/**
 * server/routes/appRoutes.js
 * FIX: matchScore saved as null (not 0) when AI is unavailable so the UI can
 *      show "AI unavailable" instead of a misleading 0% match score.
 * FIX: Duplicate-application error now returns 409 to let the frontend
 *      distinguish it from other 400 errors.
 */

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const multerS3 = require('multer-s3');
const path    = require('path');
const axios   = require('axios');
const Application  = require('../models/Application');
const Job          = require('../models/Job');
const Notification = require('../models/Notification');
const { sendStatusEmail } = require('../mailer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { s3, BUCKET_NAME, getS3SignedUrl } = require('../lib/s3');

const upload = multer({
    storage: multerS3({
        s3,
        bucket: BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            const uniqueName = 'candidate-applied-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
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
// Apply for a Job (candidate only)
// POST /api/applications/apply
// ─────────────────────────────────────────────────────────────────────────────
router.post('/apply', requireAuth, requireRole('candidate'), upload.single('resume'), async (req, res) => {
    try {
        const candidateId = req.user._id;
        const { jobId, coverLetter } = req.body;

        if (!req.file) return res.status(400).json({ error: 'Resume file is required' });
        if (!jobId)    return res.status(400).json({ error: 'Job ID is required' });

        const existingApp = await Application.findOne({ candidateId, jobId });
        // FIX: Return 409 Conflict so frontend can give a specific message
        if (existingApp) return res.status(409).json({ error: 'You have already applied to this job' });

        const job = await Job.findById(jobId).populate('companyId', 'name companyName');
        if (!job) return res.status(404).json({ error: 'Job not found' });

        const s3Key = req.file.key;

        // FIX: matchScore starts as null — only set if AI responds successfully.
        // A null score is shown as "Pending" in the UI rather than 0%.
        let matchScore = null;
        let aiFeedback = '';
        try {
            const signedUrl = await getS3SignedUrl(s3Key);
            const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'}/analyze`, {
                resume_path:     signedUrl,
                job_description: job.description,
                required_skills: job.requiredSkills
            }, { timeout: 60000 }); // 60s timeout for cold-start HF spaces
            matchScore = aiResponse.data.match_percentage ?? null;
            aiFeedback = aiResponse.data.feedback || '';
        } catch (err) {
            console.error('AI Match Score Error (non-fatal):', err.response?.data || err.message);
        }

        const application = new Application({
            candidateId, jobId,
            resumePath: s3Key,
            coverLetter,
            status: 'applied',
            matchScore,
            aiFeedback,
            appliedAt: new Date()
        });
        await application.save();

        // Notify the company that a new application was received
        try {
            await Notification.create({
                userId:  job.companyId._id,
                type:    'application_received',
                title:   'New Application Received',
                message: `${req.user.name} applied for "${job.title}".`
            });
        } catch (e) { console.error('Notification error:', e.message); }

        res.status(201).json({ message: 'Applied successfully!', application });
    } catch (err) {
        // FIX: Catch the unique index violation from MongoDB (race condition)
        if (err.code === 11000) {
            return res.status(409).json({ error: 'You have already applied to this job' });
        }
        res.status(400).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Get Applications for a Job (company only)
// GET /api/applications/job/:jobId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/job/:jobId', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const applications = await Application.find({ jobId: req.params.jobId })
            .populate('candidateId', 'name email')
            .sort({ appliedAt: -1 });

        const appsWithUrls = await Promise.all(applications.map(async (app) => {
            const obj = app.toObject();
            if (app.resumePath) obj.resumeSignedUrl = await getS3SignedUrl(app.resumePath, 3600);
            return obj;
        }));

        res.json(appsWithUrls);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Get Applications for a Candidate (candidate only)
// GET /api/applications/candidate/:candidateId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/candidate/:candidateId', requireAuth, requireRole('candidate'), async (req, res) => {
    if (req.user._id.toString() !== req.params.candidateId)
        return res.status(403).json({ error: 'Access denied.' });
    try {
        const applications = await Application.find({ candidateId: req.params.candidateId })
            .populate({
                path: 'jobId',
                select: 'title companyId requiredSkills',
                populate: { path: 'companyId', select: 'name companyName' }
            })
            .sort({ appliedAt: -1 });

        const appsWithUrls = await Promise.all(applications.map(async (app) => {
            const obj = app.toObject();
            if (app.resumePath) obj.resumeSignedUrl = await getS3SignedUrl(app.resumePath, 3600);
            return obj;
        }));

        res.json(appsWithUrls);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Analyze Resume (company triggers AI)
// POST /api/applications/analyze/:applicationId
// ─────────────────────────────────────────────────────────────────────────────
router.post('/analyze/:applicationId', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const application = await Application.findById(req.params.applicationId).populate('jobId');
        if (!application) return res.status(404).json({ error: 'Application not found' });

        const signedUrl = await getS3SignedUrl(application.resumePath);

        try {
            const response = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'}/analyze`, {
                resume_path:     signedUrl,
                job_description: application.jobId.description,
                required_skills: application.jobId.requiredSkills
            }, { timeout: 60000 });

            application.matchScore = response.data.match_percentage;
            application.aiFeedback = response.data.feedback;
            application.status     = 'analyzed';
            await application.save();

            // Notify candidate their resume was analyzed
            try {
                await Notification.create({
                    userId:  application.candidateId,
                    type:    'status_analyzed',
                    title:   'Resume Analyzed',
                    message: `Your resume for "${application.jobId.title}" has been analyzed by the recruiter.`
                });
            } catch (e) { console.error('Notification error:', e.message); }

            res.json(application);
        } catch (aiError) {
            console.error('AI Service Error:', aiError.message);
            res.status(500).json({ error: 'AI Analysis failed. Please ensure the AI service is running.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Update Application Status (company only)
// PATCH /api/applications/:id/status
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['shortlisted', 'rejected', 'applied', 'analyzed'].includes(status))
            return res.status(400).json({ error: 'Invalid status value.' });

        const application = await Application.findByIdAndUpdate(
            req.params.id, { status }, { new: true }
        )
        .populate('candidateId', 'name email')
        .populate({
            path: 'jobId',
            select: 'title companyId',
            populate: { path: 'companyId', select: 'name companyName' }
        });

        if (!application) return res.status(404).json({ error: 'Application not found.' });

        // Notify candidate of shortlist / rejection
        if (status === 'shortlisted' || status === 'rejected') {
            const companyName = application.jobId.companyId?.companyName
                || application.jobId.companyId?.name || 'the company';

            try {
                await Notification.create({
                    userId:  application.candidateId._id,
                    type:    status === 'shortlisted' ? 'status_shortlisted' : 'status_rejected',
                    title:   status === 'shortlisted' ? '🎉 You were shortlisted!' : 'Application Update',
                    message: status === 'shortlisted'
                        ? `Congratulations! ${companyName} shortlisted you for "${application.jobId.title}".`
                        : `${companyName} has reviewed your application for "${application.jobId.title}" and moved forward with other candidates.`
                });
            } catch (e) { console.error('Notification error:', e.message); }

            try {
                await sendStatusEmail({
                    toEmail:       application.candidateId.email,
                    candidateName: application.candidateId.name,
                    jobTitle:      application.jobId.title,
                    companyName,
                    status
                });
            } catch (emailErr) {
                console.error('Email sending failed:', emailErr.message);
            }
        }

        res.json(application);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;