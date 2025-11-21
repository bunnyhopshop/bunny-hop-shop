const express = require('express')
const app = express()
const path = require('path')
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 3000
const indexRouter = require('./routes/index-router')
const orderRouter = require('./routes/order-router')
require('dotenv').config();
const db = require('./config/mongoose.connection')
const sellerRouter = require('./routes/seller-router')
const flash = require('connect-flash')
const expressSession = require('express-session')
// console.log(process.env)

app.set('views', path.join((__dirname), 'views'))
app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')));

app.use(flash())
app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: "hello"
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.use('/', indexRouter)
app.use('/orders', orderRouter)
app.use('/seller', sellerRouter)


app.listen(3000)