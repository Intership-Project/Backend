const express = require('express');
const db = require('../db');
const utils = require('../utils');
const cryptoJs = require('crypto-js');
const jwt = require('jsonwebtoken');
const config = require('../config');
const path = require('path');
const fs = require('fs');
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

// ============================
// 1. PUBLIC ROUTES (No JWT)
// ============================

// REGISTER Faculty
router.post('/register', async (req, res) => {
  const { facultyname, email, password, role_id, course_id } = req.body;

  try {
    if (!facultyname || !email || !password || !role_id) {
      return res.send(utils.createError("Faculty name, email, password and role are required"));
    }

    if (role_id == 3 && !course_id) {
      return res.send(utils.createError("Course selection required for Course Coordinator"));
    }

    const encryptedPassword = String(cryptoJs.SHA256(password));

    const statement = `
      INSERT INTO Faculty (facultyname, email, password, role_id, course_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(statement, [
      facultyname,
      email,
      encryptedPassword,
      role_id,
      role_id == 3 ? course_id : null
    ]);

    res.send(utils.createSuccess({
      facultyId: result.insertId,
      facultyname,
      email,
      role_id,
      course_id: role_id == 3 ? course_id : null
    }));
  } catch (ex) {
    res.send(utils.createError(ex));
  }
});

// LOGIN Faculty
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.send(utils.createError('Email and password are required'));
    }

    const [facultyRows] = await db.execute(
      `SELECT f.faculty_id, f.facultyname, f.email, f.password, f.role_id, f.course_id, r.rolename
       FROM faculty f
       JOIN role r ON f.role_id = r.role_id
       WHERE f.email = ?`,
      [email]
    );

    if (facultyRows.length === 0) return res.send(utils.createError('Invalid email'));

    const faculty = facultyRows[0];
    const encryptedPassword = cryptoJs.SHA256(password).toString();

    if (faculty.password !== encryptedPassword) {
      return res.send(utils.createError('Invalid password'));
    }

    if (faculty.rolename === 'Course Coordinator' && !faculty.course_id) {
      return res.send(utils.createError('Course selection required for Course Coordinator'));
    }

    const token = jwt.sign({
      faculty_id: faculty.faculty_id,
      username: faculty.facultyname,
      email: faculty.email,
      rolename: faculty.rolename,
      course_id: faculty.course_id || null
    }, config.secret, { expiresIn: '1d' });

    res.send(utils.createSuccess({
      token,
      faculty_id: faculty.faculty_id,
      username: faculty.facultyname,
      email: faculty.email,
      rolename: faculty.rolename,
      course_id: faculty.course_id || null
    }));

  } catch (ex) {
    console.error('Faculty Login Error:', ex);
    res.send(utils.createError('Something went wrong during faculty login.'));
  }
});

// Forgot Password
router.post('/forgotpassword', async (req, res) => {
  const { email } = req.body;
  try {
    const [rows] = await db.execute(`SELECT faculty_id, email FROM faculty WHERE email = ?`, [email]);

    if (rows.length === 0) return res.send(utils.createError('Faculty not found with this email'));

    const faculty = rows[0];
    const resetToken = jwt.sign({ faculty_id: faculty.faculty_id, email: faculty.email }, config.secret, { expiresIn: '20m' });

    res.send(utils.createSuccess({ resetToken }));
  } catch (ex) {
    console.error("Forgot Password Error:", ex.message);
    res.send(utils.createError("Something went wrong in forgot password"));
  }
});

// Reset Password
router.post('/resetpassword', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  try {
    const decoded = jwt.verify(resetToken, config.secret);
    const encryptedPassword = cryptoJs.SHA256(newPassword).toString();

    await db.execute(`UPDATE faculty SET password = ? WHERE faculty_id = ?`, [encryptedPassword, decoded.faculty_id]);
    res.send(utils.createSuccess('Password reset successfully'));
  } catch (ex) {
    res.send(utils.createError('Invalid or expired reset token'));
  }
});

// ============================
// 2. PROTECTED ROUTES (JWT Required)
// ============================

router.use(verifyToken);

// Update Profile
router.put('/profile', async (req, res) => {
  const { facultyname, email } = req.body;
  const faculty_id = req.data.faculty_id;

  try {
    const statement = `UPDATE faculty SET facultyname = ?, email = ? WHERE faculty_id = ?`;
    const [result] = await db.execute(statement, [facultyname, email, faculty_id]);

    res.send(utils.createSuccess({ updated: result.affectedRows, facultyId: faculty_id }));
  } catch (ex) {
    res.send(utils.createError(ex.message || ex));
  }
});

// Change Password
router.put('/changepassword', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { faculty_id, rolename } = req.data;

  if (!['Trainer', 'Lab Mentor', 'Course Coordinator'].includes(rolename)) {
    return res.status(403).send(utils.createError("Only Trainer, Lab Mentor or CC can change password"));
  }

  try {
    const [rows] = await db.execute(`SELECT password FROM faculty WHERE faculty_id = ?`, [faculty_id]);
    if (rows.length === 0) return res.send(utils.createError('Faculty not found'));

    const oldHash = cryptoJs.SHA256(oldPassword).toString();
    if (oldHash !== rows[0].password) return res.send(utils.createError('Old password is incorrect'));

    const newHash = cryptoJs.SHA256(newPassword).toString();
    await db.execute(`UPDATE faculty SET password = ? WHERE faculty_id = ?`, [newHash, faculty_id]);

    res.send(utils.createSuccess('Password changed successfully'));
  } catch (ex) {
    res.send(utils.createError("Something went wrong in change-password"));
  }
});



// Get all PDF URLs for logged-in faculty (added by CC or Admin)

router.get("/faculty-feedback", async (req, res) => {
  const { faculty_id } = req.data;

  try {
    const [feedbackRows] = await db.execute(
      `SELECT DISTINCT pdf_file 
       FROM addfeedback 
       WHERE faculty_id = ? AND pdf_file IS NOT NULL`,
      [faculty_id]
    );

    if (feedbackRows.length === 0) 
      return res.send(utils.createError("No feedback found for this faculty"));

    const pdfUrls = feedbackRows.map(f => `${req.protocol}://${req.get('host')}/uploads/feedback_reports/${f.pdf_file}`);
    res.send(utils.createSuccess(pdfUrls));
  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex.message || "Something went wrong"));
  }
});



// Get Trainers & Lab Mentors
router.get('/trainers-labs', async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT faculty_id, facultyname, role_id FROM faculty WHERE role_id IN (1, 2)`);
    res.send(utils.createSuccess(rows));
  } catch (err) {
    res.send(utils.createError(err));
  }
});

// Get batches for a faculty
router.get('/:faculty_id/batches', async (req, res) => {
  const { faculty_id } = req.params;
  try {
    const [rows] = await db.execute(`SELECT role_id, course_id FROM faculty WHERE faculty_id = ?`, [faculty_id]);
    if (rows.length === 0) return res.send(utils.createError("Faculty not found"));

    let batches = [];
    if (rows[0].role_id === 1) {
      const [batchRows] = await db.execute(`SELECT * FROM batch WHERE faculty_id = ?`, [faculty_id]);
      batches = batchRows;
    }

    res.send(utils.createSuccess({ role_id: rows[0].role_id, course_id: rows[0].course_id, batches }));
  } catch (err) {
    res.send(utils.createError(err.message || err));
  }
});

// Get all faculty
router.get("/all", async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT faculty_id, facultyname, role_id FROM faculty`);
    res.send(utils.createSuccess(rows));
  } catch (err) {
    res.send(utils.createError(err.message));
  }
});

// Get single faculty by ID
router.get('/:faculty_id', async (req, res) => {
  try {
    const facultyId = req.params.faculty_id;
    const [rows] = await db.execute(
      `SELECT f.faculty_id, f.facultyname, f.email, r.rolename
       FROM faculty f
       JOIN role r ON f.role_id = r.role_id
       WHERE f.faculty_id = ?`,
      [facultyId]
    );

    if (rows.length === 0) return res.send(utils.createError('Faculty not found'));
    res.send(utils.createSuccess(rows[0]));
  } catch (err) {
    console.error("Error in /faculty/:id", err);
    res.send(utils.createError("Something went wrong"));
  }
});

// Delete faculty (Admin only)
router.delete('/:faculty_id', async (req, res) => {
  const { faculty_id } = req.params;
  if (req.data.usertype !== 'Admin') return res.status(403).send(utils.createError('Only Admin can delete faculty'));

  try {
    const [result] = await db.execute(`DELETE FROM Faculty WHERE faculty_id = ?`, [faculty_id]);
    res.send(utils.createSuccess({ deleted: result.affectedRows, facultyId: faculty_id }));
  } catch (ex) {
    res.send(utils.createError(ex));
  }
});

// Download specific feedback PDF
router.get('/feedbacks/:id/download', async (req, res) => {
  const { faculty_id, rolename } = req.data;
  const addfeedback_id = req.params.id;

  if (!['Trainer', 'Lab Mentor'].includes(rolename)) {
    return res.status(403).send(utils.createError("Access denied"));
  }

  try {
    const [rows] = await db.execute(
      `SELECT pdf_file FROM addfeedback WHERE addfeedback_id = ? AND faculty_id = ? AND pdf_file IS NOT NULL`,
      [addfeedback_id, faculty_id]
    );

    if (rows.length === 0) return res.status(404).send(utils.createError("No PDF found for this feedback"));

    const pdfFile = rows[0].pdf_file;
    const filePath = path.join(process.cwd(), 'uploads/feedback_reports', pdfFile);

    if (!fs.existsSync(filePath)) return res.status(404).send(utils.createError("PDF file not found on server"));

    res.download(filePath, pdfFile);
  } catch (err) {
    console.error("Error in download:", err);
    res.status(500).send(utils.createError("Something went wrong while downloading PDF"));
  }
});

module.exports = router;
