const express = require('express');
const router = express.Router();
const db = require('../db');
const utils = require('../utils');
const cryptoJs = require('crypto-js');
const jwt = require('jsonwebtoken');
const config = require('../config');
const verifyToken = require('../middlewares/verifyToken');


// REGISTER (Admin)
router.post('/register', async (req, res) => {
  const { studentname, email, password, course_id, batch_id } = req.body;

  if (!studentname || !email || !password || !course_id || !batch_id) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields',
      received: req.body
    });
  }

  try {
    const encryptedPassword = cryptoJs.SHA256(password).toString();

    const statement = `
      INSERT INTO student (studentname, email, password, course_id, batch_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(statement, [
      studentname,
      email,
      encryptedPassword,
      course_id,
      batch_id
    ]);

    res.send(utils.createSuccess({
      student_id: result.insertId,
      studentname,
      email,
      course_id,
      batch_id
    }));
  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex));
  }
});




// student Registers
router.post('/studentregister', async (request, response) => {
  const { studentname, email, password, course_id,batch_id} = request.body;


  // Validation
  if (!studentname || !email || !password || !course_id || !batch_id) {
    return response.status(400).json({
      status: 'error',
      message: 'Missing required fields',
      received: request.body // helpful for debugging
    });

    
  }
  try {
     // Check if batch exists
    const [batchCheck] = await db.execute(
      'SELECT batch_id FROM batch WHERE batch_id = ?',
      [batch_id]
    );

    if (batchCheck.length === 0) {
      return response.status(400).json({
        status: 'error',
        message: `Batch ID ${batch_id} does not exist`
      });
    }
    //  Encrypt password using SHA256 before saving into DB
    const encryptedPassword = String(cryptoJs.SHA256(password));

    // SQL query to insert student details
    const statement = `
      INSERT INTO Student (studentname, email, password, course_id,batch_id)
      VALUES (?, ?, ?, ?,?)
    `

    // Execute query with provided values
    const [result] = await db.execute(statement, [
      studentname,
      email,
      encryptedPassword,
      course_id,
      batch_id
    ])

    //  Send success response
    response.send(utils.createSuccess({
      student_id: result.insertId,
      studentname,
      email,
      course_id,
      batch_id
    }))
  } catch (ex) {
    response.send(utils.createError(ex))
    console.error(ex);
  }
})



// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.send(utils.createError('Email and password are required'));
  }

  try {
    const [rows] = await db.execute(
      `SELECT s.student_id, s.studentname, s.email, s.password, s.course_id, s.batch_id, c.coursename
       FROM student s
       LEFT JOIN course c ON s.course_id = c.course_id
       WHERE s.email = ?`,
      [email]
    );

    if (rows.length === 0) return res.send(utils.createError('Invalid email'));

    const student = rows[0];
    const encryptedPassword = cryptoJs.SHA256(password).toString();

    if (student.password !== encryptedPassword) return res.send(utils.createError('Invalid password'));

    const token = jwt.sign({
      student_id: student.student_id,
      studentname: student.studentname,
      email: student.email,
      course_id: student.course_id,
      batch_id: student.batch_id,
      coursename: student.coursename || null
    }, config.secret, { expiresIn: '1d' });

    res.send(utils.createSuccess({
      token,
      studentname: student.studentname,
      email: student.email,
      course_id: student.course_id,
      batch_id: student.batch_id,
      coursename: student.coursename || null
    }));
  } catch (ex) {
    console.error('Student Login Error:', ex);
    res.send(utils.createError('Something went wrong during student login.'));
  }
});




// FORGOT PASSWORD (by student)
router.post('/forgotpassword', async (req, res) => {
  const { email } = req.body;

  try {
    const [rows] = await db.execute(`SELECT student_id, email FROM student WHERE email = ?`, [email]);
    if (rows.length === 0) return res.send(utils.createError('Student not found with this email'));

    const student = rows[0];
    const resetToken = jwt.sign({ student_id: student.student_id, email: student.email }, config.secret, { expiresIn: '20m' });

    
    res.send(utils.createSuccess({ resetToken }));
  } catch (ex) {
    console.error('Forgot Password Error:', ex.message);
    res.send(utils.createError('Something went wrong in forgot password'));
  }
});



// RESET PASSWORD (by student)
router.post('/resetpassword', async (req, res) => {
  const { resetToken, newPassword } = req.body;

  try {
    const decoded = jwt.verify(resetToken, config.secret);
    const encryptedPassword = cryptoJs.SHA256(newPassword).toString();

    await db.execute(`UPDATE student SET password = ? WHERE student_id = ?`, [encryptedPassword, decoded.student_id]);
    res.send(utils.createSuccess('Password reset successfully'));
  } catch (ex) {
    console.error('Reset Password Error:', ex.message);
    res.send(utils.createError('Invalid or expired reset token'));
  }
});


//UPDATE STUDENT (by Admin)
router.put('/update/:id', async (req, res) => {
  const student_id = req.params.id;
  const { studentname, email, password, course_id, batch_id } = req.body;

  try {
    let params = [studentname, email];
    let statement = 'UPDATE student SET studentname=?, email=?, ';

    if (password) {
      const encryptedPassword = cryptoJs.SHA256(password).toString();
      statement += 'password=?, ';
      params.push(encryptedPassword);
    }

    statement += 'course_id=?, batch_id=? WHERE student_id=?';
    params.push(course_id, batch_id, student_id);

    const [result] = await db.execute(statement, params);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Student not found' });

    // Fetch updated student
    const [rows] = await db.execute(
      `SELECT s.student_id, s.studentname, s.email, s.course_id, s.batch_id,
              c.coursename, b.batchname
       FROM student s
       LEFT JOIN course c ON s.course_id = c.course_id
       LEFT JOIN batch b ON s.batch_id = b.batch_id
       WHERE s.student_id = ?`,
      [student_id]
    );

    res.json({ status: 'success', data: rows[0] });
  } catch (ex) {
    console.error(ex);
    res.status(500).json({ status: 'error', error: 'Internal Server Error' });
  }
});



// DELETE STUDENT (by Admin)
router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.execute(
      'DELETE FROM student WHERE student_id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});




// GET ALL STUDENTS (byAdmin)
router.get('/getall', async (req, res) => {
  try {
    const [result] = await db.execute('SELECT student_id, studentname, email, course_id, batch_id FROM student');
    res.send(utils.createSuccess(result));
  } catch (ex) {
    console.error(ex);
    res.send(utils.createError(ex));
  }
});



//  Get student Profile 
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const student_id = req.data.student_id;

    const statement = `
      SELECT student_id, studentname, email, course_id,batch_id
      FROM student
      WHERE student_id = ?
    `;
    const [result] = await db.execute(statement, [student_id]);

    if (result.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(utils.createSuccess(result[0]));
  } catch (ex) {
    console.error(ex);
    res.status(500).json(utils.createError(ex));
  }
});




// Student submits feedback 
router.post('/filledfeedback', async (req, res) => {
  const { student_id, schedulefeedback_id, comments, responses } = req.body

  if (!student_id || !schedulefeedback_id || !responses || responses.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const connection = await db.getConnection()
  await connection.beginTransaction()

  try {
    // 1. Insert into filledfeedback (rating = 0 initially)
    const [result] = await connection.execute(
      `INSERT INTO Filledfeedback (student_id, schedulefeedback_id, comments, rating) 
       VALUES (?, ?, ?, 0)`,
      [student_id, schedulefeedback_id, comments || null]
    )

    const filledfeedbacks_id = result.insertId

    // 2. Insert responses (store response_text as response_rating)
    for (const resp of responses) {
      await connection.execute(
        `INSERT INTO Feedbackresponses (filledfeedbacks_id, feedbackquestion_id, response_rating)
         VALUES (?, ?, ?)`,
        [filledfeedbacks_id, resp.feedbackquestion_id, resp.response_text]
      )
    }

    // 3. Update filledfeedback.rating based on average mapping
    const updateQuery = `
      UPDATE Filledfeedback
      SET rating = (
        SELECT ROUND(AVG(
          CASE
            WHEN fr.response_rating = 'excellent' THEN 5
            WHEN fr.response_rating = 'good' THEN 4
            WHEN fr.response_rating = 'satisfactory' THEN 3
            WHEN fr.response_rating = 'unsatisfactory' THEN 2
            ELSE 1
          END
        ))
        FROM Feedbackresponses fr
        WHERE fr.filledfeedbacks_id = ?
      )
      WHERE filledfeedbacks_id = ?
    `
    await connection.execute(updateQuery, [filledfeedbacks_id, filledfeedbacks_id])

    // 4. Fetch updated filledfeedback and responses
    const [filledfeedbackRows] = await connection.execute(
      `SELECT filledfeedbacks_id, student_id, schedulefeedback_id, comments, rating
       FROM Filledfeedback
       WHERE filledfeedbacks_id = ?`,
      [filledfeedbacks_id]
    )

    const [responseRows] = await connection.execute(
      `SELECT feedbackquestion_id, response_rating AS response_text
       FROM Feedbackresponses
       WHERE filledfeedbacks_id = ?`,
      [filledfeedbacks_id]
    )

    await connection.commit()

    res.json({
      ...filledfeedbackRows[0],
      responses: responseRows
    })
  } catch (ex) {
    await connection.rollback()
    console.error('Feedback submission error:', ex.message)
    res.status(500).json({ error: ex.sqlMessage || ex.message })
  } finally {
    connection.release()
  }
})




module.exports = router;
