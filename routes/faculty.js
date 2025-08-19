const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const cryptoJs = require('crypto-js')
const jwt = require('jsonwebtoken')
const config = require('../config')



// REGISTER Faculty with Role
router.post('/register', async (request, response) => {
    const { facultyname, email, password, role } = request.body



    try {
        const encryptedPassword = String(cryptoJs.SHA256(password))


        // Step 1: Insert into Faculty table
        const statement = `
    insert into  Faculty(facultyname,email,password)
    values
    (?,?,?)`


        const [result] = await db.execute(statement, [

            facultyname,
            email,
            encryptedPassword

        ])


        // Get the inserted faculty_id
        const facultyId = result.insertId



        // Step 2: Insert into Role table
        const Statement = `
            INSERT INTO Role (rolename, faculty_id)
            VALUES (?, ?) `


        await db.execute(Statement, [role, facultyId])

        response.send(utils.createSuccess({

            facultyId,
            facultyname,
            email,
            role

        }))


    } catch (ex) {
        response.send(utils.createError(ex))
    }
})






// LOGIN Faculty with Role JOIN
router.post('/login', async (request, response) => {

    const { email, password } = request.body;

    try {
        const encryptedPassword = String(cryptoJs.SHA256(password));


        const statement = `
            SELECT f.faculty_id, f.facultyname, r.rolename
            FROM Faculty f
            LEFT JOIN Role r ON f.faculty_id = r.faculty_id
            WHERE f.email = ? AND f.password = ?
            
            `

        const [facultyRows] = await db.execute(statement, [
            email,
            encryptedPassword,

        ])


        if (facultyRows.length == 0) {
            response.send(utils.createError('user does not exist'))

        } else {

            const faculty = facultyRows[0]
            const token = jwt.sign({
                faculty_id: faculty['faculty_id'], facultyname: faculty['facultyname']

            },

                config.secret

            )


            response.send(
                utils.createSuccess({
                    token,
                    facultyname: faculty['facultyname'],


                })
            )
        }



    } catch (ex) {
        response.send(utils.createError(ex))
    }

})
module.exports = router