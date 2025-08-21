const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')

// CREATE FeedbackModuleType
router.post('/', async (req, res) => {
  const { fbmoduletypename, feedbacktype_id } = req.body
  try {
    if (!fbmoduletypename || !feedbacktype_id) {
      return res.send(utils.createError('fbmoduletypename and feedbacktype_id are required'))
    }

    const statement = `
      INSERT INTO FeedbackModuleType (fbmoduletypename, feedbacktype_id)
      VALUES (?, ?)
    `
    const [result] = await db.execute(statement, [fbmoduletypename, feedbacktype_id])

    res.send(utils.createSuccess({
      feedbackmoduletype_id: result.insertId,
      fbmoduletypename,
      feedbacktype_id
    }))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})
// GET All FeedbackModuleTypes
router.get('/', async (req, res) => {
    try {
      const statement = `
        SELECT fmt.feedbackmoduletype_id, fmt.fbmoduletypename, fmt.feedbacktype_id, ft.fbtypename
        FROM FeedbackModuleType fmt
        INNER JOIN FeedbackType ft ON fmt.feedbacktype_id = ft.feedbacktype_id
      `
      const [rows] = await db.execute(statement)
      res.send(utils.createSuccess(rows))
    } catch (ex) {
      res.send(utils.createError(ex))
    }
  })
  
module.exports = router