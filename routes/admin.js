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

    // insert into Admin table

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
    // Step 1: Check if email exists
    const [emailRows] = await db.execute(
      `SELECT id, username, email, password FROM Admin WHERE email = ?`,
      [email]
    )

    if (emailRows.length === 0) {
      return res.send(utils.createError('Invalid email'))
    }

    const admin = emailRows[0]

    // Step 2: Encrypt and check password
    const encryptedPassword = String(cryptoJs.SHA256(password))
    if (admin.password !== encryptedPassword) {
      return res.send(utils.createError('Invalid password'))
    }

    // Step 3: Create JWT token
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

module.exports = router