const express = require('express')
const router = express.Router()
const db = require('../db') 
const utils = require('../utils')  
const cryptoJs = require('crypto-js')
const jwt = require('jsonwebtoken')
const config = require('../config')


router.post('/register', async(request, response) => {
const {studentname,email,password,course_id} = request.body

try {
const Password = String (cryptoJs.SHA256(password)) 

const statement = `
    insert into Student(studentname,email,password,course_id)
    values
    (?,?,?,?)`
const result = await db.execute(statement, [
   
    studentname,
    email,
    Password,
    course_id

])

const student_id = result.insertid 

response.send(utils.createSuccess(result))
}catch (ex) {
    response.send(utils.createError(ex))
}
})
router.post('/login', async (request, response) => {

    const {email,password} = request.body

try {
const Password = String (cryptoJs.SHA256(password)) 

const statement = `
    Select studentname from student where email = ? and password =?`
    
const [studentRows] = await db.execute(statement, [
    email,
    Password,
   
])

 if (studentRows.length == 0) {
            response.send(utils.createError('user does not exist'))

        } else {

            const student = studentRows[0]
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

})
module.exports = router