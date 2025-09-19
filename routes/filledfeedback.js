const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const config = require('../config')
const PDFDocument = require('pdfkit')
const verifyToken = require("../middlewares/verifyToken");



//  POST FilledFeedback 
router.post('/', async (req, res) => {
  const { student_id, schedulefeedback_id, comments, questionResponses } = req.body;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Check if feedback already exists
    const [existingFeedback] = await connection.execute(
      `SELECT filledfeedbacks_id 
       FROM FilledFeedback 
       WHERE student_id = ? AND schedulefeedback_id = ?`,
      [parseInt(student_id), parseInt(schedulefeedback_id)]
    );

    if (existingFeedback.length > 0) {
      return res.send(utils.createError("You have already submitted feedback for this schedule."));
    }

    // 2. Insert feedback
    const [result] = await connection.execute(
      `INSERT INTO FilledFeedback (student_id, schedulefeedback_id, comments, rating, review_status)
       VALUES (?, ?, ?, 0,  'Pending')`,
      [parseInt(student_id), parseInt(schedulefeedback_id), comments ?? null]
    );

    const filledfeedbacks_id = result.insertId;

    // 3. Insert responses
    if (Array.isArray(questionResponses) && questionResponses.length > 0) {
      const insertResponse = `
        INSERT INTO FeedbackResponses (filledfeedbacks_id, feedbackquestion_id, response_rating)
        VALUES (?, ?, ?)
      `;
      for (const r of questionResponses) {
        await connection.execute(insertResponse, [
          filledfeedbacks_id,
          r.feedbackquestion_id ?? null,
          r.response_rating ?? null,
        ]);
      }
    }

    // 4. Update rating
    await connection.execute(
      `UPDATE FilledFeedback
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
       WHERE filledfeedbacks_id = ?`,
      [filledfeedbacks_id, filledfeedbacks_id]
    );

    await connection.commit();

    // 5. Return inserted feedback
    const [newFeedbackRows] = await connection.execute(
      `SELECT * FROM FilledFeedback WHERE filledfeedbacks_id = ?`,
      [filledfeedbacks_id]
    );

    res.send(utils.createSuccess(newFeedbackRows[0]));

  } catch (err) {
    if (connection) await connection.rollback();

    // Handle duplicate entry error
    if (err.code === "ER_DUP_ENTRY") {
      return res.send(utils.createError("You have already submitted feedback for this schedule."));
    }

    res.send(utils.createError(err));
  } finally {
    if (connection) connection.release();
  }
});





// GET /filledfeedback/stats/:course_id
router.get('/stats/:course_id', async (req, res) => {
  const { course_id } = req.params;
  try {
    const [[stats]] = await db.execute(`
      SELECT 
        COUNT(*) AS totalFeedback,
        SUM(CASE WHEN rating IS NULL OR rating = 0 THEN 1 ELSE 0 END) AS pendingReview,
        SUM(CASE WHEN rating > 0 THEN 1 ELSE 0 END) AS facultyFeedbackAdded
      FROM FilledFeedback AS FF
      INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      WHERE SF.course_id = ?
    `, [course_id]);

    res.send(utils.createSuccess(stats));
  } catch (err) {
    res.send(utils.createError(err.message || err));
  }
});




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
     FF.review_status AS status
FROM FilledFeedback AS FF
INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
INNER JOIN Student AS S ON FF.student_id = S.student_id
INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
LEFT JOIN FeedbackModuleType AS FMT ON SF.feedbackmoduletype_id = FMT.feedbackmoduletype_id
LEFT JOIN FeedbackType AS FT ON SF.feedbacktype_id = FT.feedbacktype_id
WHERE SF.course_id = ?
ORDER BY FF.filledfeedbacks_id DESC
LIMIT 3;
    `, [course_id]);

    res.send(utils.createSuccess(rows));
  } catch (err) {
    res.send(utils.createError(err.message || err));
  }
});



// PUT /filledfeedback/:id/status
router.put("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await db.execute(
      "UPDATE FilledFeedback SET review_status = ? WHERE filledfeedbacks_id = ?",
      [status, id]
    );
    res.send({ status: "success", message: "Status updated" });
  } catch (err) {
    res.send({ status: "error", error: err.message });
  }
});







//  Get all feedbacks for a course with responses (CC view)
router.get("/course/:courseId/grouped", verifyToken, async (req, res) => {
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
      FROM schedulefeedback sf
      JOIN course c ON sf.course_id = c.course_id
      JOIN subject sub ON sf.subject_id = sub.subject_id
      JOIN faculty f ON sf.faculty_id = f.faculty_id
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
         FROM filledfeedback f
         JOIN student s ON f.student_id = s.student_id
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
           FROM feedbackresponses fr
           JOIN feedbackquestions q 
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



// Download all responses PDF for a schedule (CC access)
router.get("/download/schedule/:scheduleId", verifyToken, async (req, res) => {
  const { scheduleId } = req.params;
  const user = req.data; // decoded JWT payload

  try {
    // Only allow Course Coordinator of this course
    const [[schedule]] = await db.execute(
      `SELECT course_id FROM schedulefeedback WHERE schedulefeedback_id = ?`,
      [scheduleId]
    );

    if (!schedule || user.rolename !== "Course Coordinator" || user.course_id != schedule.course_id) {
      return res.status(403).send(utils.createError("Access denied"));
    }

    // Fetch all feedbacks for this schedule
    const [feedbacks] = await db.execute(
      `SELECT 
         f.filledfeedbacks_id,
         s.studentname,
         f.comments,
         f.rating
       FROM filledfeedback f
       JOIN student s ON f.student_id = s.student_id
       WHERE f.schedulefeedback_id = ?
       ORDER BY f.filledfeedbacks_id`,
      [scheduleId]
    );

    // Include responses
    for (const fb of feedbacks) {
      const [responses] = await db.execute(
        `SELECT fq.questiontext, fr.response_rating
         FROM feedbackresponses fr
         JOIN feedbackquestions fq ON fr.feedbackquestion_id = fq.feedbackquestion_id
         WHERE fr.filledfeedbacks_id = ?`,
        [fb.filledfeedbacks_id]
      );
      fb.responses = responses;
    }

    // Generate PDF
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument();
    let filename = `schedule-${scheduleId}-responses.pdf`;
    filename = encodeURIComponent(filename);

    res.setHeader("Content-disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-type", "application/pdf");

    doc.pipe(res);

    doc.fontSize(16).text(`Feedback Responses for Schedule ID: ${scheduleId}`, {
      align: "center",
    });
    doc.moveDown();

    feedbacks.forEach((fb) => {
      doc.fontSize(12).text(`Student: ${fb.studentname}`);
      doc.text(`Comments: ${fb.comments}`);
      doc.text(`Rating: ${fb.rating}`);
      fb.responses.forEach((r, idx) => {
        doc.text(`Q${idx + 1}: ${r.questiontext}`);
        doc.text(`Answer: ${r.response_rating}`);
      });
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).send(utils.createError(err.message));
  }
});







// GET all FilledFeedback (with course, subject, faculty, student)
router.get('/', async (req, res) => {
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
        SF.EndDate
      FROM FilledFeedback AS FF
      INNER JOIN Student AS S ON FF.student_id = S.student_id
      INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      INNER JOIN Course AS C ON SF.course_id = C.course_id
      INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
      INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
    `
    const [rows] = await db.execute(statement)
    res.send(utils.createSuccess(rows))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})




// GET FilledFeedback by ID (with full info)
router.get('/:filledfeedbacks_id', async (req, res) => {
  const { filledfeedbacks_id } = req.params
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
        SF.EndDate
      FROM FilledFeedback AS FF
      INNER JOIN Student AS S ON FF.student_id = S.student_id
      INNER JOIN ScheduleFeedback AS SF ON FF.schedulefeedback_id = SF.schedulefeedback_id
      INNER JOIN Course AS C ON SF.course_id = C.course_id
      INNER JOIN Subject AS Sub ON SF.subject_id = Sub.subject_id
      INNER JOIN Faculty AS F ON SF.faculty_id = F.faculty_id
      WHERE FF.filledfeedbacks_id = ?
    `
    const [rows] = await db.execute(statement, [filledfeedbacks_id])
    if (rows.length === 0) {
      res.send(utils.createError('FilledFeedback not found'))
    } else {
      res.send(utils.createSuccess(rows[0]))
    }
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})




// DELETE FilledFeedback and its FeedbackResponses
router.delete('/:filledfeedbacks_id', async (req, res) => {
  const { filledfeedbacks_id } = req.params
  let connection
  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    await connection.execute(`DELETE FROM FeedbackResponses WHERE filledfeedbacks_id = ?`, [filledfeedbacks_id])
    const [result] = await connection.execute(
      `DELETE FROM FilledFeedback WHERE filledfeedbacks_id = ?`,
      [filledfeedbacks_id]
    )

    await connection.commit()

    if (result.affectedRows === 0) {
      res.send(utils.createError('FilledFeedback not found'))
    } else {
      res.send(utils.createSuccess(`Feedback ID ${filledfeedbacks_id} deleted successfully`))
    }
  } catch (ex) {
    if (connection) await connection.rollback()
    res.send(utils.createError(ex))
  } finally {
    if (connection) connection.release()
  }
})





//GET Responses for a specific FilledFeedback
router.get('/details/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute(
      `SELECT Q.feedbackquestion_id, Q.questiontext, R.response_rating
       FROM feedbackresponses R
       INNER JOIN feedbackquestions Q 
         ON R.feedbackquestion_id = Q.feedbackquestion_id
       WHERE R.filledfeedbacks_id = ?`,
      [id]
    );

    res.send({ status: "success", data: rows });
  } catch (err) {
    res.send({ status: "error", error: err.message });
  }
});




//GET Feedback Summary by Faculty & Course
router.get('/summary/by-faculty-course', async (req, res) => {
  const { faculty_id, course_id } = req.query
  if (!faculty_id || !course_id) {
    return res.send(utils.createError('Faculty ID and Course ID are required'))
  }

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
    `
    const [rows] = await db.execute(statement, [faculty_id, course_id])
    res.send(utils.createSuccess(rows))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})




// Download ALL student filled feedbacks for one faculty
router.get('/download/faculty/:faculty_id', async (req, res) => {
  const { faculty_id } = req.params

  try {
    // 1. Fetch all feedbacks for that faculty
    const [rows] = await db.execute(`
      SELECT
        FF.filledfeedbacks_id,
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
      WHERE SF.faculty_id = ?
      ORDER BY FF.filledfeedbacks_id
    `, [faculty_id])

    if (rows.length === 0) {
      return res.status(404).send(' No feedback found for this faculty')
    }

    // 2. Fetch responses for each feedback
    const feedbackWithResponses = []
    for (const fb of rows) {
      const [responses] = await db.execute(`
        SELECT FQ.questiontext, FR.response_rating
        FROM FeedbackResponses FR
        INNER JOIN FeedbackQuestions FQ ON FR.feedbackquestion_id = FQ.feedbackquestion_id
        WHERE FR.filledfeedbacks_id = ?
      `, [fb.filledfeedbacks_id])
      feedbackWithResponses.push({ ...fb, responses })
    }

    // 3. Generate PDF
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ margin: 40 })
    res.setHeader('Content-Disposition', `attachment; filename=faculty-${faculty_id}-feedbacks.pdf`)
    res.setHeader('Content-Type', 'application/pdf')
    doc.pipe(res)

    // Title
    doc.fontSize(20).text(`Feedback Report for ${rows[0].facultyname}`, { align: 'center' })
    doc.moveDown()

    // Each feedback
    feedbackWithResponses.forEach((fb, index) => {
      doc.fontSize(14).text(`Feedback #${index + 1}`, { underline: true })
      doc.moveDown(0.3)
      doc.text(`Student: ${fb.studentname}`)
      doc.text(`Course: ${fb.coursename}`)
      doc.text(`Subject: ${fb.subjectname}`)
      doc.text(`Period: ${fb.StartDate} - ${fb.EndDate}`)
      doc.text(`Overall Rating: ${fb.rating}`)
      if (fb.comments) doc.text(`Comments: ${fb.comments}`)
      doc.moveDown(0.5)

      fb.responses.forEach((r, i) => {
        doc.text(`   Q${i + 1}: ${r.questiontext}`)
        doc.text(`      Response: ${r.response_rating}`)
      })

      doc.moveDown(1)
    })

    doc.end()
  } catch (err) {
    console.error(err)
    res.status(500).send(' Error generating faculty feedback PDF')
  }
})



module.exports = router



