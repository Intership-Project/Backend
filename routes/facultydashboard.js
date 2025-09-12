// const express = require('express')
// const router = express.Router()
// const db = require('../db')
// const utils = require('../utils')
// const cryptoJs = require('crypto-js')
// const jwt = require('jsonwebtoken')
// const config = require('../config')


// // GET /feedbackdashboard/chart/:faculty_id
// router.get('/chart/:faculty_id', async (req, res) => {
//     const facultyId = req.params.faculty_id;

//     try {
//         // Aggregated feedback data: average rating per question
//         const statement = `
//             SELECT q.questiontext AS question,
//                    AVG(f.rating) AS avg_rating
//             FROM filledfeedback f
//             INNER JOIN schedulefeedback s 
//                 ON f.schedulefeedback_id = s.schedulefeedback_id
//             INNER JOIN feedbackquestions q 
//                 ON s.feedbacktype_id = q.feedbacktype_id
//             WHERE s.faculty_id = ?
//             GROUP BY q.feedbackquestion_id, q.questiontext
//         `;

//         const [rows] = await db.execute(statement, [facultyId]);

//         // Send success response with aggregated data
//         res.send(utils.createSuccess(rows));
//     } catch (err) {
//         res.send(utils.createError(err));
//     }
// })



// module.exports = router