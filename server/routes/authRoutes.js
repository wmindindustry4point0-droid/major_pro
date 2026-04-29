const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendOtpEmail } = require('../mailer');
const { signToken, requireAuth } = require('../middleware/auth');

// ── MongoDB-backed OTP rate limiter ───────────────────────────────────────────
// FIX #8: Uses dedicated `attempts` Number field instead of abusing the `otp`
// String field as a counter. $inc on a String field silently corrupts data.
const OTP_MAX_ATTEMPTS = 5;
const OTP_WINDOW_MS    = 15 * 60 * 1000; // 15 minutes

async function checkOtpRateLimit(email, purpose) {
    const key = email.toLowerCase().trim();
    const rateLimitDoc = await Otp.findOne({ email: key, purpose: `ratelimit_${purpose}` });
    const now = Date.now();
    if (rateLimitDoc) {
        if (rateLimitDoc.expiresAt < new Date()) {
            // Window expired — delete stale doc and allow
            await Otp.deleteOne({ _id: rateLimitDoc._id });
            return true;
        }
        if (rateLimitDoc.attempts >= OTP_MAX_ATTEMPTS) return false; // blocked
        // FIX: increment the dedicated `attempts` Number field, not `otp` String
        await Otp.updateOne({ _id: rateLimitDoc._id }, { $inc: { attempts: 1 } });
    } else {
        await Otp.create({
            email: key,
            purpose: `ratelimit_${purpose}`,
            otp: null,       // not an OTP doc
            attempts: 1,     // FIX: use the correct field
            expiresAt: new Date(now + OTP_WINDOW_MS)
        });
    }
    return true;
}

async function resetOtpRateLimit(email, purpose) {
    await Otp.deleteOne({ email: email.toLowerCase().trim(), purpose: `ratelimit_${purpose}` });
}
// ─────────────────────────────────────────────────────────────────────────────

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const saveOtp = async (email, purpose) => {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.findOneAndDelete({ email, purpose });
    await Otp.create({ email, otp, purpose, expiresAt });
    return otp;
};

// STEP 1 — Send OTP for registration
router.post('/send-otp', async (req, res) => {
    const { email, name, password, role, companyName } = req.body;
    if (!name || !email || !password || !role)
        return res.status(400).json({ error: 'All fields are required.' });
    if (password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    try {
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing)
            return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
        const otp = await saveOtp(email.toLowerCase().trim(), 'register');
        await sendOtpEmail({ toEmail: email, otp, purpose: 'register', name });
        res.json({ message: 'OTP sent to your email. Valid for 10 minutes.' });
    } catch (err) {
        console.error('Send OTP error:', err);
        res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }
});

// STEP 2 — Verify OTP and complete registration → returns JWT
router.post('/verify-register', async (req, res) => {
    const { email, otp, name, password, role, companyName } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    if (!await checkOtpRateLimit(email.toLowerCase().trim(), 'register')) {
        return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    try {
        const record = await Otp.findOne({ email: email.toLowerCase().trim(), purpose: 'register' });
        if (!record) return res.status(400).json({ error: 'OTP not found or already used. Please request a new one.' });
        if (new Date() > record.expiresAt) return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP. Please try again.' });

        await resetOtpRateLimit(email.toLowerCase().trim(), 'register');
        await Otp.deleteOne({ _id: record._id });

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) return res.status(409).json({ error: 'Account already exists. Please log in.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role,
            companyName: role === 'company' ? companyName?.trim() : undefined,
            isEmailVerified: true
        });
        const token = signToken(user);
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.status(201).json({ token, user: userWithoutPassword });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
        console.error('Verify register error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// LOGIN — Send OTP
router.post('/send-login-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ error: 'No account found with this email.' });
        const otp = await saveOtp(email.toLowerCase().trim(), 'login');
        await sendOtpEmail({ toEmail: email, otp, purpose: 'login', name: user.name });
        res.json({ message: 'OTP sent to your email. Valid for 10 minutes.' });
    } catch (err) {
        console.error('Send login OTP error:', err);
        res.status(500).json({ error: 'Failed to send OTP.' });
    }
});

// LOGIN — Verify OTP → returns JWT
router.post('/verify-login-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    if (!await checkOtpRateLimit(email.toLowerCase().trim(), 'login')) {
        return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    try {
        const record = await Otp.findOne({ email: email.toLowerCase().trim(), purpose: 'login' });
        if (!record) return res.status(400).json({ error: 'OTP not found or already used.' });
        if (new Date() > record.expiresAt) return res.status(400).json({ error: 'OTP has expired.' });
        if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });

        await resetOtpRateLimit(email.toLowerCase().trim(), 'login');
        await Otp.deleteOne({ _id: record._id });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ error: 'User not found.' });
        const token = signToken(user);
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.json({ token, user: userWithoutPassword });
    } catch (err) {
        console.error('Verify login OTP error:', err);
        res.status(500).json({ error: 'Login failed.' });
    }
});

// CLASSIC PASSWORD LOGIN → returns JWT
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        const isMatch = user && user.password && await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });
        const token = signToken(user);
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.json({ token, user: userWithoutPassword });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// CLASSIC REGISTER → returns JWT
router.post('/register', async (req, res) => {
    const { name, email, password, role, companyName } = req.body;
    try {
        if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields are required.' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role,
            companyName: role === 'company' ? companyName?.trim() : undefined,
            isEmailVerified: false
        });
        await user.save();
        const token = signToken(user);
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.status(201).json({ token, user: userWithoutPassword });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// ── Settings: Update profile ──────────────────────────────────────────────────
router.patch('/me', requireAuth, async (req, res) => {
    try {
        const { name, companyName, notificationPrefs } = req.body;
        const updates = {};
        if (name              !== undefined) updates.name              = name.trim();
        if (companyName       !== undefined) updates.companyName       = companyName.trim();
        if (notificationPrefs !== undefined) updates.notificationPrefs = notificationPrefs;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json(user);
    } catch (err) {
        console.error('PATCH /me error:', err.message);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// ── Settings: Change password ─────────────────────────────────────────────────
router.post('/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
        return res.status(400).json({ error: 'Current and new password are required.' });
    if (newPassword.length < 6)
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        if (!user.password)
            return res.status(400).json({ error: 'Your account uses Google Sign-In and has no password.' });
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        // Invalidate any outstanding OTPs for this email so stolen OTPs can't be reused
        await Otp.deleteMany({ email: user.email.toLowerCase() }).catch(console.error);
        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        console.error('change-password error:', err.message);
        res.status(500).json({ error: 'Failed to change password.' });
    }
});

// ── Settings: Delete account (cascading deletion) ─────────────────────────────
router.delete('/me', requireAuth, async (req, res) => {
    try {
        const userId   = req.user._id;
        const userRole = req.user.role;

        const Application      = require('../models/Application');
        const StageHistory     = require('../models/StageHistory');
        const CandidateProfile = require('../models/CandidateProfile');
        const Notification     = require('../models/Notification');
        const AIWorkspace      = require('../models/AIWorkspace');
        const Job              = require('../models/Job');
        const Interview        = require('../models/Interview');
        const VideoInterview   = require('../models/VideoInterview');

        if (userRole === 'candidate') {
            const apps   = await Application.find({ candidateId: userId }, '_id');
            const appIds = apps.map(a => a._id);

            if (appIds.length > 0) {
                await StageHistory.deleteMany({ applicationId: { $in: appIds } });
                // FIX: also clean up interview and video-interview records tied to this candidate
                await Interview.deleteMany({ candidateId: userId });
                await VideoInterview.deleteMany({ candidateId: userId });
            }

            await Application.deleteMany({ candidateId: userId });
            await CandidateProfile.deleteOne({ userId });

        } else if (userRole === 'company') {
            const jobs   = await Job.find({ companyId: userId }, '_id');
            const jobIds = jobs.map(j => j._id);

            if (jobIds.length > 0) {
                const apps   = await Application.find({ jobId: { $in: jobIds } }, '_id');
                const appIds = apps.map(a => a._id);

                if (appIds.length > 0) {
                    await StageHistory.deleteMany({ applicationId: { $in: appIds } });
                }

                await Application.deleteMany({ jobId: { $in: jobIds } });
                // FIX: clean up all interviews for this company's jobs
                await Interview.deleteMany({ companyId: userId });
                await VideoInterview.deleteMany({ companyId: userId });
            }

            await Job.deleteMany({ companyId: userId });
            await AIWorkspace.deleteMany({ companyId: userId });
        }

        await Notification.deleteMany({ userId });
        await User.findByIdAndDelete(userId);

        res.json({ message: 'Account and all associated data deleted successfully.' });
    } catch (err) {
        console.error('DELETE /me error:', err.message);
        res.status(500).json({ error: 'Failed to delete account.' });
    }
});

// GOOGLE OAUTH
router.get('/google', (req, res, next) => {
    const role = req.query.role === 'company' ? 'company' : 'candidate';
    passport.authenticate('google', { scope: ['profile', 'email'], state: role })(req, res, next);
});

router.get('/google/callback',
    (req, res, next) => {
        passport.authenticate('google', (err, user, info) => {
            if (err) {
                console.error('Google OAuth error:', err);
                return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/?oauth_error=server_error`);
            }
            if (!user) {
                console.error('Google OAuth no user:', info);
                return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/?oauth_error=no_user`);
            }
            const token = signToken(user);
            const { password: _, ...userWithoutPassword } = user.toObject ? user.toObject() : user;
            const encoded = Buffer.from(JSON.stringify({ token, user: userWithoutPassword })).toString('base64');
            const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
            res.redirect(`${CLIENT_URL}/oauth-callback?data=${encoded}`);
        })(req, res, next);
    }
);

module.exports = router;