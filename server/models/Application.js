const mongoose = require('mongoose');

const ScoreBreakdownSchema = new mongoose.Schema({
    semantic:   { type: Number, default: 0 },
    skills:     { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    projects:   { type: Number, default: 0 }
}, { _id: false });

const ApplicationSchema = new mongoose.Schema({
    candidateId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Job',  required: true },
    resumePath:   { type: String, required: true },
    coverLetter:  { type: String },

    status: {
        type: String,
        enum: ['applied', 'screened', 'shortlisted', 'interview', 'selected', 'rejected'],
        default: 'applied'
    },

    // Legacy field kept in sync for backward compat
    matchScore:     { type: Number, default: null },
    finalScore:     { type: Number, default: null },
    scoreBreakdown: { type: ScoreBreakdownSchema, default: null },

    aiFeedback:     { type: String },
    skillsMatched:  { type: [String], default: [] },
    skillsMissing:  { type: [String], default: [] },
    strengths:      { type: [String], default: [] },
    weaknesses:     { type: [String], default: [] },

    recruiterNotes:  { type: String },
    rejectionReason: { type: String },

    appliedAt:     { type: Date, default: Date.now },
    screenedAt:    { type: Date },
    shortlistedAt: { type: Date },
    interviewAt:   { type: Date },
    selectedAt:    { type: Date },
    rejectedAt:    { type: Date }
});

ApplicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });
ApplicationSchema.index({ jobId: 1, finalScore: -1 });
ApplicationSchema.index({ jobId: 1, status: 1 });

module.exports = mongoose.model('Application', ApplicationSchema);