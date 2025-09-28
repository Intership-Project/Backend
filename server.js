const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const verifyToken = require("./middlewares/verifyToken");

// Import routes
const facultyRouter = require("./routes/faculty");
const courseCoordinatorRouter = require("./routes/coursecordinator");
const studentRouter = require("./routes/student");
const addFeedbackRouter = require("./routes/addfeedback");
const courseRouter = require("./routes/course");
const adminRouter = require("./routes/admin");
const roleRouter = require("./routes/role");
const batchRouter = require("./routes/batch");
const subjectRouter = require("./routes/subject");
const feedbackTypeRouter = require("./routes/feedbacktype");
const feedbackModuleTypeRouter = require("./routes/feedbackmoduletype");
const feedbackQuestionRouter = require("./routes/feedbackquestion");
const scheduleFeedbackRouter = require("./routes/schedulefeedback");
const filledFeedbackRouter = require("./routes/filledfeedback");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  '/feedback_reports',
  express.static(path.join(__dirname, 'uploads', 'feedback_reports'))
);

// Public routes (no JWT required)
const publicUrls = [
  "/faculty/register",
  "/faculty/login",
  "/faculty/forgotpassword",
  "/faculty/resetpassword",
  "/student/register",
  "/student/login",
  "/student/forgotpassword",
  "/student/resetpassword",
  "/admin/register",
  "/admin/login",
  "/admin/forgotpassword",
  "/admin/resetpassword",
  '/uploads',
    '/feedback_reports',
  "/course",
];

// Serve uploaded PDFs and files publicly
const uploadsPath = path.join(__dirname, "uploads");
console.log("Serving static files from:", uploadsPath);
app.use("/uploads", express.static(uploadsPath));

// JWT Middleware: protect all routes except public ones
app.use((req, res, next) => {
  if (
    publicUrls.some((url) => req.originalUrl.startsWith(url)) ||
    req.originalUrl.startsWith("/uploads")
  ) {
    return next();
  }
  verifyToken(req, res, next);
});

//Routes
app.use("/faculty", facultyRouter);
app.use("/coursecordinator", courseCoordinatorRouter);
app.use("/student", studentRouter);
app.use("/addfeedback", addFeedbackRouter);
app.use("/course", courseRouter);
app.use("/admin", adminRouter);
app.use("/role", roleRouter);
app.use("/batch", batchRouter);
app.use("/subject", subjectRouter);
app.use("/feedbacktype", feedbackTypeRouter);
app.use("/feedbackmoduletype", feedbackModuleTypeRouter);
app.use("/feedbackquestion", feedbackQuestionRouter);
app.use("/schedulefeedback", scheduleFeedbackRouter);
app.use("/filledfeedback", filledFeedbackRouter);

// Start Server 
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
