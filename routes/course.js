
const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')

// CREATE Course
router.post('/', async (req, res) => {
  const { coursename } = req.body
  try {
    const statement = `
      INSERT INTO Course (coursename)
      VALUES (?)
    `
    const [result] = await db.execute(statement, [coursename])

    res.send(
      utils.createSuccess({
        course_id: result.insertId,
        coursename,
      })
    )
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

// GET All Courses
router.get('/', async (req, res) => {
  try {
    const statement = `
      SELECT course_id, coursename
      FROM Course
    `
    const [rows] = await db.execute(statement)
    res.send(utils.createSuccess(rows))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

module.exports = router