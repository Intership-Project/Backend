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

  const skipurls = ['/student/register','/student/login']
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
const userRouter = require('./routes/student')
const getstudentRouter = require('./routes/getallstudent')

app.use('/student',userRouter)
app.use('/getallstudent',getstudentRouter)

app.listen(3000,'0.0.0.0',() =>{
  console.log('Server Running on Port 3000')
})



