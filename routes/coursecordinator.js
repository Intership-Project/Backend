const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const upload = require('../middlewares/upload');
const multer = require('multer');
const verifyToken = require('../middlewares/verifyToken');



//addfacultyfeedback
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







//homecc and addfacultyfeedback 
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