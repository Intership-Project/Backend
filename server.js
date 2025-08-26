

const express = require('express')
const cors = require('cors')
const db = require('./db') 

const utils = require('./utils')
const morgan = require('morgan')
const config = require('./config')
const jwt = require('jsonwebtoken')


// create new react app



const app = express()
app.use(cors())
app.use(morgan('combined'))
app.use (express.json())
app.use(express.urlencoded({ extended: true }))


// configure protected routes

app.use((request, response, next) => {
const skipUrls = ['/student/register', '/student/login']
if (skipUrls.findIndex((item) => item == request.url) != -1) {

    next()

}
else {

    const token = request.headers['token']
    if (!token)  {
        response.send(utils.createError('missing token'))

    }else {
        try {
            const payload = jwt.verify(token, config.secret) 
            request.data = payload
            next()

        } catch (ex)  {
            response.send(utils.createError('invalid token'))
        }

    }
}


})





// add the routes

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
});