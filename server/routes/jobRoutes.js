const express  = require('express');
const router   = express.Router();
const Job      = require('../models/Job');
const AIWorkspace  = require('../models/AIWorkspace');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const multer   = require('multer');
const multerS3 = require('multer-s3');
const path     = require('path');
const axios    = require('axios');
const { requireAuth, requireRole } = require('../middleware/auth');
const { s3, BUCKET_NAME, getS3SignedUrl } = require('../lib/s3');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

// FIX: Forward the internal secret on every AI service call so the
// secured endpoints accept the request.
const AI_HEADERS = process.env.AI_INTERNAL_SECRET
    ? { 'X-Internal-Secret': process.env.AI_INTERNAL_SECRET }
    : {};

async function deleteS3Object(key) {
    try { await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key })); }
    catch (err) { console.error('S3 delete failed (non-fatal):', key, err.message); }
}

const upload = multer({
    storage: multerS3({
        s3,
        bucket: BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            const uniqueName = 'recruiter-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
            cb(null, `resumes/tmp/${uniqueName}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

const parseSkills = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(s => s.trim()).filter(Boolean);
    return val.split(',').map(s => s.trim()).filter(Boolean);
};

// ── Create Job ───────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const {
            title, description, requiredSkills,
            mustHaveSkills, niceToHaveSkills,
            minExperience, maxExperience,
            experienceLevel, location
        } = req.body;

        const job = new Job({
            companyId:        req.user._id,
            title, description, experienceLevel, location,
            requiredSkills:   parseSkills(requiredSkills),
            mustHaveSkills:   parseSkills(mustHaveSkills || requiredSkills),
            niceToHaveSkills: parseSkills(niceToHaveSkills),
            minExperience:    Number(minExperience) || 0,
            maxExperience:    Number(maxExperience) || 99,
        });
        await job.save();

        // Generate JD embedding async (stored for reuse)
        setImmediate(async () => {
            try {
                const aiRes = await axios.post(
                    `${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'}/embed_jd`,
                    { job_description: description },
                    { timeout: 30000, headers: AI_HEADERS }
                );
                if (aiRes.data.embedding) {
                    await Job.findByIdAndUpdate(job._id, { jdEmbeddingVector: aiRes.data.embedding });
                }
            } catch (err) { console.error('JD embedding failed (non-fatal):', err.message); }
        });

        // Notify all candidates
        try {
            const candidates = await User.find({ role: 'candidate' }, '_id');
            const companyName = req.user.companyName || req.user.name || 'A company';
            const notifications = candidates.map(c => ({
                userId: c._id, type: 'job_posted', title: 'New Job Posted',
                message: `${companyName} posted a new role: "${title}". Check it out!`
            }));
            if (notifications.length > 0) await Notification.insertMany(notifications, { ordered: false });
        } catch (e) { console.error('Job notification error:', e.message); }

        res.status(201).json(job);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ── Get All Jobs ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.find({ isActive: { $ne: false } })
            .populate('companyId', 'name companyName')
            .sort({ createdAt: -1 });
        res.json(jobs);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Delete Job (cascading delete of applications + StageHistory) ─────────────
router.delete('/:id', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const Application  = require('../models/Application');
        const StageHistory = require('../models/StageHistory');

        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found.' });
        if (job.companyId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });

        const apps = await Application.find({ jobId: req.params.id }, '_id candidateId');
        if (apps.length > 0) {
            const appIds = apps.map(a => a._id);
            const candidateIds = apps.map(a => a.candidateId);

            await StageHistory.deleteMany({ applicationId: { $in: appIds } });

            const notifs = candidateIds.map(cid => ({
                userId: cid,
                type: 'job_deleted',
                title: 'Job No Longer Available',
                message: `The job "${job.title}" you applied to has been removed by the recruiter.`
            }));
            Notification.insertMany(notifs, { ordered: false }).catch(e => console.error('Notify error:', e.message));

            await Application.deleteMany({ jobId: req.params.id });
        }

        await Job.findByIdAndDelete(req.params.id);
        res.json({ message: 'Job deleted successfully.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Analyze Fit (single resume, candidate self-check) ────────────────────────
router.post('/analyze-fit', requireAuth, requireRole('candidate'), upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Resume file is required.' });
        const { jobDescription, requiredSkills, mustHaveSkills, niceToHaveSkills, minExperience } = req.body;
        const s3Key = req.file.key;
        const signedUrl = await getS3SignedUrl(s3Key);
        try {
            const response = await axios.post(
                `${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'}/analyze`,
                {
                    resume_path:         signedUrl,
                    job_description:     jobDescription,
                    must_have_skills:    parseSkills(mustHaveSkills || requiredSkills),
                    nice_to_have_skills: parseSkills(niceToHaveSkills),
                    required_skills:     parseSkills(requiredSkills),
                    min_experience:      Number(minExperience) || 0
                },
                { timeout: 60000, headers: AI_HEADERS }
            );
            res.json(response.data);
        } catch (aiError) {
            console.error('AI Service Error:', aiError.message);
            res.status(500).json({ error: 'AI Analysis failed' });
        } finally {
            await deleteS3Object(s3Key);
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Analyze Workspace (batch) ────────────────────────────────────────────────
// FIX: PDFs are now kept in S3 under resumes/workspace/<key> so the frontend
// can preview them at any time via a fresh signed URL. We no longer delete
// files in the `finally` block; instead we move the tmp key to a permanent
// key before sending them to the AI service.
router.post('/analyze-workspace', requireAuth, requireRole('company'), upload.array('resumes', 200), async (req, res) => {
    const permanentKeys = []; // track keys we've committed so we can clean up on hard failure
    try {
        const { jobDescription, requiredSkills, mustHaveSkills, niceToHaveSkills, minExperience } = req.body;
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ error: 'No resumes uploaded.' });

        // Rename from tmp path to a permanent workspace path so files survive after analysis.
        const { CopyObjectCommand } = require('@aws-sdk/client-s3');
        const fileRecords = await Promise.all(req.files.map(async (file, index) => {
            const permanentKey = `resumes/workspace/${req.user._id}/${Date.now()}_${index}_${file.originalname}`;
            // Copy to permanent location
            await s3.send(new CopyObjectCommand({
                Bucket: BUCKET_NAME,
                CopySource: `${BUCKET_NAME}/${file.key}`,
                Key: permanentKey,
            }));
            // Delete the tmp object
            await deleteS3Object(file.key);
            permanentKeys.push(permanentKey);
            // Generate a 24-hour signed URL for the AI service to read
            const signedUrl = await getS3SignedUrl(permanentKey, 86400);
            return {
                id: `req_${Date.now()}_${index}`,
                path: signedUrl,
                fileName: file.originalname,
                s3Key: permanentKey,
            };
        }));

        let aiResponse;
        try {
            aiResponse = await axios.post(
                `${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'}/analyze_batch`,
                {
                    resumes:             fileRecords.map(f => ({ id: f.id, path: f.path, fileName: f.fileName })),
                    job_description:     jobDescription,
                    must_have_skills:    parseSkills(mustHaveSkills || requiredSkills),
                    nice_to_have_skills: parseSkills(niceToHaveSkills),
                    required_skills:     parseSkills(requiredSkills),
                    min_experience:      Number(minExperience) || 0
                },
                { timeout: 300000, headers: AI_HEADERS }
            );
        } catch (aiError) {
            console.error('AI Batch Error:', aiError.message, aiError.response?.data);
            return res.status(500).json({ error: 'AI Batch Analysis failed' });
        }

        // Attach s3Key to each analyzed candidate result so the frontend can
        // request a fresh signed URL at view time.
        const candidates = aiResponse.data?.analyzed_candidates || [];
        const enriched = candidates.map(c => {
            const record = fileRecords.find(f => f.fileName === c.fileName);
            return {
                ...c,
                s3Key: record?.s3Key || null,
            };
        });

        res.json({ ...aiResponse.data, analyzed_candidates: enriched });
    } catch (err) {
        // Hard failure: clean up any permanent keys we already wrote
        await Promise.all(permanentKeys.map(deleteS3Object));
        res.status(500).json({ error: err.message });
    }
});

// ── Get signed PDF URL for workspace candidate ───────────────────────────────
// Called by the frontend whenever a user opens the candidate modal so the
// signed URL is always fresh (S3 signed URLs expire).
router.get('/workspaces/resume-url', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const { s3Key } = req.query;
        if (!s3Key) return res.status(400).json({ error: 's3Key is required' });
        // Basic ownership check: key must start with the requesting user's id
        if (!s3Key.includes(req.user._id.toString()))
            return res.status(403).json({ error: 'Access denied.' });
        const url = await getS3SignedUrl(s3Key, 3600); // 1-hour URL
        res.json({ url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── AI Workspace CRUD ────────────────────────────────────────────────────────
router.post('/workspaces', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const workspace = new AIWorkspace({ ...req.body, companyId: req.user._id });
        await workspace.save();
        res.status(201).json(workspace);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/workspaces/:companyId', requireAuth, requireRole('company'), async (req, res) => {
    if (req.user._id.toString() !== req.params.companyId)
        return res.status(403).json({ error: 'Access denied.' });
    try {
        const workspaces = await AIWorkspace.find({ companyId: req.params.companyId }).sort({ createdAt: -1 });
        res.json(workspaces);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/workspaces/:id', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const workspace = await AIWorkspace.findById(req.params.id);
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
        if (workspace.companyId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });

        const { name, jobTitle, jobDescription, analysisResults, results, requiredSkills, mustHaveSkills, niceToHaveSkills, minExperience, skillsInput, status } = req.body;
        const safeUpdate = {};
        if (name             !== undefined) safeUpdate.name             = name;
        if (jobTitle         !== undefined) safeUpdate.jobTitle         = jobTitle;
        if (jobDescription   !== undefined) safeUpdate.jobDescription   = jobDescription;
        if (skillsInput      !== undefined) safeUpdate.skillsInput      = skillsInput;
        if (analysisResults  !== undefined) safeUpdate.analysisResults  = analysisResults;
        if (results          !== undefined) safeUpdate.analysisResults  = results;
        if (status           !== undefined) safeUpdate.status           = status;
        if (requiredSkills   !== undefined) safeUpdate.requiredSkills   = requiredSkills;
        if (mustHaveSkills   !== undefined) safeUpdate.mustHaveSkills   = mustHaveSkills;
        if (niceToHaveSkills !== undefined) safeUpdate.niceToHaveSkills = niceToHaveSkills;
        if (minExperience    !== undefined) safeUpdate.minExperience    = minExperience;

        const updated = await AIWorkspace.findByIdAndUpdate(req.params.id, safeUpdate, { new: true });
        res.json(updated);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── Get Single Job ───────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).populate('companyId', 'name companyName');
        if (!job) return res.status(404).json({ error: 'Job not found' });
        res.json(job);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;