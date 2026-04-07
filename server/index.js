/**
 * server/index.js
 * ADDED: /api/notifications route registration.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');

dotenv.config();

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
app.use('/uploads', express.static('uploads'));

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

// Routes
const authRoutes         = require('./routes/authRoutes');
const jobRoutes          = require('./routes/jobRoutes');
const appRoutes          = require('./routes/appRoutes');
const candidateRoutes    = require('./routes/candidateRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); // NEW

app.use('/api/auth',          authRoutes);
app.use('/api/jobs',          jobRoutes);
app.use('/api/applications',  appRoutes);
app.use('/api/candidate',     candidateRoutes);
app.use('/api/notifications', notificationRoutes); // NEW

app.get('/', (req, res) => res.send('API is running...'));

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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));