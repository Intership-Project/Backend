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


// use routes

app.use('/admin', adminRoute)


// default route
app.get('/', (req, res) => {
  res.send('API is running...')
})

// start server
const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`)
})







