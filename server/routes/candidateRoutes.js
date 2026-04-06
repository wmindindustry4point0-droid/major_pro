const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const axios = require('axios');
const path = require('path');
const CandidateProfile = require('../models/CandidateProfile');
const { requireAuth, requireRole } = require('../middleware/auth');

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

async function getS3SignedUrl(s3Key, expiresIn = 300) {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key });
    return await getSignedUrl(s3, command, { expiresIn });
}

// ─────────────────────────────────────────────────────────────────────────────
// Resume Proxy — FIX for S3 CORS error on apply
// GET /api/candidate/resume-proxy/:userId
// Fetches the candidate's saved resume from S3 server-side and streams it
// back to the browser. This avoids the browser hitting S3 directly, which
// is blocked by S3's CORS policy.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/resume-proxy/:userId', requireAuth, requireRole('candidate'), async (req, res) => {
    if (req.user._id.toString() !== req.params.userId) {
        return res.status(403).json({ message: 'Access denied.' });
    }
    try {
        const profile = await CandidateProfile.findOne({ userId: req.params.userId });
        if (!profile || !profile.resumeS3Key) {
            return res.status(404).json({ message: 'No resume found. Please upload your resume first.' });
        }

        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: profile.resumeS3Key });
        const s3Response = await s3.send(command);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
        s3Response.Body.pipe(res);
    } catch (error) {
        console.error('Resume proxy error:', error.message);
        res.status(500).json({ message: 'Failed to fetch resume.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Upload/update candidate resume profile (candidate only)
// POST /api/candidate/profile
// ─────────────────────────────────────────────────────────────────────────────
router.post('/profile', requireAuth, requireRole('candidate'), upload.single('resume'), async (req, res) => {
    try {
        const userId = req.user._id;
        if (!req.file) return res.status(400).json({ message: 'Please upload a resume (PDF)' });

        const s3Key = req.file.key;
        const resumeUrl = req.file.location;

        const signedUrl = await getS3SignedUrl(s3Key);
        const aiResponse = await axios.post(`${AI_SERVICE}/extract_resume`, { resume_path: signedUrl });
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

// ─────────────────────────────────────────────────────────────────────────────
// Get candidate profile (candidate — own profile only)
// GET /api/candidate/profile/:userId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/profile/:userId', requireAuth, requireRole('candidate'), async (req, res) => {
    if (req.user._id.toString() !== req.params.userId) {
        return res.status(403).json({ message: 'Access denied.' });
    }
    try {
        const profile = await CandidateProfile.findOne({ userId: req.params.userId });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        let signedResumeUrl = profile.resumeUrl;
        if (profile.resumeS3Key) {
            signedResumeUrl = await getS3SignedUrl(profile.resumeS3Key, 3600);
        }

        res.status(200).json({ ...profile.toObject(), resumeUrl: signedResumeUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Update candidate profile fields (candidate — own profile only)
// PUT /api/candidate/profile/:userId
// ─────────────────────────────────────────────────────────────────────────────
router.put('/profile/:userId', requireAuth, requireRole('candidate'), async (req, res) => {
    if (req.user._id.toString() !== req.params.userId) {
        return res.status(403).json({ message: 'Access denied.' });
    }
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

module.exports = router;