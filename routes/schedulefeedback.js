const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')

// CREATE Schedule Feedback
router.post('/register', async (request, response) => {
  const { 
    course_id, 
    subject_id, 
    faculty_id, 
    batch_id, 
    feedbacktype_id, 
    StartDate, 
    EndDate,
    feedbackmoduletype_id
  } = request.body

  try {
    // Required fields check
    if (!course_id || !subject_id || !faculty_id || !feedbacktype_id || !StartDate || !EndDate || !feedbackmoduletype_id) {
      return response.send(utils.createError("All required fields must be provided."))
    }

    let batchValue = null
    if (feedbacktype_id == 2) { 
      if (!batch_id) {
        return response.send(utils.createError("Batch ID is required for Lab feedback type."))
      }
      batchValue = batch_id
    }

    const statement = `
      INSERT INTO ScheduleFeedback 
      (course_id, subject_id, faculty_id, batch_id, feedbacktype_id, StartDate, EndDate, feedbackmoduletype_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    const [result] = await db.execute(statement, [
      course_id, subject_id, faculty_id, batchValue, feedbacktype_id, StartDate, EndDate, feedbackmoduletype_id
    ])

    response.send(
      utils.createSuccess({
        scheduleFeedbackId: result.insertId,
        course_id,
        subject_id,
        faculty_id,
        batch_id: batchValue,
        feedbacktype_id,
        StartDate,
        EndDate,
        feedbackmoduletype_id
      })
    )
  } catch (ex) {
    response.send(utils.createError(ex))
  }
})


// GET All Schedule Feedbacks

router.get('/', async (request, response) => {
  try {
    const statement = `
      SELECT 
        sf.schedulefeedback_id,
        sf.StartDate,
        sf.EndDate,
        sf.feedbacktype_id,
        sf.feedbackmoduletype_id,
        c.course_id,
        c.coursename,
        s.subject_id,
        s.subjectname,
        f.faculty_id,
        f.facultyname,
        b.batch_id,
        b.batchname
      FROM ScheduleFeedback sf
      JOIN Course c ON sf.course_id = c.course_id
      JOIN Subject s ON sf.subject_id = s.subject_id
      JOIN Faculty f ON sf.faculty_id = f.faculty_id
      LEFT JOIN Batch b ON sf.batch_id = b.batch_id
    `

    const [rows] = await db.execute(statement)
    response.send(utils.createSuccess(rows))
  } catch (ex) {
    response.send(utils.createError(ex.message || ex))
  }
})


// GET Schedule Feedback by ID

router.get('/:id', async (request, response) => {
  const { id } = request.params
  try {
    const statement = `
      SELECT 
        sf.schedulefeedback_id,
        sf.StartDate,
        sf.EndDate,
        sf.feedbacktype_id,
        sf.feedbackmoduletype_id,
        c.course_id,
        c.coursename,
        s.subject_id,
        s.subjectname,
        f.faculty_id,
        f.facultyname,
        b.batch_id,
        b.batchname
      FROM ScheduleFeedback sf
      JOIN Course c ON sf.course_id = c.course_id
      JOIN Subject s ON sf.subject_id = s.subject_id
      JOIN Faculty f ON sf.faculty_id = f.faculty_id
      LEFT JOIN Batch b ON sf.batch_id = b.batch_id
      WHERE sf.schedulefeedback_id = ?
    `

    const [rows] = await db.execute(statement, [id])

    if (rows.length === 0) {
      response.send(utils.createError('Schedule Feedback not found'))
    } else {
      response.send(utils.createSuccess(rows[0]))
    }
  } catch (ex) {
    response.send(utils.createError(ex.message || ex))
  }
})


// UPDATE Schedule Feedback with full info

router.put('/:id', async (request, response) => {
  const { id } = request.params
  const { 
    course_id, 
    subject_id, 
    faculty_id, 
    batch_id, 
    feedbacktype_id, 
    StartDate, 
    EndDate,
    feedbackmoduletype_id
  } = request.body

  try {
    // Required fields check
    if (!course_id || !subject_id || !faculty_id || !feedbacktype_id || !StartDate || !EndDate || !feedbackmoduletype_id) {
      return response.send(utils.createError("All required fields must be provided."))
    }

    let batchValue = null
    if (feedbacktype_id == 2) { 
      if (!batch_id) {
        return response.send(utils.createError("Batch ID is required for Lab feedback type."))
      }
      batchValue = batch_id
    }


    // Update record

    const statement = `
      UPDATE ScheduleFeedback
      SET course_id = ?, subject_id = ?, faculty_id = ?, batch_id = ?, feedbacktype_id = ?, StartDate = ?, EndDate = ?, feedbackmoduletype_id = ?
      WHERE schedulefeedback_id = ?
    `

    const [result] = await db.execute(statement, [
      course_id, subject_id, faculty_id, batchValue, feedbacktype_id, StartDate, EndDate, feedbackmoduletype_id, id
    ])

    if (result.affectedRows === 0) {
      return response.send(utils.createError('Schedule Feedback not found'))
    }


   
    // Fetch updated record with JOINs

    const getUpdated = `
      SELECT 
        sf.schedulefeedback_id,
        sf.StartDate,
        sf.EndDate,
        sf.feedbacktype_id,
        sf.feedbackmoduletype_id,
        c.course_id,
        c.coursename,
        s.subject_id,
        s.subjectname,
        f.faculty_id,
        f.facultyname,
        b.batch_id,
        b.batchname
      FROM ScheduleFeedback sf
      JOIN Course c ON sf.course_id = c.course_id
      JOIN Subject s ON sf.subject_id = s.subject_id
      JOIN Faculty f ON sf.faculty_id = f.faculty_id
      LEFT JOIN Batch b ON sf.batch_id = b.batch_id
      WHERE sf.schedulefeedback_id = ?
    `
    const [rows] = await db.execute(getUpdated, [id])

    response.send(utils.createSuccess(rows[0]))
  } catch (ex) {
    response.send(utils.createError(ex.message || ex))
  }
})



//DELETE Schedule Feedback
router.delete('/:id', async (request, response) => {
  const { id } = request.params
  try {
    const statement = `DELETE FROM ScheduleFeedback WHERE schedulefeedback_id = ?`
    const [result] = await db.execute(statement, [id])

    if (result.affectedRows === 0) {
      response.send(utils.createError('Schedule Feedback not found or already deleted'))
    } else {
      response.send(utils.createSuccess(`Schedule Feedback with ID ${id} deleted successfully`))
    }
  } catch (ex) {
    response.send(utils.createError(ex))
  }
})

module.exports = router

