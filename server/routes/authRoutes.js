const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, role, companyName } = req.body;

    try {
        // Basic server-side validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Check if email already exists — give a clean message
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res.status(409).json({
                error: 'An account with this email already exists. Please log in instead.'
            });
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role,
            companyName: role === 'company' ? companyName?.trim() : ''
        });

        await user.save();

        // Never send password back to client
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.status(201).json(userWithoutPassword);

    } catch (err) {
        // Catch any remaining MongoDB duplicate key errors as a safety net
        if (err.code === 11000) {
            return res.status(409).json({
                error: 'An account with this email already exists. Please log in instead.'
            });
        }
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        // Use bcrypt to compare hashed password
        const isMatch = user && await bcrypt.compare(password, user.password);

        // Same error for both "user not found" and "wrong password" — don't reveal which
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Never send password back to client
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.json(userWithoutPassword);

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

module.exports = router;