// server/routes/candidateRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const axios = require('axios');
const path = require('path');

const CandidateProfile = require('../models/CandidateProfile');
const Job = require('../models/Job');
const Application = require('../models/Application');

const AI_SERVICE = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

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
            const uniqueName = 'candidate-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
            cb(null, `resumes/${uniqueName}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Generate a short-lived signed URL so AI service can download the PDF directly
async function getS3SignedUrl(s3Key) {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key });
    return await getSignedUrl(s3, command, { expiresIn: 300 });
}

// POST: /api/candidate/profile
router.post('/profile', upload.single('resume'), async (req, res) => {
    try {
        const userId = req.body.userId;
        if (!userId) return res.status(400).json({ message: 'User ID is required' });
        if (!req.file) return res.status(400).json({ message: 'Please upload a resume (PDF)' });

        const s3Key = req.file.key;
        const resumeUrl = req.file.location;

        // Pass signed URL directly to AI — no temp download needed
        const signedUrl = await getS3SignedUrl(s3Key);
        const aiResponse = await axios.post(`${AI_SERVICE}/extract_resume`, {
            resume_path: signedUrl
        });
        const aiData = aiResponse.data;
        if (aiData.error) return res.status(500).json({ message: 'AI Extraction failed', error: aiData.error });

        let profile = await CandidateProfile.findOne({ userId });
        const updateData = {
            resumeUrl,
            resumeS3Key: s3Key,
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

// GET: /api/candidate/profile/:userId
router.get('/profile/:userId', async (req, res) => {
    try {
        const profile = await CandidateProfile.findOne({ userId: req.params.userId });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        let signedResumeUrl = profile.resumeUrl;
        if (profile.resumeS3Key) {
            const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: profile.resumeS3Key });
            signedResumeUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        }

        res.status(200).json({ ...profile.toObject(), resumeUrl: signedResumeUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
});

// PUT: /api/candidate/profile/:userId
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

// POST: /api/candidate/apply
router.post('/apply', async (req, res) => {
    try {
        const { candidateId, jobId, resumePath } = req.body;
        if (!candidateId || !jobId || !resumePath) {
            return res.status(400).json({ message: 'Missing required application fields' });
        }

        const existingApp = await Application.findOne({ candidateId, jobId });
        if (existingApp) return res.status(400).json({ message: 'You have already applied to this job' });

        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const s3Key = resumePath.includes('amazonaws.com')
            ? new URL(resumePath.split('?')[0]).pathname.slice(1)
            : resumePath;

        const signedUrl = await getS3SignedUrl(s3Key);

        let matchScore = 0;
        let aiFeedback = '';
        try {
            const aiResponse = await axios.post(`${AI_SERVICE}/analyze`, {
                resume_path: signedUrl,
                job_description: job.description,
                required_skills: job.requiredSkills
            });
            matchScore = aiResponse.data.match_percentage ?? 0;
            aiFeedback = aiResponse.data.feedback || '';
        } catch (err) {
            console.error('AI Match Score Error:', err.response?.data || err.message);
        }

        const application = new Application({
            candidateId,
            jobId,
            resumePath: s3Key,
            status: 'applied',
            matchScore,
            aiFeedback,
            appliedAt: new Date()
        });

        await application.save();
        res.status(201).json({ message: 'Applied successfully!', application });
    } catch (error) {
        console.error('Apply Error:', error);
        res.status(500).json({ message: 'Server error during job application' });
    }
});

module.exports = router;