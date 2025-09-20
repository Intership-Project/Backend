const express = require("express");
const router = express.Router();
const db = require("../db");
const utils = require("../utils");
const upload = require("../middlewares/upload");
const path = require("path");
const fs = require("fs");
const verifyToken = require("../middlewares/verifyToken"); // your token middleware

// ======================= ADD FEEDBACK =======================
router.post("/", upload.single("pdf_file"), async (req, res) => {
  try {
    const { course_id, batch_id, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date } = req.body;

    if (!course_id || !subject_id || !faculty_id || !feedbackmoduletype_id || !feedbacktype_id || !date || !req.file) {
      return res.send(utils.createError("All required fields and PDF must be provided"));
    }

    const [result] = await db.execute(
      `INSERT INTO addfeedback 
        (course_id, batch_id, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date, pdf_file)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [course_id, batch_id || null, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date, req.file.filename]
    );

    res.send(
      utils.createSuccess({
        addfeedback_id: result.insertId,
        course_id,
        batch_id,
        subject_id,
        faculty_id,
        feedbackmoduletype_id,
        feedbacktype_id,
        date,
        pdf_file: req.file.filename,
      })
    );
  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex.message || "Something went wrong"));
  }
});

// ======================= GET ALL FEEDBACKS =======================
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT af.addfeedback_id, af.course_id, c.coursename, 
              af.batch_id, b.batchname,
              af.subject_id, s.subjectname,
              af.faculty_id, f.facultyname,
              af.feedbackmoduletype_id, fmt.fbmoduletypename,
              af.feedbacktype_id, ft.fbtypename,
              af.date, af.pdf_file, af.created_at
       FROM addfeedback af
       JOIN Course c ON af.course_id = c.course_id
       LEFT JOIN Batch b ON af.batch_id = b.batch_id
       JOIN Subject s ON af.subject_id = s.subject_id
       JOIN Faculty f ON af.faculty_id = f.faculty_id
       JOIN FeedbackModuleType fmt ON af.feedbackmoduletype_id = fmt.feedbackmoduletype_id
       JOIN FeedbackType ft ON af.feedbacktype_id = ft.feedbacktype_id
       ORDER BY af.created_at DESC`
    );

    res.send(utils.createSuccess(rows));
  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex.message || "Something went wrong"));
  }
});

// ======================= UPDATE FEEDBACK =======================
router.put("/update/:id", upload.single("pdf_file"), async (req, res) => {
  try {
    const { id } = req.params;
    const { course_id, batch_id, subject_id, faculty_id, feedbackmoduletype_id, feedbacktype_id, date } = req.body;

    const [existing] = await db.execute("SELECT * FROM addfeedback WHERE addfeedback_id = ?", [id]);
    if (existing.length === 0) {
      return res.send(utils.createError("Feedback not found"));
    }

    let pdfFile = existing[0].pdf_file;
    if (req.file) {
      if (pdfFile) {
        const oldPath = path.join(__dirname, "../uploads", pdfFile);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      pdfFile = req.file.filename;
    }

    await db.execute(
      `UPDATE addfeedback 
       SET course_id = ?, batch_id = ?, subject_id = ?, faculty_id = ?, 
           feedbackmoduletype_id = ?, feedbacktype_id = ?, date = ?, pdf_file = ?
       WHERE addfeedback_id = ?`,
      [
        course_id || existing[0].course_id,
        batch_id || existing[0].batch_id,
        subject_id || existing[0].subject_id,
        faculty_id || existing[0].faculty_id,
        feedbackmoduletype_id || existing[0].feedbackmoduletype_id,
        feedbacktype_id || existing[0].feedbacktype_id,
        date || existing[0].date,
        pdfFile,
        id,
      ]
    );

    res.send(utils.createSuccess("Feedback updated successfully"));
  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex.message || "Something went wrong"));
  }
});

// ======================= DELETE FEEDBACK =======================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute("SELECT * FROM addfeedback WHERE addfeedback_id = ?", [id]);
    if (existing.length === 0) {
      return res.send(utils.createError("Feedback not found"));
    }

    const pdfFile = existing[0].pdf_file;
    if (pdfFile) {
      const filePath = path.join(__dirname, "../uploads", pdfFile);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.execute("DELETE FROM addfeedback WHERE addfeedback_id = ?", [id]);

    res.send(utils.createSuccess("Feedback deleted successfully"));
  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex.message || "Something went wrong"));
  }
});


// Serve PDF with token protection
router.get("/file/:filename",  (req, res) => {
  const filePath = path.join(__dirname, "../uploads/feedback_reports", req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ status: "error", error: "File not found" });
  }

  res.sendFile(filePath);
});
module.exports = router;