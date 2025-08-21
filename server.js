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


// configure protected routes

app.use((request, response, next) => {
    const skipUrls = ['/faculty/register', '/faculty/login']
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
//const feedbackdashboardRouter = require('./routes/feedbackdashboard')



app.use('/faculty', facultyRouter)
//app.use('/feedbackdashboard', feedbackdashboardRouter)





app.listen(4000, '0.0.0.0', () => {
    console.log('server started on port 4000')
})