const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hiremind_jwt_secret_change_in_prod';

// Middleware: verify JWT and attach user to req.user
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { _id, email, role, name }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }
};

// Middleware: restrict to a specific role
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}.` });
    }
    next();
};

// Helper: sign a token for a user document
const signToken = (user) => jwt.sign(
    { _id: user._id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
);

module.exports = { requireAuth, requireRole, signToken };