const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String
  },
    shippingAddress: {
      type: Object,
      required: true,
      properties: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
      },
    },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  }],
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'confirmed',
  },
  phoneNumber: { type: String},
  email: { type: String},
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('order', orderSchema);