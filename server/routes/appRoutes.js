const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const Job = require('../models/Job');

// Multer Setup for Resume Upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Apply for a Job
router.post('/apply', upload.single('resume'), async (req, res) => {
    try {
        const { candidateId, jobId, coverLetter } = req.body;
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
            // We need to send the file path or content. For simplicity, let's assume we send the absolute path.
            // In a real world, we might stream the file or use a shared volume.
            // Since this is local, absolute path works.
            const absoluteResumePath = path.resolve(application.resumePath);

            const response = await axios.post('http://127.0.0.1:5001/analyze', {
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
