const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const cryptoJs = require('crypto-js')
const jwt = require('jsonwebtoken')
const config = require('../config')




// REGISTER Admin
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body

  // basic validation
  if (!username || !email || !password) {
    return res.send(utils.createError('Username, email, and password are required'))
  }

  try {
    // encrypt password
    const encryptedPassword = String(cryptoJs.SHA256(password))

    const statement = `INSERT INTO Admin (username, password, email) VALUES (?, ?, ?)`
    const [result] = await db.execute(statement, [username, encryptedPassword, email])


    res.send(
      utils.createSuccess({
        adminId: result.insertId,
        username,
        email
      })
    )
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})



// LOGIN Admin
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.send(utils.createError('Email and password are required'))
  }
 try {
    // Check if email exists
    const [emailRows] = await db.execute(
      `SELECT id, username, email, password FROM Admin WHERE email = ?`,
      [email]
    )

    if (emailRows.length === 0) {
      return res.send(utils.createError('Invalid email'))
    }

    const admin = emailRows[0]

    //Encrypt and check password
    const encryptedPassword = String(cryptoJs.SHA256(password))
    if (admin.password !== encryptedPassword) {
      return res.send(utils.createError('Invalid password'))
    }

    //Created JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        usertype: 'Admin',
      },
      config.secret,
      { expiresIn: '1d' }
    )

    res.send(
      utils.createSuccess({
        token,
        adminId: admin.id,
        username: admin.username,
        email: admin.email,
        usertype: 'Admin',
      })
    )
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})




// POST /admin/forgotpassword
router.post('/forgotpassword', async (req, res) => {
  const { email } = req.body;

  try {
    const [rows] = await db.execute(`SELECT id, email FROM Admin WHERE email = ?`, [email]);

    if (rows.length === 0) {
      return res.send(utils.createError('Admin not found with this email'));
    }

    const admin = rows[0];
    // Token valid for 20 minutes
    const resetToken = jwt.sign(
      { id: admin.id, email: admin.email },
      config.secret,
      { expiresIn: '20m' }
    );

   

    res.send(utils.createSuccess({ resetToken }));
  } catch (ex) {
    console.error("Admin Forgot Password Error:", ex);
    res.send(utils.createError("Something went wrong"));
  }
});



// POST /admin/resetpassword
router.post("/resetpassword", async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res.send(utils.createError("Token and new password are required"));
  }

  try {
    // Verify token
    const decoded = jwt.verify(resetToken, config.secret);

    // Encrypt new password
    const encryptedPassword = cryptoJs.SHA256(newPassword).toString();

    // Update password in Admin table
    await db.execute(`UPDATE Admin SET password = ? WHERE id = ?`, [
      encryptedPassword,
      decoded.id,
    ]);

    res.send(utils.createSuccess("Password reset successfully"));
  } catch (ex) {
    console.error("Admin Reset Password Error:", ex);
    res.send(utils.createError("Invalid or expired reset token"));
  }
});



module.exports = router