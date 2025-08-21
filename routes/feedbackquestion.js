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

module.exports = router

