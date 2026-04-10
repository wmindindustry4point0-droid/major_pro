const express     = require('express');
const router      = express.Router();
const multer      = require('multer');
const multerS3    = require('multer-s3');
const path        = require('path');
const axios       = require('axios');
const Application  = require('../models/Application');
const StageHistory = require('../models/StageHistory');
const Job          = require('../models/Job');
const CandidateProfile = require('../models/CandidateProfile');
const Notification = require('../models/Notification');
const { sendStatusEmail } = require('../mailer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { s3, BUCKET_NAME, getS3SignedUrl } = require('../lib/s3');
const preFilter   = require('../lib/preFilter');

const VALID_TRANSITIONS = {
    applied:     ['screened', 'rejected'],
    screened:    ['shortlisted', 'rejected'],
    shortlisted: ['interview', 'rejected'],
    interview:   ['selected', 'rejected'],
    selected:    [],
    rejected:    []
};

const STAGE_TIMESTAMP = {
    screened:    'screenedAt',
    shortlisted: 'shortlistedAt',
    interview:   'interviewAt',
    selected:    'selectedAt',
    rejected:    'rejectedAt'
};

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

// ── Apply for a Job ──────────────────────────────────────────────────────────
router.post('/apply', requireAuth, requireRole('candidate'), upload.single('resume'), async (req, res) => {
    try {
        const candidateId = req.user._id;
        const { jobId, coverLetter } = req.body;

        if (!req.file) return res.status(400).json({ error: 'Resume file is required' });
        if (!jobId)    return res.status(400).json({ error: 'Job ID is required' });

        const existingApp = await Application.findOne({ candidateId, jobId });
        if (existingApp) return res.status(409).json({ error: 'You have already applied to this job' });

        const job = await Job.findById(jobId).populate('companyId', 'name companyName');
        if (!job) return res.status(404).json({ error: 'Job not found' });

        const s3Key = req.file.key;

        const application = new Application({
            candidateId, jobId,
            resumePath: s3Key,
            coverLetter,
            status: 'applied',
            appliedAt: new Date()
        });
        await application.save();

        await StageHistory.create({
            applicationId: application._id,
            fromStatus: 'none',
            toStatus: 'applied',
            changedBy: candidateId,
            note: 'Application submitted'
        });

        Notification.create({
            userId:  job.companyId._id,
            type:    'application_received',
            title:   'New Application Received',
            message: `${req.user.name} applied for "${job.title}".`
        }).catch(e => console.error('Notification error:', e.message));

        // AI analysis runs in background — response returns immediately
        setImmediate(() => runAIAnalysis(application._id, s3Key, job, candidateId));

        res.status(201).json({ message: 'Applied successfully! AI analysis running in background.', application });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'You have already applied to this job' });
        res.status(400).json({ error: err.message });
    }
});

async function runAIAnalysis(applicationId, s3Key, job, candidateId) {
    try {
        const application = await Application.findById(applicationId);
        if (!application) return;

        const profile = await CandidateProfile.findOne({ userId: candidateId });

        const signedUrl = await getS3SignedUrl(s3Key, 900);

        const existingEmbedding = (profile && profile.embeddingVector && profile.embeddingVector.length > 0)
            ? profile.embeddingVector : null;

        let aiData;
        try {
            const aiResponse = await axios.post(
                `${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'}/analyze`,
                {
                    resume_path:         signedUrl,
                    job_description:     job.description,
                    must_have_skills:    job.mustHaveSkills   && job.mustHaveSkills.length > 0 ? job.mustHaveSkills : job.requiredSkills || [],
                    nice_to_have_skills: job.niceToHaveSkills || [],
                    required_skills:     job.requiredSkills   || [],
                    min_experience:      job.minExperience    || 0,
                    max_experience:      job.maxExperience    || 99,
                    jd_embedding:        (job.jdEmbeddingVector && job.jdEmbeddingVector.length > 0) ? job.jdEmbeddingVector : null,
                    resume_embedding:    existingEmbedding
                },
                { timeout: 90000 }
            );
            aiData = aiResponse.data;
        } catch (aiErr) {
            console.error('AI service error during analysis:', aiErr.message);
            await Application.findByIdAndUpdate(applicationId, {
                aiFeedback: `AI analysis failed: ${aiErr.message}. Please contact support or re-apply.`
            }).catch(console.error);
            return;
        }

        const freshSkills = (aiData.parsedData?.skills || aiData.skills || []);
        const freshExp    = aiData.parsedData?.totalExperienceYears ?? (profile?.totalExperienceYears || 0);

        if (job.mustHaveSkills && job.mustHaveSkills.length > 0) {
            const freshProfileForFilter = {
                extractedSkills:      freshSkills,
                totalExperienceYears: freshExp
            };
            const filterResult = preFilter(freshProfileForFilter, job);
            if (!filterResult.pass) {
                application.status       = 'rejected';
                application.rejectedAt   = new Date();
                application.finalScore   = 0;
                application.matchScore   = 0;
                application.weaknesses   = [filterResult.reason];
                application.aiFeedback   = `Pre-screened: ${filterResult.reason}`;
                await application.save();

                // Bug #15 fix: changedBy should be null/system marker, not candidateId
                await StageHistory.create({
                    applicationId,
                    fromStatus: 'applied',
                    toStatus: 'rejected',
                    changedBy: null, // system-initiated rejection, not the candidate
                    note: `Auto-rejected by system: ${filterResult.reason}`
                });

                Notification.create({
                    userId: candidateId,
                    type: 'status_rejected',
                    title: 'Application Update',
                    message: `Your application for "${job.title}" did not meet the minimum requirements: ${filterResult.reason}`
                }).catch(console.error);
                return;
            }
        }

        application.status         = 'screened';
        application.screenedAt     = new Date();
        application.finalScore     = aiData.finalScore ?? aiData.matchPercentage ?? null;
        application.matchScore     = application.finalScore;
        application.scoreBreakdown = aiData.scoreBreakdown || null;
        application.skillsMatched  = aiData.skillsMatched  || [];
        application.skillsMissing  = aiData.skillsMissing  || [];
        application.strengths      = aiData.strengths       || [];
        application.weaknesses     = aiData.weaknesses      || [];
        application.aiFeedback     = aiData.feedback        || '';
        await application.save();

        if (aiData.jdEmbedding && (!job.jdEmbeddingVector || job.jdEmbeddingVector.length === 0)) {
            Job.findByIdAndUpdate(job._id, { jdEmbeddingVector: aiData.jdEmbedding }).catch(console.error);
        }
        if (profile && aiData.resumeEmbedding && profile.embeddingVector.length === 0) {
            CandidateProfile.findOneAndUpdate(
                { userId: candidateId },
                { embeddingVector: aiData.resumeEmbedding, embeddingHash: aiData.resumeEmbeddingHash }
            ).catch(console.error);
        }

        if (profile && freshSkills.length > 0) {
            CandidateProfile.findOneAndUpdate(
                { userId: candidateId },
                { extractedSkills: freshSkills, totalExperienceYears: freshExp }
            ).catch(console.error);
        }

        // Bug #15 fix: changedBy is system (null), not the candidate
        await StageHistory.create({
            applicationId,
            fromStatus: 'applied',
            toStatus: 'screened',
            changedBy: null, // system AI screened, not the candidate
            note: `AI scored: ${application.finalScore?.toFixed(1)}%`
        });

        Notification.create({
            userId: candidateId,
            type: 'status_analyzed',
            title: 'Resume Screened',
            message: `Your resume for "${job.title}" has been screened. Score: ${application.finalScore?.toFixed(0)}%`
        }).catch(console.error);

    } catch (err) {
        console.error('Background AI analysis error:', err.message);
        Application.findByIdAndUpdate(applicationId, {
            aiFeedback: `Analysis error: ${err.message}`
        }).catch(console.error);
    }
}

// ── Get Applications for a Job (Bug #7 fix — ownership check) ────────────────
router.get('/job/:jobId', requireAuth, requireRole('company'), async (req, res) => {
    try {
        // Verify the job belongs to the requesting recruiter
        const job = await Job.findById(req.params.jobId);
        if (!job) return res.status(404).json({ error: 'Job not found.' });
        if (job.companyId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied. This job does not belong to your account.' });

        const { minScore, status, mustSkills, minExp, sort } = req.query;

        const query = { jobId: req.params.jobId };
        if (minScore)   query.finalScore = { $gte: Number(minScore) };
        if (status)     query.status = status;
        if (mustSkills) {
            const skills = mustSkills.split(',').map(s => s.trim()).filter(Boolean);
            if (skills.length) query.skillsMatched = { $all: skills };
        }

        const sortOrder = sort === 'finalScore' ? { finalScore: -1 } : { appliedAt: -1 };

        let applications = await Application.find(query)
            .populate('candidateId', 'name email')
            .sort(sortOrder);

        if (minExp) {
            const minExpNum = Number(minExp);
            const ids = applications.map(a => a.candidateId?._id).filter(Boolean);
            const profiles = await CandidateProfile.find(
                { userId: { $in: ids } }, { userId: 1, totalExperienceYears: 1 }
            );
            const expMap = {};
            profiles.forEach(p => { expMap[p.userId.toString()] = p.totalExperienceYears || 0; });
            applications = applications.filter(a =>
                (expMap[a.candidateId?._id?.toString()] || 0) >= minExpNum
            );
        }

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

// ── Get score breakdown + history (Bug #8 fix — ownership check) ──────────────
router.get('/:id/breakdown', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const application = await Application.findById(req.params.id)
            .populate('candidateId', 'name email')
            .populate('jobId', 'title mustHaveSkills niceToHaveSkills companyId');
        if (!application) return res.status(404).json({ error: 'Application not found' });

        // Verify the job belongs to the requesting recruiter
        if (application.jobId.companyId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied. This application does not belong to your account.' });

        const history = await StageHistory.find({ applicationId: req.params.id }).sort({ changedAt: 1 });
        const profile  = await CandidateProfile.findOne(
            { userId: application.candidateId._id },
            { experience: 1, education: 1, projects: 1, totalExperienceYears: 1 }
        );
        res.json({ application: application.toObject(), stageHistory: history, candidateProfile: profile });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Get Applications for a Candidate ────────────────────────────────────────
router.get('/candidate/:candidateId', requireAuth, requireRole('candidate'), async (req, res) => {
    if (req.user._id.toString() !== req.params.candidateId)
        return res.status(403).json({ error: 'Access denied.' });
    try {
        const applications = await Application.find({ candidateId: req.params.candidateId })
            .populate({
                path: 'jobId',
                select: 'title companyId requiredSkills mustHaveSkills location',
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

// ── Re-Analyze (Bug #14 fix — always use the application's own resume) ────────
router.post('/analyze/:applicationId', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const application = await Application.findById(req.params.applicationId).populate('jobId');
        if (!application) return res.status(404).json({ error: 'Application not found' });

        // Bug #8 fix: ownership check on re-analyze too
        const job = application.jobId;
        if (job.companyId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });

        const profile = await CandidateProfile.findOne({ userId: application.candidateId });
        const existingEmbedding = (profile && profile.embeddingVector && profile.embeddingVector.length > 0) ? profile.embeddingVector : null;

        // Bug #14 fix: Always use the resume the candidate submitted WITH this application,
        // not their latest profile resume. Re-analysis should reflect the original submission.
        const resumeKey = application.resumePath;
        if (!resumeKey) return res.status(400).json({ error: 'No resume found for this application.' });
        const signedUrl = await getS3SignedUrl(resumeKey, 900);

        const response = await axios.post(
            `${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'}/analyze`,
            {
                resume_path:         signedUrl,
                job_description:     job.description,
                must_have_skills:    job.mustHaveSkills && job.mustHaveSkills.length > 0 ? job.mustHaveSkills : job.requiredSkills || [],
                nice_to_have_skills: job.niceToHaveSkills || [],
                required_skills:     job.requiredSkills   || [],
                min_experience:      job.minExperience    || 0,
                max_experience:      job.maxExperience    || 99,
                jd_embedding:        (job.jdEmbeddingVector && job.jdEmbeddingVector.length > 0) ? job.jdEmbeddingVector : null,
                resume_embedding:    existingEmbedding
            },
            { timeout: 90000 }
        );

        const aiData = response.data;
        application.finalScore     = aiData.finalScore     ?? aiData.matchPercentage ?? null;
        application.matchScore     = application.finalScore;
        application.scoreBreakdown = aiData.scoreBreakdown || null;
        application.skillsMatched  = aiData.skillsMatched  || [];
        application.skillsMissing  = aiData.skillsMissing  || [];
        application.strengths      = aiData.strengths      || [];
        application.weaknesses     = aiData.weaknesses     || [];
        application.aiFeedback     = aiData.feedback       || '';

        if (application.status === 'applied') {
            application.status = 'screened';
            application.screenedAt = new Date();
        }
        await application.save();

        if (aiData.jdEmbedding && (!job.jdEmbeddingVector || job.jdEmbeddingVector.length === 0)) {
            Job.findByIdAndUpdate(job._id, { jdEmbeddingVector: aiData.jdEmbedding }).catch(console.error);
        }
        if (profile && aiData.resumeEmbedding && profile.embeddingVector.length === 0) {
            CandidateProfile.findOneAndUpdate(
                { userId: application.candidateId },
                { embeddingVector: aiData.resumeEmbedding, embeddingHash: aiData.resumeEmbeddingHash }
            ).catch(console.error);
        }

        Notification.create({
            userId: application.candidateId,
            type: 'status_analyzed',
            title: 'Resume Re-analyzed',
            message: `Your resume for "${job.title}" was re-analyzed. Score: ${application.finalScore?.toFixed(0)}%`
        }).catch(console.error);

        res.json(application);
    } catch (err) {
        console.error('Manual AI error:', err.message);
        res.status(500).json({ error: 'AI Analysis failed. Ensure the AI service is running.' });
    }
});

// ── Update Status (Bug #6 fix — ownership check on notes too) ────────────────
router.patch('/:id/status', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const { status, note, rejectionReason } = req.body;

        const application = await Application.findById(req.params.id)
            .populate('candidateId', 'name email')
            .populate({
                path: 'jobId',
                select: 'title companyId',
                populate: { path: 'companyId', select: 'name companyName' }
            });

        if (!application) return res.status(404).json({ error: 'Application not found.' });

        // Ownership check
        if (application.jobId.companyId._id.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied.' });

        const currentStatus = application.status;
        const allowed = VALID_TRANSITIONS[currentStatus] || [];
        if (!allowed.includes(status)) {
            return res.status(400).json({
                error: `Invalid transition: ${currentStatus} → ${status}. Allowed: ${allowed.join(', ') || 'none (terminal stage)'}`
            });
        }

        application.status = status;
        const tsField = STAGE_TIMESTAMP[status];
        if (tsField) application[tsField] = new Date();
        if (rejectionReason) application.rejectionReason = rejectionReason;
        await application.save();

        await StageHistory.create({
            applicationId: application._id,
            fromStatus: currentStatus,
            toStatus: status,
            changedBy: req.user._id,
            note: note || rejectionReason || undefined
        });

        const companyName = application.jobId.companyId?.companyName || application.jobId.companyId?.name || 'The company';
        const jobTitle    = application.jobId.title;

        const notifMap = {
            shortlisted: { type: 'status_shortlisted', title: '🎉 You were shortlisted!',  msg: `${companyName} shortlisted you for "${jobTitle}".` },
            interview:   { type: 'status_interview',   title: '📅 Interview Scheduled',    msg: `${companyName} wants to interview you for "${jobTitle}".` },
            selected:    { type: 'status_selected',    title: '🎊 You got the offer!',     msg: `Congratulations! ${companyName} selected you for "${jobTitle}".` },
            rejected:    { type: 'status_rejected',    title: 'Application Update',         msg: `${companyName} has moved forward with other candidates for "${jobTitle}".${rejectionReason ? ' Reason: ' + rejectionReason : ''}` }
        };

        const notif = notifMap[status];
        if (notif) {
            Notification.create({
                userId:  application.candidateId._id,
                type:    notif.type,
                title:   notif.title,
                message: notif.msg
            }).catch(e => console.error('Notification error:', e.message));

            if (['shortlisted', 'rejected', 'selected', 'interview'].includes(status)) {
                sendStatusEmail({
                    toEmail:       application.candidateId.email,
                    candidateName: application.candidateId.name,
                    jobTitle, companyName, status
                }).catch(e => console.error('Email error:', e.message));
            }
        }

        res.json(application);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Save Recruiter Notes (Bug #6 fix — ownership check) ──────────────────────
router.patch('/:id/notes', requireAuth, requireRole('company'), async (req, res) => {
    try {
        const { recruiterNotes } = req.body;

        const application = await Application.findById(req.params.id).populate({
            path: 'jobId',
            select: 'companyId'
        });
        if (!application) return res.status(404).json({ error: 'Application not found.' });

        // Bug #6 fix: verify the job belongs to the requesting recruiter
        if (application.jobId.companyId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: 'Access denied. You do not own this application.' });

        application.recruiterNotes = recruiterNotes;
        await application.save();
        res.json(application);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
