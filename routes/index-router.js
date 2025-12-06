require('dotenv').config()
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
const productModel = require('../models/product-model');
const multer = require('multer');
const { default: storage } = require('../cloudinary');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const saleModel = require('../models/sale-model');
const sendEmail = require('../utils/sendEmail');
const upload = multer({ storage });
const {getDiscountForProduct} = require("../utils/discount")
const {orderEmailTemplate} = require("../helper/orderEmailTemplate");
const addToCart = require('../middlewares/addto-cart');
const mongoose = require('mongoose');


// router.get('/', isLoggedIn, addToCart, async function (req, res) {
//     let error = req.flash('error');
//     let feat = await productModel.find({ tags: 'featured' });
//     let trendy = await productModel.find({ tags: 'trend' });

//     res.render('index', {
//         user: res.locals.user,
//         feat,
//         trendy,
//         error,
//         req,
//         cart: res.locals.cart
//     });

//     // if (!req.user || req.user === 'unsigned') {
        
//     //     return res.render('index', {
//     //         user: 'unsigned',
//     //         feat,
//     //         error,
//     //         trendy,
//     //         req
//     //     });
//     // }


//     // let user = await userModel.findOne({ username: req.user.username });
//     // let cart = user?.cart || [];

//     // res.render('index', {
//     //     user: req.user,
//     //     feat,
//     //     error,
//     //     trendy,
//     //     req,
//     //     cart
//     // });
// });

router.get('/', isLoggedIn, addToCart, async function (req, res) {
    let error = req.flash('error');

    
    const now = new Date();
    const activeSales = await saleModel.find({
        startDate: { $lte: now },
        endDate: { $gte: now }
    });



    let featProducts = await productsModel.find({ tags: 'featured' });


    let trendyProducts = await productsModel.find({ tags: 'trend' });

   
    function applySale(products) {
        return products.map(p => {
            const applicable = activeSales.filter(s =>
                s.productIds.includes(p._id.toString())
            );

            let discountPercent = 0;
            let discountPrice = 0
            if (applicable.length > 0) {
                const best = applicable.reduce((a, b) =>
                    a.percentage > b.percentage ? a : b
                );
                discountPercent = best.percentage;
       discountPrice = Math.round(p.price - (p.price * discountPercent / 100));
            }

            return {
                ...p.toObject(),
                discountPercent,
                discountPrice
            };
        });
    }

    let feat = applySale(featProducts);
    let trendy = applySale(trendyProducts);

    res.render('index', {
        user: res.locals.user,
        feat,
        trendy,
        error,
        req,
        cart: res.locals.cart
    });
});


router.get('/access', redirectIfLogin, function (req, res) {
    let registerError = req.flash('registerError')
    let loginError = req.flash('loginError')
    let sellerError = req.flash('sellerError')
    res.render('access', { registerError, loginError, sellerError })
})

router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', {
        error: req.flash('forgotError'),
        message: req.flash('forgotMessage')
    });
});


router.post('/register', async (req, res) => {
    let { fullName, email, username, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        req.flash('registerError', 'Invalid email format');
        return res.redirect('/access');
    }

    let isEmail = await userModel.findOne({ email });
    if (isEmail) {
        req.flash('registerError', 'User already exists');
        return res.redirect('/access');
    }
    const isUsername =  await userModel.findOne({username})
    if (isUsername) {
        req.flash('registerError', 'Username already exists');
        return res.redirect('/access');
    }

    try {
        if (!process.env.TOKEN) {
            req.flash('registerError', 'Token missing');
            return res.send('bring token');
        }

        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async (err, hash) => {
                try {
                    let user = await userModel.create({
                        fullName,
                        email,
                        username,
                        password: hash,
                    });

                    let token = jwt.sign(
                        { username, userId: user._id, isSeller: user.isSeller },
                        process.env.TOKEN
                    );
                    
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  maxAge: 30 * 24 * 60 * 60 * 1000
});

                    res.redirect('/');
                } catch (error) {
                    req.flash('registerError', 'cannot create user');
                    console.log(error);
                    res.redirect('/access');
                }
            });
        });
    } catch (error) {
        req.flash('registerError', 'something went wrong');
        res.redirect('/access');
    }
});


router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    let user = await userModel.findOne({ email });
    if (!user) {
        req.flash('registerError', 'Email not found');
        return res.redirect('/access');
    }

    const token = crypto.randomBytes(32).toString('hex');

    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 15; // 15 minutes
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;


    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASS
        }
    });

    await transporter.sendMail({
        from: 'Bunny Hop Shop',
        to: email,
        subject: 'Reset Password',
        html: `
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}">Reset Password</a>
        `
    });

    req.flash('registerError', 'Reset link sent to your email');
    res.redirect('/access');
});


router.get('/reset-password/:token', async (req, res) => {
    const token = req.params.token;

    const user = await userModel.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
        return res.send("Invalid or expired token");
    }

    res.render('reset-password', { token, error: null });
});

router.post('/reset-password', async (req, res) => {
    const { password, token } = req.body;

    const user = await userModel.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
        return res.send("Invalid or expired token");
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    user.password = hash;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    req.flash('registerError', 'Password reset successful. You can login now.');
    res.redirect('/access');
});


  router.post('/login', async (req, res) => {
      let { email, password } = req.body
      let user = await userModel.findOne({ email })
      const isMobile = /mobile/i.test(req.headers['user-agent']);
      console.log(isMobile)
if (!user) {
  req.flash('loginError', 'please register first');
  return res.redirect(isMobile ? '/login' : '/access');
}


      try {
          if (!process.env.TOKEN) {
              req.flash('registerError', 'Token missing')
              return res.send('bring token')
          }
          bcrypt.compare(password, user.password, (err, result) => {
if (!result) {
  console.log(result)
  req.flash('loginError', "Invalid Credentials!");
  return res.redirect(isMobile ? '/login' : '/access');
}

              if (result) {
                  let token = jwt.sign({ username: user.username, userId: user._id, isSeller: user.isSeller}, process.env.TOKEN)
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  maxAge: 30 * 24 * 60 * 60 * 1000
});

                  res.redirect('/')
              }
          })
      } catch (error) {
req.flash('loginError', error.message);
return res.redirect(isMobile ? '/login' : '/access');
      }
  })

router.get('/logout', (req, res) => {
    res.clearCookie('token')
    req.session.seller = false;
    // req.user = 'unsigned'
    res.redirect('/')
})
router.get('/products', (req, res) => {
    res.render('product', { user: 'unsigned' })
})

router.get('/products/:id', isLoggedIn, addToCart, async (req, res) => {
    let product = await productsModel.findOne({ _id: req.params.id });

    if (!product.isApproved) {
        req.flash('error', 'product not approved yet');
        return res.redirect('/');
    }
    const now = new Date()
    const activeSales = await saleModel.find({
        startDate: { $lte: now },
        endDate: { $gte: now }
    });

    const applicable = activeSales.filter(s =>
        s.productIds.includes(product._id.toString())
    );

    let discountPercent = 0;
    let discountName = null;
    let discountEnd = null;

    if (applicable.length > 0) {

        const bestSale = applicable.reduce((max, current) => 
            current.percentage > max.percentage ? current : max
        );

        discountPercent = bestSale.percentage;
        discountName = bestSale.title;
        discountEnd = bestSale.endDate;
    }

    let discountedPrice = null;
    if (discountPercent > 0) {
        discountedPrice = product.price - (product.price * discountPercent / 100);
    }

    // if (!req.user || req.user === 'unsigned') {
    //     return res.render('product', {
    //         product,
    //         user: 'unsigned',
    //         productPage: true,
    //         discountedPrice,
    //         discountPercent,
    //         discountName,
    //         discountEnd
    //     });
    // }

    // let user = await userModel.findOne({ username: req.user.username });
    // let cart = user?.cart || [];

    res.render('product', { product, user: res.locals.user, cart: res.locals.cart, productPage: true, discountPercent, discountedPrice,discountName,discountEnd});
});

router.get('/clothings/:category', isLoggedIn, async (req, res) => {
  try {
    const category = req.params.category.toLowerCase();
    const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);

    const gender = req.query.gender;
    const searchTerm = req.query.searched?.toLowerCase();
    const isUnsigned = !req.user || req.user === 'unsigned';

    let query = {
      category: { $in: [category] },
      isApproved: true
    };

    if (gender === 'boy' || gender === 'boys') query.gender = 'boy';
    if (gender === 'girl' || gender === 'girls') query.gender = 'girl';


    if (searchTerm) {
      let selectedProducts = await productsModel.find({
        title: { $regex: searchTerm, $options: 'i' }
      });

      selectedProducts = await Promise.all(
        selectedProducts.map(async (p) => {
          const discountInfo = await getDiscountForProduct(p._id);
          p = p.toObject();
          p.discountInfo = discountInfo;
          return p;
        })
      );
  
      return res.render('categorized', {
        user: req.user,
        req,
        cart: isUnsigned ? [] : (await userModel.findOne({ username: req.user.username })).cart,
        selectedProducts,
        displayCategory,
        searched: true,
        request: req.query.searched,
        cat: false,
        gen: false
      });
    }

    let cart = [];
    if (!isUnsigned) {
      const dbUser = await userModel.findOne({ username: req.user.username });
      cart = dbUser.cart || [];
    }

    let selectedProducts = await productsModel.find(query);


    selectedProducts = await Promise.all(
      selectedProducts.map(async (p) => {
        const discountInfo = await getDiscountForProduct(p._id);
        p = p.toObject();
        p.discountInfo = discountInfo;
        return p;
      })
    );
    console.log(selectedProducts , "all here")
    return res.render('categorized', {
      user: req.user,
      req,
      cart,
      selectedProducts,
      displayCategory,
      category,
      cat: true,
      gen: false
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load category");
  }
});



// router.get('/clothings/:category', async (req, res) => {
//     let category = req.params.category.toLowerCase();

//     let displayCategory = category.charAt(0).toUpperCase() + category.slice(1);

//     if (req.query.searched) {
//         let request = req.query.searched.toLowerCase();
//         const selectedProducts = await productsModel.find({
//             title: { $regex: request, $options: 'i' }
//         });

//         return res.render('categorized', { user: req.user || null, gen: false, cat: false, searched: true, selectedProducts, cart: req.user ? (await userModel.findOne({ username: req.user.username })).cart : null, req: req, request: req.query.searched });
//     }

//     let filter = { category: req.params.category, isApproved: true };

//     if (req.query.gender === "boys") filter.gender = "boys";
//     if (req.query.gender === "girls") filter.gender = "girls";

//     let selectedProducts = await productsModel.find(filter);

//     let cart = null;
//     if (req.user && req.user.username) {
//         const dbUser = await userModel.findOne({ username: req.user.username });
//         cart = dbUser?.cart || null;
//     }

//     return res.render('categorized', { user: req.user || null, selectedProducts, displayCategory, category, cat: true, gen: false, cart, req: req});
// });


// router.get('/fits/:gender', isLoggedIn, async (req, res) => {
//     let selectedProducts = await productsModel.find({ gender: req.params.gender, isApproved: true })
//     let gender = req.params.gender;
//     gender = gender.charAt(0).toUpperCase() + gender.slice(1);
//     if(req.user === 'unsigned'){
//         return res.render('categorized', { user: req.user, selectedProducts, gender, gen: true, cat: false, req: req})
//     }
//     let user = await userModel.findOne({username: req.user.username})
//     let cart = user.cart
//     res.render('categorized', { user: req.user, selectedProducts, gender, gen: true, cat: false, cart , req: req})
// })

router.get('/fits/:gender', isLoggedIn, async (req, res) => {
  try {

    const genderParam = req.params.gender.toLowerCase().slice(0, -1);
    let selectedProducts = await productsModel.find({ gender: genderParam, isApproved: true });

    selectedProducts = await Promise.all(
      selectedProducts.map(async (p) => {
        const discountInfo = await getDiscountForProduct(p._id);
        p = p.toObject(); 
        p.discountInfo = discountInfo;
        return p;
      })
    );

    let gender = req.params.gender.toLowerCase();
    let displayGender = gender.charAt(0).toUpperCase() + gender.slice(1);

    let cart = null;
    if (req.user && req.user.username) {
      let dbUser = await userModel.findOne({ username: req.user.username });
      cart = dbUser?.cart || null;
    }

    return res.render('categorized', {
      user: req.user || null,
      selectedProducts,
      gender: displayGender,
      gen: true,
      cat: false,
      cart,
      req
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load fits");
  }
});

router.get('/login', (req, res) => {
    let loginError = req.flash('loginError')
    res.render('login', { loginError })
})

router.post('/add-to-cart/:id', isLoggedIn, async (req, res) => {
    console.log(req.user)
    const productId = req.params.id;

    if (!req.user || req.user === "unsigned") {
        let cart = [];

        try {
            cart = JSON.parse(req.cookies.guestCart || "[]");
        } catch (e) {
            cart = [];
        }
        
        const existing = cart.find(item => item.productId.toString() === productId.toString());

        if (existing) {
            existing.quantity += 1;
        } else {
            const product = await productsModel.findById(productId);
            cart.push({
                productId: productId.toString(),
                title: product.title,
                quantity: 1,
                price: product.price,
                image: product.mainImage
            });
        }

        // const productId = req.params.id;


        // const existing = cart.find(item => item.productId === productId);

        // if (existing) {
        //     existing.quantity += 1;
        // } else {

        //     const product = await productsModel.findById(productId);
        //     cart.push({
        //         productId,
        //         title: product.title,
        //         quantity: 1,
        //         price: product.price,
        //         image: product.mainImage
        //     });
        // }

        res.cookie("guestCart", JSON.stringify(cart), {
            httpOnly: false,
            maxAge: 1000 * 60 * 60 * 24 * 30, 
            secure: false
        });
        res.locals.cart = cart;

        return res.status(200).json({ guest: true, cart });
    }
    console.log("here")

    const user = await userModel.findOne({ username: req.user.username });

    const existing = user.cart.find(
        item => item.productId.toString() === productId.toString()
    );

    if (existing) {
        existing.quantity += 1;
    } else {
        user.cart.push({
            productId: productId,
            quantity: 1
        });
    }

    await user.save();
    res.locals.cart = user.cart;

    res.json({ guest: false, cart: user.cart });
});

  
router.get('/cart', isLoggedIn, async (req, res) => {

    let error = req.flash('error');


    if (!req.user || req.user === "unsigned") {

        let guestCart = [];
        try {
            guestCart = JSON.parse(req.cookies.guestCart || "[]");
        } catch (e) {
            guestCart = [];
        }
        // console.log(guestCart)
        for (let item of guestCart) {
            item.discountInfo = await getDiscountForProduct(item.productId);
        }
        console.log(guestCart)
        return res.render('cart', {
            user: "unsigned",
            cart: guestCart,
            guest: true,
            error
        });
    }

    let user = await userModel
        .findOne({ username: req.user.username })
        .populate({ path: 'cart.productId' });
            for (let item of user.cart) {
        item.discountInfo = await getDiscountForProduct(item.productId._id);
    }
    console.log(user.cart)
    res.render('cart', {
        user: req.user,
        cart: user.cart,
        guest: false,
        error
    });
});


router.get('/product-json/:id', async (req, res) => {
  const product = await productsModel.findById(req.params.id);

  const disc = await getDiscountForProduct(product._id);

  res.json({
    _id: product._id,
    title: product.title,
    price: product.price,
    image: product.mainImage,
    finalPrice: disc ? disc.finalPrice : product.price
  });
});


router.get('/remove-from-cart/:id', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ username: req.user.username })
           if (!user) {
        try {
            guestCart = JSON.parse(req.cookies.guestCart || "[]");
        } catch (e) {
            guestCart = [];
        }
     guestCart = guestCart.filter(p => p.productId !== req.params.id)

    res.cookie("guestCart", JSON.stringify(guestCart), { httpOnly: true });
    return res.redirect('/cart')

    }
    await user.updateOne({ $pull: { cart: { productId: req.params.id } } })
    try {
        res.redirect('/cart')
    } catch (error) {
        console.log(error)
        req.flash("error", "Something went wrong")
        return res.redirect("/cart")
    }
})
router.get('/sub-quantity/:id', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ username: req.user.username })
        if (!user) {
        try {
            guestCart = JSON.parse(req.cookies.guestCart || "[]");
        } catch (e) {
            guestCart = [];
        }
    const product = guestCart.find(p => p.productId === req.params.id)

    if(product && product.quantity > 1) {
        product.quantity -= 1
    } else{
        product.quantity = 1
        req.flash('error', 'You must have at least one product to purchase')
        return res.redirect('/cart')
    }
    res.cookie("guestCart", JSON.stringify(guestCart), { httpOnly: true });
    return res.redirect('/cart')

    }
    let product = user.cart.find(product => product.productId.toString() == req.params.id)
    console.log(product)
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
        req.flash("error", "Something went wrong")
        return res.redirect("/cart")
    }

})
router.get('/add-quantity/:id', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ username: req.user.username })
    if (!user) {
        try {
            guestCart = JSON.parse(req.cookies.guestCart || "[]");
        } catch (e) {
            guestCart = [];
        }
    const product = guestCart.find(p => p.productId === req.params.id)

    if(product && product.quantity < 200) {
        product.quantity += 1
    } else{
        product.quantity = 200
        req.flash('error', 'cannot order more than 200 products')
        return res.redirect('/cart')
    }
    res.cookie("guestCart", JSON.stringify(guestCart), { httpOnly: true });
    return res.redirect('/cart')

    }
    console.log(user.cart)
    let product = user.cart.find(product => product.productId.toString() === req.params.id)
    console.log(product)
    if(product && product.quantity < 200) {
        product.quantity += 1
    } else{
        product.quantity = 200
        req.flash('error', 'cannot order more than 200 products')
        return res.redirect('/cart')
    }
    try {
        await user.save()
        res.redirect('/cart')
    } catch (error) {
        req.flash("error", "Something went wrong")
        return res.redirect("/cart")
    }

})
router.get('/checkout/:id', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ username: req.user.username })
    let product = await productModel.findOne({ _id: req.params.id })
    let discountInfo = await getDiscountForProduct(product._id)
    product.discountInfo = discountInfo

    res.render('checkout', {user: req.user, cart: user?.cart || [], product, req: req})
})
// router.post('/checkout', isLoggedInStrict, async (req,res) => {
//     let {fullName, lastName,street, city, state, zip, phoneNumber, totalPrice, email} = req.body
//     let user = await userModel.findOne({ username: req.user.username })
//     if(req.body.single){
//         let product = await productModel.findOne({_id: req.body.productId})
//         try {
//             let order = await orderModel.create({
//                 fullName,
//                 lastName,
//                 shippingAddress : {
//                     street,
//                     city,
//                     state,
//                     zip
//                 },
//                 items: {productId: product._id},
//                 totalPrice: product.price,
//                 status: 'confirmed',
//                 userId: req.user.userId
            
//             }) 
//             req.session.checkoutDone = 'true'
//             user.orders.push(order)
//             await user.save()
//             return res.redirect('/success-checkout')
//         } catch (error) {
//             console.log(error)
//         }
//     }
//     if(req.body.cart){
//         let cart = user.cart
//        let orderItems = []
//        cart.forEach((item) => {
//         orderItems.push({
//             productId: item.productId,
//             quantity: item.quantity
//         })
//        })
//         try {
//             let order = await orderModel.create({
//                 fullName,
//                 email,
//                 phoneNumber,
//                 shippingAddress : {
//                     street,
//                     city,
//                     state,
//                     zip
//                 },
//                 items: orderItems,
//                 totalPrice: Number(totalPrice) + 250,
//                 status: 'confirmed',
//                 userId: req.user.userId
//             })
//             req.session.checkoutDone = 'true'
//             user.orders.push(order)
//             user.cart = []
//             await user.save()
//             return res.redirect('/success-checkout')
//         } catch (error) {
//             console.log(error)
//         }
//     }
// })
// router.get('/order/:id', async (req, res) => {
//   const order = await orderModel.findById(req.params.id);

//   res.render('success-checkout', { 
//     order: order 
//   });
// });

router.get('/order/:id', async (req, res) => {
  try {
    const orderId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).send("Invalid order ID");
    }

    // Fetch order and populate items
    const order = await orderModel.findById(orderId).populate("items.productId");
    if (!order) return res.status(404).send("Order not found");

    // Determine user type
    let userType = "unsigned"; // default
    if (req.user && req.user.username) userType = "loggedIn";
    else if (order.isGuest) userType = "guest";

    // Render dynamic page
    res.render('success-checkout', {
      user: req.user || null,  
      order: order,
      userType
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Error loading order");
  }
});

// router.post('/checkout', isLoggedIn, async (req, res) => {
//   try {
//     let {
//       fullName,
//       lastName,
//       street,
//       city,
//       state,
//       zip,
//       phoneNumber,
//       email,
//       totalPrice,
//       single,
//       productId,
//       quantity
//     } = req.body;

//     const isGuest = req.user === "unsigned";
//     const adminEmail = process.env.ADMIN_EMAIL 

//     if (isGuest) {
//       let orderItems = [];

//       if (single === "true") {
//         orderItems.push({ productId, quantity: quantity || 1 });
//       } else {
//         let guestCart = [];
//         try {
//           guestCart = JSON.parse(req.cookies.guestCart || "[]");
//         } catch (e) {
//           guestCart = [];
//         }
//         guestCart.forEach(item => {
//           orderItems.push({ productId: item.productId, quantity: item.quantity });
//         });
//       }

//       const order = await orderModel.create({
//         fullName,
//         lastName,
//         phoneNumber,
//         email,
//         shippingAddress: { street, city, state, zip },
//         items: orderItems,
//         totalPrice: Number(totalPrice),
//         status: "confirmed",
//         userId: null,
//         isGuest: true
//       });

//       await order.populate({ path: "items.productId" });

//       await sendEmail({
//         to: email,
//         subject: "Your Bunny Hop Shop Order Confirmation",
//         html: orderEmailTemplate(order)
//       });


// await sendEmail({
//   to: adminEmail,
//   subject: "New Order Received",
//   html: `<h2>New Order Alert</h2>
//          <p>Order ID: ${order._id}</p>
//          <p>Customer: ${order.fullName}</p>
//          <p>Total: PKR.${order.totalPrice}</p>
//          <p>Items: ${order.items.map(i => i.productId.title + " x" + i.quantity).join(", ")}</p>
//          <p>
//            <a href="${process.env.FRONTEND_URL}/order/${order._id}" 
//               style="display:inline-block;padding:10px 15px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">
//               View Order Receipt
//            </a>
//          </p>
//          <p>
//            Or see all orders here: 
//            <a href="${process.env.FRONTEND_URL}/orders/all">Orders Dashboard</a>
//          </p>`
// });

//       res.clearCookie("guestCart");
//       req.session.checkoutDone = "true";
//       return res.redirect(`/order/${order._id}`);
//     }

//     let user = await userModel.findOne({ username: req.user.username });

//     if (single === "true") {
//       let order = await orderModel.create({
//         fullName,
//         lastName,
//         phoneNumber,
//         shippingAddress: { street, city, state, zip },
//         items: [{ productId, quantity: quantity || 1 }],
//         totalPrice: Number(totalPrice),
//         status: "confirmed",
//         userId: req.user.userId
//       });

//       await order.populate({ path: "items.productId" });

//       user.orders.push(order);
//       await user.save();

  
//       await sendEmail({
//         to: user.email,
//         subject: "Your Bunny Hop Shop Order Confirmation",
//         html: orderEmailTemplate(order)
//       });
//       console.log(order)
// await sendEmail({
//   to: adminEmail,
//   subject: "New Order Received",
//   html: `<h2>New Order Alert</h2>
//          <p>Order ID: ${order._id}</p>
//          <p>Customer: ${order.fullName}</p>
//          <p>Total: PKR.${order.totalPrice}</p>
//          <p>Items: ${order.items.map(i => i.productId.title + " x" + i.quantity).join(", ")}</p>
//          <p>
//            <a href="${process.env.FRONTEND_URL}/order/${order._id}" 
//               style="display:inline-block;padding:10px 15px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">
//               View Order Receipt
//            </a>
//          </p>
//          <p>
//            Or see all orders here: 
//            <a href="${process.env.FRONTEND_URL}/orders/all">Orders Dashboard</a>
//          </p>`
// });


//       req.session.checkoutDone = "true";
//       return res.redirect(`/order/${order._id}`);
//     }

//     let orderItems = user.cart.map(i => ({
//       productId: i.productId,
//       quantity: i.quantity
//     }));

//     let order = await orderModel.create({
//       fullName,
//       email,
//       phoneNumber,
//       shippingAddress: { street, city, state, zip },
//       items: orderItems,
//       totalPrice: Number(totalPrice),
//       status: "confirmed",
//       userId: req.user.userId
//     });

//     await order.populate({ path: "items.productId" });

//     user.orders.push(order);
//     user.cart = [];
//     await user.save();

//     await sendEmail({
//       to: user.email,
//       subject: "Your Bunny Hop Shop Order Confirmation",
//       html: orderEmailTemplate(order)
//     });

// await sendEmail({
//   to: adminEmail,
//   subject: "New Order Received",
//   html: `<h2>New Order Alert</h2>
//          <p>Order ID: ${order._id}</p>
//          <p>Customer: ${order.fullName}</p>
//          <p>Total: PKR.${order.totalPrice}</p>
//          <p>Items: ${order.items.map(i => i.productId.title + " x" + i.quantity).join(", ")}</p>
//          <p>
//            <a href="${process.env.FRONTEND_URL}/order/${order._id}" 
//               style="display:inline-block;padding:10px 15px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">
//               View Order Receipt
//            </a>
//          </p>
//          <p>
//            Or see all orders here: 
//            <a href="${process.env.FRONTEND_URL}/orders/all">Orders Dashboard</a>
//          </p>`
// });

//     req.session.checkoutDone = "true";
//     return res.redirect(`/order/${order._id}`);

//   } catch (error) {
//     console.log(error);
//     req.flash("error", "Error in Checkout");
//     res.status(500).send("Checkout failed");
//   }
// });

// router.get('/success-checkout', isLoggedIn, async (req, res) => {

//     if (!req.session.lastOrderId) {
//         return res.send("No order found");
//     }

//     const order = await orderModel
//         .findById(req.session.lastOrderId)
//         .populate("items.productId");

//     let user = await userModel.findOne({ username: req.user.username });
//     let cart = user?.cart || [];

//     res.render('success-checkout', {
//         user: req.user,
//         cart,
//         order
//     });
// });


// router.post('/checkout', isLoggedIn, async (req, res) => {
//   try {
//     let {
//       fullName,
//       lastName,
//       street,
//       city,
//       state,
//       zip,
//       phoneNumber,
//       email,
//       totalPrice,
//       single,
//       productId,
//       quantity
//     } = req.body;

//     const isGuest = req.user === "unsigned";


//     if (isGuest) {
//       let orderItems = [];

//       if (single === "true") {
//         orderItems.push({
//           productId,
//           quantity: quantity || 1
//         });
//       } else {

//         let guestCart = [];
//         try {
//           guestCart = JSON.parse(req.cookies.guestCart || "[]");
//         } catch (e) {
//           guestCart = [];
//         }

//         guestCart.forEach(item => {
//           orderItems.push({
//             productId: item.productId,
//             quantity: item.quantity
//           });
//         });
//       }

//       const order = await orderModel.create({
//         fullName,
//         lastName,
//         phoneNumber,
//         email,
//         shippingAddress: { street, city, state, zip },
//         items: orderItems,
//         totalPrice: Number(totalPrice),   
//         status: "confirmed",
//         userId: null,
//         isGuest: true
//       });

//       await order.populate({ path: "items.productId" });

//       await sendEmail({
//         to: email,
//         subject: "Your Bunny Hop Shop Order Confirmation",
//         html: orderEmailTemplate(order)
//       });

//       res.clearCookie("guestCart"); 
//       req.session.checkoutDone = "true";
//       return res.redirect(`/order/${order._id}`);

//     }


//     let user = await userModel.findOne({ username: req.user.username });

//     if (single === "true") {

//       let order = await orderModel.create({
//         fullName,
//         lastName,
//         shippingAddress: { street, city, state, zip },
//         items: [{ productId, quantity: quantity || 1 }],
//         totalPrice: Number(totalPrice),   
//         status: "confirmed",
//         userId: req.user.userId
//       });

//       user.orders.push(order);
//       await user.save();

//       await sendEmail({
//         to: user.email,
//         subject: "Your Bunny Hop Shop Order Confirmation",
//         html: orderEmailTemplate(order)
//       });

//       req.session.checkoutDone = "true";
//       return res.redirect(`/order/${order._id}`);
//     }

    
//     let orderItems = user.cart.map(i => ({
//       productId: i.productId,
//       quantity: i.quantity
//     }));

//     let order = await orderModel.create({
//       fullName,
//       email,
//       phoneNumber,
//       shippingAddress: { street, city, state, zip },
//       items: orderItems,
//       totalPrice: Number(totalPrice), 
//       status: "confirmed",
//       userId: req.user.userId
//     });

//     user.orders.push(order);
//     user.cart = []; 
//     await user.save();

//     await sendEmail({
//       to: user.email,
//       subject: "Your Bunny Hop Shop Order Confirmation",
//       html: orderEmailTemplate(order)
//     });

//     req.session.checkoutDone = "true";
//     return res.redirect(`/order/${order._id}`);


//   } catch (error) {
//     console.log(error);
//     res.status(500).send("Checkout failed");
//   }
// });

router.post('/checkout', isLoggedIn, async (req, res) => {
  try {
    let {
      fullName,
      lastName,
      street,
      city,
      state,
      zip,
      phoneNumber,
      email,
      single,
      productId,
      quantity
    } = req.body;

    const isGuest = req.user === "unsigned";
    const adminEmail = process.env.ADMIN_EMAIL;

    let orderItems = [];

    if (isGuest) {
      // Guest user
      if (single === "true") {
        const product = await productModel.findById(productId);
        const discount = await getDiscountForProduct(productId);

        orderItems.push({
          productId,
          quantity: quantity || 1,
          finalPrice: discount.finalPrice
        });
      } else {
        let guestCart = [];
        try {
          guestCart = JSON.parse(req.cookies.guestCart || "[]");
        } catch (e) {
          guestCart = [];
        }

        // Calculate discounted prices for all items
        orderItems = await Promise.all(guestCart.map(async item => {
          const discount = await getDiscountForProduct(item.productId);
          return {
            productId: item.productId,
            quantity: item.quantity,
            finalPrice: discount.finalPrice
          };
        }));
      }
    } else {
      // Logged-in user
      if (single === "true") {
        const product = await productModel.findById(productId);
        const discount = await getDiscountForProduct(productId);

        orderItems.push({
          productId,
          quantity: quantity || 1,
          finalPrice: discount.finalPrice
        });
      } else {
        const user = await userModel.findOne({ username: req.user.username });
        orderItems = await Promise.all(user.cart.map(async i => {
          const discount = await getDiscountForProduct(i.productId);
          return {
            productId: i.productId,
            quantity: i.quantity,
            finalPrice: discount.finalPrice
          };
        }));

        // Clear user cart
        user.cart = [];
        await user.save();
      }
    }

    // Calculate totalPrice with discounts
    const totalPrice = orderItems.reduce((sum, item) => {
      return sum + item.finalPrice * item.quantity;
    }, 0);

    // Create order
    const orderData = {
      fullName,
      lastName,
      phoneNumber,
      email,
      shippingAddress: { street, city, state, zip },
      items: orderItems,
      totalPrice,
      status: "confirmed",
      userId: isGuest ? null : req.user.userId,
      isGuest
    };

    const order = await orderModel.create(orderData);
    await order.populate({ path: "items.productId" });

    // Send confirmation emails
    await sendEmail({
      to: email,
      subject: "Your Bunny Hop Shop Order Confirmation",
      html: orderEmailTemplate(order)
    });

    await sendEmail({
      to: adminEmail,
      subject: "New Order Received",
      html: `<h2>New Order Alert</h2>
             <p>Order ID: ${order._id}</p>
             <p>Customer: ${order.fullName}</p>
             <p>Total: PKR.${order.totalPrice}</p>
             <p>Items: ${order.items.map(i => i.productId.title + " x" + i.quantity).join(", ")}</p>
             <p>
               <a href="${process.env.FRONTEND_URL}/order/${order._id}" 
                  style="display:inline-block;padding:10px 15px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">
                  View Order Receipt
               </a>
             </p>
             <p>
               Or see all orders here: 
               <a href="${process.env.FRONTEND_URL}/orders/all">Orders Dashboard</a>
             </p>`
    });

    if (isGuest) res.clearCookie("guestCart");

    req.session.checkoutDone = "true";
    return res.redirect(`/order/${order._id}`);

  } catch (error) {
    console.log(error);
    req.flash("error", "Error in Checkout");
    res.status(500).send("Checkout failed");
  }
});



router.get('/success-checkout', isLoggedIn, checkoutCheckout, async (req, res) => {
    let user = await userModel.findOne({ username: req.user.username })
    let cart = user?.cart || []
    res.render('success-checkout', {user: req.user, cart, req: req})
})

router.post('/create/:id', async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    const shipmentPayload = {
      booked_packet_weight: 0.5,
      booking_type: 2, 
      cod_amount: order.totalAmount,
      shipper_name: order.customerName,
      shipper_phone: order.customerPhone,
      shipper_address: order.shippingAddress,
      shipment_origin_city: order.city,
      shipment_destination_city: order.city,
      shipment_items: "Order (COD)",
      merchant_order_id: order._id.toString()
    };

    const shipmentResponse = await axios.post(process.env.LEOPARD_CREATE_SHIPMENT_URL, shipmentPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.LEOPARD_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!shipmentResponse.data.tracking_number) {
      return res.json({
        success: false,
        message: "Shipment failed: Tracking number not received"
      });
    }

    const trackingNumber = shipmentResponse.data.tracking_number;

    order.trackingNumber = trackingNumber;
    order.status = "Shipped";
    await order.save();

    const pickupPayload = {
      tracking_number: trackingNumber,
      pickup_address: order.shippingAddress,
      pickup_city: order.city,
      payment_type: "COD",
      instruction: "COD Order – Rider Pickup Required",
      merchant_order_id: order._id.toString(),
      contact_name: order.customerName,
      contact_phone: order.customerPhone
    };

    const pickupResponse = await axios.post(
      process.env.LEOPARD_CREATE_PICKUP_URL,
      pickupPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.LEOPARD_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({
      success: true,
      trackingNumber,
      message: "Shipment and Pickup booked",
      pickupStatus: pickupResponse.data
    });

  } catch (err) {
    console.error("Leopard Error:", err.response?.data || err.message);
    res.json({ success: false, message: "API request failed" });
  }
});

router.get("/seller/edit/:id", isLoggedInStrict, async (req, res) => {
    const product = await productsModel.findById(req.params.id);
    const user = await userModel.findOne({ username: req.user.username });
    const cart = user?.cart || [];

    res.render("dashboard", { 
        user, 
        cart, 
        edit: true, 
        product, 
        error: [], 
        success: []
    });
});

router.post("/seller/update/:id", upload.array("images", 5), async (req, res) => {
    let images = [];

    // new images uploaded?
    if (req.files?.length > 0) {  
    images = req.files.map(file => "/uploads/" + file.filename);
    } else {
        const product = await productsModel.findById(req.params.id);
        images = product?.images || []; 
    }

    await productsModel.findByIdAndUpdate(req.params.id, {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        gender: req.body.gender,
        color: req.body.color,
        category: req.body.category,
        images: images
    });

    res.redirect("/seller/dashboard");
});



module.exports = router;