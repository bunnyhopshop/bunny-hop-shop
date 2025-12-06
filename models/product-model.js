const mongoose = require('mongoose')

const prodModel = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    mainImage: {
        type: String,
        required: true
    },
    image2: {
        type: String,
        required: true
    },
    image3 : {
        type: String,
        required: true
    },
    image4: {
        type: String,
    },
    image5: {
        type: String,
    },
    description: {
        type: String,
    },
    size:{
        type: String,
        enum: ['S', 'M', 'L', 'XL', 'XXL']
    },
        discount: {
        type: Number, // percentage or fixed amount
        default: 0
    },
    finalPrice: { type: Number },
    gender: {
        type: String,
        enum: ['boy', 'girl', "unisex"],
        required: true
    },
    textColor: String,
    color: {
        type: [String],
    },
    category:{
        type: [String]
    },
    tags: {
        type: [String]
    },
    isApproved: {
        type: Boolean,
        default: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }
    
}, {timestamps: true})

module.exports = mongoose.model('product', prodModel)