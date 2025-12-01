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

router.get("/all", isLoggedInStrict, isSeller,async (req,res) => {
    const orders = await orderModel.find().populate("items.productId")
    console.log(orders)
    const user = await userModel.findOne({username: req.user.username})
    try {
        return res.render("all-orders", {user: req.user, orders, cart: user.cart})
    } catch (error) {
        res.redirect("/seller/dashboard")
    }
} )
router.post('/admin/cancel/:id', isLoggedIn, isSeller, async (req, res) => {
  try {
    await orderModel.findOneAndDelete({_id: req.params.id})
    res.redirect('/orders/all');
  } catch (err) {
    console.error(err);
    res.redirect('/orders/all');
  }
});

module.exports = router