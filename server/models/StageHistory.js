const mongoose = require('mongoose');

const StageHistorySchema = new mongoose.Schema({
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    fromStatus:    { type: String, required: true },
    toStatus:      { type: String, required: true },
    changedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note:          { type: String },
    changedAt:     { type: Date, default: Date.now }
});

StageHistorySchema.index({ applicationId: 1, changedAt: -1 });

module.exports = mongoose.model('StageHistory', StageHistorySchema);