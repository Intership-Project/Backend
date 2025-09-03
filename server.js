const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const config = require('./config');
const utils = require('./utils');

// optional (for future PDF generation)
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Import JWT middleware
const verifyToken = require('./middlewares/verifyToken');

const app = express();

// -------------------- Middleware --------------------
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------- JWT Middleware --------------------

const publicUrls = [
    '/faculty/register',
    '/faculty/login',
    '/faculty/forgotpassword',
    '/faculty/resetpassword',
    '/student/register',
    '/student/login',
    '/admin/register',
    '/admin/login'
];


app.use((req, res, next) => {
    if (publicUrls.includes(req.url)) return next();

    const token = req.headers['token'];
    if (!token) return res.send(utils.createError('missing token'));

    try {
        const payload = jwt.verify(token, config.secret);
        req.data = payload;
        next();
    } catch (ex) {
        res.send(utils.createError('invalid token'));
    }
});

// -------------------- Routes --------------------

const studentRouter = require('./routes/student');
const adminRouter = require('./routes/admin');
const courseRouter = require('./routes/course');
const roleRouter = require('./routes/role');
const batchRouter = require('./routes/batch');
const subjectRouter = require('./routes/subject');
const feedbacktypeRouter = require('./routes/feedbacktype');
const feedbackmoduletypeRouter = require('./routes/feedbackmoduletype');
const feedbackquestionRouter = require('./routes/feedbackquestion');
const schedulefeedbackRouter = require('./routes/schedulefeedback');
const filledfeedbackRouter = require('./routes/filledfeedback');
const addfeedbackRouter = require('./routes/addfeedback');
const facultyRouter = require('./routes/faculty');
const coursecordinatorRouter = require('./routes/coursecordinator');
// const facultydashboardRouter = require('./routes/facultydashboard');

// Only include this if the file exists
// const facultyfeedbackpdfRouter = require('./routes/facultyfeedbackpdf');



// Register routes
app.use('/admin', adminRouter);
app.use('/course', courseRouter);
app.use('/role', roleRouter);
app.use('/batch', batchRouter);
app.use('/subject', subjectRouter);
app.use('/feedbacktype', feedbacktypeRouter);
app.use('/feedbackmoduletype', feedbackmoduletypeRouter);
app.use('/feedbackquestion', feedbackquestionRouter);
app.use('/schedulefeedback', schedulefeedbackRouter);
app.use('/filledfeedback', filledfeedbackRouter);
app.use('/addfeedback', addfeedbackRouter);
app.use('/faculty', facultyRouter);
app.use('/coursecordinator', coursecordinatorRouter);
// app.use('/facultydashboard', facultydashboardRouter);
// app.use('/facultyfeedbackpdf', facultyfeedbackpdfRouter);
app.use('/student', studentRouter);



// -------------------- Start Server --------------------

app.listen(4000, '0.0.0.0', () => {
    console.log('Server started on port 3000');
});

