const mongoose = require('mongoose');

// FIX #8: Separated OTP and rate-limit documents into clean, typed fields.
// Previously the `otp` field (String) was repurposed as a numeric counter for
// rate-limit docs using $inc, which silently corrupts String fields in Mongoose.
// Now rate-limit docs use a dedicated `attempts` Number field.

const OtpSchema = new mongoose.Schema({
    email:     { type: String, required: true },
    otp:       { type: String },        // 6-digit code; null for rate-limit docs
    attempts:  { type: Number, default: 0 }, // FIX: dedicated counter for rate-limit docs
    purpose:   { type: String, required: true }, // 'register' | 'login' | 'ratelimit_register' | 'ratelimit_login'
    expiresAt: { type: Date, required: true }
});

// TTL index: MongoDB auto-deletes documents at expiresAt
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for fast lookup during verification
OtpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model('Otp', OtpSchema);