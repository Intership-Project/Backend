
const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')

// Add Course
router.post('/', async (req, res) => {
  const { coursename } = req.body
  try {
    const statement = `INSERT INTO Course (coursename) VALUES (?)`
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
    const statement = `SELECT course_id, coursename FROM Course`
    const [rows] = await db.execute(statement)
    res.send(utils.createSuccess(rows))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

// GET Course by ID
router.get('/:course_id', async (req, res) => {
  const { course_id } = req.params
  try {
    const statement = `SELECT course_id, coursename FROM Course WHERE course_id = ?`
    const [rows] = await db.execute(statement, [course_id])
    if (rows.length === 0) {
      res.send(utils.createError('Course not found'))
    } else {
      res.send(utils.createSuccess(rows[0]))
    }
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

// UPDATE Course by ID
router.put('/:course_id', async (req, res) => {
  const { course_id } = req.params
  const { coursename } = req.body
  try {
    const statement = `UPDATE Course SET coursename = ? WHERE course_id = ?`
    const [result] = await db.execute(statement, [coursename, course_id])

    if (result.affectedRows === 0) {
      res.send(utils.createError('Course not found or not updated'))
    } else {
      res.send(utils.createSuccess({ course_id, coursename }))
    }
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

// DELETE Course by ID
router.delete('/:course_id', async (req, res) => {
  const { course_id } = req.params
  try {
    const statement = `DELETE FROM Course WHERE course_id = ?`
    const [result] = await db.execute(statement, [course_id])

    if (result.affectedRows === 0) {
      res.send(utils.createError('Course not found'))
    } else {
      res.send(utils.createSuccess(`Course with id ${course_id} deleted successfully`))
    }
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

module.exports = router