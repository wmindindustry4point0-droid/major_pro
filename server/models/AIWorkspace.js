const mongoose = require('mongoose');

const AIWorkspaceSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    jobTitle: { type: String, required: true },
    jobDescription: { type: String, required: true },
    skillsInput: { type: String }, // The raw string input
    requiredSkills: { type: [String], required: true },
    mustHaveSkills: { type: [String], default: [] },
    niceToHaveSkills: { type: [String], default: [] },
    minExperience: { type: Number, default: 0 },
    status: { type: String, enum: ['Draft', 'Completed', 'Failed'], default: 'Draft' },
    analysisResults: { type: Array, default: [] }, // Array of candidate analysis objects
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AIWorkspace', AIWorkspaceSchema);