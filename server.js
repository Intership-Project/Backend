const express = require('express')
const cors = require('cors')
const db = require('./db')
const utils = require('./utils')
const morgan = require('morgan')
const jwt = require('jsonwebtoken')
const config = require('./config')


// create app
const app = express()
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


// app.use((req, res, next) => {
//     const skipUrls = ['/student/register', '/student/login', '/admin/register','/admin/login']

//     // Use req.path to skip certain routes
//     if (skipUrls.includes(req.path)) return next()

//     const token = req.headers['token']
//     if (!token)  {
//         return res.status(401).send(utils.createError('missing token'))
//     } else {
//         try {
//             const payload = jwt.verify(token, config.secret)
//             req.data = payload
//             next()
//         } catch (ex)  {
//             return res.status(403).send(utils.createError('invalid token'))
//         }
//     }
// })


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
const filledfeedbackRoute = require('./routes/filledfeedback')
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
app.use('/filledfeedback',filledfeedbackRoute)

// default route
app.get('/', (req, res) => {
  res.send('API is running...')
})

// start server
const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`)
})







