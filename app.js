const express = require('express')
const app = express()
require('dotenv').config();
const path = require('path')
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 3000
const indexRouter = require('./routes/index-router')
const orderRouter = require('./routes/order-router')
const db = require('./config/mongoose.connection')
const sellerRouter = require('./routes/seller-router')
const flash = require('connect-flash')
const expressSession = require('express-session')
const salesRouter = require("./routes/sales-router")
const paymentRoutes = require('./routes/paymentRoutes')

app.get('/privacy-policy', (req, res) => {
  res.render('privacy-policy', { user: null, cart: [], req });
});

app.get('/terms-of-service', (req, res) => {
  res.render('terms-of-service', { user: null, cart: [], req });
});
app.get('/about', (req, res) => {
  res.render('about', { user: null, cart: [], req });
});

app.get('/shipping-delivery', (req, res) => {
  res.render('shipping-delivery', { user: null, cart: [], req });
});
app.get('/track-order', (req, res) => {
  res.render('track-order', { user: null, cart: [], req });
});
app.get('/return-exchange', (req, res) => {
  res.render('return-exchange', { user: null, cart: [], req });
});

app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join((__dirname), 'views'))
app.set('view engine', 'ejs')

app.use(flash())
app.use(expressSession({
  resave: false,
  saveUninitialized: false,
  secret: process.env.EXPRESS_KEY,
  cookie: {
    secure: true,
    sameSite: "None"
  }
}));

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.use('/', indexRouter)
app.use('/shipment', indexRouter);
app.use('/orders', orderRouter)
app.use('/seller', sellerRouter)
app.use('/sales', salesRouter)
app.use('/api/payment', paymentRoutes);

// OAuth Setup
const passport = require('./utils/oauth');
app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { username: req.user.username, userId: req.user._id, isSeller: req.user.isSeller },
      process.env.TOKEN
    );
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.redirect('/');
  }
);

app.post("/payment-success", (req, res) => {
  console.log("JazzCash response:", req.body);
  // In production: verify secure hash and update order in DB
  if (req.body.pp_ResponseCode === "000") {
    return res.send("<h2>Payment Successful</h2><p>Thank you for your payment.</p>");
  }
  return res.send("<h2>Payment Failed</h2><p>Check the response and logs.</p>");
});  

app.listen(3000, () => {
  console.log(`Server listening on port ${port}`);
});
