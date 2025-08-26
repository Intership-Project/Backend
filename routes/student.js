const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const cryptoJs = require('crypto-js')
const jwt = require('jsonwebtoken')
const config = require('../config')


// ========================== Student Registration API ==========================
// 📌 Registers a new student into the "Student" table
router.post('/register', async (request, response) => {
  const { studentname, email, password, course_id,batch_id} = request.body;

  try {
    // 🔐 Encrypt password using SHA256 before saving into DB
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

    // ✅ Send success response
    response.send(utils.createSuccess({
      student_id: result.InsertId, // Newly created student ID
      studentname,
      email,
      course_id,
      batch_id
    }))
  } catch (ex) {
    response.send(utils.createError(ex))
  }
})


// ========================== Student Login API ==========================
// 📌 Validates student credentials and generates JWT token
router.post('/login', async (request, response) => {
  const { email, password } = request.body;

  try {
    // 🔐 Encrypt entered password
    const encryptedPassword = String(cryptoJs.SHA256(password));

    // SQL query to check if student exists with given email + password
    const statement = `
      SELECT student_id, studentname, email, password, course_id 
      FROM student 
      WHERE email = ? AND password = ?
    ` 

    const [studentRows] = await db.execute(statement, [email, encryptedPassword])

    // ❌ If no student found
    if (studentRows.length === 0) {
      response.send(utils.createError('User does not exist'))
    } else {
      // ✅ Student found
      const student = studentRows[0]

      // Generate JWT token with student data
      const token = jwt.sign(
        {
          student_id: student['student_id'],
          studentname: student['studentname'],
          coursename: student['coursename'] // ⚠️ Make sure coursename exists in table
        },
        config.secret
      )

      // Send login success response with token
      response.send(
        utils.createSuccess({
          token,
          studentname: student['studentname'],
          coursename: student['coursename']
        })
      )
    }
  } catch (ex) {
    response.send(utils.createError(ex))
  }
})


// ========================== Update Student API ==========================
 // ✅ Update student details by student_id
router.put('/update/:id', async (req, res) => {
  const student_id = req.params.id
  const { studentname, email, password, course_id, batch_id } = req.body

  try {
    let encryptedpassword = null
    if (password) {
      // 🔐 Encrypt password if provided
      encryptedpassword = String(cryptoJs.SHA256(password))
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



// ========================== Get All Students API ==========================
// 📌 Fetch all students from Student table
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


// ========================== Get Profile API ==========================
// 📌 Fetch logged-in student profile using student_id from JWT
router.get('/profile', async (req, res) => {
  try {
    const student_id = req.data.student_id   // student_id comes from JWT middleware

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




// ================= Change Password API =================
router.put('/changepassword', async (req, res) => {
  try {
    const student_id = req.data.student_id   // JWT se aya
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json(utils.createError('Old and new password dono chahiye'))
    }

    // Old password encrypt karke verify
    const encryptedOldPassword = cryptojs.SHA256(oldPassword).toString()

    const [users] = await db.execute(
      `SELECT student_id FROM student WHERE student_id = ? AND password = ?`,
      [student_id, encryptedOldPassword]
    )

    if (users.length === 0) {
      return res.status(400).json(utils.createError('Old password galat hai'))
    }

    // New password encrypt
    const encryptedNewPassword = cryptojs.SHA256(newPassword).toString()

    // Update DB
    await db.execute(
      `UPDATE student SET password = ? WHERE student_id = ?`,
      [encryptedNewPassword, student_id]
    )

    res.json(utils.createSuccess('Password successfully change ho gaya'))
  } catch (ex) {
    res.status(500).json(utils.createError(ex))
  }
})


// ✅ Delete Student
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM student WHERE student_id=?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Student deleted successfully" });
  });
});

// ✅ Update Student
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, course_id } = req.body;
  const sql = "UPDATE student SET name=?, email=?, course_id=? WHERE student_id=?";
  db.query(sql, [name, email, course_id, id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Student updated successfully" });
  });
});


module.exports = router