const express       = require('express');
const router        = express.Router();
const multer        = require('multer');
const multerS3      = require('multer-s3');
const path          = require('path');
const axios         = require('axios');
const VideoInterview = require('../models/VideoInterview');
const Application   = require('../models/Application');
const Notification  = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');
const { s3, BUCKET_NAME, getS3SignedUrl } = require('../lib/s3');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// ── S3 video upload ───────────────────────────────────────────────────────────
const videoUpload = multer({
    storage: multerS3({
        s3, bucket: BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const name = `videos/${req.user._id}-${Date.now()}${path.extname(file.originalname)}`;
            cb(null, name);
        },
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) cb(null, true);
        else cb(new Error('Only video files are allowed.'), false);
    },
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ── Company: Create video interview assignment ─────────────────────────────────
// POST /api/video-interviews
// body: { applicationId, questions: string[], deadline? }
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const { applicationId, questions, deadline } = req.body;
        if (!applicationId || !questions?.length)
            return res.status(400).json({ error: 'applicationId and questions[] are required.' });
        if (questions.length > 5)
            return res.status(400).json({ error: 'Maximum 5 questions allowed.' });

        const app = await Application.findById(applicationId)
            .populate('candidateId', 'name email')
            .populate({ path: 'jobId', select: 'title companyId' });
        if (!app) return res.status(404).json({ error: 'Application not found.' });
        if (app.jobId.companyId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });

        // Upsert
        let vi = await VideoInterview.findOne({ applicationId });
        if (vi) {
            vi.questions = questions;
            vi.deadline  = deadline ? new Date(deadline) : vi.deadline;
            vi.status    = 'pending';
            vi.responses = [];
            await vi.save();
        } else {
            vi = await VideoInterview.create({
                applicationId, jobId: app.jobId._id,
                candidateId: app.candidateId._id,
                companyId: req.user._id,
                questions,
                deadline: deadline ? new Date(deadline) : null,
            });
        }

        await Notification.create({
            userId:  app.candidateId._id,
            type:    'status_interview',
            title:   '🎥 Video Interview Assigned',
            message: `You have a new async video interview for "${app.jobId.title}". Record your responses in HireMind.`,
        });

        res.status(201).json(vi);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Candidate: Submit a video response ────────────────────────────────────────
// POST /api/video-interviews/:id/respond
// multipart: video file + { questionIndex, transcript }
router.post('/:id/respond', requireAuth, requireRole('candidate'), videoUpload.single('video'), async (req, res) => {
    try {
        const vi = await VideoInterview.findById(req.params.id)
            .populate({ path: 'jobId', select: 'title description' });
        if (!vi) return res.status(404).json({ error: 'Video interview not found.' });
        if (vi.candidateId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });

        const { questionIndex, transcript } = req.body;
        const qIdx = parseInt(questionIndex, 10);
        if (isNaN(qIdx) || qIdx < 0 || qIdx >= vi.questions.length)
            return res.status(400).json({ error: 'Invalid questionIndex.' });

        const videoS3Key = req.file?.key || null;
        const question   = vi.questions[qIdx];

        // AI score the transcript
        let aiResult = { score: null, contentScore: null, commScore: null, feedback: null, strengths: [], improvements: [] };
        if (transcript?.trim()) {
            try {
                const { data } = await axios.post(`${AI_URL}/score_video_response`, {
                    transcript, question,
                    job_title:       vi.jobId?.title || '',
                    job_description: vi.jobId?.description || '',
                });
                aiResult = { score: data.score, contentScore: data.content_score, commScore: data.communication_score, feedback: data.feedback, strengths: data.strengths || [], improvements: data.improvements || [] };
            } catch (e) { console.error('[video score]', e.message); }
        }

        // Upsert response for this question index
        const existing = vi.responses.findIndex(r => r.questionIndex === qIdx);
        const responseData = {
            questionIndex: qIdx, question, videoS3Key, transcript: transcript || '',
            aiScore: aiResult.score, contentScore: aiResult.contentScore, commScore: aiResult.commScore,
            feedback: aiResult.feedback, strengths: aiResult.strengths, improvements: aiResult.improvements,
            submittedAt: new Date(),
        };
        if (existing >= 0) vi.responses[existing] = responseData;
        else vi.responses.push(responseData);

        // Mark submitted if all questions answered
        if (vi.responses.length >= vi.questions.length) {
            vi.status = 'submitted';
            const scores = vi.responses.filter(r => r.aiScore != null).map(r => r.aiScore);
            if (scores.length) vi.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

            await Notification.create({
                userId:  vi.companyId,
                type:    'application_received',
                title:   '🎥 Video Interview Submitted',
                message: `A candidate submitted all video responses for "${vi.jobId?.title || 'a job'}". Review them now.`,
            });
        } else {
            vi.status = 'in_progress';
        }

        await vi.save();

        // Return signed video URL if available
        let videoUrl = null;
        if (videoS3Key) videoUrl = await getS3SignedUrl(videoS3Key, 3600).catch(() => null);

        res.json({ ...vi.toObject(), videoUrl, aiResult });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Get video interview by applicationId ──────────────────────────────────────
// GET /api/video-interviews/application/:applicationId
router.get('/application/:applicationId', requireAuth, async (req, res) => {
    try {
        const vi = await VideoInterview.findOne({ applicationId: req.params.applicationId });
        if (!vi) return res.status(404).json({ error: 'No video interview found.' });
        // Sign video URLs for each response
        const responses = await Promise.all(vi.responses.map(async (r) => {
            const obj = r.toObject ? r.toObject() : { ...r };
            if (obj.videoS3Key) obj.videoUrl = await getS3SignedUrl(obj.videoS3Key, 3600).catch(() => null);
            return obj;
        }));
        res.json({ ...vi.toObject(), responses });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Company: list all video interviews ───────────────────────────────────────
// GET /api/video-interviews/company/all
router.get('/company/all', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const list = await VideoInterview.find({ companyId: req.user._id })
            .populate('candidateId', 'name email')
            .populate('jobId', 'title')
            .sort({ updatedAt: -1 });
        res.json(list);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;