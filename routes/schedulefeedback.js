 const express = require('express')
 const router = express.Router()
 const db = require('../db')
 const utils = require('../utils')

// // CREATE Schedule Feedback
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
    // const statement = `
    //   SELECT 
    //     sf.schedulefeedback_id,
    //     sf.StartDate,
    //     sf.EndDate,
    //     sf.feedbacktype_id,
    //     sf.feedbackmoduletype_id,
    //     c.course_id,
    //     c.coursename,
    //     s.subject_id,
    //     s.subjectname,
    //     f.faculty_id,
    //     f.facultyname,
    //     b.batch_id,
    //     b.batchname
    //   FROM ScheduleFeedback sf
    //   JOIN Course c ON sf.course_id = c.course_id
    //   JOIN Subject s ON sf.subject_id = s.subject_id
    //   JOIN Faculty f ON sf.faculty_id = f.faculty_id
    //   LEFT JOIN Batch b ON sf.batch_id = b.batch_id
    // `

    const statement = `
      SELECT 
        sf.schedulefeedback_id,
        sf.StartDate,
        sf.EndDate,
        sf.feedbacktype_id,
        ft.fbtypename,
        c.coursename,
        s.subjectname
      FROM ScheduleFeedback sf
      JOIN Course c ON sf.course_id = c.course_id
      JOIN Subject s ON sf.subject_id = s.subject_id
      LEFT JOIN FeedbackType ft ON sf.feedbacktype_id = ft.feedbacktype_id
    `;
      

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


// delete feedback
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Delete related FeedbackResponses first
    await db.execute(`
      DELETE fr
      FROM FeedbackResponses fr
      INNER JOIN FilledFeedback ff ON fr.filledfeedbacks_id = ff.filledfeedbacks_id
      WHERE ff.schedulefeedback_id = ?
    `, [id]);

    // Delete related FilledFeedback
    await db.execute(`DELETE FROM FilledFeedback WHERE schedulefeedback_id = ?`, [id]);

    // Delete ScheduleFeedback
    const [result] = await db.execute(`DELETE FROM ScheduleFeedback WHERE schedulefeedback_id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.send({ status: 'error', error: 'Schedule Feedback not found' });
    }

    res.send({ status: 'success', message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.send({ status: 'error', error: err.message || err });
  }
});



// Save Schedule Feedback
router.post('/', async (req, res) => {
  const {
    course_id,
    subject_id,
    faculty_id,
    batch_id,
    feedbacktype_id,
    feedbackmoduletype_id,
    StartDate,
    EndDate,
  } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO ScheduleFeedback 
      (course_id, subject_id, faculty_id, batch_id, feedbacktype_id, feedbackmoduletype_id, StartDate, EndDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [course_id, subject_id, faculty_id, batch_id, feedbacktype_id, feedbackmoduletype_id, StartDate, EndDate]
    );

    res.send(utils.createSuccess({ schedulefeedback_id: result.insertId }));
  } catch (err) {
    console.error(err);
    res.send(utils.createError(err.message));
  }
});

//active inactive status

router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.send({ status: 'error', error: 'Invalid status value' });
  }

  try {
    const statement = `UPDATE ScheduleFeedback SET status = ? WHERE schedulefeedback_id = ?`;
    const [result] = await db.execute(statement, [status, id]);

    if (result.affectedRows === 0) {
      return res.send({ status: 'error', error: 'Schedule Feedback not found' });
    }

    const [rows] = await db.execute(
      `SELECT * FROM ScheduleFeedback WHERE schedulefeedback_id = ?`,
      [id]
    );

    res.send({ status: 'success', data: rows[0] });  // Returns updated row
  } catch (err) {
    console.error(err);
    res.send({ status: 'error', error: err.message || err });
  }
});

module.exports = router

