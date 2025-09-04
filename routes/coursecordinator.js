const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const upload = require('../middlewares/upload');
const multer = require('multer');



// GET /coursecordinator/feedbacks
router.get("/feedbacks", async (req, res) => {
  try {
    const role = req.data?.rolename;
    const course_id = req.data?.course_id;

    if (role !== "Course Coordinator") {
      return res.send(utils.createError("Not a Course Coordinator"));
    }

    if (!course_id) {
      return res.send(utils.createError("Course ID missing in token"));
    }

    const query = `
      SELECT ff.filledfeedbacks_id,
             ff.comments,
             ff.rating AS overall_rating,
             s.student_id,
             s.studentname,
             f.faculty_id,
             f.facultyname AS faculty_name,
             f.email AS faculty_email,
             sf.schedulefeedback_id,
             sf.course_id,
             fr.feedbackquestion_id,
             fr.response_rating
      FROM filledfeedback ff
      JOIN student s ON ff.student_id = s.student_id
      JOIN schedulefeedback sf ON ff.schedulefeedback_id = sf.schedulefeedback_id
      JOIN faculty f ON sf.faculty_id = f.faculty_id
      LEFT JOIN feedbackresponses fr ON ff.filledfeedbacks_id = fr.filledfeedbacks_id
      WHERE sf.course_id = ?
      ORDER BY ff.filledfeedbacks_id DESC
    `;

    const [rows] = await db.execute(query, [course_id]);

    if (rows.length === 0) {
      return res.send(utils.createError("No feedbacks found for your course"));
    }

    // Aggregate responses per student & per feedback
    const result = {};
    rows.forEach(row => {
      const key = row.filledfeedbacks_id;
      if (!result[key]) {
        result[key] = {
          filledfeedbacks_id: row.filledfeedbacks_id,
          comments: row.comments,
          overall_rating: row.overall_rating,
          student_id: row.student_id,
          studentname: row.studentname,
          faculty_id: row.faculty_id,
          faculty_name: row.faculty_name,
          faculty_email: row.faculty_email,
          schedulefeedback_id: row.schedulefeedback_id,
          course_id: row.course_id,
          responses: []
        };
      }
      if (row.feedbackquestion_id) {
        result[key].responses.push({
          feedbackquestion_id: row.feedbackquestion_id,
          response_rating: row.response_rating
        });
      }
    });

    res.send(utils.createSuccess(Object.values(result)));

  } catch (err) {
    console.error("Error fetching feedbacks:", err);
    return res.send(utils.createError("Something went wrong while fetching feedbacks"));
  }
});










// Add new feedback by CC
router.post("/add-feedback", upload.single("pdf_file"), async (req, res) => {
  try {
    const { rolename, course_id: cc_course_id } = req.data; // from JWT

    if (rolename !== "Course Coordinator") {
      return res.send(utils.createError("Only Course Coordinator can add feedback"));
    }

    // Get other fields from body
    const { batch_id, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date } = req.body;

    if (!subject_id || !faculty_id || !feedbackmoduletype_id || !feedbacktype_id || !date || !req.file) {
      return res.send(utils.createError("All required fields and PDF must be provided"));
    }

 // Check if Admin already added feedback for this faculty
    const [adminExisting] = await db.execute(
      `SELECT * FROM addfeedback
   WHERE faculty_id=? AND subject_id=? AND batch_id <=> ?
   AND feedbackmoduletype_id=? AND feedbacktype_id=? 
   AND added_by_role='Admin' AND added_by_id IS NULL`,
      [faculty_id, subject_id, batch_id || null, feedbackmoduletype_id, feedbacktype_id]
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
      [faculty_id, subject_id, batch_id || null, feedbackmoduletype_id, feedbacktype_id, cc_id]
    );

    if (ccExisting.length > 0) {
      return res.send(utils.createError("You have already added feedback for this faculty/subject/batch."));
    }



    // Ensure faculty belongs to CC course
    const [facultyRows] = await db.execute(
      "SELECT * FROM faculty WHERE faculty_id = ?",
      [faculty_id]
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

    // Insert into addfeedback
    const [result] = await db.execute(
      `INSERT INTO addfeedback 
        (course_id, batch_id, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date, pdf_file,added_by_role, added_by_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CC', ?)`,
      [cc_course_id, finalBatchId, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date, req.file.filename, cc_id]
    );

    res.send(utils.createSuccess({
      addfeedback_id: result.insertId,
      course_id: cc_course_id,
      batch_id: finalBatchId,
      subject_id,
      faculty_id,
      feedbackmoduletype_id,
      feedbacktype_id,
      date,
      pdf_file: req.file.filename,
      added_by_role: "CC",
      added_by_id: cc_id
    }));

  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex.message || "Something went wrong"));
  }
});

module.exports = router;