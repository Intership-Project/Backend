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

// routes

const adminRoute = require('./routes/admin')
const courseRoute = require('./routes/course')
const  roleRoute = require('./routes/role')
const batchRoute = require('./routes/batch')
const subjectRoute = require('./routes/subject')
const feedbacktypeRoute = require('./routes/feedbacktype')
const feedbackmoduletypeRoute = require('./routes/feedbackmoduletype')
const feedbackquestionRoute = require('./routes/feedbackquestion')
const schedulefeedbackRoute = require('./routes/schedulefeedback')
const FilledFeedbackRoute = require('./routes/filledfeedback')
// use routes

app.use('/admin', adminRoute)
app.use('/course',courseRoute)
app.use('/role',roleRoute)
app.use('/batch',batchRoute)
app.use('/subject',subjectRoute)
app.use('/feedbacktype',feedbacktypeRoute)
app.use('/feedbackmoduletype',feedbackmoduletypeRoute)
app.use('/feedbackquestion',feedbackquestionRoute)
app.use('/schedulefeedback',schedulefeedbackRoute)
app.use('/filledfeedback',FilledFeedbackRoute)

// default route
app.get('/', (req, res) => {
  res.send('API is running...')
})

// start server
const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`)
})





//-------------------------------------------------------------------------------------------------------------------------------------------------
// const express = require('express')
// const cors = require('cors')
// const db = require('./db') 

// const utils = require('./utils')
// const morgan = require('morgan')
// const config = require('./config')
// const jwt = require('jsonwebtoken')


//create new react app



// const app = express()
// app.use(cors())
// app.use(morgan('combined'))
// app.use (express.json())
// app.use(express.urlencoded({ extended: true }))


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



const courseRouter = require('./routes/course')   // our new course routes
const adminRouter = require('./routes/admin')     // your existing admin routes
const roleRouter = require('./routes/role')
const batchRouter = require('./routes/batch')
const subjectRouter = require('./routes/subject')
const feedbacktypeRouter = require('./routes/feedbacktype')
const feedbackmoduletypeRouter = require('./routes/feedbackmoduletype')
const feedbackquestionRouter = require('./routes/feedbackquestion')
const schedulefeedbackRouter = require('./routes/schedulefeedback')
const studentRouter = require('./routes/student')
const addfeedbackRouter = require('./routes/addfeedback')
const filledfeedbackRouter = require('./routes/filledfeedback')



app.use('/faculty', facultyRouter)
//app.use('/facultydashboard', facultydashboardRouter)
app.use('/coursecordinator', coursecordinatorRouter)
app.use('/facultyfeedbackpdf', facultyfeedbackpdfRouter)



app.use('/admin', adminRouter)
app.use('/course', courseRouter)
app.use('/role', roleRouter)
app.use('/batch', batchRouter)
app.use('/subject',subjectRouter)
app.use('/feedbacktype',feedbacktypeRouter)
app.use('/feedbackmoduletype',feedbackmoduletypeRouter)
app.use('/feedbackquestion',feedbackquestionRouter)
app.use('/schedulefeedback',schedulefeedbackRouter)
app.use('/student', studentRouter )
app.use('/addfeedback', addfeedbackRouter)
app.use('/filledfeedback', filledfeedbackRouter)


app.listen(4000, '0.0.0.0', () => {
    console.log('server started on port 4000')

})



