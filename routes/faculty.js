const express = require('express');
const db = require('../db');
const utils = require('../utils');
const cryptoJs = require('crypto-js');
const jwt = require('jsonwebtoken');
const config = require('../config');
const path = require('path');
const fs = require('fs');
const PDFDocument = require("pdfkit");
const verifyToken = require('../middlewares/verifyToken');



const router = express.Router();


// REGISTER Faculty
router.post('/register', async (req, res) => {
  const { facultyname, email, password, role_id, course_id } = req.body;

  try {
    if (!facultyname || !email || !password || !role_id) {
      return res.send(utils.createError("Faculty name, email, password and role are required"));
    }

    if (role_id == 7 && !course_id) {
      return res.send(utils.createError("Course selection required for Course Coordinator"));
    }

    const encryptedPassword = String(cryptoJs.SHA256(password));

    const statement = `
      INSERT INTO Faculty (facultyname, email, password, role_id, course_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(statement, [
      facultyname,
      email,
      encryptedPassword,
      role_id,
      role_id == 7 ? course_id : null
    ]);

    res.send(utils.createSuccess({
      facultyId: result.insertId,
      facultyname,
      email,
      role_id,
      course_id: role_id == 7 ? course_id : null
    }));
  } catch (ex) {
    res.send(utils.createError(ex));
  }
});







// LOGIN Faculty
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.send(utils.createError('Email and password are required'));
    }

    const [facultyRows] = await db.execute(
      `SELECT f.faculty_id, f.facultyname, f.email, f.password, f.role_id, f.course_id, r.rolename
       FROM Faculty f
       JOIN Role r ON f.role_id = r.role_id
       WHERE f.email = ?`,
      [email]
    );

    if (facultyRows.length === 0) return res.send(utils.createError('Invalid email'));

    const faculty = facultyRows[0];
    const encryptedPassword = cryptoJs.SHA256(password).toString();

    if (faculty.password !== encryptedPassword) {
      return res.send(utils.createError('Invalid password'));
    }

    if (faculty.rolename === 'Course Coordinator' && !faculty.course_id) {
      return res.send(utils.createError('Course selection required for Course Coordinator'));
    }

    const token = jwt.sign({
      faculty_id: faculty.faculty_id,
      username: faculty.facultyname,
      email: faculty.email,
      rolename: faculty.rolename,
      course_id: faculty.course_id || null
    }, config.secret, { expiresIn: '1d' });

    res.send(utils.createSuccess({
      token,
      faculty_id: faculty.faculty_id,
      username: faculty.facultyname,
      email: faculty.email,
      rolename: faculty.rolename,
      course_id: faculty.course_id || null
    }));

  } catch (ex) {
    console.error('Faculty Login Error:', ex);
    res.send(utils.createError('Something went wrong during faculty login.'));
  }
});


//FORGOT PASSWORD (generate token) 
router.post('/forgotpassword', async (req, res) => {
    const { email } = req.body;

    try {


        const [rows] = await db.execute(`SELECT faculty_id, email FROM Faculty WHERE email = ?`, [email])

        if (rows.length === 0) {
            return res.send(utils.createError('Faculty not found with this email'))
        }

        const faculty = rows[0]

        const resetToken = jwt.sign({ faculty_id: faculty.faculty_id, email: faculty.email }, config.secret, { expiresIn: '20m' })

        res.send(utils.createSuccess({ resetToken }))
    } catch (ex) {
        console.error("Forgot Password Error:", ex.message);
        res.send(utils.createError("Something went wrong in forgot password"));
    }
})


// RESET PASSWORD 
router.post('/resetpassword', async (req, res) => {
    const { resetToken, newPassword } = req.body

    try {
    
        const decoded = jwt.verify(resetToken, config.secret)
        const encryptedPassword = cryptoJs.SHA256(newPassword).toString();

        await db.execute(
            `UPDATE Faculty SET password = ? WHERE faculty_id = ?`,
            [encryptedPassword, decoded.faculty_id]
        )

        res.send(utils.createSuccess('Password reset successfully'))
    } catch (ex) {
        res.send(utils.createError('Invalid or expired reset token'))
    }
})



// Change Password
router.put('/changepassword', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { faculty_id, rolename } = req.data;

  if (!['Trainer', 'Lab Mentor', 'Course Coordinator'].includes(rolename)) {
    return res.status(403).send(utils.createError("Only Trainer, Lab Mentor or CC can change password"));
  }

  try {
    const [rows] = await db.execute(`SELECT password FROM Faculty WHERE faculty_id = ?`, [faculty_id]);
    if (rows.length === 0) return res.send(utils.createError('Faculty not found'));

    const oldHash = cryptoJs.SHA256(oldPassword).toString();
    if (oldHash !== rows[0].password) return res.send(utils.createError('Old password is incorrect'));

    const newHash = cryptoJs.SHA256(newPassword).toString();
    await db.execute(`UPDATE Faculty SET password = ? WHERE faculty_id = ?`, [newHash, faculty_id]);

    res.send(utils.createSuccess('Password changed successfully'));
  } catch (ex) {
    res.send(utils.createError("Something went wrong in change-password"));
  }
});

// Get all PDF URLs for logged-in faculty (added by CC or Admin)

router.get("/faculty-feedback", async (req, res) => {
  const { faculty_id } = req.data;

  try {
    const [feedbackRows] = await db.execute(
      `SELECT DISTINCT pdf_file 
       FROM addfeedback 
       WHERE faculty_id = ? AND pdf_file IS NOT NULL`,
      [faculty_id]
    );

    if (feedbackRows.length === 0) 
      return res.send(utils.createError("No feedback found for this faculty"));

    const pdfUrls = feedbackRows.map(f => `${req.protocol}://${req.get('host')}/uploads/feedback_reports/${f.pdf_file}`);
    res.send(utils.createSuccess(pdfUrls));
  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex.message || "Something went wrong"));
  }
});


// Get Trainers & Lab Mentors
router.get('/trainers-labs', async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT faculty_id, facultyname, role_id FROM Faculty WHERE role_id IN (6, 1)`);
    res.send(utils.createSuccess(rows));
  } catch (err) {
    res.send(utils.createError(err));
  }
});

// Get batches for a faculty
router.get('/:faculty_id/batches', async (req, res) => {
  const { faculty_id } = req.params;
  try {
    const [rows] = await db.execute(`SELECT role_id, course_id FROM Faculty WHERE faculty_id = ?`, [faculty_id]);
    if (rows.length === 0) return res.send(utils.createError("Faculty not found"));

    let batches = [];
    if (rows[0].role_id === 1) {
      const [batchRows] = await db.execute(`SELECT * FROM Batch WHERE faculty_id = ?`, [faculty_id]);
      batches = batchRows;
    }

    res.send(utils.createSuccess({ role_id: rows[0].role_id, course_id: rows[0].course_id, batches }));
  } catch (err) {
    res.send(utils.createError(err.message || err));
  }
});


// Get all faculty
router.get("/all", async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT faculty_id, facultyname, role_id FROM Faculty`);
    res.send(utils.createSuccess(rows));
  } catch (err) {
    res.send(utils.createError(err.message));
  }
});

// GET all Faculties (GET)

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT f.faculty_id, f.facultyname, f.email, r.rolename FROM Faculty f JOIN Role r ON f.role_id = r.role_id');
        res.send(utils.createSuccess(rows));
    } catch (ex) {
        res.send(utils.createError(ex));
    }
})
// GET single Faculty by ID (GET)

router.get('/:faculty_id', async (req, res) => {

    try {

        const facultyId = req.params.faculty_id;
        const [rows] = await db.execute
            (
                'SELECT f.faculty_id, f.facultyname, f.email, r.rolename FROM Faculty f JOIN Role r ON f.role_id = r.role_id WHERE f.faculty_id = ?',
                [facultyId]
            );

        if (rows.length === 0) {
            return res.send(utils.createError('Faculty not found'));
        }
        res.send(utils.createSuccess(rows[0]));
    } catch (err) {
        console.error("Error in /faculty/:id", err);
        res.send(utils.createError("Something went wrong"));
    }
})


// // UPDATE Faculty (PUT)


router.put('/profile', async (req, res) => {
    
    const { facultyname, email } = req.body;
    const faculty_id = req.data.faculty_id; 

    try {
        
        

        const statement = `
            UPDATE Faculty
            SET facultyname = ?, email = ?
            WHERE faculty_id = ?
        `;

        const params =  [facultyname, email, faculty_id];

        
        const [result] = await db.execute(statement, params);

        res.send(utils.createSuccess({
            updated: result.affectedRows,
            facultyId: faculty_id
        }));
    } catch (ex) {
         res.send(utils.createError(ex.message || ex));
    }
})



// DELETE Faculty (DELETE)

router.delete('/:faculty_id', async (req, res) => {
    const { faculty_id } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM Faculty WHERE faculty_id = ?', [faculty_id]);
        res.send(utils.createSuccess({
            deleted: result.affectedRows,
            facultyId: faculty_id
        }));
    } catch (ex) {
        res.send(utils.createError(ex));
    }
})


// GET /faculty/profile/:faculty_id
router.get('/profile/:faculty_id', async (req, res) => {
    const facultyId = req.params.faculty_id;

    try {
        const statement = `
            SELECT faculty_id, facultyname, email, role_id
            FROM Faculty
            WHERE faculty_id = ?
        `;

        const [rows] = await db.execute(statement, [facultyId]);

        if (rows.length === 0) {
            res.send(utils.createError('Faculty not found'));
        } else {
            res.send(utils.createSuccess(rows[0]));  // single profile
        }
    } catch (err) {
        res.send(utils.createError(err));
    }
});



//Faculty Feedback Reports (List)
router.get('/feedbacks', verifyToken, async (req, res) => {
  try {
    console.log("JWT Payload from token:", req.data);

    const { faculty_id, rolename } = req.data;

    if (!faculty_id) {
      return res.status(401).send(utils.createError("Faculty not found in token"));
    }

    // Only Trainer or Lab Mentor allowed
    if (rolename !== "Trainer" && rolename !== "Lab Mentor") {
      return res.status(403).send(utils.createError("Only faculty can view their feedback reports"));
    }

    // Fetch feedbacks
    const [rows] = await db.execute(
      `SELECT addfeedback_id, pdf_file, date 
       FROM Addfeedback 
       WHERE faculty_id = ? AND pdf_file IS NOT NULL
       ORDER BY date DESC`,
      [faculty_id]
    );

    if (rows.length === 0) {
      return res.status(404).send(utils.createError("No feedback PDFs available"));
    }

    // Map results with URLs
    const result = rows.map(row => ({
      addfeedback_id: row.addfeedback_id,
      date: row.date,
      pdf_file: row.pdf_file,
      view_url: `${req.protocol}://${req.get("host")}/uploads/feedback_reports/${row.pdf_file}`,
      download_url: `${req.protocol}://${req.get("host")}/faculty/feedbacks/${row.addfeedback_id}/download`
    }));

    res.status(200).send(utils.createSuccess(result));

  } catch (err) {
    console.error("Error fetching faculty feedback PDFs:", err);
    res.status(500).send(utils.createError("Something went wrong while fetching feedback PDFs"));
  }
});



//feedbacks/addfeedbackId/download
router.get('/feedbacks/:id/download', async (req, res) => {
  try {

     console.log("JWT Payload from token:", req.data); 
    const { faculty_id, rolename } = req.data; // from JWT
    const addfeedback_id = req.params.id;



     // Security: only Trainer / Lab Mentor allowed
    if (rolename !== "Trainer" && rolename !== "Lab Mentor") {
      return res.status(403).send(utils.createError("Access denied"));
    }



    // Check if feedback exists for this faculty
    const [rows] = await db.execute(
      `SELECT pdf_file 
       FROM addfeedback 
       WHERE addfeedback_id = ? AND faculty_id = ? AND pdf_file IS NOT NULL`,
      [addfeedback_id, faculty_id]
    );

    if (rows.length === 0) {
      return res.status(404).send(utils.createError("No PDF found for this feedback"));
    }

    const pdfFile = rows[0].pdf_file;
    const filePath = path.join(process.cwd(), 'uploads/feedback_reports', pdfFile);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send(utils.createError("PDF file not found on server"));
    }

      // Download the file
    res.download(filePath, pdfFile, (err) => {
      if (err) {
        console.error("Error while sending file:", err);
        res.status(500).send(utils.createError("Error while sending file"));
      }
    });

  } catch (err) {
    console.error("Error in download:", err);
    res.status(500).send(utils.createError("Something went wrong while downloading PDF"));
  }
});



// GET /faculty/:id/download
router.get("/faculty/pdf/:id", async (req, res) => {
  const facultyId = req.params.id;
  const user = req.data; // JWT decoded data -> { faculty_id, role_id, rolename, ... }

  try {
    // Role check
    if (user.rolename === "Course Coordinator") {
      // CC can download any faculty feedback
    } else if (user.rolename === "Trainer" || user.rolename === "Lab Mentor") {
      // Faculty can download only their own feedback
      if (user.faculty_id != facultyId) {
        return res.status(403).json({ message: "Access denied: You can only download your own feedback" });
      }
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    // Fetch feedback
    const [rows] = await db.execute(
      `SELECT 
          f.comments, 
          f.response_rating AS rating,
          q.questiontext AS question,
          c.coursename AS course,
          s.subjectname AS subject,
          b.batchname AS batch
       FROM filledfeedback f
       JOIN feedbackquestion q ON f.feedbackquestion_id = q.feedbackquestion_id
       JOIN course c ON f.course_id = c.course_id
       JOIN subject s ON f.subject_id = s.subject_id
       JOIN batch b ON f.batch_id = b.batch_id
       WHERE f.faculty_id = ?`,
      [facultyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No feedback found for this faculty" });
    }

    //  Faculty Info
    const [facultyInfo] = await db.execute(
      `SELECT facultyname FROM faculty WHERE faculty_id = ?`,
      [facultyId]
    );
    const facultyName = facultyInfo[0]?.facultyname || "N/A";

    //  Generate PDF document
    const doc = new PDFDocument({ margin: 30 });

    // Common Header
    doc.fontSize(16).text("Faculty Feedback Report", { align: "center" });
    doc.moveDown();

    const meta = rows[0];
    doc.fontSize(12).text(`Faculty ID: ${facultyId}`);
    doc.text(`Faculty Name: ${facultyName}`);
    doc.text(`Course: ${meta.course}`);
    doc.text(`Subject: ${meta.subject}`);
    doc.text(`Batch: ${meta.batch}`);
    doc.moveDown();

    // Feedback details
    rows.forEach((f, index) => {
      doc.fontSize(12).text(`${index + 1}. ${f.question}`);
      doc.text(`   ➤ Rating: ${f.rating}`);
      if (f.comments) doc.text(`   ➤ Comments: ${f.comments}`);
      doc.moveDown();
    });

    //  If CC → save temp file + download
    if (user.rolename === "Course Coordinator") {
      const filePath = path.join(__dirname, "../uploads/temp", `faculty_${facultyId}_feedback.pdf`);
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);
      doc.end();

      writeStream.on("finish", () => {
        res.download(filePath, `faculty_${facultyId}_feedback.pdf`, (err) => {
          if (err) console.error(err);
          fs.unlinkSync(filePath); // delete temp file after sending
        });
      });

    } else {
      //  If Faculty → direct stream response
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=faculty_${facultyId}_feedback.pdf`);
      doc.pipe(res);
      doc.end();
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating PDF" });
  }
});

//update faculty with role

router.put('/update/:faculty_id', async (req, res) => {
    const { faculty_id } = req.params;
    const { facultyname, email, password, role_id, course_id } = req.body;

    try {
        let updateFields = [];
        let updateValues = [];

        // Optional password update
        if (typeof password !== 'undefined') {
            const encryptedPassword = String(cryptoJs.SHA256(password));
            updateFields.push('password = ?');
            updateValues.push(encryptedPassword);
        }

        // Optional facultyname update
        if (typeof facultyname !== 'undefined') {
            updateFields.push('facultyname = ?');
            updateValues.push(facultyname);
        }

        // Optional email update
        if (typeof email !== 'undefined') {
            updateFields.push('email = ?');
            updateValues.push(email);
        }

        // Optional role_id update
        if (typeof role_id !== 'undefined') {
            updateFields.push('role_id = ?');
            updateValues.push(role_id);
        }

        // Optional course_id update ONLY for Course Coordinators
        if (typeof course_id !== 'undefined' && role_id === 7) {
            updateFields.push('course_id = ?');
            updateValues.push(course_id);
        }

        if (updateFields.length === 0) {
            return res.status(400).send(utils.createError('No fields to update'));
        }

        const statement = `
            UPDATE Faculty
            SET ${updateFields.join(', ')}
            WHERE faculty_id = ?
        `;

        updateValues.push(faculty_id);

        const [result] = await db.execute(statement, updateValues);

        res.send(utils.createSuccess({
            message: 'Faculty updated successfully',
            updatedFacultyId: faculty_id
        }));

    } catch (ex) {
        res.send(utils.createError(ex));
    }
});

// Get faculty by role
router.get('/role/:roleId', async (req, res) => {
    const { roleId } = req.params;
    try {
        const statement = `
            SELECT faculty_id, facultyname
            FROM Faculty
            WHERE role_id = ?
        `;
        const [rows] = await db.execute(statement, [roleId]);
        res.send(utils.createSuccess(rows));
    } catch (ex) {
        res.send(utils.createError(ex));
    }
});

// GET /faculty/report/all - only Trainer & Lab Mentor
router.get("/report/all", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
          fa.faculty_id,
          fa.facultyname,
          ROUND(IFNULL(AVG(ff.rating), 0), 2) AS avg_rating,
          COUNT(ff.filledfeedbacks_id) AS feedback_count
       FROM Faculty fa
       LEFT JOIN ScheduleFeedback sf ON fa.faculty_id = sf.faculty_id
       LEFT JOIN FilledFeedback ff ON sf.schedulefeedback_id = ff.schedulefeedback_id
       WHERE fa.role_id IN (1, 6)
       GROUP BY fa.faculty_id, fa.facultyname
       ORDER BY fa.facultyname`
    );

    if (rows.length === 0) {
      return res.send(utils.createError("No Trainer or Lab Mentor found"));
    }

    res.send(utils.createSuccess(rows));
  } catch (err) {
    console.error("Error fetching Trainer & Lab Mentor report:", err);
    res.status(500).send(utils.createError("Error fetching faculty report"));
  }
});



 module.exports = router;
