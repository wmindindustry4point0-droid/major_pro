const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional — null for OAuth users
    role: { type: String, enum: ['candidate', 'company'], required: true },
    companyName: { type: String, default: undefined }, // undefined for candidates, not ""

    // OAuth fields
    googleId: { type: String, sparse: true },
    avatar: { type: String }, // Profile picture URL from Google

    // Email verification
    isEmailVerified: { type: Boolean, default: false },

    // Notification preferences (Bug #12 fix — field now exists in schema)
    notificationPrefs: {
        emailOnStatus:       { type: Boolean, default: true },
        emailOnNewApplicant: { type: Boolean, default: true },
        inAppNotifications:  { type: Boolean, default: true }
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
