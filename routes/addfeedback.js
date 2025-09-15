const express = require("express");
const router = express.Router();
const db = require("../db");
const utils = require("../utils");
const upload = require("../middlewares/upload");

//  Admin Add Feedback
router.post("/add", upload.single("pdf_file"), async (req, res) => {
  try {
    const { id: adminId, username, email } = req.data; // decoded from admin JWT

    if (!adminId) {
      return res.send(utils.createError("Unauthorized: Only Admin can add feedback"));
    }

    // Fields from body
    const { course_id, batch_id, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date } = req.body;

    if (!course_id || !subject_id || !faculty_id || !feedbackmoduletype_id || !feedbacktype_id || !date || !req.file) {
      return res.send(utils.createError("All required fields and PDF must be provided"));
    }

    // Ensure faculty exists
    const [facultyRows] = await db.execute("SELECT * FROM Faculty WHERE faculty_id = ?", [faculty_id]);
    if (facultyRows.length === 0) {
      return res.send(utils.createError("Invalid faculty selected"));
    }

    const facultyRoleId = facultyRows[0].role_id;

    // Lab Mentor → must have batch
    if (facultyRoleId === 1 && !batch_id) {
      return res.send(utils.createError("Batch ID is required for Lab Mentor feedback"));
    }

    // Decide batch
    let finalBatchId = null;
    if (facultyRoleId === 1) {
      finalBatchId = batch_id; // only lab mentor needs batch
    }

    // Insert into addfeedback
    const [result] = await db.execute(
      `INSERT INTO addfeedback 
        (course_id, batch_id, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date, pdf_file)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [course_id, finalBatchId, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date, req.file.filename]
    );

    res.send(
      utils.createSuccess({
        addfeedback_id: result.insertId,
        course_id,
        batch_id: finalBatchId,
        subject_id,
        faculty_id,
        feedbackmoduletype_id,
        feedbacktype_id,
        date,
        pdf_file: req.file.filename,
        addedBy: "Admin",
      })
    );
  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex.message || "Something went wrong"));
  }
});

//  Get All Feedbacks
router.get("/all", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT af.addfeedback_id, af.course_id, c.coursename, 
              af.batch_id, b.batchname,
              af.subject_id, s.subjectname,
              af.faculty_id, f.facultyname,
              af.feedbackmoduletype_id, af.feedbacktype_id, 
              af.date, af.pdf_file, af.created_at
       FROM addfeedback af
       LEFT JOIN Course c ON af.course_id = c.course_id
       LEFT JOIN Batch b ON af.batch_id = b.batch_id
       LEFT JOIN Subject s ON af.subject_id = s.subject_id
       LEFT JOIN Faculty f ON af.faculty_id = f.faculty_id
       ORDER BY af.created_at DESC`
    );

    res.send(utils.createSuccess(rows));
  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex.message || "Something went wrong"));
  }
});



module.exports = router;
