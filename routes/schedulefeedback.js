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

module.exports = router
