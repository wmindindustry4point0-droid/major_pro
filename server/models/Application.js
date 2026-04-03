const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    resumePath:  { type: String, required: true },
    coverLetter: { type: String },
    matchScore:  { type: Number },   // Overall weighted score from AI
    aiFeedback:  { type: String },   // Short feedback string
    scoreBreakdown: {                // Breakdown of each scoring component
        semantic:   { type: Number },  // BERT semantic similarity (40%)
        skills:     { type: Number },  // Skills match score (25%)
        experience: { type: Number },  // Experience level match (20%)
        projects:   { type: Number },  // Projects section skills match (15%)
    },
    status: {
        type: String,
        enum: ['applied', 'analyzed', 'shortlisted', 'rejected'],
        default: 'applied'
    },
    appliedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', ApplicationSchema);