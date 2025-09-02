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

// REGISTER Faculty with Role
router.post('/register', async (req, res) => {
    const { facultyname, email, password, role_id } = req.body



    try {
        const encryptedPassword = String(cryptoJs.SHA256(password))


        // Step 1: Insert into Faculty table with role_id
        const statement = `
      INSERT INTO Faculty (facultyname, email, password, role_id)
      VALUES (?, ?, ?, ?)
    `


        const [result] = await db.execute(statement, [

            facultyname,
            email,
            encryptedPassword,
            role_id

        ])


        res.send(

            utils.createSuccess({
                facultyId: result.insertId,
                facultyname,
                email,
                role_id
            })

        )

    } catch (ex) {

        res.send(utils.createError(ex))
    }
})




// Faculty Login

router.post('/login', async (req, res) => {
    const { email, password, course_id } = req.body;

    try {
        if (!email || !password) {
            return res.send(utils.createError('Email and password are required'));
        }

        
        

        // Check in Faculty 
        const [facultyRows] = await db.execute(
            `SELECT f.faculty_id, f.facultyname, f.email,f.password, f.role_id, r.rolename
             FROM faculty f
             JOIN role r ON f.role_id = r.role_id
             WHERE f.email = ?`,
            [email]
        );

        if (facultyRows.length === 0) {
            return res.send(utils.createError('Invalid email'));
        }

        const faculty = facultyRows[0];


        //  Verify password
        const encryptedPassword = cryptoJs.SHA256(password).toString();
        if (faculty.password !== encryptedPassword) {
            return res.send(utils.createError('Invalid password')); 
        }



        // If role is Course Coordinator, course_id must be provided
        if (faculty.rolename === 'Course Coordinator') {
            if (!course_id) {
                return res.send(utils.createError('Course selection required for Course Coordinator'));
            }

            // Verify course exists
            const [courseRows] = await db.execute(
                ` SELECT course_id, coursename FROM course WHERE course_id = ?`,
                [course_id]
            );

            if (courseRows.length === 0) {
                return res.send(utils.createError('Invalid course selected'));
            }

             await db.execute(
                  `UPDATE faculty SET course_id = ? WHERE faculty_id = ?`,
                    [course_id, faculty.faculty_id]
    );

              faculty.course_id = course_id;

        }



         // Determine role for JWT consistently
    let roleForJWT = faculty.rolename;
    if (faculty.rolename === 'Trainer' || faculty.rolename === 'Lab Mentor') {
      roleForJWT = faculty.rolename;
    }


        // Generate JWT token
        const token = jwt.sign(
            {
                faculty_id: faculty.faculty_id,
                username: faculty.facultyname,
                email: faculty.email,
                rolename: roleForJWT,
                course_id: faculty.course_id || null
            },
            config.secret,
            { expiresIn: '1d' }
        );

        // Send success response
        res.send(utils.createSuccess({
            token,
            faculty_id: faculty.faculty_id,
            username: faculty.facultyname,
            email: faculty.email,
            rolename: roleForJWT,
            course_id: faculty.course_id || null
        }));

    } catch (ex) {
        console.error('Faculty Login Error:', ex);
        res.send(utils.createError('Something went wrong during faculty login.'));
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
                'SELECT f.faculty_id, f.facultyname, f.email, r.rolename FROM faculty f JOIN role r ON f.role_id = r.role_id WHERE f.faculty_id = ?',
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


// UPDATE Faculty (PUT)


router.put('/profile', async (req, res) => {
    
    const { facultyname, email } = req.body;
    const faculty_id = req.data.faculty_id; 

    try {
        
        

        const statement = `
            UPDATE faculty
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
            FROM faculty
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




//FORGOT PASSWORD (generate token) 
router.post('/forgotpassword', async (req, res) => {
    const { email } = req.body;

    try {


        const [rows] = await db.execute(`SELECT faculty_id, email FROM faculty WHERE email = ?`, [email])

        if (rows.length === 0) {
            return res.send(utils.createError('Faculty not found with this email'))
        }

        const faculty = rows[0]
        // Generate reset token (valid for 15 min)
        const resetToken = jwt.sign({ faculty_id: faculty.faculty_id, email: faculty.email }, config.secret, { expiresIn: '20m' })

        // Normally we email the resetToken, but for now we’ll just return it in response
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
        // Verify token
        const decoded = jwt.verify(resetToken, config.secret)

        const encryptedPassword = cryptoJs.SHA256(newPassword).toString();

        await db.execute(
            `UPDATE faculty SET password = ? WHERE faculty_id = ?`,
            [encryptedPassword, decoded.faculty_id]
        )

        res.send(utils.createSuccess('Password reset successfully'))
    } catch (ex) {
        res.send(utils.createError('Invalid or expired reset token'))
    }
})




//  FACULTY CHANGE PASSWORD 

router.put('/changepassword', async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const faculty_id = req.data.faculty_id   // taken from JWT payload

    try {
        // 1. Get faculty by ID
        const [rows] = await db.execute(
            `SELECT password FROM faculty WHERE faculty_id = ?`,
            [faculty_id]
        )

        if (rows.length === 0) {
            return res.send(utils.createError('Faculty not found'))
        }

        const faculty = rows[0]

        // 2. Hash old password with CryptoJS (same as stored)
        const oldHash = cryptoJs.SHA256(oldPassword).toString()

        if (oldHash !== faculty.password) {
            return res.send(utils.createError('Old password is incorrect'))
        }

        // 3. Hash new password with CryptoJs
        const newHash = cryptoJs.SHA256(newPassword).toString()

        // 4. Update password in DB
        await db.execute(
            `UPDATE faculty SET password = ? WHERE faculty_id = ?`,
            [newHash, faculty_id]
        )

        res.send(utils.createSuccess('Password changed successfully'))
    } catch (ex) {
        console.error("Change password error:", ex)
        res.send(utils.createError("Something went wrong in change-password"))
    }
})











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
       FROM addfeedback 
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











// Faculty Download Specific Feedback Report

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






module.exports = router;
