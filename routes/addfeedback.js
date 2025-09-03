// const express = require('express')
// const router = express.Router()
// const db = require('../db') 
// const utils = require('../utils')
// const upload = require('../middleware/upload') // multer config

// // Add New Feedback
// router.post('/', upload.single('pdf_file'), async (req, res) => {
//   try {
//     // Case 1: multipart/form-data -> fields come from req.body
//     // Case 2: raw JSON -> fields come from req.body (no req.file)
//     const body = req.body || {}

//     const {
//       course_id,
//       batch_id,
//       subject_id,
//       faculty_id,
//       feedbackmoduletype_id,
//       feedbacktype_id,
//       date
//     } = body

//     if (!course_id || !batch_id || !subject_id || !faculty_id || !feedbackmoduletype_id || !feedbacktype_id || !date) {
//       return res.send(utils.createError('All required fields must be provided'))
//     }

//     // pdf_file from file upload OR from JSON body
//     const pdf_file = req.file ? req.file.filename : (body.pdf_file || null)

//     const statement = `
//       INSERT INTO addfeedback 
//       (course_id, batch_id, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date, pdf_file)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//     `

//     const [result] = await db.execute(statement, [
//       course_id,
//       batch_id,
//       subject_id,
//       faculty_id,
//       feedbackmoduletype_id,
//       feedbacktype_id,
//       date,
//       pdf_file
//     ])

//     res.send(utils.createSuccess({
//       addfeedback_id: result.insertId,
//       course_id,
//       batch_id,
//       subject_id,
//       faculty_id,
//       feedbackmoduletype_id,
//       feedbacktype_id,
//       date,
//       pdf_file
//     }))
//   } catch (ex) {
//     res.send(utils.createError(ex.message || ex))
//   }
// })

// module.exports = router
