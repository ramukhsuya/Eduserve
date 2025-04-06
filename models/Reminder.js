const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    category: { type: String, required: true },
    dueDate: { type: Date, required: true },
    recurringType: { type: String, default: 'none' }, // e.g., daily/weekly/monthly/yearly/none
    reminderDays: { type: Number, default: 3 },       // Days before due date to remind
    notes: { type: String },
    isCompleted: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false }      // To track whether the final email has been sent
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);
