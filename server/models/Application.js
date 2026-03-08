const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    resumePath: { type: String, required: true }, // Path to uploaded PDF
    coverLetter: { type: String },
    matchScore: { type: Number }, // To be populated by AI service
    aiFeedback: { type: String }, // Short feedback
    status: { type: String, enum: ['applied', 'analyzed', 'shortlisted', 'rejected'], default: 'applied' },
    appliedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', ApplicationSchema);
