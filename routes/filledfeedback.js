// const express = require('express')
// const router = express.Router()
// const db = require('../db')
// const utils = require('../utils')
// const config = require('../config')


// const PDFDocument = require('pdfkit')
// // /  POST FilledFeedback with responses
// // router.post('/', async (req, res) => {
// //   const { student_id, schedulefeedback_id, comments, rating, questionResponses } = req.body
// //   let connection

// //   try {
// //     connection = await db.getConnection()
// //     await connection.beginTransaction()

// //     // 1. Insert into FilledFeedback (use rating from request)
// //     const insertFeedback = `
// //       INSERT INTO FilledFeedback (student_id, schedulefeedback_id, comments, rating)
// //       VALUES (?, ?, ?, ?)
// //     `
// //     const [result] = await connection.execute(insertFeedback, [
// //       student_id ?? null,
// //       schedulefeedback_id ?? null,
// //       comments ?? null,
// //       rating ?? null // ✅ Rating from Android
// //     ])

// //     const filledfeedbacks_id = result.insertId

// //     // 2. Insert responses if present (optional)
// //     if (Array.isArray(questionResponses) && questionResponses.length > 0) {
// //       const insertResponse = `
// //         INSERT INTO FeedbackResponses (filledfeedbacks_id, feedbackquestion_id, response_rating)
// //         VALUES (?, ?, ?)
// //       `
// //       for (const response of questionResponses) {
// //         await connection.execute(insertResponse, [
// //           filledfeedbacks_id,
// //           response.feedbackquestion_id ?? null,
// //           response.response_rating ?? null,
// //         ])
// //       }
// //     }

// //     // ❌ Remove rating recalculation step (optional)
// //     // Because now we are trusting the rating sent from Android
// //     // If you still want to calculate rating from responses, keep this block

// //     await connection.commit()

// //     // 4. Get the saved feedback
// //     const [rows] = await connection.execute(
// //       SELECT * FROM FilledFeedback WHERE filledfeedbacks_id = ?,
// //       [filledfeedbacks_id]
// //     )

// //     res.send(utils.createSuccess(rows[0]))
// //   } catch (ex) {
// //     if (connection) await connection.rollback()
// //     res.send(utils.createError(ex))
// //   } finally {
// //     if (connection) connection.release()
// //   }
// // })

// //  POST FilledFeedback with responses
// router.post('/', async (req, res) => {
//   const { student_id, schedulefeedback_id, comments, questionResponses } = req.body
//   let connection

//   try {
//     connection = await db.getConnection()
//     await connection.beginTransaction()

//     // 1. Insert into FilledFeedback (rating = 0 for now)
//     const insertFeedback = `
//       INSERT INTO FilledFeedback (student_id, schedulefeedback_id, comments, rating)
//       VALUES (?, ?, ?, 0)
//     `
//     const [result] = await connection.execute(insertFeedback, [
//       student_id ?? null,
//       schedulefeedback_id ?? null,
//       comments ?? null,
//     ])

//     const filledfeedbacks_id = result.insertId

//     // 2. Insert responses if present
//     if (Array.isArray(questionResponses) && questionResponses.length > 0) {
//       const insertResponse = `
//         INSERT INTO FeedbackResponses (filledfeedbacks_id, feedbackquestion_id, response_rating)
//         VALUES (?, ?, ?)
//       `
//       for (const response of questionResponses) {
//         await connection.execute(insertResponse, [
//           filledfeedbacks_id,
//           response.feedbackquestion_id ?? null,
//           response.response_rating ?? null,
//         ])
//       }
//     }

//     // 3. Update rating as average of responses
//     const updateRating = `
//       UPDATE FilledFeedback
//       SET rating = (
//         SELECT AVG(
//           CASE
//             WHEN FR.response_rating = 'excellent' THEN 5
//             WHEN FR.response_rating = 'good' THEN 4
//             WHEN FR.response_rating = 'satisfactory' THEN 3
//             WHEN FR.response_rating = 'unsatisfactory' THEN 2
//             ELSE 1
//           END
//         )
//         FROM FeedbackResponses FR
//         WHERE FR.filledfeedbacks_id = ?
//       )
//       WHERE filledfeedbacks_id = ?
//     `
//     await connection.execute(updateRating, [filledfeedbacks_id, filledfeedbacks_id])

//     await connection.commit()

//     // 4. Get the saved feedback
//     const [rows] = await connection.execute(
//       `SELECT * FROM FilledFeedback WHERE filledfeedbacks_id = ?`,
//       [filledfeedbacks_id]
//     )

//     res.send(utils.createSuccess(rows[0]))
//   } catch (ex) {
//     if (connection) await connection.rollback()
//     res.send(utils.createError(ex))
//   } finally {
//     if (connection) connection.release()
//   }
// })
// // GET all FilledFeedback (with course, subject, faculty, student)
// router.get('/', async (req, res) => {
//   try {
//     const statement = `
//       SELECT
//         FF.filledfeedbacks_id,
//         FF.comments,
//         FF.rating,
//         S.studentname,
//         C.coursename,
//         Sub.subjectname,
//         F.facultyname,
//         SF.StartDate,
//         SF.EndDate
//       FROM FilledFeedback AS FF
//       INNER JOIN Student AS S ON FF.student_id = S.student_id
//       INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
//       INNER JOIN Course AS C ON SF.course_id = C.course_id
//       INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
//       INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
//     `
//     const [rows] = await db.execute(statement)
//     res.send(utils.createSuccess(rows))
//   } catch (ex) {
//     res.send(utils.createError(ex))
//   }
// })

// // GET all FilledFeedback (with course, subject, faculty, student)
// router.get('/', async (req, res) => {
//   try {
//     const statement = `
//       SELECT
//         FF.filledfeedbacks_id,
//         FF.schedulefeedback_id,   -- Add this line
//         FF.comments,
//         FF.rating,
//         S.studentname,
//         C.coursename,
//         Sub.subjectname,
//         F.facultyname,
//         SF.StartDate,
//         SF.EndDate
//       FROM FilledFeedback AS FF
//       INNER JOIN Student AS S ON FF.student_id = S.student_id
//       INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
//       INNER JOIN Course AS C ON SF.course_id = C.course_id
//       INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
//       INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
//     `
//     const [rows] = await db.execute(statement)
//     res.send(utils.createSuccess(rows))
//   } catch (ex) {
//     res.send(utils.createError(ex))
//   }
// })

// //retrun group by schedule
// router.get('/grouped-by-schedule', async (req, res) => {
//   try {
//     const [schedules] = await db.execute(`
//       SELECT
//         SF.schedulefeedback_id,
//         C.coursename,
//         Sub.subjectname,
//         F.facultyname,
//         SF.StartDate,
//         SF.EndDate
//       FROM ScheduleFeedback AS SF
//       LEFT JOIN Course AS C ON SF.course_id = C.course_id
//       LEFT JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
//       LEFT JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
//       ORDER BY SF.schedulefeedback_id
//     `);

//     const groupedFeedbacks = [];

//     for (const schedule of schedules) {
//       const [feedbacks] = await db.execute(`
//         SELECT 
//           FF.filledfeedbacks_id,
//           FF.comments,
//           FF.rating,
//           S.studentname
//         FROM FilledFeedback AS FF
//         LEFT JOIN Student AS S ON FF.student_id = S.student_id
//         WHERE FF.schedulefeedback_id = ?
//         ORDER BY FF.filledfeedbacks_id
//       `, [schedule.schedulefeedback_id]);

//       // Attach responses for each feedback
//       for (const fb of feedbacks) {
//         const [responses] = await db.execute(`
//           SELECT FQ.questiontext, FR.response_rating
//           FROM FeedbackResponses FR
//           LEFT JOIN FeedbackQuestions FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
//           WHERE FR.filledfeedbacks_id = ?
//         `, [fb.filledfeedbacks_id]);
//         fb.responses = responses;
//       }

//       groupedFeedbacks.push({
//         schedule,
//         feedbacks
//       });
//     }

//     res.send(utils.createSuccess(groupedFeedbacks));
//   } catch (err) {
//     console.error(err);
//     res.send(utils.createError(err));
//   }
// });

// //download pdf
// router.get('/download/schedule/:schedulefeedback_id', async (req, res) => {
//   const { schedulefeedback_id } = req.params;

//   try {
//     // 1. Fetch feedbacks and responses
//     const [feedbackRows] = await db.execute(`
//       SELECT 
//         FF.filledfeedbacks_id, FF.comments, FF.rating,
//         FR.feedbackquestion_id, FR.response_rating,
//         FQ.questiontext
//       FROM FilledFeedback AS FF
//       LEFT JOIN FeedbackResponses AS FR ON FR.filledfeedbacks_id = FF.filledfeedbacks_id
//       LEFT JOIN FeedbackQuestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
//       WHERE FF.schedulefeedback_id = ?
//       ORDER BY FF.filledfeedbacks_id, FR.feedbackquestion_id
//     `, [schedulefeedback_id]);

//     if (!feedbackRows || feedbackRows.length === 0) {
//       return res.status(404).json({ status: 'error', error: 'No feedback found for this schedule' });
//     }

//     // 2. Set PDF headers **before any output**
//     res.setHeader('Content-Disposition', `attachment; filename=feedback_schedule_${schedulefeedback_id}.pdf`);
//     res.setHeader('Content-Type', 'application/pdf');

//     // 3. Create PDF document
//     const doc = new PDFDocument({ margin: 30, size: 'A4' });
//     doc.pipe(res);

//     doc.fontSize(18).text(`Filled Feedbacks - Schedule ID: ${schedulefeedback_id}`, { align: 'center' });
//     doc.moveDown(1);

//     // 4. Group feedbacks
//     const grouped = {};
//     feedbackRows.forEach(row => {
//       if (!grouped[row.filledfeedbacks_id]) {
//         grouped[row.filledfeedbacks_id] = { comments: row.comments, rating: row.rating, responses: [] };
//       }
//       if (row.feedbackquestion_id) {
//         grouped[row.filledfeedbacks_id].responses.push({ question: row.questiontext, answer: row.response_rating });
//       }
//     });

//     // 5. Add feedbacks to PDF
//     Object.values(grouped).forEach((fb, idx) => {
//       doc.font('Helvetica-Bold').fontSize(12).text(`Feedback #${idx + 1}`, { underline: true });
//       doc.moveDown(0.2);

//       doc.font('Helvetica-Bold').text('Comments:', { continued: true });
//       doc.font('Helvetica').text(` ${fb.comments || '-'}`);

//       doc.font('Helvetica-Bold').text('Rating:', { continued: true });
//       doc.font('Helvetica').text(` ${fb.rating || '-'}`);
//       doc.moveDown(0.3);

//       fb.responses.forEach((r, i) => {
//         doc.font('Helvetica-Bold').text(`Q${i + 1}:`, { continued: true });
//         doc.font('Helvetica').text(` ${r.question} → ${r.answer || '-'}`);
//       });

//       doc.moveDown(1);
//       doc.moveTo(30, doc.y).lineTo(570, doc.y).stroke();
//       doc.moveDown(0.5);
//     });

//     doc.end(); // 6. Finalize PDF

//   } catch (err) {
//     console.error('PDF download error:', err);
//     if (!res.headersSent) {
//       res.status(500).json({ status: 'error', error: 'Failed to generate PDF' });
//     }
//   }
// });



// // GET FilledFeedback by ID (with full info)
// router.get('/:filledfeedbacks_id', async (req, res) => {
//   const { filledfeedbacks_id } = req.params
//   try {
//     const statement = `
//       SELECT
//         FF.filledfeedbacks_id,
//         FF.comments,
//         FF.rating,
//         S.studentname,
//         C.coursename,
//         Sub.subjectname,
//         F.facultyname,
//         SF.StartDate,
//         SF.EndDate
//       FROM FilledFeedback AS FF
//       INNER JOIN Student AS S ON FF.student_id = S.student_id
//       INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
//       INNER JOIN Course AS C ON SF.course_id = C.course_id
//       INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
//       INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
//       WHERE FF.filledfeedbacks_id = ?
//     `
//     const [rows] = await db.execute(statement, [filledfeedbacks_id])
//     if (rows.length === 0) {
//       res.send(utils.createError('FilledFeedback not found'))
//     } else {
//       res.send(utils.createSuccess(rows[0]))
//     }
//   } catch (ex) {
//     res.send(utils.createError(ex))
//   }
// })

// // DELETE FilledFeedback and its FeedbackResponses
// router.delete('/:filledfeedbacks_id', async (req, res) => {
//   const { filledfeedbacks_id } = req.params
//   let connection
//   try {
//     connection = await db.getConnection()
//     await connection.beginTransaction()

//     await connection.execute(`DELETE FROM FeedbackResponses WHERE filledfeedbacks_id = ?`, [filledfeedbacks_id])
//     const [result] = await connection.execute(
//       `DELETE FROM FilledFeedback WHERE filledfeedbacks_id = ?`,
//       [filledfeedbacks_id]
//     )

//     await connection.commit()

//     if (result.affectedRows === 0) {
//       res.send(utils.createError('FilledFeedback not found'))
//     } else {
//       res.send(utils.createSuccess(`Feedback ID ${filledfeedbacks_id} deleted successfully`))
//     }
//   } catch (ex) {
//     if (connection) await connection.rollback()
//     res.send(utils.createError(ex))
//   } finally {
//     if (connection) connection.release()
//   }
// })

//   //GET Responses for a specific FilledFeedback


//   router.get('/:filledfeedbacks_id/responses', async (req, res) => {
//     const { filledfeedbacks_id } = req.params
//     try {
//       const statement = `
//         SELECT
//           FQ.questiontext,
//           FR.response_rating
//         FROM FeedbackResponses AS FR
//         INNER JOIN FeedbackQuestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
//         WHERE FR.filledfeedbacks_id = ?
//       `
//       const [rows] = await db.execute(statement, [filledfeedbacks_id])
//       if (rows.length === 0) {
//         res.send(utils.createError('No responses found'))
//       } else {
//         res.send(utils.createSuccess(rows))
//       }
//     } catch (ex) {
//       res.send(utils.createError(ex))
//     }
//   })
//      //GET Feedback Summary by Faculty & Course


// router.get('/summary/by-faculty-course', async (req, res) => {
//   const { faculty_id, course_id } = req.query
//   if (!faculty_id || !course_id) {
//     return res.send(utils.createError('Faculty ID and Course ID are required'))
//   }

//   try {
//     const statement = `
//       SELECT
//         FQ.questiontext,
//         SUM(CASE WHEN FR.response_rating='excellent' THEN 1 ELSE 0 END) AS Excellent,
//         SUM(CASE WHEN FR.response_rating='good' THEN 1 ELSE 0 END) AS Good,
//         SUM(CASE WHEN FR.response_rating='satisfactory' THEN 1 ELSE 0 END) AS Satisfactory,
//         SUM(CASE WHEN FR.response_rating='unsatisfactory' THEN 1 ELSE 0 END) AS Unsatisfactory
//       FROM FeedbackResponses AS FR
//       INNER JOIN FeedbackQuestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
//       INNER JOIN FilledFeedback AS FF ON FR.filledfeedbacks_id = FF.filledfeedbacks_id
//       INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
//       WHERE SF.faculty_id = ? AND SF.course_id = ?
//       GROUP BY FQ.feedbackquestion_id
//     `
//     const [rows] = await db.execute(statement, [faculty_id, course_id])
//     res.send(utils.createSuccess(rows))
//   } catch (ex) {
//     res.send(utils.createError(ex))
//   }
// })


// module.exports = router

const express = require('express');
const router = express.Router();
const db = require('../db');
const utils = require('../utils');
const PDFDocument = require('pdfkit');

// ------------------------
// POST FilledFeedback
// ------------------------
router.post('/', async (req, res) => {
  const { student_id, schedulefeedback_id, comments, questionResponses } = req.body;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const insertFeedback = `
      INSERT INTO FilledFeedback (student_id, schedulefeedback_id, comments, rating)
      VALUES (?, ?, ?, 0)
    `;
    const [result] = await connection.execute(insertFeedback, [
      student_id ?? null,
      schedulefeedback_id ?? null,
      comments ?? null,
    ]);

    const filledfeedbacks_id = result.insertId;

    if (Array.isArray(questionResponses) && questionResponses.length > 0) {
      const insertResponse = `
        INSERT INTO FeedbackResponses (filledfeedbacks_id, feedbackquestion_id, response_rating)
        VALUES (?, ?, ?)
      `;
      for (const response of questionResponses) {
        await connection.execute(insertResponse, [
          filledfeedbacks_id,
          response.feedbackquestion_id ?? null,
          response.response_rating ?? null,
        ]);
      }
    }

    const updateRating = `
      UPDATE FilledFeedback
      SET rating = (
        SELECT AVG(
          CASE
            WHEN FR.response_rating = 'excellent' THEN 5
            WHEN FR.response_rating = 'good' THEN 4
            WHEN FR.response_rating = 'satisfactory' THEN 3
            WHEN FR.response_rating = 'unsatisfactory' THEN 2
            ELSE 1
          END
        )
        FROM FeedbackResponses FR
        WHERE FR.filledfeedbacks_id = ?
      )
      WHERE filledfeedbacks_id = ?
    `;
    await connection.execute(updateRating, [filledfeedbacks_id, filledfeedbacks_id]);

    await connection.commit();

    const [rows] = await connection.execute(
      `SELECT * FROM FilledFeedback WHERE filledfeedbacks_id = ?`,
      [filledfeedbacks_id]
    );

    res.send(utils.createSuccess(rows[0]));
  } catch (ex) {
    if (connection) await connection.rollback();
    res.send(utils.createError(ex));
  } finally {
    if (connection) connection.release();
  }
});

// ------------------------
// GET all FilledFeedback
// ------------------------
router.get('/', async (req, res) => {
  try {
    const statement = `
      SELECT
        FF.filledfeedbacks_id,
        FF.schedulefeedback_id,
        FF.comments,
        FF.rating,
        S.studentname,
        C.coursename,
        Sub.subjectname,
        F.facultyname,
        SF.StartDate,
        SF.EndDate
      FROM FilledFeedback AS FF
      INNER JOIN Student AS S ON FF.student_id = S.student_id
      INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      INNER JOIN Course AS C ON SF.course_id = C.course_id
      INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
      INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
    `;
    const [rows] = await db.execute(statement);
    res.send(utils.createSuccess(rows));
  } catch (ex) {
    res.send(utils.createError(ex));
  }
});

// ------------------------
// GET FilledFeedback grouped by schedule
// ------------------------
router.get('/grouped-by-schedule', async (req, res) => {
  try {
    const [schedules] = await db.execute(`
      SELECT
        SF.schedulefeedback_id,
        C.coursename,
        Sub.subjectname,
        F.facultyname,
        SF.StartDate,
        SF.EndDate
      FROM ScheduleFeedback AS SF
      LEFT JOIN Course AS C ON SF.course_id = C.course_id
      LEFT JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
      LEFT JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
      ORDER BY SF.schedulefeedback_id
    `);

    const groupedFeedbacks = [];

    for (const schedule of schedules) {
      const [feedbacks] = await db.execute(`
        SELECT 
          FF.filledfeedbacks_id,
          FF.comments,
          FF.rating,
          S.studentname
        FROM FilledFeedback AS FF
        LEFT JOIN Student AS S ON FF.student_id = S.student_id
        WHERE FF.schedulefeedback_id = ?
        ORDER BY FF.filledfeedbacks_id
      `, [schedule.schedulefeedback_id]);

      for (const fb of feedbacks) {
        const [responses] = await db.execute(`
          SELECT FQ.questiontext, FR.response_rating
          FROM FeedbackResponses FR
          LEFT JOIN FeedbackQuestions FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
          WHERE FR.filledfeedbacks_id = ?
        `, [fb.filledfeedbacks_id]);
        fb.responses = responses;
      }

      groupedFeedbacks.push({ schedule, feedbacks });
    }

    res.send(utils.createSuccess(groupedFeedbacks));
  } catch (err) {
    console.error(err);
    res.send(utils.createError(err));
  }
});

//------------------------
// DOWNLOAD PDF for a schedule
// ------------------------
router.get('/download/schedule/:schedulefeedback_id', async (req, res) => {
  const { schedulefeedback_id } = req.params;

  try {
    // Fetch feedbacks and responses
    const [feedbackRows] = await db.execute(`
      SELECT 
        FF.filledfeedbacks_id, FF.comments, FF.rating,
        FR.feedbackquestion_id, FR.response_rating,
        FQ.questiontext,
        S.studentname,
        C.coursename,
        Sub.subjectname,
        F.facultyname,
        SF.StartDate,
        SF.EndDate
      FROM FilledFeedback AS FF
      LEFT JOIN FeedbackResponses AS FR ON FR.filledfeedbacks_id = FF.filledfeedbacks_id
      LEFT JOIN FeedbackQuestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
      INNER JOIN Student AS S ON FF.student_id = S.student_id
      INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      INNER JOIN Course AS C ON SF.course_id = C.course_id
      INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
      INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
      WHERE FF.schedulefeedback_id = ?
      ORDER BY FF.filledfeedbacks_id, FR.feedbackquestion_id
    `, [schedulefeedback_id]);

    if (!feedbackRows || feedbackRows.length === 0) {
      return res.status(404).json({ status: 'error', error: 'No feedback found for this schedule' });
    }

    // Set headers BEFORE streaming
    res.setHeader('Content-Disposition', `attachment; filename=feedback_schedule_${schedulefeedback_id}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(res);

    // Header info
    const first = feedbackRows[0];
    doc.fontSize(18).text('Feedback Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12)
       .text(`Schedule ID: ${schedulefeedback_id}`)
       .text(`Course: ${first.coursename || '-'}`)
       .text(`Subject: ${first.subjectname || '-'}`)
       .text(`Faculty: ${first.facultyname || '-'}`)
       .text(`Start Date: ${first.StartDate ? new Date(first.StartDate).toLocaleDateString() : '-'}`)
       .text(`End Date: ${first.EndDate ? new Date(first.EndDate).toLocaleDateString() : '-'}`);
    doc.moveDown(1);

    // Group by filledfeedbacks_id
    const grouped = {};
    feedbackRows.forEach(row => {
      if (!grouped[row.filledfeedbacks_id]) {
        grouped[row.filledfeedbacks_id] = {
          student: row.studentname || '-',
          comments: row.comments || '-',
          rating: row.rating || '-',
          responses: []
        };
      }
      if (row.feedbackquestion_id != null) {
        grouped[row.filledfeedbacks_id].responses.push({
          question: row.questiontext || '-',
          answer: row.response_rating || '-'
        });
      }
    });

    // Write feedbacks
    Object.values(grouped).forEach((fb, idx) => {
      doc.font('Helvetica-Bold').text(`Feedback #${idx + 1} - Student: ${fb.student}`, { underline: true });
      doc.moveDown(0.2);

      doc.font('Helvetica-Bold').text('Comments:', { continued: true });
      doc.font('Helvetica').text(` ${fb.comments}`);

      doc.font('Helvetica-Bold').text('Rating:', { continued: true });
      doc.font('Helvetica').text(` ${fb.rating}`);
      doc.moveDown(0.2);

      fb.responses.forEach((r, i) => {
        doc.font('Helvetica-Bold').text(`Q${i + 1}:`, { continued: true });
        doc.font('Helvetica').text(` ${r.question} → ${r.answer}`);
      });

      doc.moveDown(1);
      doc.moveTo(30, doc.y).lineTo(570, doc.y).stroke();
      doc.moveDown(0.5);
    });

    doc.end(); // finalize PDF

  } catch (err) {
    console.error('PDF download error:', err);
    if (!res.headersSent) res.status(500).json({ status: 'error', error: 'Failed to generate PDF' });
  }
});




// ------------------------
// GET FilledFeedback by ID
// ------------------------

router.get('/:filledfeedbacks_id', async (req, res) => {
  const { filledfeedbacks_id } = req.params;
  try {
    const statement = `
      SELECT 
        FF.filledfeedbacks_id,
        FF.comments,
        FF.rating,
        S.studentname,
        C.coursename,
        Sub.subjectname,
        F.facultyname,
        SF.StartDate,
        SF.EndDate,
        FQ.questiontext AS question,
        FR.response_rating AS answer
      FROM FilledFeedback AS FF
      INNER JOIN Student AS S ON FF.student_id = S.student_id
      INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      INNER JOIN Course AS C ON SF.course_id = C.course_id
      INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
      INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
      INNER JOIN FeedbackResponses AS FR ON FF.filledfeedbacks_id = FR.filledfeedbacks_id
      INNER JOIN FeedbackQuestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
      WHERE FF.filledfeedbacks_id = ?
    `;
    const [rows] = await db.execute(statement, [filledfeedbacks_id]);

    if (rows.length === 0) return res.send(utils.createError('FilledFeedback not found'));

    // Group all responses under one feedback object
    const feedback = {
      filledfeedbacks_id: rows[0].filledfeedbacks_id,
      comments: rows[0].comments,
      rating: rows[0].rating,
      studentname: rows[0].studentname,
      coursename: rows[0].coursename,
      subjectname: rows[0].subjectname,
      facultyname: rows[0].facultyname,
      startDate: rows[0].StartDate,
      endDate: rows[0].EndDate,
      responses: rows.map(r => ({
        question: r.question,
        response_rating: r.answer
      }))
    };

    res.send(utils.createSuccess(feedback));
  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex));
  }
});


// ------------------------
// GET responses for specific FilledFeedback
// ------------------------
router.get('/:filledfeedbacks_id/responses', async (req, res) => {
  const { filledfeedbacks_id } = req.params;
  try {
    const statement = `
      SELECT
        FQ.questiontext,
        FR.response_rating
      FROM FeedbackResponses AS FR
      INNER JOIN FeedbackQuestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
      WHERE FR.filledfeedbacks_id = ?
    `;
    const [rows] = await db.execute(statement, [filledfeedbacks_id]);
    if (rows.length === 0) res.send(utils.createError('No responses found'));
    else res.send(utils.createSuccess(rows));
  } catch (ex) {
    res.send(utils.createError(ex));
  }
});

// ------------------------
// DELETE FilledFeedback and its responses
// ------------------------
router.delete('/:filledfeedbacks_id', async (req, res) => {
  const { filledfeedbacks_id } = req.params;
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.execute(`DELETE FROM FeedbackResponses WHERE filledfeedbacks_id = ?`, [filledfeedbacks_id]);
    const [result] = await connection.execute(
      `DELETE FROM FilledFeedback WHERE filledfeedbacks_id = ?`,
      [filledfeedbacks_id]
    );

    await connection.commit();

    if (result.affectedRows === 0) res.send(utils.createError('FilledFeedback not found'));
    else res.send(utils.createSuccess(`Feedback ID ${filledfeedbacks_id} deleted successfully`));
  } catch (ex) {
    if (connection) await connection.rollback();
    res.send(utils.createError(ex));
  } finally {
    if (connection) connection.release();
  }
});

// ------------------------
// GET feedback summary by faculty & course
// ------------------------
router.get('/summary/by-faculty-course', async (req, res) => {
  const { faculty_id, course_id } = req.query;
  if (!faculty_id || !course_id) return res.send(utils.createError('Faculty ID and Course ID are required'));

  try {
    const statement = `
      SELECT
        FQ.questiontext,
        SUM(CASE WHEN FR.response_rating='excellent' THEN 1 ELSE 0 END) AS Excellent,
        SUM(CASE WHEN FR.response_rating='good' THEN 1 ELSE 0 END) AS Good,
        SUM(CASE WHEN FR.response_rating='satisfactory' THEN 1 ELSE 0 END) AS Satisfactory,
        SUM(CASE WHEN FR.response_rating='unsatisfactory' THEN 1 ELSE 0 END) AS Unsatisfactory
      FROM FeedbackResponses AS FR
      INNER JOIN FeedbackQuestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
      INNER JOIN FilledFeedback AS FF ON FR.filledfeedbacks_id = FF.filledfeedbacks_id
      INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      WHERE SF.faculty_id = ? AND SF.course_id = ?
      GROUP BY FQ.feedbackquestion_id
    `;
    const [rows] = await db.execute(statement, [faculty_id, course_id]);
    res.send(utils.createSuccess(rows));
  } catch (ex) {
    res.send(utils.createError(ex));
  }
});

module.exports = router;
