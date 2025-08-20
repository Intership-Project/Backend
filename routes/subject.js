const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')

// CREATE Subject
router.post('/', async (req, res) => {
  const { subjectname, course_id } = req.body

  if (!subjectname || !course_id) {
    return res.send(utils.createError('subjectname and course_id are required'))
  }

  try {
    const statement = `INSERT INTO Subject (subjectname, course_id) VALUES (?, ?) `
    const [result] = await db.execute(statement, [subjectname, course_id])

    res.send(utils.createSuccess({ subject_id: result.insertId, subjectname, course_id }))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

module.exports = router