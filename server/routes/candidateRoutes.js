const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const multerS3 = require('multer-s3');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const path  = require('path');
const CandidateProfile = require('../models/CandidateProfile');
const { requireAuth, requireRole } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
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

// ── Resume Proxy ─────────────────────────────────────────────────────────────
router.get('/resume-proxy/:userId', async (req, res) => {
    try {
        let token = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
        else if (req.query.token) token = req.query.token;
        if (!token) return res.status(401).json({ message: 'Authentication required.' });

        let decoded;
        try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
        catch { return res.status(401).json({ message: 'Invalid or expired token.' }); }

        if (decoded.role !== 'candidate') return res.status(403).json({ message: 'Access denied.' });
        if (decoded._id.toString() !== req.params.userId) return res.status(403).json({ message: 'Access denied.' });

        const profile = await CandidateProfile.findOne({ userId: req.params.userId });
        if (!profile || !profile.resumeS3Key) return res.status(404).json({ message: 'No resume found. Please upload your resume first.' });

        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: profile.resumeS3Key });
        let s3Response;
        try { s3Response = await s3.send(command); }
        catch (s3Err) {
            if (s3Err.name === 'NoSuchKey' || s3Err.$metadata?.httpStatusCode === 404)
                return res.status(404).json({ message: 'Resume file not found in storage.' });
            throw s3Err;
        }

        const contentType = s3Response.ContentType || 'application/octet-stream';
        if (!contentType.includes('pdf')) return res.status(422).json({ message: 'Stored file is not a valid PDF.' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
        s3Response.Body.pipe(res);
    } catch (error) {
        console.error('Resume proxy error:', error.message);
        res.status(500).json({ message: 'Failed to fetch resume.' });
    }
});

// ── Upload / Update Profile ──────────────────────────────────────────────────
router.post('/profile', requireAuth, requireRole('candidate'), upload.single('resume'), async (req, res) => {
    try {
        const userId = req.user._id;
        if (!req.file) return res.status(400).json({ message: 'Please upload a resume (PDF)' });

        const s3Key       = req.file.key;
        const resumeS3Uri = `s3://${BUCKET_NAME}/${s3Key}`;
        const signedUrl   = await getS3SignedUrl(s3Key, 900);

        // Try structured parse_resume first, fall back to extract_resume
        let aiData;
        try {
            const aiResponse = await axios.post(`${AI_SERVICE}/parse_resume`, { resume_path: signedUrl }, { timeout: 90000 });
            aiData = aiResponse.data;
            if (aiData.error) throw new Error(aiData.error);
        } catch (aiErr) {
            console.error('parse_resume failed, using fallback:', aiErr.message);
            try {
                const fallback = await axios.post(`${AI_SERVICE}/extract_resume`, { resume_path: signedUrl }, { timeout: 60000 });
                aiData = {
                    candidateName: fallback.data.candidateName,
                    email:         fallback.data.email,
                    phone:         fallback.data.phone,
                    extractedSkills:      fallback.data.extractedSkills || [],
                    totalExperienceYears: 0,
                    experience:           [],
                    education:            [],
                    projects:             [],
                    embeddingVector:      [],
                    embeddingHash:        null
                };
            } catch (fallbackErr) {
                return res.status(500).json({ message: 'AI extraction failed', error: aiErr.message });
            }
        }

        const updateData = {
            resumeUrl:            resumeS3Uri,
            resumeS3Key:          s3Key,
            extractedName:        aiData.candidateName,
            extractedEmail:       aiData.email,
            extractedPhone:       aiData.phone,
            extractedSkills:      aiData.extractedSkills      || [],
            totalExperienceYears: aiData.totalExperienceYears || 0,
            experience:           aiData.experience           || [],
            education:            aiData.education            || [],
            projects:             aiData.projects             || [],
            embeddingVector:      aiData.embeddingVector      || [],
            embeddingHash:        aiData.embeddingHash        || null,
            lastUpdated:          Date.now()
        };

        let profile = await CandidateProfile.findOne({ userId });
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

// ── Get Profile ──────────────────────────────────────────────────────────────
router.get('/profile/:userId', requireAuth, requireRole('candidate'), async (req, res) => {
    if (req.user._id.toString() !== req.params.userId)
        return res.status(403).json({ message: 'Access denied.' });
    try {
        const profile = await CandidateProfile.findOne({ userId: req.params.userId });
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        let signedResumeUrl = null;
        if (profile.resumeS3Key) signedResumeUrl = await getS3SignedUrl(profile.resumeS3Key, 3600);

        const profileObj = profile.toObject();
        delete profileObj.embeddingVector; // don't send 384-dim array to frontend
        res.status(200).json({ ...profileObj, resumeUrl: signedResumeUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
});

// ── Update Profile Fields ────────────────────────────────────────────────────
router.put('/profile/:userId', requireAuth, requireRole('candidate'), async (req, res) => {
    if (req.user._id.toString() !== req.params.userId)
        return res.status(403).json({ message: 'Access denied.' });
    try {
        const { experience, education, location, extractedSkills, linkedIn, github } = req.body;
        const updateFields = {};
        if (experience      !== undefined) updateFields.experience      = experience;
        if (education       !== undefined) updateFields.education       = education;
        if (location        !== undefined) updateFields.location        = location;
        if (extractedSkills !== undefined) updateFields.extractedSkills = extractedSkills;
        if (linkedIn        !== undefined) updateFields.linkedIn        = linkedIn;
        if (github          !== undefined) updateFields.github          = github;

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