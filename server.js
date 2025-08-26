const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const utils = require('./utils')
const jwt = require('jsonwebtoken')
const config = require('./config')

//cretae new app

const app = express()
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))


//config protected routes
app.use((request,response,next) => {

  const skipurls = ['/student/register',
    '/student/login',
     '/admin/register',   // ✅ admin register ko skip karo
    '/admin/login' ]
  if(skipurls.findIndex((item) => item == request.url) != -1) {
    next()
  }
  else{
    const token = request.headers['token']
    if(!token){
      response.send(utils.createError('missing token'))
    }else{
      try {
        const payload = jwt.verify(token,config.secret)
        request.data=payload
        next()
        
      } catch (ex) {
        response.send(utils.createError('invalid token'))
        
      }
    }
  }
})

//add routes


const adminRoute = require('./routes/admin')
const courseRoute = require('./routes/course')
const  roleRoute = require('./routes/role')
const batchRoute = require('./routes/batch')
const subjectRoute = require('./routes/subject')
const feedbacktypeRoute = require('./routes/feedbacktype')
const feedbackmoduletypeRoute = require('./routes/feedbackmoduletype')
const userRoute = require('./routes/student')
const addfeedbackRoute = require('./routes/addfeedback')




// use routes

app.use('/admin', adminRoute)
app.use('/course',courseRoute)
app.use('/role',roleRoute)
app.use('/batch',batchRoute)
app.use('/subject',subjectRoute)
app.use('/feedbacktype',feedbacktypeRoute)
app.use('/feedbackmoduletype',feedbackmoduletypeRoute)
app.use('/student',userRoute)
app.use('/addfeedback',addfeedbackRoute)






// default route
app.get('/', (req, res) => {
  res.send('API is running...')
})


app.listen(3000,'0.0.0.0',() =>{
  console.log('Server Running on Port 3000')
})



