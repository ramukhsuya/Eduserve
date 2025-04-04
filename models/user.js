const mongoose = require('mongoose');

// Define the User Schema
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true }, // Unique email
    password: { type: String, required: true },
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

// Export the User model
module.exports = mongoose.model('User', userSchema);
