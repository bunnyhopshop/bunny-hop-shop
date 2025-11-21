const express = require('express');
const router = express.Router();
const userModel = require('../models/user-model');
const productsModel = require('../models/product-model');
const orderModel = require('../models/order-model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const debug = require('debug')('development:routes')
const { isLoggedInStrict, isLoggedIn, redirectIfLogin } = require('../middlewares/auth')
const checkoutCheckout = require('../middlewares/checkout-check')
const isSeller = require('../middlewares/isSeller')
const productModel = require('../models/product-model')
require('dotenv').config()


router.get('/', isLoggedIn, async function (req, res) {
    let error = req.flash('error')
    let feat = await productModel.find({ tags: 'featured' })
    let trendy = await productModel.find({ tags: 'trend' })
    if(req.user === 'unsigned'){
        return res.render('index', { user: req.user, feat, error, trendy, req: req })
    }
    let user = await userModel.findOne({username: req.user.username})
    let cart = user.cart
    res.render('index', { user: req.user, feat, error, trendy, req: req, cart })

})
router.get('/access', redirectIfLogin, function (req, res) {
    let registerError = req.flash('registerError')
    let loginError = req.flash('loginError')
    let sellerError = req.flash('sellerError')
    res.render('access', { registerError, loginError, sellerError })
})

router.post('/register', async (req, res) => {
    let { fullName, email, username, password } = req.body;
    let user = await userModel.findOne({ username })
    if (user) {
        req.flash('registerError', 'User already exists')
        return res.redirect('/access')
    }
    try {
        if (!process.env.TOKEN) {
            req.flash('registerError', 'Token missing')
            return res.send('bring token')
        }
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async (err, hash) => {
                try {
                    let user = await userModel.create({
                        fullName,
                        email,
                        username,
                        password: hash
                    })
                    let token = jwt.sign({ username, userId: user._id, isSeller: user.isSeller }, process.env.TOKEN)
                    res.cookie('token', token)
                    res.redirect('/')
                } catch (error) {
                    req.flash('registerError', 'cannot create user')
                    console.log(error)
                    res.redirect('/access')
                }
            })
        })
    } catch (error) {
        req.flash('registerError', 'something went wrong')
        res.redirect('/access')
    }

})

router.post('/login', async (req, res) => {
    let { email, password } = req.body
    let user = await userModel.findOne({ email })
    if (!user) {
        req.flash('loginError', 'please register first')
        return res.redirect('/access')
    }

    try {
        if (!process.env.TOKEN) {
            req.flash('registerError', 'Token missing')
            return res.send('bring token')
        }
        bcrypt.compare(password, user.password, (err, result) => {
            if (!result) {
                req.flash('loginError', 'something went wrong')
                return res.redirect('/access')
            }
            if (result) {
                let token = jwt.sign({ username: user.username, userId: user._id, isSeller: user.isSeller}, process.env.TOKEN)
                res.cookie('token', token)
                res.redirect('/')
            }
        })
    } catch (error) {
        req.flash('loginError', 'something went wrong')
        res.redirect('/access')
    }
})

router.get('/logout', (req, res) => {
    res.clearCookie('token')
    req.user = 'unsigned'
    res.redirect('/')
})
router.get('/products', (req, res) => {
    res.render('product', { user: 'unsigned' })
})

router.get('/products/:id', isLoggedIn, async (req, res) => {
    let product = await productsModel.findOne({ _id: req.params.id })
    if(!product.isApproved){
        req.flash('error', 'product not approved yet')
        return res.redirect('/')
    }
    if(req.user !== 'unsigned'){
        let user = await userModel.findOne({username: req.user.username})
        let cart = user.cart
        res.render('product', { product: product, user: req.user, cart, productPage: true })
    } else{
        res.render('product', { product: product, user: req.user, productPage: true })
    }
    
})
router.get('/clothings/:category', isLoggedIn, async (req, res) => {
    let category = req.params.category.toLowerCase();
   
    displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
    if(req.user === 'unsigned'){
        if(req.query.searched){
            let request = req.query.searched.toLowerCase()
            const selectedProducts = await productsModel.find({title: 
                { $regex: request, $options: 'i'}
            })
            return res.render('categorized', { user: req.user, gen: false, cat: false, searched: true, selectedProducts, req:req, searched: true, request: req.query.searched})
        }
        let selectedProducts = await productsModel.find({ category: req.params.category, isApproved: true })
        if(req.query.gender === 'all'){
            return res.render('categorized', { user: req.user, selectedProducts, displayCategory, category, cat: true, gen: false, req: req, req})
        } if(req.query.gender === 'men'){
           let selectedProducts = await productsModel.find({ category: req.params.category, isApproved: true, gender: 'men' })
           return res.render('categorized', { user: req.user, selectedProducts, displayCategory, category, cat: true, gen: false, req: req, req})
        } if(req.query.gender === 'women'){
            let selectedProducts = await productsModel.find({ category: req.params.category, isApproved: true, gender: 'women' })
            return res.render('categorized', { user: req.user, selectedProducts, displayCategory, category, cat: true, gen: false, req: req, req})
        } else{
            return res.render('categorized', { user: req.user, selectedProducts, displayCategory, category, cat: true, gen: false, req: req, req})
        }
    }
    if(req.user !== 'unsigned'){ 
       
    let user = await userModel.findOne({username: req.user.username})
    let cart = user.cart
    if(req.query.searched){
        let request = req.query.searched.toLowerCase()
        const selectedProducts = await productsModel.find({title: 
            { $regex: request, $options: 'i'}
        })
        return res.render('categorized', { user: req.user, gen: false, cat: false, searched: true, selectedProducts, cart, req:req, searched: true, request: req.query.searched})
    }
        let selectedProducts = await productsModel.find({ category: req.params.category, isApproved: true })
        if(req.query.gender === 'all'){
            return res.render('categorized', { user: req.user, selectedProducts, displayCategory, category, cat: true, gen: false, cart, req: req })
        } if(req.query.gender === 'men'){
           let selectedProducts = await productsModel.find({ category: req.params.category, isApproved: true, gender: 'men' })
           return res.render('categorized', { user: req.user, selectedProducts, displayCategory, category, cat: true, gen: false, cart, req: req })
        } if(req.query.gender === 'women'){
            let selectedProducts = await productsModel.find({ category: req.params.category, isApproved: true, gender: 'women' })
            return res.render('categorized', { user: req.user, selectedProducts, displayCategory, category, cat: true, gen: false, cart, req: req })
        } else{
            return res.render('categorized', { user: req.user, selectedProducts, displayCategory, category, cat: true, gen: false, cart, req: req })
        }
    }
})

router.get('/fits/:gender', isLoggedIn, async (req, res) => {
    let selectedProducts = await productsModel.find({ gender: req.params.gender, isApproved: true })
    let gender = req.params.gender;
    gender = gender.charAt(0).toUpperCase() + gender.slice(1);
    if(req.user === 'unsigned'){
        return res.render('categorized', { user: req.user, selectedProducts, gender, gen: true, cat: false, req: req})
    }
    let user = await userModel.findOne({username: req.user.username})
    let cart = user.cart
    res.render('categorized', { user: req.user, selectedProducts, gender, gen: true, cat: false, cart , req: req})
})

router.get('/login', redirectIfLogin, (req, res) => {
    let loginError = req.flash('loginError')
    res.render('login', { loginError })
})
router.post('/add-to-cart/:id', isLoggedIn, async (req, res) => {
    if (req.user === 'unsigned') {
      req.flash('sellerError', 'you need an account to use the cart');
      return res.status(401).json({ redirect: '/access' });
    }
  
    const productId = req.params.id;
    let user = await userModel.findOne({ username: req.user.username });
    let product = await productsModel.findOne({ _id: productId });
  
    const productInCart = user.cart.find(item => item.productId.toString() === productId);
  
    if (productInCart) {
      productInCart.quantity = productInCart.quantity ? productInCart.quantity + 1 : 1; 
    } else {
      user.cart.push({ productId: product._id, quantity: 1 });
    }
  
    try {
      await user.save();
      res.json({ message: 'Product quantity updated successfully', cart: user.cart });
    } catch (error) {
      console.log(error);
    }
  });
  
router.get('/cart', isLoggedInStrict, async (req, res) => {
    let error = req.flash('error')
    let user = await userModel.findOne({ username: req.user.username }).populate({ path: 'cart.productId' })
    try {
        res.render('cart', { user: req.user, cart: user.cart, error })
    } catch (error) {
        console.log(error)
    }

})
router.get('/remove-from-cart/:id', isLoggedInStrict, async (req, res) => {
    let user = await userModel.findOne({ username: req.user.username })
    await user.updateOne({ $pull: { cart: { productId: req.params.id } } })
    try {
        res.redirect('/cart')
    } catch (error) {
        console.log(error)
    }
})
router.get('/sub-quantity/:id', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ username: req.user.username })
    let product = user.cart.find(product => product._id == req.params.id)
    if(product && product.quantity > 1) {
        product.quantity -= 1
    } else{
        product.quantity = 1
        req.flash('error', 'You must have at least one product to purchase')
        return res.redirect('/cart')
    }
    try {
        await user.save()
        res.redirect('/cart')
    } catch (error) {
        console.log(error)
    }

})
router.get('/add-quantity/:id', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ username: req.user.username })
    let product = user.cart.find(product => product._id == req.params.id)
    if(product && product.quantity < 100) {
        product.quantity += 1
    } else{
        product.quantity = 100
        req.flash('error', 'cannot order more than 100 products')
        return res.redirect('/cart')
    }
    try {
        await user.save()
        res.redirect('/cart')
    } catch (error) {
        console.log(error)
    }

})
router.get('/checkout/:id', isLoggedInStrict, async (req, res) => {
    let user = await userModel.findOne({ username: req.user.username })
    let product = await productModel.findOne({ _id: req.params.id })
    res.render('checkout', {user: req.user, cart: user.cart, product, req: req})
})
router.post('/checkout', isLoggedInStrict, async (req,res) => {
    let {fullName, lastName,street, city, state, zip, phoneNumber, totalPrice, email} = req.body
    let user = await userModel.findOne({ username: req.user.username })
    if(req.body.single){
        let product = await productModel.findOne({_id: req.body.productId})
        try {
            let order = await orderModel.create({
                fullName,
                lastName,
                shippingAddress : {
                    street,
                    city,
                    state,
                    zip
                },
                items: {productId: product._id},
                totalPrice: product.price,
                status: 'confirmed',
                userId: req.user.userId
            
            }) 
            req.session.checkoutDone = 'true'
            user.orders.push(order)
            await user.save()
            return res.redirect('/success-checkout')
        } catch (error) {
            console.log(error)
        }
    }
    if(req.body.cart){
        let cart = user.cart
       let orderItems = []
       cart.forEach((item) => {
        orderItems.push({
            productId: item.productId,
            quantity: item.quantity
        })
       })
        try {
            let order = await orderModel.create({
                fullName,
                email,
                phoneNumber,
                shippingAddress : {
                    street,
                    city,
                    state,
                    zip
                },
                items: orderItems,
                totalPrice: Number(totalPrice) + 5,
                status: 'confirmed',
                userId: req.user.userId
            })
            req.session.checkoutDone = 'true'
            user.orders.push(order)
            user.cart = []
            await user.save()
            return res.redirect('/success-checkout')
        } catch (error) {
            console.log(error)
        }
    }
})
router.get('/success-checkout', isLoggedInStrict, checkoutCheckout, async (req, res) => {
    let user = await userModel.findOne({ username: req.user.username })
    let cart = user.cart
    res.render('success-checkout', {user: req.user, cart, req: req})
})

module.exports = router;