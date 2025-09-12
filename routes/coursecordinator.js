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
  ff.rating AS overall_rating,
  s.studentname,
  f.facultyname AS faculty_name,
  f.faculty_id,
  sf.schedulefeedback_id,
  sub.subjectname AS subject_name,
   sf.feedbackmoduletype_id, 
  fmt.fbmoduletypename AS module,        
  ft.fbtypename AS feedback_type,        
  sf.StartDate AS start_date,            
  sf.EndDate AS end_date                  
FROM filledfeedback ff
JOIN student s ON ff.student_id = s.student_id
JOIN schedulefeedback sf ON ff.schedulefeedback_id = sf.schedulefeedback_id
JOIN faculty f ON sf.faculty_id = f.faculty_id
JOIN subject sub ON sf.subject_id = sub.subject_id
LEFT JOIN feedbackmoduletype fmt ON sf.feedbackmoduletype_id = fmt.feedbackmoduletype_id
LEFT JOIN feedbacktype ft ON sf.feedbacktype_id = ft.feedbacktype_id
WHERE sf.course_id = ?
ORDER BY ff.filledfeedbacks_id DESC;


`;

    const [rows] = await db.execute(query, [course_id]);

    if (!rows || rows.length === 0) {
      return res.send(utils.createError("No feedbacks found for your course"));
    }

    // Aggregate responses per filledfeedbacks_id
    const grouped = {};
    for (const row of rows) {
      const key = row.filledfeedbacks_id;
      if (!grouped[key]) {
        grouped[key] = {
          filledfeedbacks_id: row.filledfeedbacks_id,
          comments: row.comments,
          overall_rating: row.overall_rating,
          student_id: row.student_id,
          studentname: row.studentname,
          faculty_id: row.faculty_id,
          faculty_name: row.faculty_name,
          schedulefeedback_id: row.schedulefeedback_id,
          course_id: row.course_id,
          start_date: row.start_date,
          end_date: row.end_date,
          subject_name: row.subject_name,
          module_name: row.module,
          feedbackmoduletype_id: row.feedbackmoduletype_id,
          feedback_type: row.feedback_type,
          responses: []
        };

      }
      if (row.feedbackquestion_id) {
        grouped[key].responses.push({
          feedbackquestion_id: row.feedbackquestion_id,
          response_rating: row.response_rating
        });
      }
    }
    return res.send(utils.createSuccess(Object.values(grouped)));
  } catch (err) {
    console.error("Error fetching feedbacks:", err);
    // send actual error message (helpful while debugging). You can change to generic message later.
    return res.send(utils.createError(err.message || "Something went wrong while fetching feedbacks"));
  }
});




// GET /coursecordinator/feedbacks/:schedulefeedback_id
router.get("/feedbacks/:schedulefeedback_id", verifyToken, async (req, res) => {
  try {
    const { schedulefeedback_id } = req.params;

    const query = `
      SELECT ff.filledfeedbacks_id,
             ff.comments,
             ff.rating AS overall_rating,
             s.studentname,
             fq.feedbackquestion_id,
             fq.questiontext,
             fr.response_rating
      FROM filledfeedback ff
      JOIN student s ON ff.student_id = s.student_id
      JOIN feedbackresponses fr ON ff.filledfeedbacks_id = fr.filledfeedbacks_id
      JOIN feedbackquestions fq ON fr.feedbackquestion_id = fq.feedbackquestion_id
      WHERE ff.schedulefeedback_id = ?
      ORDER BY ff.filledfeedbacks_id DESC
    `;

    const [rows] = await db.execute(query, [schedulefeedback_id]);

    if (rows.length === 0) {
      return res.send(utils.createError("No detailed feedbacks found"));
    }

    res.send(utils.createSuccess(rows));
  } catch (err) {
    console.error("Error fetching feedback details:", err);
    return res.send(utils.createError("Something went wrong"));
  }
});




// GET /cc/feedbacks/:facultyId/download-anon
router.get('/cc/feedbacks/:facultyId/download-anon', async (req, res) => {
  const facultyId = req.params.facultyId;
  const user = req.data; // JWT decoded data

  try {
    // Role check: Only Course Coordinator allowed
    if (user.rolename !== "Course Coordinator") {
      return res.status(403).json({ message: "Access denied: Only Course Coordinator can download anonymized reports" });
    }

    // Query without student names (anonymized)
    let query = `
      SELECT
        FF.filledfeedbacks_id,
        FF.comments,
        FF.rating,
        C.coursename,
        Sub.subjectname,
        F.facultyname,
        SF.StartDate,
        SF.EndDate
      FROM FilledFeedback AS FF
      INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      INNER JOIN Course AS C ON SF.course_id = C.course_id
      INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
      INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
      WHERE SF.faculty_id = ? AND SF.course_id = ?
      ORDER BY FF.filledfeedbacks_id
    `;

    let params = [facultyId, user.course_id]; // CC only in his course
    const [rows] = await db.execute(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No feedback found for this faculty" });
    }

    // Fetch question responses
    const feedbackWithResponses = [];
    for (const fb of rows) {
      const [responses] = await db.execute(`
        SELECT FQ.questiontext, FR.response_rating
        FROM FeedbackResponses FR
        INNER JOIN FeedbackQuestions FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
        WHERE FR.filledfeedbacks_id = ?
      `, [fb.filledfeedbacks_id]);
      feedbackWithResponses.push({ ...fb, responses });
    }

    //Generate anonymized PDF
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Disposition", `attachment; filename=faculty-${facultyId}-anon-feedbacks.pdf`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // Title
    doc.fontSize(20).text(`Anonymized Feedback Report for ${rows[0].facultyname}`, { align: "center" });
    doc.moveDown();

    feedbackWithResponses.forEach((fb, index) => {
      doc.fontSize(14).text(`Feedback #${index + 1}`, { underline: true });
      doc.moveDown(0.3);

      // Student name removed
      doc.text(`Course: ${fb.coursename}`);
      doc.text(`Subject: ${fb.subjectname}`);
      doc.text(`Period: ${fb.StartDate} - ${fb.EndDate}`);
      doc.text(`Overall Rating: ${fb.rating}`);
      if (fb.comments) doc.text(`Comments: ${fb.comments}`);
      doc.moveDown(0.5);

      fb.responses.forEach((r, i) => {
        doc.text(`   Q${i + 1}: ${r.questiontext}`);
        doc.text(`      Response: ${r.response_rating}`);
      });

      doc.moveDown(1);
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating anonymized PDF" });
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
        "SELECT role_id FROM faculty WHERE faculty_id = ?",
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
          "SELECT * FROM batch WHERE course_id = ?",
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
      "SELECT * FROM faculty WHERE faculty_id = ?",
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
      FROM faculty F
      LEFT JOIN Course C ON F.course_id = C.course_id
      WHERE F.faculty_id = ? AND F.role_id = 3  -- 3 = Course Coordinator
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