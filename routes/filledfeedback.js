const express = require('express');
const router = express.Router();
const db = require('../db');
const utils = require('../utils');
const PDFDocument = require('pdfkit');


// POST FilledFeedback
router.post('/', async (req, res) => {
  const { student_id, schedulefeedback_id, comments, questionResponses } = req.body;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const insertFeedback = `
      INSERT INTO Filledfeedback (student_id, schedulefeedback_id, comments, rating)
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
        INSERT INTO Feedbackresponses (filledfeedbacks_id, feedbackquestion_id, response_rating)
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
      UPDATE Filledfeedback
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
        FROM Feedbackresponses FR
        WHERE FR.filledfeedbacks_id = ?
      )
      WHERE filledfeedbacks_id = ?
    `;
    await connection.execute(updateRating, [filledfeedbacks_id, filledfeedbacks_id]);

    await connection.commit();

    const [rows] = await connection.execute(
      `SELECT * FROM Filledfeedback WHERE filledfeedbacks_id = ?`,
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



//homecc
// GET /filledfeedback/stats/:course_id
router.get('/stats/:course_id', async (req, res) => {
  const { course_id } = req.params;
  try {
    const [[stats]] = await db.execute(`
      SELECT 
        -- total student filled feedbacks
        (SELECT COUNT(*) 
         FROM Filledfeedback FF
         INNER JOIN SSchedulefeedback SF 
           ON FF.schedulefeedback_id = SF.schedulefeedback_id
         WHERE SF.course_id = ?) AS totalFeedbacks,

        -- CC uploaded PDFs
        (SELECT COUNT(*) 
         FROM Addfeedback AF
         WHERE AF.course_id = ?) AS facultyFeedbackAdded,


        -- Pending reviews (feedbacks with review_status = 'Pending')
        (SELECT COUNT(*) 
         FROM Filledfeedback FF
         INNER JOIN Schedulefeedback SF 
           ON FF.schedulefeedback_id = SF.schedulefeedback_id
         WHERE SF.course_id = ? 
           AND FF.review_status = 'Pending') AS pendingReview
    `, [course_id, course_id, course_id]);

    res.send(utils.createSuccess(stats));
  } catch (err) {
    res.send(utils.createError(err.message || err));
  }
});




//homecc
// GET /filledfeedback/recent/:course_id
router.get('/recent/:course_id', async (req, res) => {
  const { course_id } = req.params;
  try {
    const [rows] = await db.execute(`
    SELECT 
    FF.filledfeedbacks_id,
    S.studentname,
    F.facultyname,
    Sub.subjectname,
    FMT.fbmoduletypename AS module,   
    FT.fbtypename AS type,          
    SF.StartDate,
    SF.EndDate,
    FF.rating,
    FF.comments,
     FF.review_status
FROM Filledfeedback AS FF
INNER JOIN Schedulefeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
INNER JOIN Student AS S ON FF.student_id = S.student_id
INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
LEFT JOIN Feedbackmoduletype AS FMT ON SF.feedbackmoduletype_id = FMT.feedbackmoduletype_id
LEFT JOIN Feedbacktype AS FT ON SF.feedbacktype_id = FT.feedbacktype_id
WHERE SF.course_id = ?
ORDER BY FF.filledfeedbacks_id DESC
LIMIT 8;
    `, [course_id]);

    res.send(utils.createSuccess(rows));
  } catch (err) {
    res.send(utils.createError(err.message || err));
  }
});




//homecc
// PUT /filledfeedback/:id/status
router.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await db.execute(
      "UPDATE Filledfeedback SET review_status = ? WHERE filledfeedbacks_id = ?",
      [status, id]
    );
    res.send({ status: "success", message: "Status updated" });
  } catch (err) {
    res.send({ status: "error", error: err.message });
  }
});





//viewstudentsfeedbacks by cc
//  Get all feedbacks for a course with responses (CC view)
router.get("/course/:courseId/grouped", async (req, res) => {
  const { courseId } = req.params;
  const user = req.data; // decoded JWT payload

  try {

    if (user.rolename !== "Course Coordinator" || user.course_id != courseId) {
      return res.status(403).send(utils.createError("Access denied"));
    }

    // Get all schedules for this course
    const [schedules] = await db.execute(
      `SELECT 
        sf.schedulefeedback_id,
        c.coursename,
        sub.subjectname,
        f.facultyname,
        sf.StartDate,
        sf.EndDate
      FROM Schedulefeedback sf
      JOIN Course c ON sf.course_id = c.course_id
      JOIN Subject sub ON sf.subject_id = sub.subject_id
      JOIN Faculty f ON sf.faculty_id = f.faculty_id
      WHERE sf.course_id = ?
      ORDER BY sf.StartDate DESC
      `,
      [courseId]
    );

    const groupedFeedbacks = [];

    // For each schedule, get feedbacks and responses
    for (const schedule of schedules) {
      const [feedbacks] = await db.execute(
        `SELECT 
           f.filledfeedbacks_id,
           s.studentname,
           f.comments,
           f.rating
         FROM Filledfeedback f
         JOIN Student s ON f.student_id = s.student_id
         WHERE f.schedulefeedback_id = ?
         ORDER BY f.filledfeedbacks_id DESC`,
        [schedule.schedulefeedback_id]
      );

      for (const fb of feedbacks) {
        const [responses] = await db.execute(
          `SELECT 
             q.feedbackquestion_id,
             q.questiontext AS question,
             fr.response_rating
           FROM Feedbackresponses fr
           JOIN Feedbackquestions q 
             ON fr.feedbackquestion_id = q.feedbackquestion_id
           WHERE fr.filledfeedbacks_id = ?
           ORDER BY q.feedbackquestion_id`,
          [fb.filledfeedbacks_id]
        );

        fb.responses = responses;
      }

      groupedFeedbacks.push({ schedule, feedbacks });
    }

    res.send(utils.createSuccess(groupedFeedbacks));
  } catch (err) {
    console.error(" SQL or server error:", err);
    res.status(500).send(utils.createError(err.message));
  }
});




//homecc
//GET Responses for a specific FilledFeedback
router.get('/details/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute(
      `SELECT Q.feedbackquestion_id, Q.questiontext, R.response_rating
       FROM Feedbackresponses R
       INNER JOIN Feedbackquestions Q 
         ON R.feedbackquestion_id = Q.feedbackquestion_id
       WHERE R.filledfeedbacks_id = ?`,
      [id]
    );

    res.send({ status: "success", data: rows });
  } catch (err) {
    res.send({ status: "error", error: err.message });
  }
});





// GET all FilledFeedback
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
      FROM Filledfeedback AS FF
      INNER JOIN Student AS S ON FF.student_id = S.student_id
      INNER JOIN Schedulefeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
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



//Admin fillfeedback
// GET FilledFeedback grouped by schedule
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
      FROM Schedulefeedback AS SF
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
        FROM Filledfeedback AS FF
        LEFT JOIN Student AS S ON FF.student_id = S.student_id
        WHERE FF.schedulefeedback_id = ?
        ORDER BY FF.filledfeedbacks_id
      `, [schedule.schedulefeedback_id]);

      for (const fb of feedbacks) {
        const [responses] = await db.execute(`
          SELECT FQ.questiontext, FR.response_rating
          FROM Feedbackresponses FR
          LEFT JOIN Feedbackquestions FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
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




//viewstudentfeedbacks by cc and Admin feedbackresponses filledfeedback
// DOWNLOAD PDF of all responses for a schedule
router.get('/download/schedule/:schedulefeedback_id', async (req, res) => {
  const { schedulefeedback_id } = req.params;

  try {
    // Fetch feedbacks with course, subject, faculty details
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
      FROM Filledfeedback AS FF
      LEFT JOIN Feedbackresponses AS FR ON FR.filledfeedbacks_id = FF.filledfeedbacks_id
      LEFT JOIN Feedbackquestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
      INNER JOIN Student AS S ON FF.student_id = S.student_id
      INNER JOIN Schedulefeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      LEFT JOIN Course AS C ON SF.course_id = C.course_id
      LEFT JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
      LEFT JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
      WHERE FF.schedulefeedback_id = ?
      ORDER BY FF.filledfeedbacks_id, FR.feedbackquestion_id
    `, [schedulefeedback_id]);

    if (!feedbackRows || feedbackRows.length === 0) {
      return res.status(404).json({ status: 'error', error: 'No feedback found for this schedule' });
    }

    const first = feedbackRows[0];

    // Sanitize names to use in filename
    const sanitize = (text) => (text || 'Unknown').replace(/[\/\\?%*:|"<> ]/g, '_');
    const filename = `${sanitize(first.coursename)}-${sanitize(first.subjectname)}-${sanitize(first.facultyname)}-Responses.pdf`;

    // Set headers for PDF download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(res);

    // PDF Header
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

    // Group feedbacks by filledfeedbacks_id
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

    // Write feedback entries
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
    console.error('PDF generation failed:', err);
    res.status(500).json({ status: 'error', error: 'Failed to generate PDF' });
  }
});



// GET FilledFeedback by ID
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
      FROM Filledfeedback AS FF
      INNER JOIN Student AS S ON FF.student_id = S.student_id
      INNER JOIN Schedulefeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      INNER JOIN Course AS C ON SF.course_id = C.course_id
      INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
      INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
      INNER JOIN Feedbackresponses AS FR ON FF.filledfeedbacks_id = FR.filledfeedbacks_id
      INNER JOIN Feedbackquestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
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



// GET responses for specific FilledFeedback
router.get('/:filledfeedbacks_id/responses', async (req, res) => {
  const { filledfeedbacks_id } = req.params;
  try {
    const statement = `
      SELECT
        FQ.questiontext,
        FR.response_rating
      FROM Feedbackresponses AS FR
      INNER JOIN Feedbackquestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
      WHERE FR.filledfeedbacks_id = ?
    `;
    const [rows] = await db.execute(statement, [filledfeedbacks_id]);
    if (rows.length === 0) res.send(utils.createError('No responses found'));
    else res.send(utils.createSuccess(rows));
  } catch (ex) {
    res.send(utils.createError(ex));
  }
});


// DELETE FilledFeedback and its responses
router.delete('/:filledfeedbacks_id', async (req, res) => {
  const { filledfeedbacks_id } = req.params;
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.execute(`DELETE FROM Feedbackresponses WHERE filledfeedbacks_id = ?`, [filledfeedbacks_id]);
    const [result] = await connection.execute(
      `DELETE FROM Filledfeedback WHERE filledfeedbacks_id = ?`,
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





// GET feedback summary by faculty & course
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
      FROM Feedbackresponses AS FR
      INNER JOIN Feedbackquestions AS FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
      INNER JOIN Filledfeedback AS FF ON FR.filledfeedbacks_id = FF.filledfeedbacks_id
      INNER JOIN Schedulefeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
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







