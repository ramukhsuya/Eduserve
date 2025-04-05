const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); // Import User model
require('dotenv').config(); // Load environment variables

const router = express.Router();
// Configure Passport with Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Find or create a user based on their Google profile
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
            user = new User({
                fullName: profile.displayName,
                email: profile.emails[0].value,
                password: '', // No password since it's a Google account
            });
            await user.save();
        }

        done(null, user);
    } catch (error) {
        done(error);
    }
}));

// Serialize and deserialize user for session management
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

// Initialize Passport and session middleware in app.js:
router.use(passport.initialize());
router.use(passport.session());

// Routes for Google OAuth Login
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        req.session.user = {
            id: req.user._id,
            fullName: req.user.fullName,
            email: req.user.email,
            createdAt: req.user.createdAt // Add this line
        };
        res.redirect('/dashboard');
    }
);

module.exports = router;
