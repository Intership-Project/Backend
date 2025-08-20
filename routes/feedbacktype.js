const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')

// Add FeedbackType
router.post('/', async (req, res) => {
  const { fbtypename } = req.body
  try {
    if (!fbtypename) {
      return res.send(utils.createError('fbtypename is required'))
    }

    const statement = `INSERT INTO FeedbackType (fbtypename) VALUES (?)`
    const [result] = await db.execute(statement, [fbtypename])

    res.send(utils.createSuccess({
      feedbacktype_id: result.insertId,
      fbtypename
    }))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})


module.exports = router
