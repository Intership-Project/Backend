const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const cryptoJs = require('crypto-js')
const jwt = require('jsonwebtoken')
const config = require('../config')
const { Parser } = require('json2csv');


// POST /addfeedback
// router.post('/addfeedback', async (req, res) => {
//   const { faculty_id, filledfeedbacks } = req.body; 
//   // filledfeedbacks = array of feedback objects
  
//   try {
//     const feedbackData = JSON.stringify(filledfeedbacks); // convert to JSON
//     const [result] = await db.execute(
//       `INSERT INTO addfeedback (faculty_id, filledfeedbacks_json) VALUES (?, ?)`,
//       [faculty_id, feedbackData]
//     );
//     res.json({ status: 'success', id: result.insertId });
//   } catch (err) {
//     res.status(500).json({ status: 'error', message: err.message });
//   }
// });



router.get('/downloadfeedback', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        ff.filledfeedbacks_id,
        ff.student_id,
        ff.schedulefeedback_id,
        ff.comments,
        ff.rating,
        sf.course_id,
        sf.subject_id,
        sf.faculty_id,
        sf.batch_id,
        sf.feedbacktype_id,
        sf.StartDate,
        sf.EndDate
      FROM filledfeedback ff
      JOIN schedulefeedback sf ON ff.schedulefeedback_id = sf.schedulefeedback_id
    `);

    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No feedback found' });
    }

    // Convert to CSV
    const parser = new Parser();
    const csv = parser.parse(rows);

    // Send file as download
    res.header('Content-Type', 'text/csv');
    res.attachment('feedback.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });

    console.error(err);
  }
});
















module.exports = router