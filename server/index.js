/**
 * server/index.js
 * BUG FIXED: CORS allowed all *.vercel.app subdomains — now only the specific deployment URL is allowed.
 * BUG FIXED: No multer error middleware — file-type rejections returned a raw 500. Now returns clean 400.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');

dotenv.config();

if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET environment variable is not set. Server cannot start safely.');

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// BUG FIXED: Was `origin.endsWith('.vercel.app')` — any Vercel app could make
// credentialed requests to this API. Now only explicitly listed origins are allowed.
const allowedOrigins = [
    'http://localhost:5173',
    'https://major-pro-omega.vercel.app',
    process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin '${origin}' is not allowed.`));
    },
    credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Passport (Google OAuth)
const passport = require('./passport');
app.use(passport.initialize());
app.use(passport.session());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/resume-screener')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const appRoutes = require('./routes/appRoutes');
const candidateRoutes = require('./routes/candidateRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', appRoutes);
app.use('/api/candidate', candidateRoutes);

app.get('/', (req, res) => res.send('API is running...'));

// ── Global error handler ──────────────────────────────────────────────────────
// BUG FIXED: Multer file-type/size errors were falling through as unhandled 500s.
// This catches multer errors and any other errors thrown by route handlers.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    // Multer-specific errors (file size, unexpected field, etc.)
    if (err.name === 'MulterError') {
        return res.status(400).json({ error: `File upload error: ${err.message}` });
    }
    // Custom file-filter rejections (e.g. "Only PDF files are allowed")
    if (err.message && err.message.toLowerCase().includes('pdf')) {
        return res.status(400).json({ error: err.message });
    }
    // CORS errors
    if (err.message && err.message.startsWith('CORS:')) {
        return res.status(403).json({ error: err.message });
    }
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));