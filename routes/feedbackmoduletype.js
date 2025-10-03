const express = require('express')
const router = express.Router()
const db = require('../db')
const utils = require('../utils')


// CREATE FeedbackModuleType
router.post('/', async (req, res) => {
  const { fbmoduletypename, feedbacktype_id } = req.body
  try {
    if (!fbmoduletypename || !feedbacktype_id) {
      return res.send(utils.createError('fbmoduletypename and feedbacktype_id are required'))
    }


    const statement = `
      INSERT INTO FeedbackModuleType (fbmoduletypename, feedbacktype_id)
      VALUES (?, ?)
    `

    const [result] = await db.execute(statement, [fbmoduletypename, feedbacktype_id])

    res.send(utils.createSuccess({
      feedbackmoduletype_id: result.insertId,
      fbmoduletypename,
      feedbacktype_id
    }))
  } catch (ex) {
    res.send(utils.createError(ex))
  }
})



// GET All FeedbackModuleTypes
router.get('/', async (req, res) => {
    try {
      const statement = `
        SELECT fmt.feedbackmoduletype_id, fmt.fbmoduletypename, fmt.feedbacktype_id, ft.fbtypename
        FROM FeedbackModuleType fmt
        INNER JOIN FeedbackType ft ON fmt.feedbacktype_id = ft.feedbacktype_id
      `
      const [rows] = await db.execute(statement)
      res.send(utils.createSuccess(rows))
    } catch (ex) {
      res.send(utils.createError(ex))
    }
  })



// GET FeedbackModuleType by ID
router.get('/:feedbackmoduletype_id', async (req, res) => {
    const { feedbackmoduletype_id } = req.params
    try {
      const statement = `
        SELECT fmt.feedbackmoduletype_id, fmt.fbmoduletypename, fmt.feedbacktype_id, ft.fbtypename
        FROM FeedbackModuleType fmt
        INNER JOIN FeedbackType ft ON fmt.feedbacktype_id = ft.feedbacktype_id
        WHERE fmt.feedbackmoduletype_id = ?
      `
      const [rows] = await db.execute(statement, [feedbackmoduletype_id])
  
      if (rows.length === 0) {
        res.send(utils.createError('FeedbackModuleType not found'))
      } else {
        res.send(utils.createSuccess(rows[0]))
      }
    } catch (ex) {
      res.send(utils.createError(ex))
    }
  })



// DELETE FeedbackModuleType
router.delete('/:feedbackmoduletype_id', async (req, res) => {

    const { feedbackmoduletype_id } = req.params
    try {
      const statement = `
        DELETE FROM FeedbackModuleType
        WHERE feedbackmoduletype_id = ?
      `
      const [result] = await db.execute(statement, [feedbackmoduletype_id])
  
      if (result.affectedRows === 0) {
        res.send(utils.createError('FeedbackModuleType not found'))
      } else {
        res.send(utils.createSuccess(`FeedbackModuleType with id ${feedbackmoduletype_id} deleted`))
      }
    } catch (ex) {
      // Foreign key constraint safety
      if (ex.code === 'ER_ROW_IS_REFERENCED_2') {
        res.send(utils.createError('Cannot delete: FeedbackModuleType is in use'))
      } else {
        res.send(utils.createError(ex))
      }
    }
  })
  


  
//addfacultyfeedback fetch moduletype for selected feedback type
// // GET module types by feedback type

router.get("/type/:feedbackTypeId", async (req, res) => {
  const { feedbackTypeId } = req.params;

  if (!feedbackTypeId) {
    return res.status(400).json(utils.createError("Feedback Type ID is required"));
  }

  try {
    const query = `
      SELECT feedbackmoduletype_id, fbmoduletypename, feedbacktype_id
      FROM feedbackmoduletype
      WHERE feedbacktype_id = ?
    `;
    const [rows] = await db.execute(query, [feedbackTypeId]);

    if (rows.length === 0) {
      return res.json(utils.createError("No module types found for this feedback type"));
    }

    return res.json(utils.createSuccess(rows));
  } catch (err) {
    console.error("Error fetching module types:", err);
    return res.status(500).json(utils.createError("Server error while fetching module types"));
  }
});


  
   

module.exports = router