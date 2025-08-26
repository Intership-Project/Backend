const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const cryptoJs = require('crypto-js')
const jwt = require('jsonwebtoken')
const config = require('../config')


// REGISTER Admin
router.post('/register', async (request, response) => {
  const { username, password } = request.body

  try {
    // encrypt password
    const encryptedPassword = String(cryptoJs.SHA256(password))

    // insert into Admin table

    const statement = `
      INSERT INTO Admin (username, password)
      VALUES (?, ?)
    `


    const [result] = await db.execute(statement, [username, encryptedPassword])

    response.send(
      utils.createSuccess({
        adminId: result.insertId,
        username,
      })
    )
  } catch (ex) {
    response.send(utils.createError(ex))
  }
})


// LOGIN Admin
router.post('/login', async (request, response) => {
  const { username, password } = request.body

  try {
    const encryptedPassword = String(cryptoJs.SHA256(password))


    const statement = `
      SELECT id, username
      FROM Admin
      WHERE username = ? AND password = ?
    `


    const [rows] = await db.execute(statement, [username, encryptedPassword])

    if (rows.length === 0) {
      response.send(utils.createError('Invalid username or password'))
    } else {
      const admin = rows[0]

      // create token
      const token = jwt.sign(
        {
          id: admin.id,
          username: admin.username,
        },
        config.secret
      )

      response.send(
        utils.createSuccess({
          token,
          adminId: admin.id,
          username: admin.username,
        })
      )
    }
  } catch (ex) {
    response.send(utils.createError(ex))
  }
})

module.exports = router
