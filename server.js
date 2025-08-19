const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')

const courseRouter = require('./routes/course')   // our new course routes
const adminRouter = require('./routes/admin')     // your existing admin routes
const roleRouter = require('./routes/role')

const app = express()

app.use(cors())
app.use(bodyParser.json())

// routes
app.use('/admin', adminRouter)
app.use('/course', courseRouter)
app.use('/role', roleRouter)

// default route
app.get('/', (req, res) => {
  res.send('Server is running ✅')
})

const PORT = process.env.PORT || 6000
app.listen(PORT, "0.0.0.0",() => {
  console.log(`Server started on http://localhost:${PORT}`)
 
})
