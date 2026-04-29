const mongoose = require('mongoose');

const InterviewSchema = new mongoose.Schema({
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    jobId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Job',         required: true },
    candidateId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',        required: true },
    companyId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',        required: true },

    // Proposed by company
    proposedSlots: [{
        date:      { type: Date, required: true },
        duration:  { type: Number, default: 45 },  // minutes
    }],

    // Confirmed by candidate
    confirmedSlot: {
        date:     { type: Date },
        duration: { type: Number },
    },

    meetLink:      { type: String },
    interviewType: { type: String, enum: ['video', 'phone', 'in-person'], default: 'video' },
    notes:         { type: String },    // from company to candidate
    status:        { type: String, enum: ['pending_confirmation', 'confirmed', 'rescheduled', 'completed', 'cancelled'], default: 'pending_confirmation' },
    rescheduleNote:{ type: String },

    createdAt:  { type: Date, default: Date.now },
    updatedAt:  { type: Date, default: Date.now },
});

InterviewSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.model('Interview', InterviewSchema);