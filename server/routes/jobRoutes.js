const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const AIWorkspace = require('../models/AIWorkspace');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');
const axios = require('axios');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { requireAuth, requireRole } = require('../middleware/auth');

// ── S3 setup ─────────────────────────────────────────────────────────────────
const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

const upload = multer({
    storage: multerS3({
        s3,
        bucket: BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            const uniqueName = 'recruiter-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
            cb(null, `resumes/${uniqueName}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

async function getS3SignedUrl(s3Key, expiresIn = 300) {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key });
    return await getSignedUrl(s3, command, { expiresIn });
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Job (company only)
// POST /api/jobs
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const job = new Job({ ...req.body, companyId: req.user._id });
        await job.save();
        res.status(201).json(job);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Get All Jobs (public)
// GET /api/jobs
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.find().populate('companyId', 'name companyName');
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Analyze Fit — ad-hoc single resume check for a candidate
// POST /api/jobs/analyze-fit
// ─────────────────────────────────────────────────────────────────────────────
router.post('/analyze-fit', requireAuth, requireRole('candidate'), upload.single('resume'), async (req, res) => {
    try {
        // FIX: guard against missing file before accessing req.file.key
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
            });
            res.json(response.data);
        } catch (aiError) {
            console.error('AI Service Error:', aiError.message);
            res.status(500).json({ error: 'AI Analysis failed' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Analyze Workspace — batch resume screening for recruiters
// POST /api/jobs/analyze-workspace
// ─────────────────────────────────────────────────────────────────────────────
router.post('/analyze-workspace', requireAuth, requireRole('company'), upload.array('resumes', 200), async (req, res) => {
    console.log('--> HIT /analyze-workspace ENDPOINT');
    console.log('--> Files count:', req.files ? req.files.length : 'None');

    try {
        const { jobDescription, requiredSkills } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No resumes uploaded.' });
        }

        let skills = [];
        try { skills = JSON.parse(requiredSkills); }
        catch (e) { if (requiredSkills) skills = requiredSkills.split(','); }

        const resumesPayload = await Promise.all(req.files.map(async (file, index) => ({
            id: `temp_req_${Date.now()}_${index}`,
            path: await getS3SignedUrl(file.key),
            fileName: file.originalname
        })));

        console.log('--> Sending batch to AI service:', process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001');

        try {
            const response = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'}/analyze_batch`, {
                resumes: resumesPayload,
                job_description: jobDescription,
                required_skills: skills
            });
            console.log('--> AI responded successfully.', response.status);
            res.json(response.data);
        } catch (aiError) {
            console.error('--> AI Service Error (Batch):', aiError.message, aiError.response?.data);
            res.status(500).json({ error: 'AI Batch Analysis failed' });
        }
    } catch (err) {
        console.error('--> General Server Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Workspace CRUD (company only)
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
    if (req.user._id.toString() !== req.params.companyId) {
        return res.status(403).json({ error: 'Access denied.' });
    }
    try {
        const workspaces = await AIWorkspace.find({ companyId: req.params.companyId }).sort({ createdAt: -1 });
        res.json(workspaces);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// FIX: added ownership check — any company could previously overwrite another company's workspace
router.put('/workspaces/:id', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const workspace = await AIWorkspace.findById(req.params.id);
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

        if (workspace.companyId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied. You do not own this workspace.' });
        }

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