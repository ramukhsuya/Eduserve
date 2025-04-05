const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
    examType: { type: String, required: true },
    subject: { type: String, required: true },
    marksObtained: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    dateOfExam: { type: Date, required: true },
    description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Mark', markSchema);
