const express = require('express');
const router = express.Router();
const userModel = require('../models/user-model');
const productsModel = require('../models/product-model');
const orderModel = require('../models/order-model');
const debug = require('debug')('development:routes')
const { isLoggedInStrict, isLoggedIn } = require('../middlewares/auth')
const isSeller = require('../middlewares/isSeller')
require('dotenv').config()

router.get('/', isLoggedInStrict, async (req, res) => {
    let user = await userModel.findOne({ username: req.user.username}).populate({
        path: 'orders',
        populate: {
            path: 'items.productId',
        }
    })
    res.render('orders', {user: req.user, orders: user.orders, cart: user.cart })
   
})
router.post('/cancel/:id', isLoggedInStrict, async (req, res) => {
    let user = await userModel.findOne({ username: req.user.username })
    let order = await orderModel.findOneAndDelete({_id: req.params.id})
    try {
        res.redirect('/orders')
    } catch (error) {
        console.log(error)
    }
})
module.exports = router