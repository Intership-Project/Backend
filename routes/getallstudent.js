const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')





router.get('/', async (request ,  response) =>{

  try {
    const statement = `
  select student_id,studentname, email,password,course_id from student`
  const [result] = await db.execute(statement, [])
  response.send(utils.createSuccess(result))
    
  } catch (ex) {
    response.send(utils.createError(ex))
    console.error("Error:", ex)
    
  }
})





module.exports = router