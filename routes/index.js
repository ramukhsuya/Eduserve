const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import User model
const bcryptjs = require('bcryptjs'); // For password comparison

// Middleware to ensure authentication for protected routes
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next(); // User is authenticated
    }
    res.redirect('/login'); // Redirect to login page if not authenticated
}

// Route for the home page
router.get('/', (req, res) => {
    res.render('home'); // Render home.ejs
});

// Route to render signup page
router.get('/signup', (req, res) => {
    res.render('signup', { error: null, fullName: '', email: '' });
});

// Route to handle signup form submission
router.post('/signup', async (req, res) => {
    const { fullName, email, password } = req.body;

    try {
        // Hash the password before saving it
        const hashedPassword = await bcryptjs.hash(password, 10);

        const newUser = new User({ fullName, email, password: hashedPassword });
        await newUser.save();

        console.log(`User ${fullName} registered successfully!`);
        res.redirect('/login'); // Redirect to login page after successful signup
    } catch (error) {
        console.error('Error during signup:', error);

        let errorMessage = 'An error occurred during registration.';
        if (error.code === 11000) {
            errorMessage = 'Email is already registered.';
        }

        res.render('signup', { error: errorMessage, fullName, email });
    }
});

// Route to render login page
router.get('/login', (req, res) => {
    res.render('login', { error: null, success: null });
});

// Route to handle login form submission
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.render('login', { error: 'Invalid email or password.', success: null });
        }

        // Compare passwords
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { error: 'Invalid email or password.', success: null });
        }

        // Save user info in session
        req.session.user = { id: user._id, fullName: user.fullName, email: user.email };

        console.log(`User ${user.fullName} logged in successfully!`);
        res.redirect('/dashboard'); // Redirect to dashboard after successful login
    } catch (error) {
        console.error('Error during login:', error);
        res.render('login', { error: 'An error occurred during login.', success: null });
    }
});

// Protected route for dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) => {
    const { fullName } = req.session.user;
    res.render('dashboard', { fullName }); // Pass user data to dashboard.ejs
});

// Route to handle logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.redirect('/dashboard'); // Redirect back if logout fails
        }
        res.redirect('/login'); // Redirect to login page after successful logout
    });
});

module.exports = router;
