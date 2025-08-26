
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
const adminRoute = require('./routes/admin')
const courseRoute = require('./routes/course')
const roleRoute = require('./routes/role')
const batchRoute = require('./routes/batch')
const subjectRoute = require('./routes/subject')
const feedbacktypeRoute = require('./routes/feedbacktype')
const feedbackmoduletypeRoute = require('./routes/feedbackmoduletype')
const feedbackquestionRoute = require('./routes/feedbackquestion')
const schedulefeedbackRoute = require('./routes/schedulefeedback')


app.use('/student', studentRoute )
app.use('/addfeedback', addfeedbackRoute)
app.use('/admin', adminRoute)
app.use('/course',courseRoute)
app.use('/role',roleRoute)
app.use('/batch',batchRoute)
app.use('/subject',subjectRoute)
app.use('/feedbacktype',feedbacktypeRoute)
app.use('/feedbackmoduletype',feedbackmoduletypeRoute)
app.use('/feedbackquestion',feedbackquestionRoute)
app.use('/schedulefeedback',schedulefeedbackRoute)

app.listen(4000, '0.0.0.0', () => {
    console.log('server started on port 4000')
});

