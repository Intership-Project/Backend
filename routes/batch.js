const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')

// Add Batch
router.post('/', async (req, res) => {
  const { batchname, course_id } = req.body

  if (!batchname || !course_id) {
    return res.send(utils.createError('batchname and course_id are required'))
  }

  try {
    const statement = `INSERT INTO Batch (batchname, course_id) VALUES (?, ?)`
    const [result] = await db.execute(statement, [batchname, course_id])

    res.send(utils.createSuccess({ batch_id: result.insertId, batchname, course_id }))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

module.exports = router