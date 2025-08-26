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

    //  Validate required fields
    if (!course_id || !batch_id || !subject_id || !faculty_id || !feedbackmoduletype_id || !feedbacktype_id || !date) {
      return res.send(utils.createError('All required fields must be provided'))
    }

    //  Insert into DB
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

    //  Response
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


module.exports = router