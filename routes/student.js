const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const cryptojs = require('crypto-js')
const jwt = require('jsonwebtoken')
const config = require('../config')


router.post('/register', async (request, response) =>{



  const {studentname,email,password,course_id} = request.body


try {


  const encryptedpassword = String(cryptojs.SHA256(password))
  
  const statement = `insert into student (studentname,email,password,course_id)
  values
  (?,?,?,?) `

  const result = await db.execute(statement,[studentname,email,encryptedpassword,course_id])
  response.send(utils.createSuccess(result))
  } 
  
  catch(ex){
    response.send(utils.createError(ex))
  }
})






  router.post('/login',async (request,response) => {
    const {email,password} = request.body

    try {

  const encryptedpassword = String(cryptojs.SHA256(password))

  const statement = `
  select studentname, email,password,course_id from student 
  where email =  ? and password = ?` 

  const [users] = await db.execute(statement,[email,encryptedpassword])

  if(users.length==0){

    response.send(utils.createError('user does not exits'))


  }else{

    const user = users[0]

    const token = jwt.sign({
      id:user['id'],studentname: user['studentname'],
    }, config.secret)
    response.send(utils.createSuccess({token,
       studentname: user['studentname'],
      email: user['email']
  }))


  }
  
  } catch(ex){
    response.send(utils.createError(ex))
    
  }
  })





module.exports = router