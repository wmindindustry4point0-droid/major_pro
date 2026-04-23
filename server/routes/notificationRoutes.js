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

// FIX #13: DELETE /api/notifications/clear — let users manually clear all their notifications
// Without this, read notifications accumulate until the 30-day TTL index purges them.
router.delete('/clear', requireAuth, async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.user._id });
        res.json({ message: 'All notifications cleared.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/notifications/:id — delete a single notification
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const n = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!n) return res.status(404).json({ error: 'Not found.' });
        res.json({ message: 'Notification deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;