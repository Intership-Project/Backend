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


router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT af.addfeedback_id, af.course_id, c.coursename, 
              af.batch_id, b.batchname,
              af.subject_id, s.subjectname,
              af.faculty_id, f.facultyname,
              af.feedbackmoduletype_id, fmt.fbmoduletypename,
              af.feedbacktype_id, ft.fbtypename,
              af.date, af.pdf_file, af.created_at
       FROM addfeedback af
       JOIN Course c ON af.course_id = c.course_id
       LEFT JOIN Batch b ON af.batch_id = b.batch_id
       JOIN Subject s ON af.subject_id = s.subject_id
       JOIN Faculty f ON af.faculty_id = f.faculty_id
       JOIN FeedbackModuleType fmt ON af.feedbackmoduletype_id = fmt.feedbackmoduletype_id
       JOIN FeedbackType ft ON af.feedbacktype_id = ft.feedbacktype_id
       ORDER BY af.created_at DESC`
    );

    res.send(utils.createSuccess(rows));
  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex.message || "Something went wrong"));
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
      `INSERT INTO Addfeedback 
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



// Get All Feedbacks
router.get("/all", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT af.addfeedback_id, af.course_id, c.coursename, 
              af.batch_id, b.batchname,
              af.subject_id, s.subjectname,
              af.faculty_id, f.facultyname,
              af.feedbackmoduletype_id, af.feedbacktype_id, 
              af.date, af.pdf_file, af.created_at
       FROM Addfeedback af
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
