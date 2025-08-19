const express = require('express')
const cors = require('cors')
const db = require('./db') // ✅ same folder

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



// add the routes

const studentRoute = require('./routes/student')
app.use('/student', studentRoute )



app.listen(4000, '0.0.0.0', () => {
    console.log('server started on port 4000')
});