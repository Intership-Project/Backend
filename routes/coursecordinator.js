const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const upload = require('../middlewares/upload');
const multer = require('multer');
const verifyToken = require('../middlewares/verifyToken');




// GET /coursecordinator/feedbacks
router.get("/feedbacks", verifyToken, async (req, res) => {
  try {
    console.log("JWT payload (coursecordinator/feedbacks):", req.data);

    const role = req.data?.rolename;
    const course_id = req.data?.course_id;

    if (role !== "Course Coordinator") {
      return res.send(utils.createError("Not a Course Coordinator"));
    }
    if (!course_id) {
      return res.send(utils.createError("Course ID missing in token"));
    }

    const query = `
      SELECT 
        ff.filledfeedbacks_id,
        ff.comments,
        ff.rating,
        s.studentname,
        ff.student_id, 
        f.facultyname AS faculty_name,
        f.faculty_id,
        sf.schedulefeedback_id,
        sf.course_id,
        C.coursename,   -- take coursename directly from DB
        sub.subjectname AS subject_name,
        sf.feedbackmoduletype_id,
        fmt.fbmoduletypename AS module_name,
        ft.fbtypename AS feedback_type,
        sf.StartDate AS start_date,
        sf.EndDate AS end_date
      FROM FilledFeedback ff
      JOIN Student s ON ff.student_id = s.student_id
      JOIN ScheduleFeedback sf ON ff.schedulefeedback_id = sf.schedulefeedback_id
      JOIN Course C ON sf.course_id = C.course_id   -- this ensures correct course name
      JOIN Faculty f ON sf.faculty_id = f.faculty_id
      JOIN Subject sub ON sf.subject_id = sub.subject_id
      LEFT JOIN FeedbackModuleType fmt ON sf.feedbackmoduletype_id = fmt.feedbackmoduletype_id
      LEFT JOIN FeedbackType ft ON sf.feedbacktype_id = ft.feedbacktype_id
      WHERE sf.course_id = ? 
      ORDER BY ff.filledfeedbacks_id DESC;
    `;

    const [rows] = await db.execute(query, [course_id]);

    if (!rows || rows.length === 0) {
      return res.send(utils.createError("No feedbacks found for your course"));
    }

    
    return res.send(utils.createSuccess(rows));
  } catch (err) {
    console.error("Error fetching feedbacks:", err);
    return res.send(utils.createError(err.message || "Something went wrong while fetching feedbacks"));
  }
});





// Download a single FilledFeedback PDF by ID
router.get('/download/:filledfeedbacks_id', async (req, res) => {
  const { filledfeedbacks_id } = req.params;

  try {
    // Fetch feedback details
    const [feedbackRows] = await db.execute(`
      SELECT
        FF.filledfeedbacks_id,
        FF.schedulefeedback_id,
        FF.comments,
        FF.rating,
        S.studentname,
        C.coursename,
        Sub.subjectname,
        F.facultyname,
        SF.StartDate,
        SF.EndDate
      FROM FilledFeedback AS FF
      INNER JOIN Student AS S ON FF.student_id = S.student_id
      INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      INNER JOIN Course AS C ON SF.course_id = C.course_id
      INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
      INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
      WHERE FF.filledfeedbacks_id = ?
    `, [filledfeedbacks_id]);

    if (feedbackRows.length === 0) return res.status(404).send('Feedback not found');

    const feedback = feedbackRows[0];

    // Fetch all responses for this feedback
    const [responses] = await db.execute(`
      SELECT FQ.questiontext, FR.response_rating
      FROM FeedbackResponses FR
      INNER JOIN FeedbackQuestions FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
      WHERE FR.filledfeedbacks_id = ?
    `, [filledfeedbacks_id]);

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Disposition', `attachment; filename=filledfeedback-${filledfeedbacks_id}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    // PDF content
    doc.fontSize(20).text(`Feedback ID: ${feedback.filledfeedbacks_id}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Student: ${feedback.studentname}`);
    doc.text(`Course: ${feedback.coursename}`);
    doc.text(`Subject: ${feedback.subjectname}`);
    doc.text(`Faculty: ${feedback.facultyname}`);
    doc.text(`Schedule: ${feedback.StartDate} - ${feedback.EndDate}`);
    doc.text(`ScheduleFeedback ID: ${feedback.schedulefeedback_id}`);
    doc.text(`Overall Rating: ${feedback.rating}`);
    doc.text(`Comments: ${feedback.comments || '-'}`);
    doc.moveDown();

    responses.forEach((r, i) => {
      doc.text(`Q${i + 1}: ${r.questiontext}`);
      doc.text(`   Response: ${r.response_rating}`);
    });

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating PDF');
  }
});





// Add new feedback by CC
router.post("/add-feedback", upload.single("pdf_file"), async (req, res) => {
  try {
    const { rolename, course_id: cc_course_id, faculty_id: cc_id } = req.data; // from JWT

    if (rolename !== "Course Coordinator") {
      return res.send(utils.createError("Only Course Coordinator can add feedback"));
    }

    // Get fields from body
    const { batch_id, subject_id, faculty_id: selectedFacultyId, feedbackmoduletype_id, feedbacktype_id, date } = req.body;

    // New: If only faculty_id is sent, return batches 
    if (selectedFacultyId && !subject_id && !feedbackmoduletype_id && !feedbacktype_id && !date) {
      const [facultyRows] = await db.execute(
        "SELECT role_id FROM Faculty WHERE faculty_id = ?",
        [selectedFacultyId]
      );

      if (facultyRows.length === 0) {
        return res.send(utils.createError("Invalid faculty selected"));
      }


      const facultyRoleId = facultyRows[0].role_id;

      // Only Lab Mentor (role_id = 1) has batches
      let batches = [];
      if (facultyRoleId === 1) {
        [batches] = await db.execute(
          "SELECT * FROM Batch WHERE course_id = ?",
          [cc_course_id]
        );
      }
      // Return batches and role_id
      return res.send(utils.createSuccess({ batches, role_id: facultyRoleId }));
    }


    // Existing add-feedback logic
    if (!subject_id || !selectedFacultyId || !feedbackmoduletype_id || !feedbacktype_id || !date || !req.file) {
      return res.send(utils.createError("All required fields and PDF must be provided"));
    }

    // Check if Admin already added feedback for this faculty
    const [adminExisting] = await db.execute(
      `SELECT * FROM addfeedback
       WHERE faculty_id=? AND subject_id=? AND batch_id <=> ?
       AND feedbackmoduletype_id=? AND feedbacktype_id=? 
       AND added_by_role='Admin' AND added_by_id IS NULL`,
      [selectedFacultyId, subject_id, batch_id || null, feedbackmoduletype_id, feedbacktype_id]
    );

    if (adminExisting.length > 0) {
      return res.send(utils.createError("Admin has already added feedback for this faculty"));
    }

    // Check if this CC already added feedback
    const [ccExisting] = await db.execute(
      `SELECT * FROM addfeedback
       WHERE faculty_id=? AND subject_id=? AND batch_id <=> ? 
       AND feedbackmoduletype_id=? AND feedbacktype_id=? 
       AND added_by_role='CC' AND added_by_id=?`,
      [selectedFacultyId, subject_id, batch_id || null, feedbackmoduletype_id, feedbacktype_id, cc_id]
    );

    if (ccExisting.length > 0) {
      return res.send(utils.createError("You have already added feedback for this faculty/subject/batch."));
    }

    // Ensure faculty exists
    const [facultyRows] = await db.execute(
      "SELECT * FROM Faculty WHERE faculty_id = ?",
      [selectedFacultyId]
    );

    if (facultyRows.length === 0) {
      return res.send(utils.createError("Invalid faculty selected"));
    }

    const facultyRoleId = facultyRows[0].role_id;

    // Lab Mentor → must have batch
    if (facultyRoleId === 1 && !batch_id) {
      return res.send(utils.createError("Batch ID is required for Lab Mentor feedback"));
    }

    // Trainer → ignore batch
    let finalBatchId = null;
    if (facultyRoleId === 1) {
      finalBatchId = batch_id; // Lab Mentor gets batch
    }

    // Insert feedback
    const [result] = await db.execute(
      `INSERT INTO addfeedback 
        (course_id, batch_id, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date, pdf_file, added_by_role, added_by_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CC', ?)`,
      [cc_course_id, finalBatchId, subject_id, selectedFacultyId, feedbackmoduletype_id, feedbacktype_id, date, req.file.filename, cc_id]
    );

    res.send(utils.createSuccess({
      addfeedback_id: result.insertId,
      course_id: cc_course_id,
      batch_id: finalBatchId,
      subject_id,
      faculty_id: selectedFacultyId,
      feedbackmoduletype_id,
      feedbacktype_id,
      date,
      pdf_file: req.file.filename,
      added_by_role: "Course Coordinator",
      added_by_id: cc_id
    }));

  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex.message || "Something went wrong"));
  }
});



// GET CC assigned course by CC id
router.get('/my-course', async (req, res) => {
  const ccId = req.data.faculty_id; // from token
  try {
    const statement = `
      SELECT C.course_id, C.coursename
      FROM Faculty F
      LEFT JOIN Course C ON F.course_id = C.course_id
      WHERE F.faculty_id = ? AND F.role_id = 7 -- 7 = Course Coordinator
    `;
    const [rows] = await db.execute(statement, [ccId]);
    if (rows.length === 0) {
      return res.send(utils.createError("No course assigned to this CC"));
    }
    res.send(utils.createSuccess(rows[0]));
  } catch (err) {
    res.send(utils.createError(err.message || err));
  }
});



module.exports = router;