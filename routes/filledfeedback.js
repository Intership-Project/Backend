const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')

//  POST FilledFeedback with responses
router.post('/', async (req, res) => {
  const { student_id, schedulefeedback_id, comments, questionResponses } = req.body
  let connection

  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    // 1. Insert into FilledFeedback (rating = 0 for now)
    const insertFeedback = `
      INSERT INTO FilledFeedback (student_id, schedulefeedback_id, comments, rating)
      VALUES (?, ?, ?, 0)
    `
    const [result] = await connection.execute(insertFeedback, [
      student_id ?? null,
      schedulefeedback_id ?? null,
      comments ?? null,
    ])

    const filledfeedbacks_id = result.insertId

    // 2. Insert responses if present
    if (Array.isArray(questionResponses) && questionResponses.length > 0) {
      const insertResponse = `
        INSERT INTO FeedbackResponses (filledfeedbacks_id, feedbackquestion_id, response_rating)
        VALUES (?, ?, ?)
      `
      for (const response of questionResponses) {
        await connection.execute(insertResponse, [
          filledfeedbacks_id,
          response.feedbackquestion_id ?? null,
          response.response_rating ?? null,
        ])
      }
    }

    // 3. Update rating as average of responses
    const updateRating = `
      UPDATE FilledFeedback
      SET rating = (
        SELECT AVG(
          CASE
            WHEN FR.response_rating = 'excellent' THEN 5
            WHEN FR.response_rating = 'good' THEN 4
            WHEN FR.response_rating = 'satisfactory' THEN 3
            WHEN FR.response_rating = 'unsatisfactory' THEN 2
            ELSE 1
          END
        )
        FROM FeedbackResponses FR
        WHERE FR.filledfeedbacks_id = ?
      )
      WHERE filledfeedbacks_id = ?
    `
    await connection.execute(updateRating, [filledfeedbacks_id, filledfeedbacks_id])

    await connection.commit()

    // 4. Get the saved feedback
    const [rows] = await connection.execute(
      `SELECT * FROM FilledFeedback WHERE filledfeedbacks_id = ?`,
      [filledfeedbacks_id]
    )

    res.send(utils.createSuccess(rows[0]))
  } catch (ex) {
    if (connection) await connection.rollback()
    res.send(utils.createError(ex))
  } finally {
    if (connection) connection.release()
  }
})
// GET all FilledFeedback (with course, subject, faculty, student)
router.get('/', async (req, res) => {
  try {
    const statement = `
      SELECT
        FF.filledfeedbacks_id,
        FF.comments,
        FF.rating,
        S.studentname,
        C.coursename,
        Sub.subjectname,
        F.facultyname,
        SF.StartDate,
        SF.EndDate
      FROM FilledFeedback AS FF
      INNER JOIN Student AS S ON FF.student_id = S.student_id
      INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      INNER JOIN Course AS C ON SF.course_id = C.course_id
      INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
      INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
    `
    const [rows] = await db.execute(statement)
    res.send(utils.createSuccess(rows))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})
// GET FilledFeedback by ID (with full info)
router.get('/:filledfeedbacks_id', async (req, res) => {
  const { filledfeedbacks_id } = req.params
  try {
    const statement = `
      SELECT
        FF.filledfeedbacks_id,
        FF.comments,
        FF.rating,
        S.studentname,
        C.coursename,
        Sub.subjectname,
        F.facultyname,
        SF.StartDate,
        SF.EndDate
      FROM FilledFeedback AS FF
      INNER JOIN Student AS S ON FF.student_id = S.student_id
      INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      INNER JOIN Course AS C ON SF.course_id = C.course_id
      INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
      INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
      WHERE FF.filledfeedbacks_id = ?
    `
    const [rows] = await db.execute(statement, [filledfeedbacks_id])
    if (rows.length === 0) {
      res.send(utils.createError('FilledFeedback not found'))
    } else {
      res.send(utils.createSuccess(rows[0]))
    }
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})
// DELETE FilledFeedback and its FeedbackResponses
router.delete('/:filledfeedbacks_id', async (req, res) => {
  const { filledfeedbacks_id } = req.params
  let connection
  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    await connection.execute(`DELETE FROM FeedbackResponses WHERE filledfeedbacks_id = ?`, [filledfeedbacks_id])
    const [result] = await connection.execute(
      `DELETE FROM FilledFeedback WHERE filledfeedbacks_id = ?`,
      [filledfeedbacks_id]
    )

    await connection.commit()

    if (result.affectedRows === 0) {
      res.send(utils.createError('FilledFeedback not found'))
    } else {
      res.send(utils.createSuccess(`Feedback ID ${filledfeedbacks_id} deleted successfully`))
    }
  } catch (ex) {
    if (connection) await connection.rollback()
    res.send(utils.createError(ex))
  } finally {
    if (connection) connection.release()
  }
})

  //GET Responses for a specific FilledFeedback

  router.get('/:filledfeedbacks_id/responses', async (req, res) => {
    const { filledfeedbacks_id } = req.params
    try {
      const statement = `
        SELECT
          FQ.questiontext,
          FR.response_rating
        FROM FeedbackResponses AS FR
        INNER JOIN FeedbackQuestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
        WHERE FR.filledfeedbacks_id = ?
      `
      const [rows] = await db.execute(statement, [filledfeedbacks_id])
      if (rows.length === 0) {
        res.send(utils.createError('No responses found'))
      } else {
        res.send(utils.createSuccess(rows))
      }
    } catch (ex) {
      res.send(utils.createError(ex))
    }
  })
     //GET Feedback Summary by Faculty & Course

router.get('/summary/by-faculty-course', async (req, res) => {
  const { faculty_id, course_id } = req.query
  if (!faculty_id || !course_id) {
    return res.send(utils.createError('Faculty ID and Course ID are required'))
  }

  try {
    const statement = `
      SELECT
        FQ.questiontext,
        SUM(CASE WHEN FR.response_rating='excellent' THEN 1 ELSE 0 END) AS Excellent,
        SUM(CASE WHEN FR.response_rating='good' THEN 1 ELSE 0 END) AS Good,
        SUM(CASE WHEN FR.response_rating='satisfactory' THEN 1 ELSE 0 END) AS Satisfactory,
        SUM(CASE WHEN FR.response_rating='unsatisfactory' THEN 1 ELSE 0 END) AS Unsatisfactory
      FROM FeedbackResponses AS FR
      INNER JOIN FeedbackQuestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
      INNER JOIN FilledFeedback AS FF ON FR.filledfeedbacks_id = FF.filledfeedbacks_id
      INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      WHERE SF.faculty_id = ? AND SF.course_id = ?
      GROUP BY FQ.feedbackquestion_id
    `
    const [rows] = await db.execute(statement, [faculty_id, course_id])
    res.send(utils.createSuccess(rows))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})
  

module.exports = router