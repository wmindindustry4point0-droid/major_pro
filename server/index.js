const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session'); // ← ADD

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Session middleware — required for Passport OAuth handshake (state verification)
app.use(session({
    secret: process.env.SESSION_SECRET || 'hiremind_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // set to true in production with HTTPS
}));

// Passport (Google OAuth)
const passport = require('./passport');
app.use(passport.initialize());
app.use(passport.session()); // ← ADD (needed for OAuth state verification)

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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));