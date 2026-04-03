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
const { sendStatusEmail } = require('../mailer');

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
        const resumePath = req.file.path;
        const application = new Application({ candidateId, jobId, resumePath, coverLetter });
        await application.save();
        res.status(201).json(application);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get Applications for a Job (Company view)
router.get('/job/:jobId', async (req, res) => {
    try {
        const applications = await Application.find({ jobId: req.params.jobId })
            .populate('candidateId', 'name email');
        res.json(applications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Applications for a Candidate (My Applications)
router.get('/candidate/:candidateId', async (req, res) => {
    try {
        const applications = await Application.find({ candidateId: req.params.candidateId })
            .populate({
                path: 'jobId',
                select: 'title companyId',
                populate: { path: 'companyId', select: 'name companyName' }
            });
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

        try {
            const response = await axios.post(`${process.env.AI_SERVICE_URL || "http://127.0.0.1:5001"}/analyze`, {
                resume_path: application.resumePath,
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

// Update Application Status (Recruiter accept / reject) — sends email to candidate
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['shortlisted', 'rejected', 'applied', 'analyzed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value.' });
        }

        const application = await Application.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        )
        .populate('candidateId', 'name email')
        .populate({
            path: 'jobId',
            select: 'title companyId',
            populate: { path: 'companyId', select: 'name companyName' }
        });

        if (!application) return res.status(404).json({ error: 'Application not found.' });

        // Send email only on accept or reject decisions
        if (status === 'shortlisted' || status === 'rejected') {
            try {
                await sendStatusEmail({
                    toEmail: application.candidateId.email,
                    candidateName: application.candidateId.name,
                    jobTitle: application.jobId.title,
                    companyName: application.jobId.companyId?.companyName || application.jobId.companyId?.name || 'the company',
                    status
                });
            } catch (emailErr) {
                // Don't fail the request if email fails — just log it
                console.error('Email sending failed:', emailErr.message);
            }
        }

        res.json(application);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;