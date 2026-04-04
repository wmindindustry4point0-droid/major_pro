// server/models/CandidateProfile.js

const mongoose = require('mongoose');

const CandidateProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    resumeUrl: { type: String, required: true },      // S3 public URL or signed URL snapshot
    resumeS3Key: { type: String },                    // S3 object key — used to generate signed URLs
    extractedName: { type: String },
    extractedEmail: { type: String },
    extractedPhone: { type: String },
    extractedSkills: { type: [String], default: [] },
    experience: { type: String },
    education: { type: String },
    location: { type: String },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CandidateProfile', CandidateProfileSchema);