const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const cryptoJs = require('crypto-js')
const jwt = require('jsonwebtoken')
const config = require('../config')



// REGISTER Faculty with Role
router.post('/register', async (request, response) => {
    const { facultyname, email, password, role_id } = request.body



    try {
        const encryptedPassword = String(cryptoJs.SHA256(password))


        // Step 1: Insert into Faculty table with role_id
        const statement = `
    insert into  Faculty(facultyname,email,password, role_id)
    values
    (?,?,?,?)`


        const [result] = await db.execute(statement, [

            facultyname,
            email,
            encryptedPassword,
            role_id

        ])


        response.send(utils.createSuccess({
            facultyId: result.insertId,
            facultyname,
            email,
            role_id
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
            JOIN Role r ON f.role_id = r.role_id
            WHERE f.email = ? AND f.password = ?
            
            `

        const [facultyRows] = await db.execute(statement, [
            email,
            encryptedPassword,

        ])


        if (facultyRows.length === 0) {
            response.send(utils.createError('user does not exist'))

        } else {

            const faculty = facultyRows[0]


            // include role also in token 
            const token = jwt.sign(
                {

                    faculty_id: faculty['faculty_id'],
                    facultyname: faculty['facultyname'],
                    rolename: faculty['rolename']    //  added role inside token

                },

                config.secret

            );

            // return role in response
            response.send(
                utils.createSuccess({
                    token,
                    facultyname: faculty['facultyname'],
                    rolename: faculty['rolename'] //  include role in response


                })
            )
        }



    } catch (ex) {
        response.send(utils.createError(ex))
    }

})


// GET all Faculties (GET)

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT f.faculty_id, f.facultyname, f.email, r.rolename FROM Faculty f JOIN Role r ON f.role_id = r.role_id');
        res.send(utils.createSuccess(rows));
    } catch (ex) {
        res.send(utils.createError(ex));
    }
})


// GET single Faculty by ID (GET)

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute
            (
                'SELECT f.faculty_id, f.facultyname, f.email, r.rolename FROM Faculty f JOIN Role r ON f.role_id = r.role_id WHERE f.faculty_id = ?', [id]);

        if (rows.length === 0) return res.send(utils.createError('Faculty not found'));
        res.send(utils.createSuccess(rows[0]));
    } catch (ex) {
        res.send(utils.createError(ex));
    }
})


// UPDATE Faculty (PUT)


router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { facultyname, email, password, role_id } = req.body;

    try {
        const encryptedPassword = password ? String(cryptoJs.SHA256(password)) : undefined;

        const statement = `
            UPDATE Faculty
            SET facultyname = ?, email = ?, ${password ? 'password = ?,' : ''} role_id = ?
            WHERE faculty_id = ?
        `;

        const params = password ? [facultyname, email, encryptedPassword, role_id, id] : [facultyname, email, role_id, id];

        const [result] = await db.execute(statement, params);

        res.send(utils.createSuccess({
            updated: result.affectedRows,
            facultyId: id
        }));
    } catch (ex) {
        res.send(utils.createError(ex));
    }
})


// DELETE Faculty (DELETE)

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM Faculty WHERE faculty_id = ?', [id]);
        res.send(utils.createSuccess({
            deleted: result.affectedRows,
            facultyId: id
        }));
    } catch (ex) {
        res.send(utils.createError(ex));
    }
})



module.exports = router;