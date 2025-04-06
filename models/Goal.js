const mongoose = require('mongoose');

const progressUpdateSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    scoreIncrease: { type: Number, required: true },
    notes: { type: String },
});

const goalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    targetScore: { type: Number, required: true },
    currentScore: { type: Number, default: 0 },
    progressPercentage: { type: Number, default: 0 },
    targetDate: { type: Date, required: true },
    isOnTrack: { type: Boolean, default: true },
    isCompleted: { type: Boolean, default: false },
    progressUpdates: [progressUpdateSchema], // Add this field
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);
