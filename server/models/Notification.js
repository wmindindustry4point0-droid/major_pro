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
            'job_posted'
        ],
        required: true
    },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    isRead:  { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('Notification', NotificationSchema);