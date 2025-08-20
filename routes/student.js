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



  
// ✅ DELETE API
router.delete("/delete/:id", (req, res) => {
    const student_id = req.params.id;

    db.query("DELETE FROM student WHERE student_id = ?", [student_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.json({ message: "Student deleted successfully" });
    });
});




// ✅ Update API
router.put('/update/:id', async (req, res) => {
  const student_id = req.params.id
  const { studentname, email, password, course_id } = req.body

  try {
    let encryptedpassword = null
    if (password) {
      encryptedpassword = String(cryptojs.SHA256(password))
    }

    const statement = `
      UPDATE student 
      SET studentname = ?, email = ?, ${password ? 'password = ?,' : ''} course_id = ? 
      WHERE student_id = ?
    `

    const params = password
      ? [studentname, email, encryptedpassword, course_id, student_id]
      : [studentname, email, course_id, student_id]

    const [result] = await db.execute(statement, params)

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Student not found' })
    }

    res.json({ message: 'Student updated successfully' })
  } catch (ex) {
    res.status(500).json({ error: ex })
  }
})



router.get('/profile', async (req, res) => {
  try {
    const student_id = req.data.student_id   // correct key

    const statement = `
      SELECT student_id, studentname, email, course_id
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





module.exports = router