const express = require('express')
const router = express.Router()
const {isLoggedIn, isLoggedInStrict} = require('../middlewares/auth')
const isSeller = require('../middlewares/isSeller')
const productsModel = require('../models/product-model')
const bcrypt = require('bcrypt')
const userModel = require('../models/user-model')
const jwt = require('jsonwebtoken')

router.get('/signup', isLoggedIn, async (req, res) => {
    let error = req.flash('error')
    let user = await userModel.findOne({ username: req.user.username})
    let sellerError = req.flash('sellerError')
    if (req.user === 'unsigned') {
        req.flash('sellerError', 'You must be logged in to become a seller ')
        return res.redirect('/access')
    }
    else {
        res.render('sellersignup', { error, sellerError, user: req.user, req: req, cart: user.cart })
    }
})
router.post('/sellersign',isLoggedIn, async (req, res) => {
    let { email, password } = req.body
    console.log(req.body)
    console.log(email)
    let user = await userModel.findOne({ email })
    console.log(user)
    if (!user) {
        req.flash('sellerError', 'please enter correct details')
        return res.redirect('/seller/signup')
    }
    if (user.username !== req.user.username) {
        req.flash('sellerError', 'Please use your registered account for a seller account')
        return res.redirect('/seller/signup')
    }
    if (user && user.isSeller === true) {
        req.flash('sellerError', 'You are already a seller')
        return res.redirect('/seller/signup')
    }
    if (user.isSeller === false) {
        try {
            bcrypt.compare(password, user.password, async (err, result) => {
                if (result) {
                    let seller = await userModel.findOneAndUpdate({ _id: user._id }, { isSeller: true })
                    req.session.seller = true
                    return res.redirect('/seller/dashboard')
                } else{
                    req.flash('sellerError', 'Please enter correct details')
                    return res.redirect('/seller/signup')
                }

            })
        } catch (error) {
            req.flash('sellerError', 'something went wrong')
            return res.redirect('/seller/signup')
        }
    }
})

router.get('/dashboard', isLoggedInStrict, isSeller, async (req, res) => {
    let user = await userModel.findOne({username: req.user.username})
    let cart = user.cart
    let error = req.flash('error')
    res.render('dashboard', { user, cart, error })
})

router.post('/push', isLoggedIn, isSeller, async (req, res) => {
    let { title, mainImage, image2, image3, description, price, gender, category, color, tags, image4, image5 } = req.body
    if (!title || !mainImage || !image2 || !image3 || !description || !price || !gender || !category || !color || !image4 || !image5) {
        req.flash('error', 'please enter required details')
        console.log(req.body)
        return res.redirect('/seller/dashboard')
    }
    else {
        try {
            if (color && color.length > 0) {
                color = color.split(',').map(tag => tag.trim())
            }
            if (category && category.length > 0) {
                category = category.split(',').map(tag => tag.trim())
            }
            if (tags && tags.length > 0) {
                tags = tags.split(',').map(tag => tag.trim())
            }
            let product = await productsModel.create({
                title,
                mainImage,
                image2,
                image3,
                description,
                seller: req.user.userId,
                price,
                gender,
                category,
                color,
                tags,
                image4,
                image5
            })
            let user = await userModel.findOne({ username: req.user.username })
            user.products.push(product)
            await user.save()
            req.flash('error', 'successfully created')
            res.redirect('/seller/dashboard')
        } catch (error) {
            req.flash('error', 'something went wrong')
            res.redirect('/seller/dashboard')
        }
    }
})

router.get('/plusproducts', isLoggedInStrict, isSeller, async (req,res) => {
    let user = await userModel.findOne({username: req.user.username})
    let cart = user.cart
    let seller = await userModel.findOne({ username: req.user.username }).populate('products')
    res.render('plusproducts', {products: seller.products, user: req.user, cart})
})

module.exports = router