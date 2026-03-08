const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Plain text for simplicity as requested
    role: { type: String, enum: ['candidate', 'company'], required: true },
    companyName: { type: String }, // Only for company users
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
