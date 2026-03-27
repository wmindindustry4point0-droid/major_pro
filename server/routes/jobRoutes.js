const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const AIWorkspace = require('../models/AIWorkspace');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary Setup
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

let storage;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'hiremind_resumes',
            // We want to keep the original pdf format
            format: async (req, file) => 'pdf',
            public_id: (req, file) => Date.now() + '-' + Math.round(Math.random() * 1E9),
        },
    });
} else {
    // Local File Storage Fallback for Development
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '..', 'uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            cb(null, 'recruiter-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
        }
    });
}
const upload = multer({ storage });

// Create Job
router.post('/', async (req, res) => {
    try {
        const job = new Job(req.body);
        await job.save();
        res.status(201).json(job);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get All Jobs
router.get('/', async (req, res) => {
    try {
        const jobs = await Job.find().populate('companyId', 'name companyName');
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analyze Fit (Ad-hoc for Candidate)
router.post('/analyze-fit', upload.single('resume'), async (req, res) => {
    try {
        const { jobDescription, requiredSkills } = req.body;
        // With Cloudinary, the URL is stored in req.file.path
        const absoluteResumePath = req.file.path;

        // Parse requiredSkills back to array if sent as JSON string
        let skills = [];
        try {
            skills = JSON.parse(requiredSkills);
        } catch (e) {
            skills = requiredSkills.split(','); // Fallback
        }

        try {
            const response = await axios.post(`${process.env.AI_SERVICE_URL || "http://127.0.0.1:5001"}/analyze`, {
                resume_path: absoluteResumePath,
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

// Analyze Workspace (Batch processing for Recruiters)
router.post('/analyze-workspace', upload.array('resumes', 200), async (req, res) => {
    console.log("--> HIT /analyze-workspace ENDPOINT");
    console.log("--> Body:", req.body);
    console.log("--> Files count:", req.files ? req.files.length : 'None');

    try {
        const { jobDescription, requiredSkills } = req.body;

        if (!req.files || req.files.length === 0) {
            console.log("--> ERROR: No files attached in multer");
            return res.status(400).json({ error: 'No resumes uploaded.' });
        }

        let skills = [];
        try {
            skills = JSON.parse(requiredSkills);
        } catch (e) {
            if (requiredSkills) skills = requiredSkills.split(',');
        }

        // Format files for Python API
        const resumesPayload = req.files.map((file, index) => ({
            id: `temp_req_${Date.now()}_${index}`,
            path: file.path, // This is now a Cloudinary URL
            fileName: file.originalname
        }));

        console.log("--> Payload prepped for Python. Sending request to https://hiremind-ai-1.onrender.com/analyze_batch");

        try {
            const response = await axios.post(`${process.env.AI_SERVICE_URL || "http://127.0.0.1:5001"}/analyze_batch`, {
                resumes: resumesPayload,
                job_description: jobDescription,
                required_skills: skills
            });
            console.log("--> HUGE SUCCESS. Python responded.", response.status);
            // Forward the AI results natively back to the React app
            res.json(response.data);
        } catch (aiError) {
            console.error('--> AI Service Error (Batch Axios):', aiError.message, aiError.response?.data);
            res.status(500).json({ error: 'AI Batch Analysis failed' });
        }
    } catch (err) {
        console.error("--> General Server Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- AI WORKSPACE ROUTES ---

// Create AI Workspace
router.post('/workspaces', async (req, res) => {
    try {
        const workspace = new AIWorkspace(req.body);
        await workspace.save();
        res.status(201).json(workspace);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get Workspaces for Company
router.get('/workspaces/:companyId', async (req, res) => {
    try {
        const workspaces = await AIWorkspace.find({ companyId: req.params.companyId }).sort({ createdAt: -1 });
        res.json(workspaces);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update AI Workspace (Results & Status)
router.put('/workspaces/:id', async (req, res) => {
    try {
        const workspace = await AIWorkspace.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
        res.json(workspace);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get Single Job
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
