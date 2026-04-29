const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:    {
        type: String,
        enum: [
            'application_received',
            'status_shortlisted',
            'status_rejected',
            'status_analyzed',
            'status_interview',
            'status_selected',
            'job_posted',
            'job_deleted',          // FIX #1: was missing — jobRoutes.js fires this on job deletion
            'interview_scheduled',
            'video_interview_assigned'
        ],
        required: true
    },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    isRead:  { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// TTL index: auto-delete notifications older than 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
// Index for fast per-user lookups
NotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);