const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
    email:     { type: String, required: true },
    // For OTP docs: stores the 6-digit code (String).
    // For rate-limit docs (purpose starts with 'ratelimit_'): stores attempt count (Number stored as mixed).
    otp:       { type: mongoose.Schema.Types.Mixed, required: true },
    purpose:   { type: String, required: true }, // 'register' | 'login' | 'ratelimit_register' | 'ratelimit_login'
    expiresAt: { type: Date, required: true }
});

// TTL index: MongoDB auto-deletes documents at expiresAt.
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for fast lookup during verification
OtpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model('Otp', OtpSchema);