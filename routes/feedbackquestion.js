const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')


// Add FeedbackQuestion
router.post('/', async (req, res) => {
  const { questiontext, feedbacktype_id } = req.body
  try {
    if (!questiontext || !feedbacktype_id) {
      return res.send(utils.createError('questiontext and feedbacktype_id are required'))
    }

    const statement = `INSERT INTO FeedbackQuestions (questiontext, feedbacktype_id) VALUES (?, ?)`
    const [result] = await db.execute(statement, [questiontext, feedbacktype_id])

    res.send(utils.createSuccess({
      feedbackquestion_id: result.insertId,
      questiontext,
      feedbacktype_id
    }))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

// GET All FeedbackQuestions

router.get('/', async (req, res) => {
  try {
    const statement = `SELECT fq.feedbackquestion_id, fq.questiontext, fq.feedbacktype_id, ft.fbtypename
      FROM FeedbackQuestions fq INNER JOIN FeedbackType ft ON fq.feedbacktype_id = ft.feedbacktype_id`
    const [rows] = await db.execute(statement)
    res.send(utils.createSuccess(rows))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

// GET FeedbackQuestion by ID

router.get('/:feedbackquestion_id', async (req, res) => {
  const { feedbackquestion_id } = req.params
  try {
    const statement = `SELECT fq.feedbackquestion_id, fq.questiontext, fq.feedbacktype_id, ft.fbtypename
      FROM FeedbackQuestions fq INNER JOIN FeedbackType ft ON fq.feedbacktype_id = ft.feedbacktype_id WHERE fq.feedbackquestion_id = ?`
    const [rows] = await db.execute(statement, [feedbackquestion_id])

    if (rows.length === 0) {
      res.send(utils.createError('FeedbackQuestion not found'))
    } else {
      res.send(utils.createSuccess(rows[0]))
    }
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})


// UPDATE FeedbackQuestion

router.put('/:feedbackquestion_id', async (req, res) => {
  const { feedbackquestion_id } = req.params
  const { questiontext, feedbacktype_id } = req.body
  try {
    if (!questiontext || !feedbacktype_id) {
      return res.send(utils.createError('questiontext and feedbacktype_id are required'))
    }

    const statement = `UPDATE FeedbackQuestions SET questiontext = ?, feedbacktype_id = ? WHERE feedbackquestion_id = ? `
    const [result] = await db.execute(statement, [questiontext, feedbacktype_id, feedbackquestion_id])

    if (result.affectedRows === 0) {
      res.send(utils.createError('FeedbackQuestion not found'))
    } else {
      res.send(utils.createSuccess({
        feedbackquestion_id,
        questiontext,
        feedbacktype_id
      }))
    }
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

// DELETE FeedbackQuestion
router.delete('/:feedbackquestion_id', async (req, res) => {
  const { feedbackquestion_id } = req.params
  try {
    const statement = `DELETE FROM FeedbackQuestions WHERE feedbackquestion_id = ?`
    const [result] = await db.execute(statement, [feedbackquestion_id])

    if (result.affectedRows === 0) {
      res.send(utils.createError('FeedbackQuestion not found'))
    } else {
      res.send(utils.createSuccess(`FeedbackQuestion with id ${feedbackquestion_id} deleted`))
    }
  } catch (ex) {
    if (ex.code === 'ER_ROW_IS_REFERENCED_2') {
      res.send(utils.createError('Cannot delete: FeedbackQuestion is in use'))
    } else {
      res.send(utils.createError(ex))
    }
  }
})


//  Get Questions by FeedbackType
router.get('/feedbacktype/:feedbacktype_id', async (req, res) => {
  const { feedbacktype_id } = req.params
  try {
    const statement = `SELECT feedbackquestion_id, questiontext FROM FeedbackQuestions WHERE feedbacktype_id = ? `
    const [rows] = await db.execute(statement, [feedbacktype_id])

    if (rows.length === 0) {
      res.send(utils.createError('No questions found for this feedback type'))
    } else {
      res.send(utils.createSuccess(rows))
    }
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})
module.exports = router



