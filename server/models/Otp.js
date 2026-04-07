const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
    email:     { type: String, required: true },
    otp:       { type: String, required: true },
    purpose:   { type: String, enum: ['register', 'login'], required: true },
    expiresAt: { type: Date, required: true }
});

// FIX: TTL index tells MongoDB to automatically delete expired OTP documents.
// expireAfterSeconds: 0 means "delete the document at the expiresAt datetime".
// Without this, expired OTPs accumulate in the collection indefinitely.
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for fast lookup during verification
OtpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model('Otp', OtpSchema);