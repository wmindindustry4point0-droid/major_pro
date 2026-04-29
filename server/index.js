const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');

dotenv.config();

// Axios is used for the AI service proxy route below
const axios = require('axios');

if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET environment variable is not set. Server cannot start safely.');

const app  = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:5173',
    'https://major-pro-omega.vercel.app',
    process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' is not allowed.`));
    },
    credentials: true
}));

app.use(express.json());

// FIX #10: Removed `app.use('/uploads', express.static('uploads'))`.
// All file uploads go to S3 — this local static route was dead code and
// misleading (it implied files were served locally, which they are not).

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure:   process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

const passport = require('./passport');
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/resume-screener')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Register models before routes load
require('./models/StageHistory');
require('./models/Interview');
require('./models/VideoInterview');

const authRoutes           = require('./routes/authRoutes');
const jobRoutes            = require('./routes/jobRoutes');
const appRoutes            = require('./routes/appRoutes');
const candidateRoutes      = require('./routes/candidateRoutes');
const notificationRoutes   = require('./routes/notificationRoutes');
const interviewRoutes      = require('./routes/interviewRoutes');
const videoInterviewRoutes = require('./routes/videoInterviewRoutes');

app.use('/api/auth',            authRoutes);
app.use('/api/jobs',            jobRoutes);
app.use('/api/applications',    appRoutes);
app.use('/api/candidate',       candidateRoutes);
app.use('/api/notifications',   notificationRoutes);
app.use('/api/interviews',      interviewRoutes);
app.use('/api/video-interviews',videoInterviewRoutes);

app.get('/', (req, res) => res.send('API is running...'));

// ── AI Service Proxy ─────────────────────────────────────────────────────────
// Routes /api/ai/* to the Python AI service. This keeps the AI service URL
// server-side only — the browser never needs VITE_AI_URL configured.
app.post('/api/ai/prep_chat', async (req, res) => {
    try {
        const aiUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';
        const response = await axios.post(`${aiUrl}/prep_chat`, req.body, { timeout: 60000 });
        res.json(response.data);
    } catch (err) {
        console.error('[AI proxy /prep_chat]', err.message);
        const status = err.response?.status || 502;
        res.status(status).json({ error: err.response?.data?.error || 'AI service unavailable. Please try again.' });
    }
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.name === 'MulterError')
        return res.status(400).json({ error: `File upload error: ${err.message}` });
    if (err.message?.toLowerCase().includes('pdf'))
        return res.status(400).json({ error: err.message });
    if (err.message?.startsWith('CORS:'))
        return res.status(403).json({ error: err.message });
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown — cleanly close MongoDB and drain in-flight requests
// before the process exits. Required for zero-downtime deploys on Render/Railway.
function gracefulShutdown(signal) {
    console.log(`[${signal}] Graceful shutdown initiated...`);
    server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close(false).then(() => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        }).catch(err => {
            console.error('Error closing MongoDB:', err);
            process.exit(1);
        });
    });
    // Force exit if drain takes too long
    setTimeout(() => { console.error('Forced exit after timeout.'); process.exit(1); }, 15000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));