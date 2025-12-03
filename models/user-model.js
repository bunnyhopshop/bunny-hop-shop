const mongoose = require('mongoose');

const userModel = mongoose.Schema({
   fullName: {
    type: String,
    required: true,
    minChar: 3,
   },
   email:{
      type: String,
      required: true
   },
   username: {
      type: String,
      required: true,
      unique: true,
   },
   password: {
      type: String,
      required: true
   },
   contact: Number,
   picture: String,
   isSeller: {
      type: Boolean,
      default: false
   },
   products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'product'
   }],
   shippingAddress: {
      type: {
        address: String,
        city: String,
        postalCode: String,
        country: String,
      },
      
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', 
      },
    ],
    cart: {
      type: [{
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'product',
          required: true,
        },
        quantity: {
          type: Number,
          min: 1,
          default: 1,
        },
        price: Number
      }],
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'order', 
      },
    ],
    resetToken: String,
    resetTokenExpiry: Date
}, {timestamps: true})

module.exports = mongoose.model('user', userModel)