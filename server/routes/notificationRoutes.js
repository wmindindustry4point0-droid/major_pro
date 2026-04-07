/**
 * server/routes/notificationRoutes.js
 */
const express = require('express');
const router  = express.Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

// GET /api/notifications — all notifications for logged-in user
router.get('/', requireAuth, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(30);
        const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
        res.json({ notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', requireAuth, async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
        res.json({ message: 'All marked as read.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', requireAuth, async (req, res) => {
    try {
        const n = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { isRead: true },
            { new: true }
        );
        if (!n) return res.status(404).json({ error: 'Not found.' });
        res.json(n);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;