const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendOtpEmail } = require('../mailer');

// ─── Helper: generate a random 6-digit OTP ───────────────────────────────────
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─── Helper: save OTP to DB (replace any existing one for same email+purpose) ─
const saveOtp = async (email, purpose) => {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await Otp.findOneAndDelete({ email, purpose }); // Remove old OTP
    await Otp.create({ email, otp, purpose, expiresAt });
    return otp;
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Send OTP for registration
// POST /api/auth/send-otp
// Body: { email, name, password, role, companyName }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
    const { email, name, password, role, companyName } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
    }

    try {
        const otp = await saveOtp(email.toLowerCase().trim(), 'register');
        await sendOtpEmail({ toEmail: email, otp, purpose: 'register', name });
        res.json({ message: 'OTP sent to your email. Valid for 10 minutes.' });
    } catch (err) {
        console.error('Send OTP error:', err);
        res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Verify OTP and complete registration
// POST /api/auth/verify-register
// Body: { email, otp, name, password, role, companyName }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-register', async (req, res) => {
    const { email, otp, name, password, role, companyName } = req.body;

    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    try {
        const record = await Otp.findOne({ email: email.toLowerCase().trim(), purpose: 'register' });

        if (!record) return res.status(400).json({ error: 'OTP not found or already used. Please request a new one.' });
        if (new Date() > record.expiresAt) return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP. Please try again.' });

        // OTP valid — delete it
        await Otp.deleteOne({ _id: record._id });

        // Check again (race condition guard)
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) return res.status(409).json({ error: 'Account already exists. Please log in.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role,
            companyName: role === 'company' ? companyName?.trim() : '',
            isEmailVerified: true
        });

        const { password: _, ...userWithoutPassword } = user.toObject();
        res.status(201).json(userWithoutPassword);

    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
        console.error('Verify register error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN — Send OTP (for OTP-based login)
// POST /api/auth/send-login-otp
// Body: { email }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send-login-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ error: 'No account found with this email.' });

    try {
        const otp = await saveOtp(email.toLowerCase().trim(), 'login');
        await sendOtpEmail({ toEmail: email, otp, purpose: 'login', name: user.name });
        res.json({ message: 'OTP sent to your email. Valid for 10 minutes.' });
    } catch (err) {
        console.error('Send login OTP error:', err);
        res.status(500).json({ error: 'Failed to send OTP.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN — Verify OTP
// POST /api/auth/verify-login-otp
// Body: { email, otp }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-login-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    try {
        const record = await Otp.findOne({ email: email.toLowerCase().trim(), purpose: 'login' });

        if (!record) return res.status(400).json({ error: 'OTP not found or already used.' });
        if (new Date() > record.expiresAt) return res.status(400).json({ error: 'OTP has expired.' });
        if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });

        await Otp.deleteOne({ _id: record._id });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const { password: _, ...userWithoutPassword } = user.toObject();
        res.json(userWithoutPassword);
    } catch (err) {
        console.error('Verify login OTP error:', err);
        res.status(500).json({ error: 'Login failed.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIC PASSWORD LOGIN (kept for backward compatibility)
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        const isMatch = user && user.password && await bcrypt.compare(password, user.password);

        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

        const { password: _, ...userWithoutPassword } = user.toObject();
        res.json(userWithoutPassword);
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIC REGISTER (kept for backward compatibility)
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
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
            companyName: role === 'company' ? companyName?.trim() : ''
        });

        await user.save();
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.status(201).json(userWithoutPassword);
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE OAUTH
// GET /api/auth/google  — redirects to Google consent page
// GET /api/auth/google/callback — Google redirects back here
// ─────────────────────────────────────────────────────────────────────────────
router.get('/google', (req, res, next) => {
    // role passed as query param: /api/auth/google?role=company
    const role = req.query.role === 'company' ? 'company' : 'candidate';
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: role  // carries role through Google redirect round-trip
    })(req, res, next);
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
            const { password: _, ...userWithoutPassword } = user.toObject ? user.toObject() : user;
            const encoded = Buffer.from(JSON.stringify(userWithoutPassword)).toString('base64');
            const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
            res.redirect(`${CLIENT_URL}/oauth-callback?data=${encoded}`);
        })(req, res, next);
    }
);

module.exports = router;