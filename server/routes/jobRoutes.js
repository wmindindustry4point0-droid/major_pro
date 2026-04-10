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
                    { timeout: 30000 }
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

// ── Delete Job (Bug #2 fix — cascading delete of applications + StageHistory) ─
router.delete('/:id', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const Application  = require('../models/Application');
        const StageHistory = require('../models/StageHistory');

        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found.' });
        if (job.companyId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });

        // Bug #13 fix: Notify applicants their application is being removed
        const apps = await Application.find({ jobId: req.params.id }, '_id candidateId');
        if (apps.length > 0) {
            const appIds = apps.map(a => a._id);
            const candidateIds = apps.map(a => a.candidateId);

            // Delete stage history for all applications under this job
            await StageHistory.deleteMany({ applicationId: { $in: appIds } });

            // Notify candidates their application was removed (Bug #13)
            const notifs = candidateIds.map(cid => ({
                userId: cid,
                type: 'job_deleted',
                title: 'Job No Longer Available',
                message: `The job "${job.title}" you applied to has been removed by the recruiter.`
            }));
            Notification.insertMany(notifs, { ordered: false }).catch(e => console.error('Notify error:', e.message));

            // Delete all applications for this job
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
                { timeout: 60000 }
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
router.post('/analyze-workspace', requireAuth, requireRole('company'), upload.array('resumes', 200), async (req, res) => {
    const uploadedKeys = [];
    try {
        const { jobDescription, requiredSkills, mustHaveSkills, niceToHaveSkills, minExperience } = req.body;
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ error: 'No resumes uploaded.' });

        req.files.forEach(f => uploadedKeys.push(f.key));

        const resumesPayload = await Promise.all(req.files.map(async (file, index) => ({
            id: `temp_req_${Date.now()}_${index}`,
            path: await getS3SignedUrl(file.key, 1800),
            fileName: file.originalname
        })));

        try {
            const response = await axios.post(
                `${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'}/analyze_batch`,
                {
                    resumes:             resumesPayload,
                    job_description:     jobDescription,
                    must_have_skills:    parseSkills(mustHaveSkills || requiredSkills),
                    nice_to_have_skills: parseSkills(niceToHaveSkills),
                    required_skills:     parseSkills(requiredSkills),
                    min_experience:      Number(minExperience) || 0
                },
                { timeout: 300000 }
            );
            res.json(response.data);
        } catch (aiError) {
            console.error('AI Batch Error:', aiError.message, aiError.response?.data);
            res.status(500).json({ error: 'AI Batch Analysis failed' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        await Promise.all(uploadedKeys.map(deleteS3Object));
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

// Bug #9 fix: Strip companyId from req.body to prevent ownership hijacking
router.put('/workspaces/:id', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const workspace = await AIWorkspace.findById(req.params.id);
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
        if (workspace.companyId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });

        // Explicitly whitelist allowed fields — never pass raw req.body
        const { name, jobDescription, results, requiredSkills, mustHaveSkills, niceToHaveSkills, minExperience } = req.body;
        const safeUpdate = {};
        if (name             !== undefined) safeUpdate.name             = name;
        if (jobDescription   !== undefined) safeUpdate.jobDescription   = jobDescription;
        if (results          !== undefined) safeUpdate.results          = results;
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
