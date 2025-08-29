
const express = require('express')
const cors = require('cors')
const db = require('./db')
const utils = require('./utils')
const morgan = require('morgan')
const jwt = require('jsonwebtoken')
const config = require('./config')
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");




// create app
const app = express()

// enable the CORS
app.use(cors())

// enable logging using morgan
app.use(morgan('combined'))

// set the middleware
app.use(express.json())


app.use(express.urlencoded({ extended: true }))


// configure protected routes

app.use((request, response, next) => {

    const skipUrls = [
        
        '/faculty/register', 
        '/faculty/login',
         '/faculty/forgotpassword',
         '/faculty/resetpassword',
         '/student/register', 
         '/student/login'
    
    ]
    if (skipUrls.findIndex((item) => item == request.url) != -1) {

        next()

    }
    else {

        const token = request.headers['token']
        if (!token) {
            response.send(utils.createError('missing token'))

        } else {
            try {
                const payload = jwt.verify(token, config.secret)
                request.data = payload
                next()

            } catch (ex) {
                response.send(utils.createError('invalid token'))
            }

        }
    }


})


// add the routes

const facultyRouter = require('./routes/faculty')
const coursecordinatorRouter = require('./routes/coursecordinator')
//const facultydashboardRouter = require('./routes/facultydashboard')
const facultyfeedbackpdfRouter = require('./routes/facultyfeedbackpdf')

const studentRoute = require('./routes/student')
const addfeedbackRoute = require('./routes/addfeedback')
const courseRouter = require('./routes/course')   // our new course routes
const adminRouter = require('./routes/admin')     // your existing admin routes
const roleRouter = require('./routes/role')
const batchRouter = require('./routes/batch')
const subjectRouter = require('./routes/subject')
const feedbacktypeRouter = require('./routes/feedbacktype')
const feedbackmoduletypeRouter = require('./routes/feedbackmoduletype')
const feedbackquestionRouter = require('./routes/feedbackquestion')
const schedulefeedbackRouter = require('./routes/schedulefeedback')




app.use('/faculty', facultyRouter)
//app.use('/facultydashboard', facultydashboardRouter)
app.use('/coursecordinator', coursecordinatorRouter)
app.use('/facultyfeedbackpdf', facultyfeedbackpdfRouter)


app.use('/student', studentRoute )
app.use('/addfeedback', addfeedbackRoute)
app.use('/admin', adminRouter)
app.use('/course', courseRouter)
app.use('/role', roleRouter)
app.use('/batch', batchRouter)
app.use('/subject',subjectRouter)
app.use('/feedbacktype',feedbacktypeRouter)
app.use('/feedbackmoduletype',feedbackmoduletypeRouter)
app.use('/feedbackquestion',feedbackquestionRouter)
app.use('/schedulefeedback',schedulefeedbackRouter)




app.listen(4000, '0.0.0.0', () => {
    console.log('server started on port 4000')

})

