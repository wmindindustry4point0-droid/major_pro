const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    companyId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:             { type: String, required: true },
    description:       { type: String, required: true },
    requiredSkills:    { type: [String], default: [] },
    mustHaveSkills:    { type: [String], default: [] },
    niceToHaveSkills:  { type: [String], default: [] },
    minExperience:     { type: Number, default: 0 },
    maxExperience:     { type: Number, default: 99 },
    jdEmbeddingVector: { type: [Number], default: [] },
    isActive:          { type: Boolean, default: true },
    experienceLevel:   { type: String, required: true },
    location:          { type: String },
    createdAt:         { type: Date, default: Date.now }
});

JobSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Job', JobSchema);