const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import User model
const bcryptjs = require('bcryptjs'); // For password comparison
const Mark = require('../models/Mark'); // Add this line
const Goal = require('../models/Goal'); // Import the Goal model
const Reminder = require('../models/Reminder'); // Import the Reminder model
const Note = require('../models/Note');
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

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        // Get user data from session
        const { fullName, email, createdAt } = req.session.user;

        // Fetch the most recent 3 goals from the database, sorted by creation date (newest first)
        const goals = await Goal.find({ userId: req.session.user.id })
            .sort({ createdAt: -1 }) // Sort by creation date in descending order
            .limit(3); // Limit to 3 goals

        // Render dashboard with user data and goals
        res.render('dashboard', { 
            user: { fullName, email, createdAt },
            goals // Pass goals to the template
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.render('dashboard', { 
            user: req.session.user,
            goals: [] // Pass empty array if fetch fails
        });
    }
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

// Route to render the goals page
router.get('/goals', ensureAuthenticated, async (req, res) => {
    try {
        const { status, subject, sort } = req.query;

        // Build query based on filters
        const query = {};
        if (status === 'active') query.isCompleted = false;
        if (status === 'completed') query.isCompleted = true;
        if (subject) query.subject = subject;

        // Sorting options
        let sortOption = { targetDate: 1 }; // Default: deadline ascending
        if (sort === 'deadline_desc') sortOption = { targetDate: -1 };
        if (sort === 'progress_asc') sortOption = { progressPercentage: 1 };
        if (sort === 'progress_desc') sortOption = { progressPercentage: -1 };

        // Fetch goals from database
        const goals = await Goal.find(query).sort(sortOption);

        // Fetch distinct subjects for filtering
        const subjects = await Goal.distinct('subject');

        res.render('goals', {
            goals,
            subjects,
            status: status || '',
            subject: subject || '',
            sort: sort || 'deadline_asc',
            success: null,
            error: null,
        });
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.render('goals', { goals: [], subjects: [], error: 'Failed to load educational goals.' });
    }
});

// GET route to display add goal form
router.get('/goals/add', ensureAuthenticated, (req, res) => {
    res.render('add-goal', { error: null });
});

// POST route to handle goal creation
router.post('/goals/add', ensureAuthenticated, async (req, res) => {
    try {
        const { name, subject, targetScore, currentScore, startDate, targetDate } = req.body;
        
        // Calculate progress percentage
        const progressPercentage = ((currentScore / targetScore) * 100) || 0;
        
        // Create new goal
        const newGoal = new Goal({
            userId: req.session.user.id,
            name,
            subject,
            targetScore: parseFloat(targetScore),
            currentScore: parseFloat(currentScore || 0),
            startDate: new Date(startDate),
            targetDate: new Date(targetDate),
            progressPercentage,
            isOnTrack: progressPercentage >= (targetScore * 0.8) // Example logic
        });

        await newGoal.save();
        res.redirect('/goals');
        
    } catch (error) {
        console.error('Error creating goal:', error);
        res.render('add-goal', { 
            error: 'Failed to create goal. Please check your inputs.' 
        });
    }
});
router.get('/goals/:id', ensureAuthenticated, async (req, res) => {
    try {
        const goalId = req.params.id;
        console.log('Fetching Goal ID:', goalId); // Debug log

        const goal = await Goal.findById(goalId);
        console.log('Fetched Goal:', goal); // Debug log

        if (!goal) {
            return res.status(404).render('goal-detail', { 
                error: 'Goal not found', 
                success: null, 
                goal: null 
            });
        }

        const daysRemaining = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
        goal.daysRemaining = daysRemaining > 0 ? daysRemaining : 0;

        res.render('goal-detail', { 
            goal, 
            error: null, 
            success: null 
        });
    } catch (error) {
        console.error('Error fetching goal details:', error);
    }
});

// Update Progress
router.put('/goals/:id/update', ensureAuthenticated, async (req, res) => {
    try {
        const goalId = req.params.id;
        const { newScore, notes, updateDate } = req.body;

        const goal = await Goal.findById(goalId);
        if (!goal) {
            return res.status(404).render('goal-detail', {
                error: 'Goal not found',
                success: null,
                goal: null
            });
        }

        // Convert scores to numbers
        const parsedNewScore = parseFloat(newScore);
        const scoreIncrease = parsedNewScore - goal.currentScore;

        // Update goal
        goal.currentScore = parsedNewScore;
        goal.progressPercentage = (parsedNewScore / goal.targetScore) * 100;
        goal.isCompleted = parsedNewScore >= goal.targetScore;

        // Add progress update
        goal.progressUpdates.push({
            date: new Date(updateDate),
            scoreIncrease: scoreIncrease,
            notes: notes
        });

        await goal.save();

        res.redirect(`/goals/${goalId}`);

    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).render('goal-detail', {
            error: 'Failed to update progress. Please try again.',
            success: null,
            goal: req.goal
        });
    }
});

// Mark Goal as Complete
router.put('/goals/:id/complete', ensureAuthenticated, async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        goal.isCompleted = true;
        await goal.save();
        res.redirect(`/goals/${req.params.id}`);
    } catch (error) {
        console.error('Error completing goal:', error);
        res.status(500).redirect('/goals');
    }
});

// Delete Goal
router.delete('/goals/:id', ensureAuthenticated, async (req, res) => {
    try {
        await Goal.findByIdAndDelete(req.params.id);
        res.redirect('/goals');
    } catch (error) {
        console.error('Error deleting goal:', error);
        res.status(500).redirect('/goals');
    }
});
// GET route to display edit form
router.get('/goals/:id/edit', ensureAuthenticated, async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (!goal) {
            return res.status(404).redirect('/goals');
        }
        res.render('edit-goal', { goal, error: null });
    } catch (error) {
        console.error('Error fetching goal for edit:', error);
        res.status(500).redirect('/goals');
    }
});

// PUT route to handle goal updates
router.put('/goals/:id', ensureAuthenticated, async (req, res) => {
    try {
        const { name, subject, targetScore, currentScore, targetDate, priority, isCompleted } = req.body;
        
        const updatedGoal = await Goal.findByIdAndUpdate(
            req.params.id,
            {
                name,
                subject,
                targetScore: parseFloat(targetScore),
                currentScore: parseFloat(currentScore),
                targetDate: new Date(targetDate),
                priority,
                isCompleted: Boolean(isCompleted),
                progressPercentage: (currentScore / targetScore) * 100
            },
            { new: true }
        );

        if (!updatedGoal) {
            return res.status(404).render('edit-goal', {
                error: 'Goal not found',
                goal: null
            });
        }

        res.redirect(`/goals/${req.params.id}`);
    } catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).render('edit-goal', {
            error: 'Failed to update goal. Please check your inputs.',
            goal: req.body
        });
    }
});

// Add these routes
router.get('/reminders/add', ensureAuthenticated, (req, res) => {
    res.render('add-reminder');
});

router.post('/reminders/add', ensureAuthenticated, async (req, res) => {
    try {
        const { title, subject, category, dueDate, recurringType, reminderDays, notes } = req.body;

        // Create a new reminder
        const newReminder = new Reminder({
            userId: req.session.user.id,
            title,
            subject,
            category,
            dueDate: new Date(dueDate),
            recurringType,
            reminderDays: parseInt(reminderDays),
            notes,
        });

        await newReminder.save();
        res.redirect('/dashboard'); // Redirect to reminders list after adding
    } catch (error) {
        console.error('Error adding reminder:', error);
        res.render('add-reminder', { error: 'Failed to add reminder. Please try again.' });
    }
});
router.get('/reminders', ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const reminders = await Reminder.find({ userId }).sort({ dueDate: 1 });
        
        const now = new Date();
        const overdueReminders = [];
        const upcomingReminders = [];
        const completedReminders = [];

        reminders.forEach(reminder => {
            const dueDate = new Date(reminder.dueDate);
            const timeDiff = dueDate - now;
            const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            if (reminder.isCompleted) {
                completedReminders.push(reminder);
            } else if (daysUntilDue < 0) {
                overdueReminders.push({ ...reminder._doc, daysUntilDue });
            } else {
                upcomingReminders.push({ ...reminder._doc, daysUntilDue });
            }
        });

        // Pass reminders explicitly along with other variables
        res.render('reminders', {
            reminders, // Add this line
            overdueReminders,
            upcomingReminders,
            completedReminders,
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.render('reminders', {
            reminders: [], // Ensure empty array is passed if an error occurs
            overdueReminders: [],
            upcomingReminders: [],
            completedReminders: [],
            error: 'Failed to load reminders',
            success: null
        });
    }
});

router.get('/reminders/:id/edit', ensureAuthenticated, async (req, res) => {
    try {
        const reminder = await Reminder.findById(req.params.id);

        if (!reminder) {
            return res.status(404).render('reminders', {
                error: 'Reminder not found',
                success: null,
                overdueReminders: [],
                upcomingReminders: [],
                completedReminders: []
            });
        }

        res.render('edit-reminder', { reminder, error: null });
    } catch (error) {
        console.error('Error fetching reminder for editing:', error);
        res.status(500).render('reminders', {
            error: 'Failed to load reminder for editing',
            success: null,
            overdueReminders: [],
            upcomingReminders: [],
            completedReminders: []
        });
    }
});
router.put('/reminders/:id', ensureAuthenticated, async (req, res) => {
    try {
        const { title, subject, category, dueDate, reminderDays, notes } = req.body;

        const updatedReminder = await Reminder.findByIdAndUpdate(
            req.params.id,
            {
                title,
                subject,
                category,
                dueDate: new Date(dueDate),
                reminderDays: parseInt(reminderDays),
                notes
            },
            { new: true }
        );

        if (!updatedReminder) {
            return res.status(404).render('reminders', {
                error: 'Reminder not found',
                success: null,
                overdueReminders: [],
                upcomingReminders: [],
                completedReminders: []
            });
        }

        res.redirect('/reminders');
    } catch (error) {
        console.error('Error updating reminder:', error);
        res.status(500).render('edit-reminder', {
            reminder: req.body,
            error: 'Failed to update reminder',
            success: null
        });
    }
});
router.post('/reminders/:id/delete', ensureAuthenticated, async (req, res) => {
    try {
        const deletedReminder = await Reminder.findByIdAndDelete(req.params.id);

        if (!deletedReminder) {
            return res.status(404).render('reminders', {
                error: 'Reminder not found',
                success: null,
                overdueReminders: [],
                upcomingReminders: [],
                completedReminders: []
            });
        }

        res.redirect('/reminders');
    } catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).render('reminders', {
            error: 'Failed to delete reminder',
            success: null,
            overdueReminders: [],
            upcomingReminders: [],
            completedReminders: []
        });
    }
});
// Note routes
// Add Note - GET
router.get('/notes/add', ensureAuthenticated, (req, res) => {
    res.render('add-notes', { error: null });
});

// Add Note - POST
router.post('/notes/add', ensureAuthenticated, async (req, res) => {
    try {
        const { title, subject, type, content, tags } = req.body;
        
        const newNote = new Note({
            title,
            subject,
            type,
            content,
            tags: tags.split(',').map(tag => tag.trim()),
            userId: req.session.user.id
        });

        await newNote.save();
        res.redirect('/notes');
    } catch (error) {
        console.error('Error saving note:', error);
        res.render('add-notes', { 
            error: 'Failed to save note. Please check all required fields.',
            values: req.body
        });
    }
});

// View All Notes - GET
router.get('/notes', ensureAuthenticated, async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.session.user.id }).sort({ createdAt: -1 });
        res.render('notes', { notes, error: null });
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.render('notes', { notes: [], error: 'Failed to load notes' });
    }
});

// View Note Detail - GET
router.get('/notes/:id', ensureAuthenticated, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).redirect('/notes');
        res.render('note-detail', { note });
    } catch (error) {
        console.error('Error fetching note:', error);
        res.redirect('/notes');
    }
});

// Delete Note - POST
router.post('/notes/:id/delete', ensureAuthenticated, async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.id);
        res.redirect('/notes');
    } catch (error) {
        console.error('Error deleting note:', error);
        res.redirect('/notes');
    }
});

module.exports = router;
