const express = require('express')
const cors = require('cors')
const db = require('./db')
const utils = require('./utils')
const morgan = require('morgan')

// create app
const app = express()
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// routes

const adminRoute = require('./routes/admin')
const courseRoute = require('./routes/course')
const  roleRoute = require('./routes/role')
const batchRoute = require('./routes/batch')
const subjectRoute = require('./routes/subject')
const feedbacktypeRoute = require('./routes/feedbacktype')
const feedbackmoduletypeRoute = require('./routes/feedbackmoduletype')
const feedbackquestionRoute = require('./routes/feedbackquestion')

// use routes

app.use('/admin', adminRoute)
app.use('/course',courseRoute)
app.use('/role',roleRoute)
app.use('/batch',batchRoute)
app.use('/subject',subjectRoute)
app.use('/feedbacktype',feedbacktypeRoute)
app.use('/feedbackmoduletype',feedbackmoduletypeRoute)
app.use('/feedbackquestion',feedbackquestionRoute)

// default route
app.get('/', (req, res) => {
  res.send('API is running...')
})

// start server
const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`)
})







