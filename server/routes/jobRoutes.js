/**
 * server/routes/jobRoutes.js
 * FIX: analyze-workspace now deletes temporary S3 objects after the AI call
 *      (success or failure) so recruiter-uploaded batch resumes don't
 *      accumulate in S3 indefinitely.
 * FIX: analyze-fit and analyze-workspace use 60s axios timeout to survive
 *      Hugging Face Space cold-starts.
 * FIX: Job delete endpoint added (was missing, JobManagement.jsx calls it).
 * ADDED: Notification broadcast to all candidates when a new job is posted.
 */

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

// Helper: delete a single S3 object by key (best-effort, never throws)
async function deleteS3Object(key) {
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    } catch (err) {
        console.error('S3 delete failed (non-fatal):', key, err.message);
    }
}

const upload = multer({
    storage: multerS3({
        s3,
        bucket: BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            const uniqueName = 'recruiter-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
            cb(null, `resumes/tmp/${uniqueName}`); // FIX: stored under tmp/ prefix for easier lifecycle rules
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ─────────────────────────────────────────────────────────────────────────────
// Create Job (company only)
// POST /api/jobs
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const job = new Job({ ...req.body, companyId: req.user._id });
        await job.save();

        // Notify all candidates about the new job (fire-and-forget)
        try {
            const candidates = await User.find({ role: 'candidate' }, '_id');
            const companyName = req.user.companyName || req.user.name || 'A company';
            const notifications = candidates.map(c => ({
                userId:  c._id,
                type:    'job_posted',
                title:   'New Job Posted',
                message: `${companyName} posted a new role: "${job.title}". Check it out!`
            }));
            if (notifications.length > 0) {
                await Notification.insertMany(notifications, { ordered: false });
            }
        } catch (e) { console.error('Job notification error:', e.message); }

        res.status(201).json(job);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Get All Jobs (public — no auth required for browsing)
// GET /api/jobs
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.find().populate('companyId', 'name companyName').sort({ createdAt: -1 });
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Delete Job (company only — must own the job)
// DELETE /api/jobs/:id
// FIX: This endpoint was referenced by JobManagement.jsx but didn't exist.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found.' });
        if (job.companyId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });
        await Job.findByIdAndDelete(req.params.id);
        res.json({ message: 'Job deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Analyze Fit — single resume check for a candidate
// POST /api/jobs/analyze-fit
// ─────────────────────────────────────────────────────────────────────────────
router.post('/analyze-fit', requireAuth, requireRole('candidate'), upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Resume file is required.' });
        const { jobDescription, requiredSkills } = req.body;
        const s3Key = req.file.key;
        let skills = [];
        try { skills = JSON.parse(requiredSkills); }
        catch (e) { skills = requiredSkills ? requiredSkills.split(',') : []; }

        const signedUrl = await getS3SignedUrl(s3Key);
        try {
            const response = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'}/analyze`, {
                resume_path: signedUrl,
                job_description: jobDescription,
                required_skills: skills
            }, { timeout: 60000 });
            res.json(response.data);
        } catch (aiError) {
            console.error('AI Service Error:', aiError.message);
            res.status(500).json({ error: 'AI Analysis failed' });
        } finally {
            // FIX: Always clean up the temp S3 object regardless of AI success/failure
            await deleteS3Object(s3Key);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Analyze Workspace — batch resume screening
// POST /api/jobs/analyze-workspace
// ─────────────────────────────────────────────────────────────────────────────
router.post('/analyze-workspace', requireAuth, requireRole('company'), upload.array('resumes', 200), async (req, res) => {
    const uploadedKeys = []; // track all uploaded keys for cleanup
    try {
        const { jobDescription, requiredSkills } = req.body;
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ error: 'No resumes uploaded.' });

        req.files.forEach(f => uploadedKeys.push(f.key));

        let skills = [];
        try { skills = JSON.parse(requiredSkills); }
        catch (e) { if (requiredSkills) skills = requiredSkills.split(','); }

        const resumesPayload = await Promise.all(req.files.map(async (file, index) => ({
            id:       `temp_req_${Date.now()}_${index}`,
            path:     await getS3SignedUrl(file.key, 1800), // 30min for batch processing
            fileName: file.originalname
        })));

        try {
            const response = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'}/analyze_batch`, {
                resumes:         resumesPayload,
                job_description: jobDescription,
                required_skills: skills
            }, { timeout: 300000 }); // 5 min for large batches
            res.json(response.data);
        } catch (aiError) {
            console.error('AI Batch Error:', aiError.message, aiError.response?.data);
            res.status(500).json({ error: 'AI Batch Analysis failed' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        // FIX: Delete all temp S3 objects after analysis (success or failure)
        // These are recruiter-uploaded files not tied to any candidate profile.
        await Promise.all(uploadedKeys.map(deleteS3Object));
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Workspace CRUD
// ─────────────────────────────────────────────────────────────────────────────
router.post('/workspaces', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const workspace = new AIWorkspace({ ...req.body, companyId: req.user._id });
        await workspace.save();
        res.status(201).json(workspace);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/workspaces/:companyId', requireAuth, requireRole('company'), async (req, res) => {
    if (req.user._id.toString() !== req.params.companyId)
        return res.status(403).json({ error: 'Access denied.' });
    try {
        const workspaces = await AIWorkspace.find({ companyId: req.params.companyId }).sort({ createdAt: -1 });
        res.json(workspaces);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/workspaces/:id', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const workspace = await AIWorkspace.findById(req.params.id);
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
        if (workspace.companyId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });
        const updated = await AIWorkspace.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Get Single Job (public)
// GET /api/jobs/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).populate('companyId', 'name companyName');
        if (!job) return res.status(404).json({ error: 'Job not found' });
        res.json(job);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;