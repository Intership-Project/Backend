const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')


// CREATE Batch

router.post('/', async (req, res) => {
  const { batchname, course_id } = req.body

  if (!batchname || !course_id) {
    return res.send(utils.createError('batchname and course_id are required'))
  }

  try {

    const statement = `
      INSERT INTO Batch (batchname, course_id)
      VALUES (?, ?)
    `

    const [result] = await db.execute(statement, [batchname, course_id])

    res.send(utils.createSuccess({ batch_id: result.insertId, batchname, course_id }))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

// GET All Batches (with Course name)
router.get('/', async (req, res) => {
    try {
      const statement =`SELECT Batch.batch_id,Batch.batchname,Course.course_id,Course.coursename FROM Batch INNER JOIN Course ON Batch.course_id = Course.course_id;`

      const [rows] = await db.execute(statement)
      res.send(utils.createSuccess(rows))
    } catch (ex) {
      res.send(utils.createError(ex))
    }
  })
  // GET Batch by ID
router.get('/:batch_id', async (req, res) => {
    const { batch_id } = req.params
    try {
      const statement = 'SELECT Batch.batch_id,Batch.batchname,Course.course_id,Course.coursename FROM Batch INNER JOIN Course ON Batch.course_id = Course.course_id WHERE Batch.batch_id = ?;'

      const [rows] = await db.execute(statement, [batch_id])
      if (rows.length === 0) {
        res.send(utils.createError('Batch not found'))
      } else {
        res.send(utils.createSuccess(rows[0]))
      }
    } catch (ex) {
      res.send(utils.createError(ex))
    }
  })
  // UPDATE Batch
router.put('/:batch_id', async (req, res) => {
    const { batch_id } = req.params
    const { batchname, course_id } = req.body
  
    try {
      const statement = `
        UPDATE Batch
        SET batchname = ?, course_id = ?
        WHERE batch_id = ?
      `
      const [result] = await db.execute(statement, [batchname, course_id, batch_id])
  
      if (result.affectedRows === 0) {
        res.send(utils.createError('Batch not found or not updated'))
      } else {
        res.send(utils.createSuccess({ batch_id, batchname, course_id }))
      }
    } catch (ex) {
      res.send(utils.createError(ex))
    }
  })
  // DELETE Batch
router.delete('/:batch_id', async (req, res) => {
    const { batch_id } = req.params
    try {
      const statement = `
        DELETE FROM Batch
        WHERE batch_id = ?
      `
      const [result] = await db.execute(statement, [batch_id])
  
      if (result.affectedRows === 0) {
        res.send(utils.createError('Batch not found'))
      } else {
        res.send(utils.createSuccess(`Batch with id ${batch_id} deleted`))
      }
    } catch (ex) {
      res.send(utils.createError(ex))
    }
  })
  
  
  // GET Batches by Course ID
router.get('/course/:course_id', async (req, res) => {
  const { course_id } = req.params
  try {
    const statement = `
      SELECT Batch.batch_id, Batch.batchname, Course.course_id, Course.coursename
      FROM Batch
      INNER JOIN Course ON Batch.course_id = Course.course_id
      WHERE Batch.course_id = ?
    `
    const [rows] = await db.execute(statement, [course_id])

    if (rows.length === 0) {
      res.send(utils.createError('No batches found for this course'))
    } else {
      res.send(utils.createSuccess(rows))
    }
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})

module.exports = router