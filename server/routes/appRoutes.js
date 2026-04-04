// server/routes/appRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const fs = require('fs');
const os = require('os');
const axios = require('axios');
const Application = require('../models/Application');
const Job = require('../models/Job');
const { sendStatusEmail } = require('../mailer');

// ===============================
// AWS S3 CONFIG
// ===============================
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
            const uniqueName = 'candidate-applied-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
            cb(null, `resumes/${uniqueName}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'), false);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper: download from S3 to /tmp for AI service
async function downloadS3ToTemp(s3Key) {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key });
    const response = await s3.send(command);
    const tmpPath = path.join(os.tmpdir(), path.basename(s3Key));
    const fileStream = fs.createWriteStream(tmpPath);
    await new Promise((resolve, reject) => {
        response.Body.pipe(fileStream);
        response.Body.on('error', reject);
        fileStream.on('finish', resolve);
    });
    return tmpPath;
}

// Apply for a Job
router.post('/apply', upload.single('resume'), async (req, res) => {
    try {
        const { candidateId, jobId, coverLetter } = req.body;
        if (!req.file) return res.status(400).json({ error: 'Resume file is required' });

        const resumePath = req.file.key;  // S3 key, e.g. "resumes/candidate-applied-xxx.pdf"

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
            .populate('candidateId', 'name email')
            .sort({ appliedAt: -1 });

        // Generate signed URLs so company can view resumes securely
        const appsWithUrls = await Promise.all(applications.map(async (app) => {
            const obj = app.toObject();
            if (app.resumePath) {
                const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: app.resumePath });
                obj.resumeSignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
            }
            return obj;
        }));

        res.json(appsWithUrls);
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
                select: 'title companyId requiredSkills',
                populate: { path: 'companyId', select: 'name companyName' }
            })
            .sort({ appliedAt: -1 });

        // Add signed URLs for each resume
        const appsWithUrls = await Promise.all(applications.map(async (app) => {
            const obj = app.toObject();
            if (app.resumePath) {
                const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: app.resumePath });
                obj.resumeSignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
            }
            return obj;
        }));

        res.json(appsWithUrls);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Analyze Resume (Call Python Service)
router.post('/analyze/:applicationId', async (req, res) => {
    let tmpPath = null;
    try {
        const application = await Application.findById(req.params.applicationId).populate('jobId');
        if (!application) return res.status(404).json({ error: 'Application not found' });

        // Download resume from S3 for AI
        tmpPath = await downloadS3ToTemp(application.resumePath);

        try {
            const response = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'}/analyze`, {
                resume_path: tmpPath,
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
    } finally {
        if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
});

// Update Application Status (Recruiter accept / reject)
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
                console.error('Email sending failed:', emailErr.message);
            }
        }

        res.json(application);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;