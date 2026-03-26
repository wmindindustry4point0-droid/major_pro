const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const CandidateProfile = require('../models/CandidateProfile');

// Configure Multer for PDF uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'candidate-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// @route   POST /api/candidate/profile
// @desc    Upload resume, parse via Python AI, create/update CandidateProfile
router.post('/profile', upload.single('resume'), async (req, res) => {
    try {
        const userId = req.body.userId; // Passed from frontend

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a resume (PDF)' });
        }

        const absolutePath = path.resolve(req.file.path);

        // 1. Call Python AI Service for metadata extraction
        console.log(`Sending single resume to AI for extraction: ${absolutePath}`);
        const aiResponse = await axios.post('http://127.0.0.1:5001/extract_resume', {
            resume_path: absolutePath
        });

        const aiData = aiResponse.data;

        if (aiData.error) {
            return res.status(500).json({ message: 'AI Extraction failed', error: aiData.error });
        }

        const resumeUrl = `/uploads/${req.file.filename}`;

        // 2. Create or Update Candidate Profile in DB
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
            // Update existing
            profile = await CandidateProfile.findOneAndUpdate(
                { userId },
                { $set: updateData },
                { new: true }
            );
        } else {
            // Create new
            profile = new CandidateProfile({
                userId,
                ...updateData
            });
            await profile.save();
        }

        res.status(200).json({ message: 'Profile updated successfully', profile });

    } catch (error) {
        console.error('Candidate Profile Update Error:', error.message);
        res.status(500).json({ message: 'Server error during profile update' });
    }
});

// @route   GET /api/candidate/profile/:userId
// @desc    Get candidate profile data
router.get('/profile/:userId', async (req, res) => {
    try {
        const profile = await CandidateProfile.findOne({ userId: req.params.userId });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.status(200).json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
});

// @route   PUT /api/candidate/profile/:userId
// @desc    Manually update candidate profile details (experience, education, location)
router.put('/profile/:userId', async (req, res) => {
    try {
        // Allow updates to generic fields
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

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        res.status(200).json({ message: 'Profile updated', profile });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
});

// @route   POST /api/candidate/apply
// @desc    Apply to a job using an ALREADY SAVED CandidateProfile resume
router.post('/apply', async (req, res) => {
    try {
        const { candidateId, jobId, resumePath } = req.body;
        
        if (!candidateId || !jobId || !resumePath) {
            return res.status(400).json({ message: 'Missing required application fields' });
        }

        // We require the Application model 
        const Application = require('../models/Application');

        // Check if already applied
        const existingApp = await Application.findOne({ candidateId, jobId });
        if (existingApp) {
            return res.status(400).json({ message: 'You have already applied to this job' });
        }

        // The resumePath here is technically a URL or a relative path from the profile.
        // During recruiter analysis, the recruiter dashboard hits `/api/jobs/analyze-workspace` 
        // with raw files. 
        // Or if the recruiter opens the application list, they can hit the Python service.
        // We just save the path provided by the profile.
        const absolutePathForPythonContext = require('path').join(__dirname, '..', resumePath);

        const application = new Application({
            candidateId,
            jobId,
            resumePath: absolutePathForPythonContext, // Store absolute path for easy AI loading
            status: 'applied'
        });

        await application.save();

        res.status(201).json({ message: 'Applied successfully!', application });

    } catch (error) {
        console.error('Apply Error:', error);
        res.status(500).json({ message: 'Server error during job application' });
    }
});

module.exports = router;
