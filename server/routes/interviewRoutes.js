const express    = require('express');
const router     = express.Router();
const Interview  = require('../models/Interview');
const Application= require('../models/Application');
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');

// ── Helper: send interview email ──────────────────────────────────────────────
async function sendInterviewEmail({ toEmail, toName, subject, html }) {
    const https = require('https');
    const body  = JSON.stringify({
        sender: { name: 'HireMind AI', email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email: toEmail, name: toName || toEmail }],
        subject,
        htmlContent: html,
    });
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.brevo.com', path: '/v3/smtp/email', method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY, 'Content-Length': Buffer.byteLength(body) },
        }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => res.statusCode < 300 ? resolve(d) : reject(new Error(d))); });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function fmtDate(d) {
    return new Date(d).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
}

// ── Company: Create/Update interview slots ─────────────────────────────────────
// POST /api/interviews   body: { applicationId, proposedSlots, meetLink, interviewType, notes }
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const { applicationId, proposedSlots, meetLink, interviewType, notes } = req.body;
        if (!applicationId || !proposedSlots?.length)
            return res.status(400).json({ error: 'applicationId and at least one proposedSlot are required.' });

        const app = await Application.findById(applicationId)
            .populate('candidateId', 'name email')
            .populate({ path: 'jobId', select: 'title companyId', populate: { path: 'companyId', select: 'companyName name' } });
        if (!app) return res.status(404).json({ error: 'Application not found.' });
        if (app.jobId.companyId._id.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });

        let interview = await Interview.findOne({ applicationId });
        if (interview) {
            interview.proposedSlots  = proposedSlots;
            interview.meetLink       = meetLink || interview.meetLink;
            interview.interviewType  = interviewType || interview.interviewType;
            interview.notes          = notes || interview.notes;
            interview.status         = 'pending_confirmation';
            interview.confirmedSlot  = undefined;
            await interview.save();
        } else {
            interview = await Interview.create({
                applicationId,
                jobId:       app.jobId._id,
                candidateId: app.candidateId._id,
                companyId:   req.user._id,
                proposedSlots, meetLink, interviewType: interviewType || 'video', notes,
            });
        }

        // Notify candidate in-app
        await Notification.create({
            userId:  app.candidateId._id,
            type:    'status_interview',
            title:   '📅 Interview Slots Received',
            message: `${app.jobId.companyId.companyName || app.jobId.companyId.name} has proposed interview slots for "${app.jobId.title}". Please confirm a slot.`,
        });

        // Email candidate
        const slotList = proposedSlots.map((s, i) => `<li style="margin:6px 0;color:#a5b4fc">Option ${i+1}: <strong>${fmtDate(s.date)}</strong> (${s.duration || 45} min)</li>`).join('');
        sendInterviewEmail({
            toEmail: app.candidateId.email, toName: app.candidateId.name,
            subject: `📅 Interview Slots for ${app.jobId.title}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#d97706,#b45309);padding:36px 32px;text-align:center">
                    <h1 style="margin:0;color:#fff;font-size:26px">📅 Interview Invitation</h1>
                </div>
                <div style="padding:32px">
                    <p>Hi <strong style="color:#a5b4fc">${app.candidateId.name}</strong>,</p>
                    <p style="color:#94a3b8">${app.jobId.companyId.companyName || app.jobId.companyId.name} has invited you to interview for <strong style="color:#fff">${app.jobId.title}</strong>.</p>
                    <p style="color:#94a3b8">Please log in to HireMind to confirm one of the following slots:</p>
                    <ul style="background:#1e293b;border-radius:12px;padding:16px 24px">${slotList}</ul>
                    ${notes ? `<p style="color:#94a3b8;font-style:italic">Note from recruiter: ${notes}</p>` : ''}
                    <p style="color:#64748b;font-size:12px;margin-top:24px">Log in to HireMind AI to confirm your preferred slot.</p>
                </div>
            </div>`,
        }).catch(e => console.error('Interview email error:', e.message));

        res.status(201).json(interview);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Candidate: Confirm a slot ─────────────────────────────────────────────────
// PATCH /api/interviews/:id/confirm   body: { slotIndex }
router.patch('/:id/confirm', requireAuth, requireRole('candidate'), async (req, res) => {
    try {
        const { slotIndex } = req.body;
        const interview = await Interview.findById(req.params.id)
            .populate('candidateId', 'name email')
            .populate('companyId', 'name email companyName')
            .populate({ path: 'jobId', select: 'title' });
        if (!interview) return res.status(404).json({ error: 'Interview not found.' });
        if (interview.candidateId._id.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });

        const slot = interview.proposedSlots[slotIndex];
        if (!slot) return res.status(400).json({ error: 'Invalid slot index.' });

        interview.confirmedSlot = { date: slot.date, duration: slot.duration };
        interview.status = 'confirmed';
        await interview.save();

        // Notify company
        await Notification.create({
            userId:  interview.companyId._id,
            type:    'status_interview',
            title:   '✅ Interview Confirmed',
            message: `${interview.candidateId.name} confirmed an interview slot for "${interview.jobId.title}" on ${fmtDate(slot.date)}.`,
        });

        // Email company
        sendInterviewEmail({
            toEmail: interview.companyId.email,
            toName:  interview.companyId.companyName || interview.companyId.name,
            subject: `✅ Interview confirmed by ${interview.candidateId.name}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
                <div style="background:linear-gradient(135deg,#059669,#047857);padding:36px;text-align:center">
                    <h1 style="margin:0;color:#fff">✅ Interview Confirmed</h1>
                </div>
                <div style="padding:32px">
                    <p><strong style="color:#a5b4fc">${interview.candidateId.name}</strong> has confirmed the interview for <strong style="color:#fff">${interview.jobId.title}</strong>.</p>
                    <div style="background:#1e293b;border-radius:12px;padding:20px;margin:16px 0">
                        <p style="margin:0;color:#34d399;font-weight:bold">📅 ${fmtDate(slot.date)} (${slot.duration || 45} min)</p>
                        ${interview.meetLink ? `<p style="margin:8px 0 0;color:#94a3b8">Meet link: <a href="${interview.meetLink}" style="color:#a5b4fc">${interview.meetLink}</a></p>` : ''}
                    </div>
                </div>
            </div>`,
        }).catch(e => console.error('Confirm email error:', e.message));

        res.json(interview);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Candidate: Request reschedule ─────────────────────────────────────────────
// PATCH /api/interviews/:id/reschedule   body: { rescheduleNote }
router.patch('/:id/reschedule', requireAuth, requireRole('candidate'), async (req, res) => {
    try {
        const { rescheduleNote } = req.body;
        const interview = await Interview.findById(req.params.id)
            .populate('candidateId', 'name')
            .populate('companyId', 'name email companyName')
            .populate({ path: 'jobId', select: 'title' });
        if (!interview) return res.status(404).json({ error: 'Interview not found.' });
        if (interview.candidateId._id.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });

        interview.status = 'rescheduled';
        interview.rescheduleNote = rescheduleNote || 'Candidate requested reschedule.';
        interview.confirmedSlot = undefined;
        await interview.save();

        await Notification.create({
            userId:  interview.companyId._id,
            type:    'status_interview',
            title:   '🔄 Reschedule Requested',
            message: `${interview.candidateId.name} requested a reschedule for "${interview.jobId.title}". Reason: ${rescheduleNote || 'Not specified'}`,
        });

        res.json(interview);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Get interview by applicationId ────────────────────────────────────────────
// GET /api/interviews/application/:applicationId
router.get('/application/:applicationId', requireAuth, async (req, res) => {
    try {
        const interview = await Interview.findOne({ applicationId: req.params.applicationId });
        if (!interview) return res.status(404).json({ error: 'No interview scheduled.' });
        res.json(interview);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Company: get all interviews for their jobs ─────────────────────────────────
// GET /api/interviews/company/all
router.get('/company/all', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const interviews = await Interview.find({ companyId: req.user._id })
            .populate('candidateId', 'name email')
            .populate('jobId', 'title')
            .sort({ createdAt: -1 });
        res.json(interviews);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Candidate: get all their interviews ───────────────────────────────────────
// GET /api/interviews/candidate/all
router.get('/candidate/all', requireAuth, requireRole('candidate'), async (req, res) => {
    try {
        const interviews = await Interview.find({ candidateId: req.user._id })
            .populate('companyId', 'name companyName')
            .populate('jobId', 'title')
            .sort({ createdAt: -1 });
        res.json(interviews);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;