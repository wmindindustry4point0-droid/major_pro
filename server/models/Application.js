const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Job',  required: true },
    resumePath:  { type: String, required: true },
    coverLetter: { type: String },
    // FIX: matchScore defaults to null instead of 0 so the UI can distinguish
    // "AI unavailable" from a genuine 0% match.
    matchScore:  { type: Number, default: null },
    aiFeedback:  { type: String },
    status: {
        type: String,
        enum: ['applied', 'analyzed', 'shortlisted', 'rejected'],
        default: 'applied'
    },
    appliedAt: { type: Date, default: Date.now }
});

// FIX: Unique compound index prevents duplicate applications even under
// race conditions (two rapid clicks). The app-layer check remains as a
// friendly first line of defence; the DB index is the hard guarantee.
ApplicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema);