const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    type: { type: String, required: true, enum: ['Lecture', 'Lab', 'Research', 'Other'] },
    content: { type: String, required: true },
    tags: [String],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
