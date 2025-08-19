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




// add the routes

const facultyRoute = require('./routes/faculty')

app.use('/faculty', facultyRoute)







app.listen(4000, '0.0.0.0', () => {
    console.log('server started on port 4000')
})