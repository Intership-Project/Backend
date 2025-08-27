const express = require("express");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const db = require("../db");

const router = express.Router();

// API to download faculty feedback
router.get("/faculty/:id/download", async (req, res) => {
  const facultyId = req.params.id;

  
  
  try {
    // 1. Fetch feedback data from DB
    const [rows] = await db.execute(
      `SELECT 
          q.questiontext AS question,
          f.rating,
          f.comments,
          c.course_name,
          s.subject_name,
          b.batch_name,
          ft.feedbacktype_name,
          sf.StartDate,
          sf.EndDate
       FROM FilledFeedback f
       JOIN ScheduleFeedback sf 
           ON f.schedulefeedback_id = sf.schedulefeedback_id
       JOIN FeedbackQuestions q 
           ON f.feedbackquestion_id = q.feedbackquestion_id
       JOIN Course c 
           ON sf.course_id = c.course_id
       JOIN Subject s 
           ON sf.subject_id = s.subject_id
       JOIN Batch b 
           ON sf.batch_id = b.batch_id
       JOIN FeedbackType ft 
           ON sf.feedbacktype_id = ft.feedbacktype_id
       WHERE sf.faculty_id = ?`,
      [facultyId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No feedback found for this faculty." });
    }

    // 2. Generate PDF dynamically
    const doc = new PDFDocument();
    const filePath = path.join(process.cwd(), `faculty_${facultyId}_feedback.pdf`);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(16).text(`Faculty Feedback Report`, { align: "center" });
    doc.moveDown();

    // Report metadata (take from first row since it's same for all)
    const meta = rows[0];
    doc.fontSize(12).text(`Course: ${meta.course_name}`);
    doc.text(`Subject: ${meta.subject_name}`);
    doc.text(`Batch: ${meta.batch_name}`);
    doc.text(`Feedback Type: ${meta.feedbacktype_name}`);
    doc.text(`Date Range: ${meta.StartDate} to ${meta.EndDate}`);
    doc.moveDown();

    // Feedback list
    rows.forEach((f, i) => {
      doc.fontSize(12).text(`${i + 1}. ${f.question}`);
      doc.text(`   ➤ Rating: ${f.rating}`);
      if (f.comments) {
        doc.text(`   ➤ Comments: ${f.comments}`);
      }
      doc.moveDown();
    });

    doc.end();

    // 3. Send file as download
    stream.on("finish", function () {
      res.download(filePath, `faculty_${facultyId}_feedback.pdf`, (err) => {
        if (err) console.log(err);
        fs.unlinkSync(filePath); // delete file after download
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating feedback PDF" });
  }
});

module.exports = router;
