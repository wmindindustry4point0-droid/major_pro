const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const Job = require('../models/Job');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary Setup for Resume Upload
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
            cb(null, 'candidate-applied-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
        }
    });
}

const upload = multer({ storage });

// Apply for a Job
router.post('/apply', upload.single('resume'), async (req, res) => {
    try {
        const { candidateId, jobId, coverLetter } = req.body;
        // With Cloudinary, the URL is stored in req.file.path
        const resumePath = req.file.path;

        const application = new Application({
            candidateId,
            jobId,
            resumePath,
            coverLetter
        });
        await application.save();
        res.status(201).json(application);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get Applications for a 'Job' (Company view)
router.get('/job/:jobId', async (req, res) => {
    try {
        const applications = await Application.find({ jobId: req.params.jobId })
            .populate('candidateId', 'name email');
        res.json(applications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Applications for a 'Candidate' (My Applications)
router.get('/candidate/:candidateId', async (req, res) => {
    try {
        const applications = await Application.find({ candidateId: req.params.candidateId })
            .populate('jobId', 'title companyId');
        res.json(applications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analyze Resume (Call Python Service)
router.post('/analyze/:applicationId', async (req, res) => {
    try {
        const application = await Application.findById(req.params.applicationId).populate('jobId');
        if (!application) return res.status(404).json({ error: 'Application not found' });

        // Call Python Service
        // Assuming Python service is running on port 5001
        try {
            // We need to send the Cloudinary URL.
            const absoluteResumePath = application.resumePath;

            const response = await axios.post(`${process.env.AI_SERVICE_URL || "http://127.0.0.1:5001"}/analyze`, {
                resume_path: absoluteResumePath,
                job_description: application.jobId.description,
                required_skills: application.jobId.requiredSkills
            });

            application.matchScore = response.data.match_percentage;
            application.aiFeedback = response.data.feedback;
            application.status = 'analyzed';
            await application.save();

            res.json(application);

        } catch (aiError) {
            console.error('AI Service Error:', aiError.message);
            res.status(500).json({ error: 'AI Analysis failed' });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
