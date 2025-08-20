const express = require('express')
const router = express.Router()
const db = require('../db') 
const utils = require('../utils')  
const cryptoJs = require('crypto-js')
const jwt = require('jsonwebtoken')
const config = require('../config')

//Student Registration
router.post('/register', async(request, response) => {
const {studentname,email,password,course_id} = request.body

try {
const encryptedPassword = String(cryptoJs.SHA256(password))


const statement = `
    insert into Student(studentname,email,password,course_id)
    values
    (?,?,?,?)`
const result = await db.execute(statement, [
   
    studentname,
    email,
     encryptedPassword,

    course_id

])

const student_id = result.insertid 

response.send(utils.createSuccess(result))
}catch (ex) {
    response.send(utils.createError(ex))
}
})


//Student Login

router.post('/login', async (request, response) => {

    //const {email,password} = request.body

//try {
  //const encryptedPassword = String(cryptoJs.SHA256(password));





 const { email, password, Password } = request.body;  
    const pwd = password || Password;   

try {
  const encryptedPassword = String(cryptoJs.SHA256(pwd));




const statement = `
    Select studentname from student where email = ? and password =?`
    
const [studentRows] = await db.execute(statement, [
    email,
 encryptedPassword,
   
])

 if (studentRows.length === 0) {
            response.send(utils.createError('user does not exist'))

        } else {

            const student = studentRows[0]

            
                      // include role also in token 
            const token = jwt.sign({
                student_id: student['student_id'], studentname: student['studentname']

            },

                config.secret

            )


            response.send(
                utils.createSuccess({
                    token,
                    studentname: ['studentname'],


                })
            )
        }



    } catch (ex) {
        response.send(utils.createError(ex))
    }



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
    
    

})
module.exports = router





