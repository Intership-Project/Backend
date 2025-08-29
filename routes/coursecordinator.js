const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')





// View Faculty Feedbacks
router.post('/feedbacks', async (req, res) => {
  try {
    const { role, course_id } = req.body

    let query = `
      SELECT ff.filledfeedbacks_id,
             ff.comments,
             ff.rating,
             s.student_id,
             s.student_name,
             f.faculty_id,
             f.facultyname AS faculty_name,
             f.email AS faculty_email,
             sf.schedulefeedback_id,
             sf.course_id
      FROM filledfeedback ff
      JOIN student s ON ff.student_id = s.student_id
      JOIN schedulefeedback sf ON ff.schedulefeedback_id = sf.schedulefeedback_id
      JOIN faculty f ON sf.faculty_id = f.faculty_id
    `
    let params = []

    if (role === 'Course Coordinator') {
      if (!course_id) {
        return res.send(utils.createError("Course must be selected for Course Coordinator"))
      }

      query += ` WHERE sf.course_id = ? ORDER BY ff.filledfeedbacks_id DESC`
      params.push(course_id)

      const [rows] = await db.execute(query, params)
      return res.send(utils.createSuccess(rows))
    } else {
      // if role not handled yet
      return res.send(utils.createError("Invalid role or not implemented"))
    }

  } catch (err) {
    console.error("Error fetching feedbacks:", err)
    return res.send(utils.createError("Something went wrong while fetching feedbacks"))
  }
})







// Add New Feedback

router.post('/add-feedback', async (req, res) => {
  try {
    const {

      role_id,
      course_id,
      batch_id,
      subject_id,
      faculty_id,
      feedbackmoduletype_id,
      feedbacktype_id,
      date,
      pdf_file
    } = req.body



    // Only CC (role_id === 1) can add feedback
    if (role_id !== 1) {
      return res.send(utils.createError("Only Course Coordinator can add feedback"))
    }


    //  Validate required fields
    if (!course_id || !batch_id || !subject_id || !faculty_id || !feedbackmoduletype_id || !feedbacktype_id || !date) {
      return res.send(utils.createError('All required fields must be provided'))
    }


    // Check if CC is allowed to add feedback for this course
    const [rows] = await db.execute(
      `SELECT * FROM Faculty WHERE faculty_id = ? AND course_id = ?`,
      [faculty_id, course_id]
    )
    if (rows.length === 0) {
      return res.send(utils.createError("You can only add feedback for your own course"))
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




module.exports = router;
