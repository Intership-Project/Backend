const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')


//  Schedule Feedback 
router.post('/bulk', async (req, res) => {
  const { course_id, subject_id, feedbacktype_id, StartDate, EndDate, assignments } = req.body
  // `assignments` will be an array of { batch_id, faculty_id }
  if (!assignments || assignments.length === 0) {
    return res.send(utils.createError('At least one batch/faculty assignment is required'))
  }

  try {
    const statement = `
      INSERT INTO ScheduleFeedback 
      (course_id, subject_id, faculty_id, batch_id, feedbacktype_id, StartDate, EndDate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `

    for (const item of assignments) {
      await db.execute(statement, [
        course_id,
        subject_id,
        item.faculty_id,
        item.batch_id,
        feedbacktype_id,
        StartDate,
        EndDate
      ])
    }

    res.send(utils.createSuccess('Feedback scheduled for multiple batches successfully'))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

module.exports = router