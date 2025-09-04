const express = require('express')
const router = express.Router()
const db = require('../db') 
const utils = require('../utils')
const upload = require('../middlewares/upload');
const multer = require('multer');

// Add New Feedback (Admin)
router.post('/', upload.single("pdf_file"), async (req, res) => {
  try {
    const {
      course_id,
      batch_id,
      subject_id,
      faculty_id,
      feedbackmoduletype_id,
      feedbacktype_id,
      date
    } = req.body;

     const pdf_file = req.file ? req.file.filename : null;

    if (!course_id || !subject_id || !faculty_id || !feedbackmoduletype_id || !feedbacktype_id || !date || !pdf_file) {
      return res.send(utils.createError('All required fields must be provided'));
    }

    // Check if Admin already added feedback
    const [adminExisting] = await db.execute(
      `SELECT * FROM addfeedback
       WHERE faculty_id=? AND subject_id=? AND batch_id <=> ? 
       AND feedbackmoduletype_id=? AND feedbacktype_id=? 
       AND added_by_role='Admin' AND added_by_id IS NULL`,
      [faculty_id, subject_id, batch_id, feedbackmoduletype_id, feedbacktype_id]
    );

    if (adminExisting.length > 0) {
      return res.send(utils.createError("You have already added feedback for this faculty"));
    }

    // Check if CC already added feedback
    const [ccExisting] = await db.execute(
      `SELECT * FROM addfeedback
       WHERE faculty_id=? AND subject_id=? AND batch_id <=> ? 
       AND feedbackmoduletype_id=? AND feedbacktype_id=? 
       AND added_by_role='CC'`,
      [faculty_id, subject_id, batch_id, feedbackmoduletype_id, feedbacktype_id]
    );

    if (ccExisting.length > 0) {
      return res.send(utils.createError("A Course Coordinator has already added feedback for this faculty"));
    }

    //  Insert Admin feedback
    const [result] = await db.execute(
      `INSERT INTO addfeedback 
       (course_id, batch_id, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date, pdf_file, added_by_role, added_by_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Admin', NULL)`,
      [course_id, batch_id, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date, pdf_file || null]
    );

    res.send(utils.createSuccess({
      addfeedback_id: result.insertId,
      course_id,
      batch_id,
      subject_id,
      faculty_id,
      feedbackmoduletype_id,
      feedbacktype_id,
      date,
      pdf_file: pdf_file || null,
      added_by_role: "Admin"
    }));

  } catch (ex) {
    res.send(utils.createError(ex.message || ex));
  }
});



//  Get all feedbacks
router.get('/', async (req, res) => {
  try {
    const statement = `SELECT * FROM addfeedback`
    const [rows] = await db.execute(statement)
    res.send(utils.createSuccess(rows))
  } catch (ex) {
    res.send(utils.createError(ex.message || ex))
  }
})


//  Get feedbacks by faculty_id
router.get('/faculty/:faculty_id', async (req, res) => {

  try {
    const { faculty_id } = req.params
    const statement = `SELECT * FROM addfeedback WHERE faculty_id = ?`
    const [rows] = await db.execute(statement, [faculty_id])

    if (rows.length === 0) {
      return res.send(utils.createError('No feedback found for this faculty'))
    }

    res.send(utils.createSuccess(rows))
  } catch (ex) {
    res.send(utils.createError(ex.message || ex))
  }
})

module.exports = router
