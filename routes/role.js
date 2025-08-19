const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')

// Add Role
router.post('/register', async (request, response) => {
  const { rolename } = request.body

  try {
    const statement = `
      INSERT INTO Role (rolename)
      VALUES (?)
    `

    const [result] = await db.execute(statement, [rolename])

    response.send(
      utils.createSuccess({
        roleId: result.insertId,
        rolename,
      })
    )
  } catch (ex) {
    response.send(utils.createError(ex))
  }
})


module.exports = router
