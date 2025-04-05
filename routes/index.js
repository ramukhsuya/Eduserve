const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import User model
const bcryptjs = require('bcryptjs'); // For password comparison
const Mark = require('../models/Mark'); // Add this line

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
        req.session.user = {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            createdAt: user.createdAt // Add this line
        };

        res.redirect('/dashboard'); // Redirect to dashboard after successful login
    } catch (error) {
        console.error('Error during login:', error);
        res.render('login', { error: 'An error occurred during login.', success: null });
    }
});
// Middleware to ensure authentication
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next(); // User is authenticated
    }
    res.redirect('/login'); // Redirect to login page if not authenticated
}
// Route for dashboard (protected)
router.get('/dashboard', ensureAuthenticated, (req, res) => {
    // Retrieve user data from session
    const { fullName, email, createdAt } = req.session.user;
    res.render('dashboard', { 
        user: { 
            fullName, 
            email, 
            createdAt // Pass createdAt to the template
        } 
    });
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

// Route to render the "Add Marks" form (GET request)
router.get('/marks/add', ensureAuthenticated, (req, res) => {
    res.render('add-marks', { error: null }); // Render add-marks.ejs
});

router.post('/marks/add', async (req, res) => {
    const { examType, subject, marksObtained, totalMarks, dateOfExam, description } = req.body;

    try {
        // Save marks data to database (assuming you have a Marks model)
        const newMark = new Mark({
            examType,
            subject,
            marksObtained,
            totalMarks,
            dateOfExam,
            description,
        });

        await newMark.save();
        res.redirect('/dashboard'); // Redirect back to dashboard after adding marks
    } catch (error) {
        console.error('Error adding marks:', error);
        res.render('add-marks', { error: 'Failed to add marks. Please try again.' });
    }
});

// Get all marks with filters
router.get('/marks', ensureAuthenticated, async (req, res) => {
    try {
        const { examType, subject, month, sort } = req.query;
        const query = {};
        
        if (examType) query.examType = examType;
        if (subject) query.subject = subject;
        
        if (month) {
            const year = new Date().getFullYear(); // Modify as needed
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 1);
            query.dateOfExam = { $gte: startDate, $lt: endDate };
        }

        let sortOption = { dateOfExam: -1 };
        if (sort) {
            switch(sort) {
                case 'date_asc': sortOption = { dateOfExam: 1 }; break;
                case 'marks_desc': sortOption = { marksObtained: -1 }; break;
                case 'marks_asc': sortOption = { marksObtained: 1 }; break;
            }
        }

        const marks = await Mark.find(query).sort(sortOption);
        const examTypes = await Mark.distinct('examType');
        const subjects = await Mark.distinct('subject');

        res.render('marks', { 
            marks,
            examTypes,
            subjects,
            examType: examType || '',
            subject: subject || '',
            month: month || '',
            sort: sort || 'date_desc'
        });
        
    } catch (error) {
        console.error('Error fetching marks:', error);
        res.render('marks', { error: 'Failed to load academic records' });
    }
});

module.exports = router;
