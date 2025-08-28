const express = require('express')
const router = express.Router()
const db = require('../db') 
const utils = require('../utils')

// Add New Feedback
router.post('/', async (req, res) => {
  try {
    const {
      course_id,
      batch_id,
      subject_id,
      faculty_id,
      feedbackmoduletype_id,
      feedbacktype_id,
      date,
      pdf_file
    } = req.body

    if (!course_id || !batch_id || !subject_id || !faculty_id || !feedbackmoduletype_id || !feedbacktype_id || !date) {
      return res.send(utils.createError('All required fields must be provided'))
    }

    const statement = `
      INSERT INTO addfeedback 
      (course_id, batch_id, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date, pdf_file)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    const [result] = await db.execute(statement, [
      course_id,
      batch_id,
      subject_id,
      faculty_id,
      feedbackmoduletype_id,
      feedbacktype_id,
      date,
      pdf_file || null
    ])

    res.send(utils.createSuccess({
      addfeedback_id: result.insertId,
      course_id,
      batch_id,
      subject_id,
      faculty_id,
      feedbackmoduletype_id,
      feedbacktype_id,
      date,
      pdf_file: pdf_file || null
    }))
  } catch (ex) {
    res.send(utils.createError(ex.message || ex))
  }
})

// ✅ Get all feedbacks
router.get('/', async (req, res) => {
  try {
    const statement = `SELECT * FROM addfeedback`
    const [rows] = await db.execute(statement)
    res.send(utils.createSuccess(rows))
  } catch (ex) {
    res.send(utils.createError(ex.message || ex))
  }
})

// ✅ Get addfeedback by faculty_id
router.get('/:faculty_id', async (req, res) => {
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
