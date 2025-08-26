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

    const statement = `
      INSERT INTO Subject (subjectname, course_id)
      VALUES (?, ?)
    `

    const [result] = await db.execute(statement, [subjectname, course_id])

    res.send(utils.createSuccess({ subject_id: result.insertId, subjectname, course_id }))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

// GET All Subjects (with Course info)
router.get('/', async (req, res) => {
    try {
      const statement = `
        SELECT 
            Subject.subject_id,
            Subject.subjectname,
            Course.course_id,
            Course.coursename
        FROM 
            Subject
        INNER JOIN 
            Course ON Subject.course_id = Course.course_id
      `
      const [rows] = await db.execute(statement)
      res.send(utils.createSuccess(rows))
    } catch (ex) {
      res.send(utils.createError(ex))
    }
  })
  // GET Subject by ID
router.get('/:subject_id', async (req, res) => {
    const { subject_id } = req.params
    try {
      const statement = `
        SELECT 
            Subject.subject_id,
            Subject.subjectname,
            Course.course_id,
            Course.coursename
        FROM 
            Subject
        INNER JOIN 
            Course ON Subject.course_id = Course.course_id
        WHERE 
            Subject.subject_id = ?
      `
      const [rows] = await db.execute(statement, [subject_id])
      if (rows.length === 0) {
        res.send(utils.createError('Subject not found'))
      } else {
        res.send(utils.createSuccess(rows[0]))
      }
    } catch (ex) {
      res.send(utils.createError(ex))
    }
  })
  // UPDATE Subject
router.put('/:subject_id', async (req, res) => {
    const { subject_id } = req.params
    const { subjectname, course_id } = req.body
  
    if (!subjectname || !course_id) {
      return res.send(utils.createError('subjectname and course_id are required'))
    }
  
    try {
      const statement = `
        UPDATE Subject
        SET subjectname = ?, course_id = ?
        WHERE subject_id = ?
      `
      const [result] = await db.execute(statement, [subjectname, course_id, subject_id])
  
      if (result.affectedRows === 0) {
        res.send(utils.createError('Subject not found or not updated'))
      } else {
        res.send(utils.createSuccess({ subject_id, subjectname, course_id }))
      }
    } catch (ex) {
      res.send(utils.createError(ex))
    }
  })
  router.delete('/:subject_id', async (req, res) => {
    const { subject_id } = req.params
    try {
      const statement = `
        DELETE FROM Subject
        WHERE subject_id = ?
      `
      const [result] = await db.execute(statement, [subject_id])
  
      if (result.affectedRows === 0) {
        res.send(utils.createError('Subject not found'))
      } else {
        res.send(utils.createSuccess(`Subject with id ${subject_id} deleted`))
      }
    } catch (ex) {
      // catches MySQL foreign key errors too
      res.send(utils.createError(ex))
    }
  })

  //GET subject by course_id

  router.get('/course/:course_id', async (req, res) => {
    const { course_id } = req.params
    try {
      const statement = `
        SELECT subject_id, subjectname, course_id
        FROM Subject 
        WHERE course_id = ?
      `
      const [rows] = await db.execute(statement, [course_id])
  
      if (rows.length === 0) {
        res.send(utils.createError('No subjects found for this course'))
      } else {
        res.send(utils.createSuccess(rows))
      }
    } catch (ex) {
      res.send(utils.createError(ex))
    }
  })
  

module.exports = router