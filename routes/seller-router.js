const express = require('express')
const router = express.Router()
const {isLoggedIn, isLoggedInStrict} = require('../middlewares/auth')
const isSeller = require('../middlewares/isSeller')
const productsModel = require('../models/product-model')
const bcrypt = require('bcrypt')
const userModel = require('../models/user-model')
const jwt = require('jsonwebtoken')
const { default: storage } = require('../cloudinary')
const multer = require('multer')

const upload = multer({ storage });

// router.get('/signup', isLoggedIn, async (req, res) => {
//     let error = req.flash('error');
//     let sellerError = req.flash('sellerError');

//     // If user is not logged in
//     if (!req.user || req.user === 'unsigned') {
//         req.flash('sellerError', 'You must be logged in to become a seller');
//         return res.redirect('/access');
//     }

//     // Try to find user in DB
//     let user = await userModel.findOne({ username: req.user.username });

//     // If user not found in DB
//     if (!user) {
//         req.flash('sellerError', 'User not found');
//         return res.redirect('/access');
//     }

//     res.render('sellersignup', {
//         error,
//         sellerError,
//         user: req.user,
//         req: req,
//         cart: user.cart || []
//     });
// });

// router.post('/sellersign', isLoggedIn, async (req, res) => {
//     let { email, password } = req.body;
//     let user = await userModel.findOne({ email });

//     if (!user || user.username !== req.user.username) {
//         req.flash('sellerError', 'Please enter correct details');
//         return res.redirect('/seller/signup');
//     }

//     if (user.isSeller === true) {
//         req.flash('sellerError', 'You are already a seller');
//         return res.redirect('/seller/dashboard');
//     }

//     bcrypt.compare(password, user.password, async (err, result) => {
//         if (!result) {
//             req.flash('sellerError', 'Incorrect password');
//             return res.redirect('/seller/signup');
//         }


//         user.isSeller = true;
//         await user.save();


//         let updatedToken = jwt.sign(
//             {
//                 username: user.username,
//                 userId: user._id,
//                 isSeller: true
//             },
//             process.env.TOKEN
//         );

    
//         res.cookie('token', updatedToken);

//         req.flash('error', 'Seller account successfully created!');
//         return res.redirect('/seller/dashboard');
//     });
// });


router.get('/dashboard', isLoggedInStrict, isSeller, async (req, res) => {
    let user = await userModel.findOne({username: req.user.username})
    let cart = user?.cart || [];
    let error = req.flash('error')
    let success = req.flash('success');
    res.render('dashboard', { user, cart, error, success, uploadedImage: null })
})


router.post('/push', isLoggedIn, isSeller, upload.array('images', 5), async (req, res) => {
    console.log('form received')
    let { title, description, price, gender, category, color, tags } = req.body;

    if (!title || !description || !price || !gender || !category || !color || req.files.length < 5) {
        req.flash('error', 'Please enter required details');
        return res.redirect('/seller/dashboard');
    }

    try {
        if (color) color = color.split(',').map(c => c.trim());
        if (category) category = category.split(',').map(c => c.trim());
        if (tags) tags = tags.split(',').map(t => t.trim());

        const images = req.files.map(file => file.path);

        const product = await productsModel.create({title, mainImage: images[0], image2: images[1], image3: images[2], description, seller: req.user.userId, price, gender, category, color, tags, image4: images[3], image5: images[4]});
        await userModel.findByIdAndUpdate(req.user.userId, { $push: { products: product._id } });
        req.flash('success', 'Product created successfully');
        res.redirect('/seller/dashboard');
    } catch (error) {
        console.log(error);
        req.flash('error', 'something went wrong')
        res.redirect('/seller/dashboard')
    }
});


router.get('/plusproducts', isLoggedInStrict, isSeller, async (req,res) => {
    let user = await userModel.findOne({username: req.user.username}).populate('products');
    let cart = user.cart
    let seller = await userModel.findOne({ username: req.user.username }).populate('products')
    res.render('plusproducts', {products: seller.products, user: req.user, cart})
})

router.delete('/products/:id', isLoggedIn, async (req, res) => {
  try {
    await productsModel.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
});



module.exports = router