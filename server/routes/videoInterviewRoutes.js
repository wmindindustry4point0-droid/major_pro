const express        = require('express');
const router         = express.Router();
const multer         = require('multer');
const multerS3       = require('multer-s3');
const path           = require('path');
const axios          = require('axios');
const https          = require('https');
const VideoInterview = require('../models/VideoInterview');
const Application    = require('../models/Application');
const Notification   = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');
const { s3, BUCKET_NAME, getS3SignedUrl } = require('../lib/s3');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

function sendVideoEmail({ toEmail, toName, subject, html }) {
    const body = JSON.stringify({
        sender: { name: 'HireMind AI', email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email: toEmail, name: toName || toEmail }],
        subject, htmlContent: html,
    });
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.brevo.com', path: '/v3/smtp/email', method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY, 'Content-Length': Buffer.byteLength(body) },
        }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => res.statusCode < 300 ? resolve(d) : reject(new Error(d))); });
        req.on('error', reject); req.write(body); req.end();
    });
}

const videoUpload = multer({
    storage: multerS3({
        s3, bucket: BUCKET_NAME, contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => cb(null, `videos/${req.user._id}-${Date.now()}${path.extname(file.originalname)}`),
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) cb(null, true);
        else cb(new Error('Only video/audio files are allowed.'), false);
    },
    limits: { fileSize: 200 * 1024 * 1024 },
});

// POST /api/video-interviews — company assigns questions
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const { applicationId, questions, deadline } = req.body;
        if (!applicationId || !questions?.length) return res.status(400).json({ error: 'applicationId and questions[] are required.' });
        if (questions.length > 5) return res.status(400).json({ error: 'Maximum 5 questions allowed.' });

        const app = await Application.findById(applicationId)
            .populate('candidateId', 'name email')
            .populate({ path: 'jobId', select: 'title companyId' });
        if (!app) return res.status(404).json({ error: 'Application not found.' });
        if (app.jobId.companyId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied.' });

        let vi = await VideoInterview.findOne({ applicationId });
        if (vi) { vi.questions = questions; vi.deadline = deadline ? new Date(deadline) : vi.deadline; vi.status = 'pending'; vi.responses = []; await vi.save(); }
        else vi = await VideoInterview.create({ applicationId, jobId: app.jobId._id, candidateId: app.candidateId._id, companyId: req.user._id, questions, deadline: deadline ? new Date(deadline) : null });

        await Notification.create({ userId: app.candidateId._id, type: 'status_interview', title: '🎥 Video Interview Assigned', message: `You have a new async video interview for "${app.jobId.title}". Record your responses in HireMind.` });

        const qList = questions.map((q, i) => `<li style="margin:6px 0;color:#e2e8f0">${i+1}. ${q}</li>`).join('');
        sendVideoEmail({
            toEmail: app.candidateId.email, toName: app.candidateId.name,
            subject: `🎥 Video Interview Assigned — ${app.jobId.title}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#d97706,#b45309);padding:36px 32px;text-align:center"><h1 style="margin:0;color:#fff;font-size:24px">🎥 Video Interview Assigned</h1></div><div style="padding:32px"><p>Hi <strong style="color:#a5b4fc">${app.candidateId.name}</strong>,</p><p style="color:#94a3b8">Please record your responses for <strong style="color:#fff">${app.jobId.title}</strong>:</p><ul style="background:#1e293b;border-radius:12px;padding:16px 24px">${qList}</ul>${deadline ? `<p style="color:#f59e0b;font-size:13px">⏰ Deadline: ${new Date(deadline).toLocaleDateString()}</p>` : ''}<p style="color:#64748b;font-size:12px;margin-top:24px">Log in to HireMind AI to record your responses.</p></div></div>`,
        }).catch(e => console.error('[assign email]', e.message));

        res.status(201).json(vi);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/video-interviews/:id/respond — candidate submits video
router.post('/:id/respond', requireAuth, requireRole('candidate'), videoUpload.single('video'), async (req, res) => {
    try {
        const vi = await VideoInterview.findById(req.params.id)
            .populate({ path: 'jobId', select: 'title description' })
            .populate('companyId', 'name email companyName')
            .populate('candidateId', 'name email');
        if (!vi) return res.status(404).json({ error: 'Video interview not found.' });
        if (vi.candidateId._id.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied.' });

        const { questionIndex, transcript } = req.body;
        const qIdx = parseInt(questionIndex, 10);
        if (isNaN(qIdx) || qIdx < 0 || qIdx >= vi.questions.length) return res.status(400).json({ error: 'Invalid questionIndex.' });

        const videoS3Key = req.file?.key || null;
        const question   = vi.questions[qIdx];

        let audioUrl = null;
        if (videoS3Key) audioUrl = await getS3SignedUrl(videoS3Key, 7200).catch(() => null);

        let aiResult = { score: null, contentScore: null, commScore: null, feedback: null, strengths: [], improvements: [], transcript: transcript || '', speechMetrics: {} };
        try {
            const { data } = await axios.post(`${AI_URL}/score_video_response`, {
                audio_url: audioUrl || '', transcript: transcript || '',
                question, job_title: vi.jobId?.title || '', job_description: vi.jobId?.description || '',
            }, { timeout: 180000 });
            aiResult = { score: data.score, contentScore: data.content_score, commScore: data.communication_score, feedback: data.feedback, strengths: data.strengths || [], improvements: data.improvements || [], transcript: data.transcript || transcript || '', speechMetrics: data.speech_metrics || {} };
        } catch (e) { console.error('[video score]', e.message); }

        const existing = vi.responses.findIndex(r => r.questionIndex === qIdx);
        const responseData = { questionIndex: qIdx, question, videoS3Key, transcript: aiResult.transcript, aiScore: aiResult.score, contentScore: aiResult.contentScore, commScore: aiResult.commScore, feedback: aiResult.feedback, strengths: aiResult.strengths, improvements: aiResult.improvements, speechMetrics: aiResult.speechMetrics, submittedAt: new Date() };
        if (existing >= 0) vi.responses[existing] = responseData;
        else vi.responses.push(responseData);

        if (vi.responses.length >= vi.questions.length) {
            vi.status = 'submitted';
            const scores = vi.responses.filter(r => r.aiScore != null).map(r => r.aiScore);
            if (scores.length) vi.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

            await Notification.create({ userId: vi.companyId._id, type: 'application_received', title: '🎥 Video Interview Submitted', message: `${vi.candidateId.name} submitted all video responses for "${vi.jobId?.title}". Overall AI Score: ${vi.overallScore ?? 'N/A'}%. Review now in HireMind.` });

            const resultsRows = vi.responses.map((r, i) => `<tr style="border-top:1px solid #1e293b"><td style="padding:12px;color:#94a3b8;font-size:13px">Q${i+1}: ${r.question?.substring(0,60)}...</td><td style="padding:12px;text-align:center;font-weight:bold;color:${(r.aiScore||0)>=70?'#4ade80':(r.aiScore||0)>=50?'#fbbf24':'#f87171'}">${r.aiScore ?? '—'}%</td><td style="padding:12px;text-align:center;color:#94a3b8">${r.contentScore ?? '—'}%</td><td style="padding:12px;text-align:center;color:#94a3b8">${r.commScore ?? '—'}%</td></tr>`).join('');
            sendVideoEmail({
                toEmail: vi.companyId.email, toName: vi.companyId.companyName || vi.companyId.name,
                subject: `🎥 Video Results — ${vi.candidateId.name} for ${vi.jobId?.title}`,
                html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 32px;text-align:center"><h1 style="margin:0;color:#fff;font-size:24px">🎥 Video Interview Results</h1><p style="margin:8px 0 0;color:#c7d2fe">${vi.candidateId.name} — ${vi.jobId?.title}</p></div><div style="padding:32px"><div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center"><p style="margin:0;color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:2px">Overall AI Score</p><p style="margin:8px 0 0;font-size:48px;font-weight:bold;color:${(vi.overallScore||0)>=70?'#4ade80':(vi.overallScore||0)>=50?'#fbbf24':'#f87171'}">${vi.overallScore ?? '—'}%</p></div><table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden"><tr style="background:#0f172a"><th style="padding:12px;text-align:left;color:#64748b;font-size:12px">Question</th><th style="padding:12px;text-align:center;color:#64748b;font-size:12px">Overall</th><th style="padding:12px;text-align:center;color:#64748b;font-size:12px">Content</th><th style="padding:12px;text-align:center;color:#64748b;font-size:12px">Comm</th></tr>${resultsRows}</table><p style="color:#64748b;font-size:12px;margin-top:24px">Log in to HireMind AI to watch the video responses.</p></div></div>`,
            }).catch(e => console.error('[submit email]', e.message));
        } else { vi.status = 'in_progress'; }

        await vi.save();
        let videoUrl = null;
        if (videoS3Key) videoUrl = await getS3SignedUrl(videoS3Key, 3600).catch(() => null);
        res.json({ ...vi.toObject(), videoUrl, aiResult });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/video-interviews/application/:applicationId
// FIX #7: Added ownership check — only the owning candidate or company may access this
router.get('/application/:applicationId', requireAuth, async (req, res) => {
    try {
        const vi = await VideoInterview.findOne({ applicationId: req.params.applicationId });
        if (!vi) return res.status(404).json({ error: 'No video interview found.' });

        const userId = req.user._id.toString();
        const isCandidate = req.user.role === 'candidate' && vi.candidateId.toString() === userId;
        const isCompany   = req.user.role === 'company'   && vi.companyId.toString()   === userId;

        if (!isCandidate && !isCompany)
            return res.status(403).json({ error: 'Access denied.' });

        const responses = await Promise.all(vi.responses.map(async (r) => {
            const obj = r.toObject ? r.toObject() : { ...r };
            if (obj.videoS3Key) obj.videoUrl = await getS3SignedUrl(obj.videoS3Key, 3600).catch(() => null);
            return obj;
        }));
        res.json({ ...vi.toObject(), responses });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/video-interviews/company/all — company lists all their video interviews
router.get('/company/all', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const list = await VideoInterview.find({ companyId: req.user._id })
            .populate('candidateId', 'name email')
            .populate('jobId', 'title')
            .sort({ updatedAt: -1 });
        res.json(list);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/video-interviews/:id — company fetches full results for one interview
router.get('/:id', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const vi = await VideoInterview.findById(req.params.id)
            .populate('candidateId', 'name email')
            .populate('jobId', 'title');
        if (!vi) return res.status(404).json({ error: 'Not found.' });
        if (vi.companyId.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Access denied.' });
        const responses = await Promise.all(vi.responses.map(async (r) => {
            const obj = r.toObject ? r.toObject() : { ...r };
            if (obj.videoS3Key) obj.videoUrl = await getS3SignedUrl(obj.videoS3Key, 7200).catch(() => null);
            return obj;
        }));
        if (vi.status === 'submitted') { vi.status = 'reviewed'; await vi.save(); }
        res.json({ ...vi.toObject(), responses });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;