/**
 * server/routes/candidateRoutes.js
 * BUG FIXED: Duplicate S3Client init — now imports from shared lib/s3.js
 * BUG FIXED: resumeUrl stored as time-limited snapshot URL — now stores permanent S3 URI
 * BUG FIXED: resume-proxy didn't validate S3 Content-Type or handle NoSuchKey explicitly
 * BUG FIXED: Signed URL for AI service was 300s (5 min) — increased to 900s (15 min)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const path = require('path');
const CandidateProfile = require('../models/CandidateProfile');
const { requireAuth, requireRole } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// BUG FIXED: No longer initialising S3Client here — using shared instance
const { s3, BUCKET_NAME, getS3SignedUrl } = require('../lib/s3');

const AI_SERVICE = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

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

// ─────────────────────────────────────────────────────────────────────────────
// Resume Proxy — serves S3 resume server-side to avoid CORS / Access Denied
// GET /api/candidate/resume-proxy/:userId
// GET /api/candidate/resume-proxy/:userId?token=JWT_TOKEN
// ─────────────────────────────────────────────────────────────────────────────
router.get('/resume-proxy/:userId', async (req, res) => {
    try {
        // Extract token from Authorization header or ?token= query param
        let token = null;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        // Verify JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }

        // Role + ownership validation
        if (decoded.role !== 'candidate') {
            return res.status(403).json({ message: 'Access denied.' });
        }
        if (decoded._id.toString() !== req.params.userId) {
            return res.status(403).json({ message: 'Access denied.' });
        }

        // Fetch profile
        const profile = await CandidateProfile.findOne({ userId: req.params.userId });
        if (!profile || !profile.resumeS3Key) {
            return res.status(404).json({ message: 'No resume found. Please upload your resume first.' });
        }

        // Fetch from S3
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: profile.resumeS3Key
        });

        let s3Response;
        try {
            s3Response = await s3.send(command);
        } catch (s3Err) {
            // BUG FIXED: NoSuchKey was previously swallowed into a generic 500
            if (s3Err.name === 'NoSuchKey' || s3Err.$metadata?.httpStatusCode === 404) {
                return res.status(404).json({ message: 'Resume file not found in storage.' });
            }
            throw s3Err;
        }

        // BUG FIXED: Was blindly streaming without checking Content-Type from S3.
        // Now validates the file is actually a PDF before streaming.
        const contentType = s3Response.ContentType || 'application/octet-stream';
        if (!contentType.includes('pdf')) {
            return res.status(422).json({ message: 'Stored file is not a valid PDF.' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');

        s3Response.Body.pipe(res);

    } catch (error) {
        console.error('Resume proxy error:', error.message);
        res.status(500).json({ message: 'Failed to fetch resume.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Upload / update candidate resume profile (candidate only)
// POST /api/candidate/profile
// ─────────────────────────────────────────────────────────────────────────────
router.post('/profile', requireAuth, requireRole('candidate'), upload.single('resume'), async (req, res) => {
    try {
        const userId = req.user._id;
        if (!req.file) return res.status(400).json({ message: 'Please upload a resume (PDF)' });

        const s3Key = req.file.key;

        // BUG FIXED: Previously stored req.file.location (a time-limited signed URL) as resumeUrl.
        // That URL expires and becomes invalid. Now storing the permanent S3 URI instead.
        // Fresh signed URLs are always generated on-demand via resumeS3Key.
        const resumeS3Uri = `s3://${BUCKET_NAME}/${s3Key}`;

        // BUG FIXED: Signed URL for AI service was 300s. Increased to 900s to avoid
        // timeout issues when the AI service is under load.
        const signedUrl = await getS3SignedUrl(s3Key, 900);

        const aiResponse = await axios.post(`${AI_SERVICE}/extract_resume`, { resume_path: signedUrl });
        const aiData = aiResponse.data;
        if (aiData.error) return res.status(500).json({ message: 'AI Extraction failed', error: aiData.error });

        let profile = await CandidateProfile.findOne({ userId });
        const updateData = {
            resumeUrl: resumeS3Uri,       // permanent S3 URI — not a signed URL
            resumeS3Key: s3Key,           // key used to generate fresh signed URLs
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

        // Always generate a fresh 1-hour signed URL for the frontend
        let signedResumeUrl = null;
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