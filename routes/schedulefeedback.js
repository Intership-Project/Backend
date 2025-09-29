const express = require('express');
const router = express.Router();
const db = require('../db');
const utils = require('../utils');

// CREATE Schedule Feedback
router.post('/register', async (req, res) => {
    const { course_id, subject_id, faculty_id, batch_id, feedbacktype_id, StartDate, EndDate, feedbackmoduletype_id } = req.body;

    try {
        if (!course_id || !subject_id || !faculty_id || !feedbacktype_id || !StartDate || !EndDate || !feedbackmoduletype_id) {
            return res.send(utils.createError("All required fields must be provided."));
        }

        let batchValue = null;

        // Lab feedback (feedbacktype_id = 2) → batch required
        if (feedbacktype_id == 2) {
            if (!batch_id) {
                return res.send(utils.createError("Batch ID is required for Lab feedback type."));
            }
            batchValue = batch_id;
        }

        // Lab Mentor (feedbacktype_id = 3) → batch required
        if (feedbacktype_id == 3) {
            if (!batch_id) {
                return res.send(utils.createError("Batch ID is required for Lab Mentor feedback type."));
            }
            batchValue = batch_id;
        }

        const statement = `
            INSERT INTO ScheduleFeedback
            (course_id, subject_id, faculty_id, batch_id, feedbacktype_id, StartDate, EndDate, feedbackmoduletype_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(statement, [course_id, subject_id, faculty_id, batchValue, feedbacktype_id, StartDate, EndDate, feedbackmoduletype_id]);

        res.send(utils.createSuccess({
            scheduleFeedbackId: result.insertId,
            course_id,
            subject_id,
            faculty_id,
            batch_id: batchValue,
            feedbacktype_id,
            StartDate,
            EndDate,
            feedbackmoduletype_id
        }));
    } catch (ex) {
        res.send(utils.createError(ex.message || ex));
    }
});

// GET all Schedule Feedbacks
router.get('/', async (req, res) => {
    try {
        const statement = `
            SELECT sf.schedulefeedback_id, sf.StartDate, sf.EndDate, sf.feedbacktype_id, sf.feedbackmoduletype_id,
                   sf.batch_id, sf.status,
                   c.course_id, c.coursename,
                   s.subject_id, s.subjectname,
                   f.faculty_id, f.facultyname,
                   b.batchname
            FROM ScheduleFeedback sf
            JOIN Course c ON sf.course_id = c.course_id
            JOIN Subject s ON sf.subject_id = s.subject_id
            JOIN Faculty f ON sf.faculty_id = f.faculty_id
            LEFT JOIN Batch b ON sf.batch_id = b.batch_id
        `;
        const [rows] = await db.execute(statement);
        res.send(utils.createSuccess(rows));
    } catch (ex) {
        res.send(utils.createError(ex.message || ex));
    }
});

// GET Schedule Feedback by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const statement = `
            SELECT sf.schedulefeedback_id, sf.StartDate, sf.EndDate, sf.feedbacktype_id, sf.feedbackmoduletype_id,
                   sf.batch_id, sf.status,
                   c.course_id, c.coursename,
                   s.subject_id, s.subjectname,
                   f.faculty_id, f.facultyname,
                   b.batchname
            FROM ScheduleFeedback sf
            JOIN Course c ON sf.course_id = c.course_id
            JOIN Subject s ON sf.subject_id = s.subject_id
            JOIN Faculty f ON sf.faculty_id = f.faculty_id
            LEFT JOIN Batch b ON sf.batch_id = b.batch_id
            WHERE sf.schedulefeedback_id = ?
        `;
        const [rows] = await db.execute(statement, [id]);
        if (rows.length === 0) {
            res.send(utils.createError('Schedule Feedback not found'));
        } else {
            res.send(utils.createSuccess(rows[0]));
        }
    } catch (ex) {
        res.send(utils.createError(ex.message || ex));
    }
});

// UPDATE Schedule Feedback
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { course_id, subject_id, faculty_id, batch_id, feedbacktype_id, StartDate, EndDate, feedbackmoduletype_id } = req.body;

    try {
        if (!course_id || !subject_id || !faculty_id || !feedbacktype_id || !StartDate || !EndDate || !feedbackmoduletype_id) {
            return res.send(utils.createError("All required fields must be provided."));
        }

        let batchValue = null;

        if (feedbacktype_id == 2 || feedbacktype_id == 3) {
            if (!batch_id) {
                return res.send(utils.createError("Batch ID is required for Lab / Lab Mentor feedback type."));
            }
            batchValue = batch_id;
        }

        const statement = `
            UPDATE ScheduleFeedback
            SET course_id = ?, subject_id = ?, faculty_id = ?, batch_id = ?, feedbacktype_id = ?, StartDate = ?, EndDate = ?, feedbackmoduletype_id = ?
            WHERE schedulefeedback_id = ?
        `;
        const [result] = await db.execute(statement, [course_id, subject_id, faculty_id, batchValue, feedbacktype_id, StartDate, EndDate, feedbackmoduletype_id, id]);

        if (result.affectedRows === 0) {
            return res.send(utils.createError('Schedule Feedback not found'));
        }

        const getUpdated = `
            SELECT sf.schedulefeedback_id, sf.StartDate, sf.EndDate, sf.feedbacktype_id, sf.feedbackmoduletype_id,
                   sf.batch_id, sf.status,
                   c.course_id, c.coursename,
                   s.subject_id, s.subjectname,
                   f.faculty_id, f.facultyname,
                   b.batchname
            FROM ScheduleFeedback sf
            JOIN Course c ON sf.course_id = c.course_id
            JOIN Subject s ON sf.subject_id = s.subject_id
            JOIN Faculty f ON sf.faculty_id = f.faculty_id
            LEFT JOIN Batch b ON sf.batch_id = b.batch_id
            WHERE sf.schedulefeedback_id = ?
        `;
        const [rows] = await db.execute(getUpdated, [id]);

        res.send(utils.createSuccess(rows[0]));
    } catch (ex) {
        res.send(utils.createError(ex.message || ex));
    }
});

module.exports = router;
