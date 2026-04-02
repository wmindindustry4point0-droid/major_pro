// C:\Users\Yash\Desktop\HireMind\server\routes\candidateRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const CandidateProfile = require('../models/CandidateProfile');
const Job = require('../models/Job');
const Application = require('../models/Application');

// ===============================
// MULTER CONFIG (for future resume upload if needed)
// ===============================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'candidate-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ===============================
// POST: /api/candidate/profile
// Upload resume → Extract AI Data → Save Profile
// ===============================
router.post('/profile', upload.single('resume'), async (req, res) => {
    try {
        const userId = req.body.userId;
        if (!userId) return res.status(400).json({ message: 'User ID is required' });
        if (!req.file) return res.status(400).json({ message: 'Please upload a resume (PDF)' });

        const absolutePath = path.resolve(req.file.path);

        // Send resume to AI for extraction
        const aiResponse = await axios.post('http://127.0.0.1:5001/extract_resume', {
            resume_path: absolutePath
        });
        const aiData = aiResponse.data;
        if (aiData.error) return res.status(500).json({ message: 'AI Extraction failed', error: aiData.error });

        const resumeUrl = `/uploads/${req.file.filename}`;

        let profile = await CandidateProfile.findOne({ userId });
        const updateData = {
            resumeUrl,
            extractedName: aiData.candidateName,
            extractedEmail: aiData.email,
            extractedPhone: aiData.phone,
            extractedSkills: aiData.extractedSkills,
            lastUpdated: Date.now()
        };

        if (profile) {
            profile = await CandidateProfile.findOneAndUpdate({ userId }, { $set: updateData }, { new: true });
        } else {
            profile = new CandidateProfile({ userId, ...updateData });
            await profile.save();
        }

        res.status(200).json({ message: 'Profile updated successfully', profile });
    } catch (error) {
        console.error('Candidate Profile Update Error:', error.message);
        res.status(500).json({ message: 'Server error during profile update' });
    }
});

// ===============================
// GET: /api/candidate/profile/:userId
// ===============================
router.get('/profile/:userId', async (req, res) => {
    try {
        const profile = await CandidateProfile.findOne({ userId: req.params.userId });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        res.status(200).json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
});

// ===============================
// PUT: /api/candidate/profile/:userId
// ===============================
router.put('/profile/:userId', async (req, res) => {
    try {
        const { experience, education, location, extractedSkills } = req.body;

        const updateFields = {};
        if (experience !== undefined) updateFields.experience = experience;
        if (education !== undefined) updateFields.education = education;
        if (location !== undefined) updateFields.location = location;
        if (extractedSkills !== undefined) updateFields.extractedSkills = extractedSkills;

        const profile = await CandidateProfile.findOneAndUpdate(
            { userId: req.params.userId },
            { $set: updateFields },
            { new: true }
        );

        if (!profile) return res.status(404).json({ message: 'Profile not found' });
        res.status(200).json({ message: 'Profile updated', profile });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
});

// ===============================
// POST: /api/candidate/apply
// Apply to job + Generate AI Match Score
// ===============================
router.post('/apply', async (req, res) => {
    try {
        const { candidateId, jobId, resumePath } = req.body;

        if (!candidateId || !jobId || !resumePath) {
            return res.status(400).json({ message: 'Missing required application fields' });
        }

        // Check if already applied
        const existingApp = await Application.findOne({ candidateId, jobId });
        if (existingApp) return res.status(400).json({ message: 'You have already applied to this job' });

        // Load job data for AI match
        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Normalize path for OS
        const fullResumePath = path.resolve(path.join(__dirname, '..', resumePath.replace(/^\/+/, '')));

        // ----- AI MATCH SCORE -----
        let matchScore = 0;
        let aiFeedback = '';
        try {
            console.log("Sending resume to Python AI for match score...");
            const aiResponse = await axios.post("http://127.0.0.1:5001/analyze", {  // <-- fixed endpoint
                resume_path: fullResumePath,
                job_description: job.description,
                required_skills: job.requiredSkills
            });
            matchScore = aiResponse.data.match_percentage ?? 0;
            aiFeedback = aiResponse.data.feedback || '';
        } catch (err) {
            console.error('AI Match Score Error:', err.response?.data || err.message);
        }

        // Save application
        const application = new Application({
            candidateId,
            jobId,
            resumePath,
            status: 'applied',
            matchScore,
            aiFeedback,
            appliedAt: new Date()
        });

        await application.save();

        res.status(201).json({
            message: "Applied successfully!",
            application
        });

    } catch (error) {
        console.error('Apply Error:', error);
        res.status(500).json({ message: 'Server error during job application' });
    }
});

module.exports = router;