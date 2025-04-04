const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
const session = require('express-session');
const authRoutes = require('./routes/auth');

// MongoDB connection setup
const dbUrl = 'mongodb://localhost:27017/EDUCATION'; 
mongoose.connect(dbUrl)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1); // Exit if DB connection fails
    });

// Middleware to parse form data (MUST come before routes)
app.use(bodyParser.urlencoded({ extended: true }));
// Add session middleware
app.use(session({
    secret: '0lTERpo+V6T/Enpt2Xva3VPO1u3tQYOznL97w+XBFY0=',
    resave: false,
    saveUninitialized: false,
}));

// Middleware to make 'user' available in all EJS templates
app.use((req, res, next) => {
    res.locals.user = req.session.user || null; // Set 'user' from session or null if not logged in
    next();
});

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);
app.use('/', authRoutes);
// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
