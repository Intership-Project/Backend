const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const cryptoJs = require('crypto-js')
const jwt = require('jsonwebtoken')
const config = require('../config')


// Student Registration API 
//  Registers
router.post('/register', async (request, response) => {
  const { studentname, email, password, course_id,batch_id} = request.body;

  try {
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
      student_id: result.InsertId,
      studentname,
      email,
      course_id,
      batch_id
    }))
  } catch (ex) {
    response.send(utils.createError(ex))
  }
})


//  Student Login API 
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.send(utils.createError('Email and password are required'))
    }
   
   
    // Check if student exists by email
       const [studentRows] = await db.execute(
      `SELECT 
          s.student_id, 
          s.studentname, 
          s.email, 
          s.password, 
          s.course_id, 
          s.batch_id, 
          c.coursename
       FROM student s
       LEFT JOIN course c ON s.course_id = c.course_id
       WHERE s.email = ?`,
      [email]
    )

    if (studentRows.length === 0) {
      return res.send(utils.createError('Invalid email'))
    }

    const student = studentRows[0]

    // Verify password
    const encryptedPassword = cryptoJs.SHA256(password).toString()
    if (student.password !== encryptedPassword) {
      return res.send(utils.createError('Invalid password'))
    }
      
    // Generate JWT token
    const token = jwt.sign(
      {
        student_id: student.student_id,
        studentname: student.studentname,
        email: student.email,
        course_id: student.course_id,
        batch_id: student.batch_id,
        coursename: student.coursename || null
      },
      config.secret,
      { expiresIn: '1d' }
    )


     // Send success response
    res.send(
      utils.createSuccess({
        token,
        studentname: student.studentname,
        email: student.email,
        course_id: student.course_id,
        batch_id: student.batch_id,
        coursename: student.coursename || null
      })
    )
  } catch (ex) {
    console.error('Student Login Error:', ex)
    res.send(utils.createError('Something went wrong during student login.'))
  }
})


//  Forgot Password (Generate Token) 
router.post('/forgotpassword', async (req, res) => {
  const { email } = req.body

  try {
    const [rows] = await db.execute(
      `SELECT student_id, email FROM student WHERE email = ?`,
      [email]
    )

    if (rows.length === 0) {
      return res.send(utils.createError('Student not found with this email'))
    }

    const student = rows[0]

    // Generate reset token (valid for 20 minutes)
    const resetToken = jwt.sign(
      { student_id: student.student_id, email: student.email },
      config.secret,
      { expiresIn: '20m' }
    )

    // In production, send resetToken via email.
    // For now, return it in response.
    res.send(utils.createSuccess({ resetToken }))
  } catch (ex) {
    console.error('Forgot Password Error:', ex.message)
    res.send(utils.createError('Something went wrong in forgot password'))
  }
})


// ========================== Reset Password ==========================
router.post('/resetpassword', async (req, res) => {
  const { resetToken, newPassword } = req.body

  try {
    // Verify token
    const decoded = jwt.verify(resetToken, config.secret)

    // Encrypt new password
    const encryptedPassword = cryptoJs.SHA256(newPassword).toString()

    await db.execute(
      `UPDATE student SET password = ? WHERE student_id = ?`,
      [encryptedPassword, decoded.student_id]
    )

    res.send(utils.createSuccess('Password reset successfully'))
  } catch (ex) {
    console.error('Reset Password Error:', ex.message)
    res.send(utils.createError('Invalid or expired reset token'))
  }
})





// Update Student API
 //  Update student details by student_id
router.put('/update/:id', async (req, res) => {
  const student_id = req.params.id
  const { studentname, email, password, course_id, batch_id } = req.body

  try {
    let encryptedpassword = null
    if (password) {
      //  Encrypt password if provided
   encryptedpassword = cryptoJs.SHA256(password).toString()
    }

    // SQL Update query (conditionally includes password if provided)
    const statement = `
      UPDATE student 
      SET studentname = ?, 
          email = ?, 
          ${password ? 'password = ?,' : ''} 
          course_id = ?, 
          batch_id = ?
      WHERE student_id = ?
    `

    // Parameters for query
    const params = password
      ? [studentname, email, encryptedpassword, course_id, batch_id, student_id]
      : [studentname, email, course_id, batch_id, student_id]

    const [result] = await db.execute(statement, params)

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Student not found' })
    }

    res.json({ message: 'Student updated successfully' })
  } catch (ex) {
  
    res.status(500).json({ error: 'Internal Server Error' })
  }
})



//  Delete Student API 
//  Delete student by student_id
router.delete("/delete/:id", (req, res) => {
  const student_id = req.params.id;

  db.query("DELETE FROM student WHERE student_id = ?", [student_id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err });
    }

    if (result.affectedRows === 0) {
      console.error(err)
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ message: "Student deleted successfully" });
  });
})



//  Get All Students API
//  Fetch all students from Student table
router.get('/getall', async (request, response) => {
  try {
    const statement = `
      SELECT student_id, studentname, email, password, course_id,batch_id 
      FROM student
    `
    const [result] = await db.execute(statement, [])
    response.send(utils.createSuccess(result))
  } catch (ex) {
    response.send(utils.createError(ex))
    console.error("Error:", ex)
  }
})


//  Get Profile API 

router.get('/profile', async (req, res) => {
  try {
    const student_id = req.data.student_id   

    const statement = `
      SELECT student_id, studentname, email, course_id,batch_id
      FROM student
      WHERE student_id = ?
    `
    const [result] = await db.execute(statement, [student_id])

    if (result.length === 0) {
      return res.status(404).json({ message: 'Student not found' })
    }

    res.json(utils.createSuccess(result[0]))
  } catch (ex) {
    res.status(500).json(utils.createError(ex))
  }
})




// Change Password API 
router.put('/changepassword', async (req, res) => {
  try {
    const student_id = req.data.student_id   // JWT se aya
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json(utils.createError('Old and new password is wrong'))
    }

    // Old password encrypt karke verify
    const encryptedOldPassword = cryptoJs.SHA256(oldPassword).toString()

    const [users] = await db.execute(
      `SELECT student_id FROM student WHERE student_id = ? AND password = ?`,
      [student_id, encryptedOldPassword]
    )

    if (users.length === 0) {
      return res.status(400).json(utils.createError('Old password wrong'))
    }

    // New password encrypt
    const encryptedNewPassword = cryptoJs.SHA256(newPassword).toString()

    // Update DB
    await db.execute(
      `UPDATE student SET password = ? WHERE student_id = ?`,
      [encryptedNewPassword, student_id]
    )

    res.json(utils.createSuccess('Password successfully changed'))
  } catch (ex) {
    res.status(500).json(utils.createError(ex))
  }
})


//  Delete Student
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM student WHERE student_id=?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Student deleted successfully" });
  });
});

//  Update Student
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, course_id } = req.body;
  const sql = "UPDATE student SET name=?, email=?, course_id=? WHERE student_id=?";
  db.query(sql, [name, email, course_id, id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Student updated successfully" });
  });
});

//  Submit Feedback API
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
      `INSERT INTO filledfeedback (student_id, schedulefeedback_id, comments, rating) 
       VALUES (?, ?, ?, 0)`,
      [student_id, schedulefeedback_id, comments || null]
    )

    const filledfeedbacks_id = result.insertId

    // 2. Insert responses (store response_text as response_rating)
    for (const resp of responses) {
      await connection.execute(
        `INSERT INTO feedbackresponses (filledfeedbacks_id, feedbackquestion_id, response_rating)
         VALUES (?, ?, ?)`,
        [filledfeedbacks_id, resp.feedbackquestion_id, resp.response_text]
      )
    }

    // 3. Update filledfeedback.rating based on average mapping
    const updateQuery = `
      UPDATE filledfeedback
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
        FROM feedbackresponses fr
        WHERE fr.filledfeedbacks_id = ?
      )
      WHERE filledfeedbacks_id = ?
    `
    await connection.execute(updateQuery, [filledfeedbacks_id, filledfeedbacks_id])

    // 4. Fetch updated filledfeedback and responses
    const [filledfeedbackRows] = await connection.execute(
      `SELECT filledfeedbacks_id, student_id, schedulefeedback_id, comments, rating
       FROM filledfeedback
       WHERE filledfeedbacks_id = ?`,
      [filledfeedbacks_id]
    )

    const [responseRows] = await connection.execute(
      `SELECT feedbackquestion_id, response_rating AS response_text
       FROM feedbackresponses
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





module.exports = router