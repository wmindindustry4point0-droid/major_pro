const mongoose = require('mongoose');

const VideoResponseSchema = new mongoose.Schema({
    questionIndex: { type: Number, required: true },
    question:      { type: String, required: true },
    videoS3Key:    { type: String },          // S3 key of the uploaded video
    transcript:    { type: String },          // From browser Web Speech API
    aiScore:       { type: Number },          // 0-100
    contentScore:  { type: Number },
    commScore:     { type: Number },
    feedback:      { type: String },
    strengths:     { type: [String], default: [] },
    improvements:  { type: [String], default: [] },
    submittedAt:   { type: Date },
}, { _id: false });

const VideoInterviewSchema = new mongoose.Schema({
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    jobId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Job',         required: true },
    candidateId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',        required: true },
    companyId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',        required: true },

    questions:     { type: [String], default: [] },   // company-set questions
    responses:     { type: [VideoResponseSchema], default: [] },

    status: {
        type: String,
        enum: ['pending', 'in_progress', 'submitted', 'reviewed'],
        default: 'pending'
    },

    overallScore:  { type: Number },
    companyNotes:  { type: String },

    deadline:      { type: Date },
    createdAt:     { type: Date, default: Date.now },
    updatedAt:     { type: Date, default: Date.now },
});

VideoInterviewSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.model('VideoInterview', VideoInterviewSchema);