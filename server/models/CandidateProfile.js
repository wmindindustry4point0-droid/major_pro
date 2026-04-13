const mongoose = require('mongoose');

const ExperienceSchema = new mongoose.Schema({
    title:          { type: String },
    company:        { type: String },
    startDate:      { type: String },
    endDate:        { type: String },
    durationMonths: { type: Number, default: 0 },
    description:    { type: String }
}, { _id: false });

const EducationSchema = new mongoose.Schema({
    degree:      { type: String },
    institution: { type: String },
    year:        { type: Number },
    grade:       { type: String }
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
    name:        { type: String },
    techStack:   { type: [String], default: [] },
    description: { type: String }
}, { _id: false });

const CandidateProfileSchema = new mongoose.Schema({
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    resumeUrl:    { type: String, required: true },
    resumeS3Key:  { type: String },
    resumeHash:   { type: String },

    extractedName:  { type: String },
    extractedEmail: { type: String },
    extractedPhone: { type: String },
    extractedSkills:{ type: [String], default: [] },

    totalExperienceYears: { type: Number, default: 0 },
    experience:   { type: [ExperienceSchema], default: [] },
    education:    { type: [EducationSchema],  default: [] },
    projects:     { type: [ProjectSchema],    default: [] },

    embeddingVector: { type: [Number], default: [] },
    embeddingHash:   { type: String },

    location:  { type: String },
    linkedIn:  { type: String },
    github:    { type: String },

    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CandidateProfile', CandidateProfileSchema);