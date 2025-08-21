const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')

// Add Role
router.post('/register', async (request, response) => {
  const { rolename } = request.body

  try {
    const statement = `INSERT INTO Role (rolename) VALUES (?)`

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

// GET All Roles
router.get('/', async (request, response) => {
  try {
    const statement = `SELECT role_id, rolename FROM Role`

    const [rows] = await db.execute(statement)

    response.send(utils.createSuccess(rows))
  } catch (ex) {
    response.send(utils.createError(ex))
  }
})

// GET Role by ID
router.get('/:id', async (request, response) => {
  const { id } = request.params

  try {
    const statement = `SELECT role_id, rolename FROM Role WHERE role_id = ?`

    const [rows] = await db.execute(statement, [id])

    if (rows.length === 0) {
      response.send(utils.createError('Role not found'))
    } else {
      response.send(utils.createSuccess(rows[0]))
    }
  } catch (ex) {
    response.send(utils.createError(ex))
  }
})

// GET Role by ID
router.get('/:id', async (request, response) => {
  const { id } = request.params

  try {
    const statement = `SELECT role_id, rolename FROM Role WHERE role_id = ?`

    const [rows] = await db.execute(statement, [id])

    if (rows.length === 0) {
      response.send(utils.createError('Role not found'))
    } else {
      response.send(utils.createSuccess(rows[0]))
    }
  } catch (ex) {
    response.send(utils.createError(ex))
  }
})

// DELETE Role
router.delete('/:id', async (request, response) => {
  const { id } = request.params

  try {
    const statement = `DELETE FROM Role WHERE role_id = ?`

    const [result] = await db.execute(statement, [id])

    if (result.affectedRows === 0) {
      response.send(utils.createError('Role not found or already deleted'))
    } else {
      response.send(utils.createSuccess(`Role with ID ${id} deleted successfully`))
    }
  } catch (ex) {
    response.send(utils.createError(ex))
  }
})

module.exports = router
