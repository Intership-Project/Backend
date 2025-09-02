const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const utils = require('./utils');

// Routes
const facultyRouter = require('./routes/faculty');
const coursecordinatorRouter = require('./routes/coursecordinator');
const studentRouter = require('./routes/student');
const addfeedbackRouter = require('./routes/addfeedback');
const courseRouter = require('./routes/course');
const adminRouter = require('./routes/admin');
const roleRouter = require('./routes/role');
const batchRouter = require('./routes/batch');
const subjectRouter = require('./routes/subject');
const feedbacktypeRouter = require('./routes/feedbacktype');
const feedbackmoduletypeRouter = require('./routes/feedbackmoduletype');
const feedbackquestionRouter = require('./routes/feedbackquestion');
const schedulefeedbackRouter = require('./routes/schedulefeedback');

// Import JWT middleware
const verifyToken = require('./middlewares/verifyToken');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Public routes that do NOT require JWT
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

// Apply verifyToken for protected routes
app.use((req, res, next) => {
  if (publicUrls.some(url => req.originalUrl.startsWith(url))) return next();
  verifyToken(req, res, next);
});

// Route mapping
app.use('/faculty', facultyRouter);
app.use('/coursecordinator', coursecordinatorRouter);
app.use('/student', studentRouter);
app.use('/addfeedback', addfeedbackRouter);
app.use('/admin', adminRouter);
app.use('/course', courseRouter);
app.use('/role', roleRouter);
app.use('/batch', batchRouter);
app.use('/subject', subjectRouter);
app.use('/feedbacktype', feedbacktypeRouter);
app.use('/feedbackmoduletype', feedbackmoduletypeRouter);
app.use('/feedbackquestion', feedbackquestionRouter);
app.use('/schedulefeedback', schedulefeedbackRouter);

// Serve uploaded PDFs
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads/feedback_reports')));

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
