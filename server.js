const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const jwt = require('jsonwebtoken')
const config = require('./config')
const utils = require('./utils')

// optional (for future PDF generation)
const PDFDocument = require("pdfkit")
const fs = require("fs")
const path = require("path")

// create app
const app = express()

// enable CORS
app.use(cors())

// enable logging
app.use(morgan('combined'))

// enable JSON + URL-encoded parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// -------------------- JWT Middleware --------------------
app.use((request, response, next) => {
    const skipUrls = [
        '/faculty/register',
        '/faculty/login',
        '/faculty/forgotpassword',
        '/faculty/resetpassword',
        '/student/register',
        '/student/login',
        '/admin/register',
        '/admin/login'
    ]

    if (skipUrls.includes(request.url)) {
        return next()
    }

    const token = request.headers['token']
    if (!token) {
        return response.send(utils.createError('missing token'))
    }

    try {
        const payload = jwt.verify(token, config.secret)
        request.data = payload
        next()
    } catch (ex) {
        response.send(utils.createError('invalid token'))
    }
})

// -------------------- Routes --------------------
const adminRouter = require('./routes/admin')
const courseRouter = require('./routes/course')
const roleRouter = require('./routes/role')
const batchRouter = require('./routes/batch')
const subjectRouter = require('./routes/subject')
const feedbacktypeRouter = require('./routes/feedbacktype')
const feedbackmoduletypeRouter = require('./routes/feedbackmoduletype')
const feedbackquestionRouter = require('./routes/feedbackquestion')
const schedulefeedbackRouter = require('./routes/schedulefeedback')
const filledfeedbackRouter = require('./routes/filledfeedback')
//const addfeedbackRouter = require('./routes/addfeedback')
const facultyRouter = require('./routes/faculty')
const coursecordinatorRouter = require('./routes/coursecordinator')
//const facultydashboardRouter = require('./routes/facultydashboard')
const facultyfeedbackpdfRouter = require('./routes/facultyfeedbackpdf')
const studentRouter = require('./routes/student')

// Register routes
app.use('/admin', adminRouter)
app.use('/course', courseRouter)
app.use('/role', roleRouter)
app.use('/batch', batchRouter)
app.use('/subject', subjectRouter)
app.use('/feedbacktype', feedbacktypeRouter)
app.use('/feedbackmoduletype', feedbackmoduletypeRouter)
app.use('/feedbackquestion', feedbackquestionRouter)
app.use('/schedulefeedback', schedulefeedbackRouter)
app.use('/filledfeedback', filledfeedbackRouter)
//app.use('/addfeedback', addfeedbackRouter)
app.use('/faculty', facultyRouter)
app.use('/coursecordinator', coursecordinatorRouter)
//app.use('/facultydashboard', facultydashboardRouter)
app.use('/facultyfeedbackpdf', facultyfeedbackpdfRouter)
app.use('/student', studentRouter)

// Default route
app.get('/', (req, res) => {
    res.send('API is running...')
})

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT}`)
})
