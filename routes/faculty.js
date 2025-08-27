const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')
const cryptoJs = require('crypto-js')
const jwt = require('jsonwebtoken')
const config = require('../config')



// REGISTER Faculty with Role
router.post('/register', async (req, res) => {
    const { facultyname, email, password, role_id } = req.body



    try {
        const encryptedPassword = String(cryptoJs.SHA256(password))


        // Step 1: Insert into Faculty table with role_id
        const statement = `
      INSERT INTO Faculty (facultyname, email, password, role_id)
      VALUES (?, ?, ?, ?)
    `


        const [result] = await db.execute(statement, [

            facultyname,
            email,
            encryptedPassword,
            role_id

        ])


        res.send(

            utils.createSuccess({
                facultyId: result.insertId,
                facultyname,
                email,
                role_id
            })

        )

    } catch (ex) {

        res.send(utils.createError(ex))
    }
})





// LOGIN Faculty Only
router.post('/login', async (req, res) => {
    const { email, password, course_id } = req.body;

    try {
        if (!email || !password) {
            return res.send(utils.createError('Email and password are required'));
        }

        // Hash the password
        const encryptedPassword = cryptoJs.SHA256(password).toString();

        // Check in Faculty table
        const [facultyRows] = await db.execute(
            `SELECT f.faculty_id, f.facultyname, f.email, f.role_id, r.rolename
             FROM faculty f
             JOIN role r ON f.role_id = r.role_id
             WHERE f.email = ? AND f.password = ?`,
            [email, encryptedPassword]
        );

        if (facultyRows.length === 0) {
            return res.send(utils.createError('Invalid credentials'));
        }

        const faculty = facultyRows[0];

        // If role is Course Coordinator, course_id must be provided
        if (faculty.rolename === 'Course Coordinator') {
            if (!course_id) {
                return res.send(utils.createError('Course selection required for Course Coordinator'));
            }

            // Verify course exists
            const [courseRows] = await db.execute(
                ` SELECT course_id, coursename FROM course WHERE course_id = ?`,
                [course_id]
            );

            if (courseRows.length === 0) {
                return res.send(utils.createError('Invalid course selected'));
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                faculty_id: faculty.faculty_id,
                username: faculty.facultyname,
                email: faculty.email,
                rolename: faculty.rolename,
                course_id: faculty.rolename === 'Course Coordinator' ? course_id : null
            },
            config.secret,
            { expiresIn: '1h' }
        );

        // Send success response
        res.send(utils.createSuccess({
            token,
            username: faculty.facultyname,
            email: faculty.email,
            rolename: faculty.rolename,
            course_id: faculty.rolename === 'Course Coordinator' ? course_id : null
        }));

    } catch (ex) {
        console.error('Faculty Login Error:', ex);
        res.send(utils.createError('Something went wrong during faculty login.'));
    }
});




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

router.get('/:faculty_id', async (req, res) => {

    try {

        const facultyId = req.params.faculty_id;
        const [rows] = await db.execute
            (
                'SELECT f.faculty_id, f.facultyname, f.email, r.rolename FROM faculty f JOIN role r ON f.role_id = r.role_id WHERE f.faculty_id = ?',
                [facultyId]
            );

        if (rows.length === 0) {
            return res.send(utils.createError('Faculty not found'));
        }
        res.send(utils.createSuccess(rows[0]));
    } catch (err) {
        console.error("Error in /faculty/:id", err);
        res.send(utils.createError("Something went wrong"));
    }
})


// UPDATE Faculty (PUT)


router.put('profile/:faculty_id', async (req, res) => {
    const { id } = req.params;
    const { facultyname, email, password, role_id } = req.body;

    try {
        const encryptedPassword = password ? String(cryptoJs.SHA256(password)) : undefined;

        const statement = `
            UPDATE faculty
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

router.delete('/:faculty_id', async (req, res) => {
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


// GET /faculty/profile/:faculty_id
router.get('/profile/:faculty_id', async (req, res) => {
    const facultyId = req.params.faculty_id;

    try {
        const statement = `
            SELECT faculty_id, facultyname, email, role_id
            FROM faculty
            WHERE faculty_id = ?
        `;

        const [rows] = await db.execute(statement, [facultyId]);

        if (rows.length === 0) {
            res.send(utils.createError('Faculty not found'));
        } else {
            res.send(utils.createSuccess(rows[0]));  // single profile
        }
    } catch (err) {
        res.send(utils.createError(err));
    }
});




//FORGOT PASSWORD (generate token) 
router.post('/forgotpassword', async (req, res) => {
    const { email } = req.body;

    try {


        const [rows] = await db.execute(`SELECT faculty_id, email FROM faculty WHERE email = ?`, [email])

        if (rows.length === 0) {
            return res.send(utils.createError('Faculty not found with this email'))
        }

        const faculty = rows[0]
        // Generate reset token (valid for 15 min)
        const resetToken = jwt.sign({ faculty_id: faculty.faculty_id, email: faculty.email }, config.secret, { expiresIn: '20m' })

        // Normally we email the resetToken, but for now we’ll just return it in response
        res.send(utils.createSuccess({ resetToken }))
    } catch (ex) {
        console.error("Forgot Password Error:", ex.message);
        res.send(utils.createError("Something went wrong in forgot password"));
    }
})


// RESET PASSWORD 
router.post('/resetpassword', async (req, res) => {
    const { resetToken, newPassword } = req.body

    try {
        // Verify token
        const decoded = jwt.verify(resetToken, config.secret)

        const encryptedPassword = cryptoJs.SHA256(newPassword).toString();

        await db.execute(
            `UPDATE faculty SET password = ? WHERE faculty_id = ?`,
            [encryptedPassword, decoded.faculty_id]
        )

        res.send(utils.createSuccess('Password reset successfully'))
    } catch (ex) {
        res.send(utils.createError('Invalid or expired reset token'))
    }
})




//  FACULTY CHANGE PASSWORD 

router.put('/:faculty_id/change-password', async (req, res) => {
    const { faculty_id } = req.params
    const { oldPassword, newPassword } = req.body

    try {
        // 1. Get faculty by ID
        const [rows] = await db.execute(
            `SELECT password FROM faculty WHERE faculty_id = ?`,
            [faculty_id]
        )

        if (rows.length === 0) {
            return res.send(utils.createError('Faculty not found'))
        }

        const faculty = rows[0]

        // 2. Hash old password with CryptoJS (same as stored)
        const oldHash = cryptoJs.SHA256(oldPassword).toString()

        if (oldHash !== faculty.password) {
            return res.send(utils.createError('Old password is incorrect'))
        }

        // 3. Hash new password with CryptoJS
        const newHash = cryptoJs.SHA256(newPassword).toString()

        // 4. Update password in DB
        await db.execute(
            `UPDATE faculty SET password = ? WHERE faculty_id = ?`,
            [newHash, faculty_id]
        )

        res.send(utils.createSuccess('Password changed successfully'))
    } catch (ex) {
        console.error("Change password error:", ex)
        res.send(utils.createError("Something went wrong in change-password"))
    }
})





// GET /faculty/my-feedback-reports/:faculty_id

router.get("/myfeedbackreports/:faculty_id", (req, res) => {
    const { faculty_id } = req.params;

    const sql = `
       SELECT af.addfeedback_id, af.date, af.feedbackmoduletype_id AS feedback_type, 
       c.coursename AS course_name, 
       s.subjectname AS subject_name, 
       b.batchname AS batch_name, 
       af.pdf_file
FROM AddFeedback af
JOIN Course c ON af.course_id = c.course_id
JOIN Batch b ON af.batch_id = b.batch_id
JOIN Subject s ON af.subject_id = s.subject_id
WHERE af.faculty_id = ? 
ORDER BY af.date DESC;

    `;

    db.query(sql, [faculty_id], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});






module.exports = router;