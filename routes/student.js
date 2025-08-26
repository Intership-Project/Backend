const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const cryptojs = require('crypto-js')
const jwt = require('jsonwebtoken')
const config = require('../config')





  
// ✅ DELETE API
router.delete("/delete/:id", (req, res) => {
    const student_id = req.params.id;

    db.query("DELETE FROM student WHERE student_id = ?", [student_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.json({ message: "Student deleted successfully" });
    });
});






// ================= Change Password API =================
router.put('/changepassword', async (req, res) => {
  try {
    const student_id = req.data.student_id   // JWT se aya
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json(utils.createError('Old and new password dono chahiye'))
    }

    // Old password encrypt karke verify
    const encryptedOldPassword = cryptojs.SHA256(oldPassword).toString()

    const [users] = await db.execute(
      `SELECT student_id FROM student WHERE student_id = ? AND password = ?`,
      [student_id, encryptedOldPassword]
    )

    if (users.length === 0) {
      return res.status(400).json(utils.createError('Old password galat hai'))
    }

    // New password encrypt
    const encryptedNewPassword = cryptojs.SHA256(newPassword).toString()

    // Update DB
    await db.execute(
      `UPDATE student SET password = ? WHERE student_id = ?`,
      [encryptedNewPassword, student_id]
    )

    res.json(utils.createSuccess('Password successfully change ho gaya'))
  } catch (ex) {
    res.status(500).json(utils.createError(ex))
  }
})



// POST: student submits feedback
router.post('/submit', async (req, res) => {
  const { student_id, schedulefeedback_id, comments, rating } = req.body

  try {
    // validation (basic check)
    if (!student_id || !schedulefeedback_id || !rating) {
      return res.send(utils.createError('student_id, schedulefeedback_id and rating are required'))
    }

    const statement = `
      INSERT INTO filledfeedback (student_id, schedulefeedback_id, comments, rating)
      VALUES (?, ?, ?, ?)
    `

    const [result] = await db.execute(statement, [
      student_id,
      schedulefeedback_id,
      comments || null,
      rating
    ])

    res.send(
      utils.createSuccess({
        feedbackId: result.insertId,
        student_id,
        schedulefeedback_id,
        comments,
        rating
      })
    )
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})




module.exports = router