const express = require('express')
const router = express.Router()
const { isLoggedIn, isLoggedInStrict } = require('../middlewares/auth')
const isSeller = require('../middlewares/isSeller')
const productsModel = require('../models/product-model')
const bcrypt = require('bcrypt')
const userModel = require('../models/user-model')
const jwt = require('jsonwebtoken')
const { default: storage } = require('../config/cloudinary')
const multer = require('multer')
const productModel = require('../models/product-model')
const heroStorage = require("../config/hero-storage")
const categoryModel = require('../models/category-model');
const essentialsModel  = require('../models/essentials-model')
const testimonial = require('../models/testimonial')
const upload = multer({ storage });
const uploadHero = multer({ storage: heroStorage });

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
  let user = await userModel.findOne({ username: req.user.username })
  let cart = user?.cart || [];
  let categories = await categoryModel.find({});
  let error = req.flash('error')
  let success = req.flash('success');
  res.render('dashboard', { user, cart, error, success, uploadedImage: null, edit: false, categories })
})

router.get('/categories', isLoggedInStrict, isSeller, async (req, res) => {
  let user = await userModel.findOne({ username: req.user.username })
  let cart = user?.cart || [];
  let categories = await categoryModel.find({});
  let error = req.flash('error')
  let success = req.flash('success');
  res.render('categories', { user, cart, error, success, categories })
})

router.post('/create-category', isLoggedIn, isSeller, upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !req.file) {
      req.flash('error', 'Category name and image are required');
      return res.redirect('/seller/categories');
    }

    await categoryModel.create({
      name: name,
      image: req.file.path 
    });

    req.flash('success', 'Category created successfully');
    res.redirect('/seller/categories');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to create category');
    res.redirect('/seller/categories');
  }
});


router.post('/push', isLoggedIn, isSeller, upload.array('images', 5), async (req, res) => {
  // console.log('form received')
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

    const product = await productsModel.create({ title, mainImage: images[0], image2: images[1], image3: images[2], description, seller: req.user.userId, price, gender, category, color, tags, image4: images[3], image5: images[4] });
    await userModel.findByIdAndUpdate(req.user.userId, { $push: { products: product._id } });
    req.flash('success', 'Product created successfully');
    res.redirect('/seller/dashboard');
  } catch (error) {
    console.log(error);
    req.flash('error', 'something went wrong')
    res.redirect('/seller/dashboard')
  }
});


// router.get('/plusproducts', isLoggedInStrict, isSeller, async (req,res) => {
//     let user = await userModel.findOne({username: req.user.username}).populate('products');
//     let cart = user.cart
//     let seller = await userModel.findOne({ username: req.user.username }).populate('products')
//     res.render('plusproducts', {products: seller.products, user: req.user, cart})
// })
router.get('/plusproducts', isLoggedInStrict, isSeller, async (req, res) => {
  let seller = await userModel.findOne({ username: req.user.username })
  // Fetch products belonging to this seller
  let products = await productModel.find({ seller: seller._id });
  res.render('plusproducts', { products: products, user: req.user, cart: seller.cart })
})

router.post('/feature/:id', isLoggedIn, isSeller, async (req, res) => {
  try {
    const product = await productModel.findOne({ _id: req.params.id, seller: req.user.userId });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let tags = product.tags || [];
    let isFeatured = false;

    if (tags.includes('featured')) {
      // Unpin
      tags = tags.filter(t => t !== 'featured');
    } else {
      // Pin
      tags.push('featured');
      isFeatured = true;
    }

    product.tags = tags;
    await product.save();

    return res.status(200).json({ success: true, isFeatured });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
});


router.delete('/products/:id', isLoggedIn, async (req, res) => {
  try {
    await productsModel.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
});


router.get("/upload-hero", isLoggedIn, async (req, res) => {
  try {
    let seller = await userModel.findOne({ username: req.user.username });
    let products = await productModel.find({ seller: seller._id });
    let essentials = await essentialsModel.findOne();
    let error = req.flash('error');
    let success = req.flash('success');
    
    res.render('upload-hero', { 
      products: products, 
      user: req.user, 
      cart: seller.cart,
      essentials: essentials,
      error: error,
      success: success
    });
  } catch (error) {
    req.flash("serverError", "Something went wrong");
    res.redirect("/");
  }
});

router.post("/upload-hero", isLoggedInStrict, isSeller,uploadHero.single("hero"),
  async (req, res) => {
    try {
      if (!req.file) {
        req.flash("error", "No file uploaded");
        return res.redirect("/seller/upload-hero");
      }

      const imageUrl = req.file.path;


      if (!imageUrl) {
        req.flash("error", "Unable to get image URL from upload");
        return res.redirect("/seller/upload-hero");
      }

      let essentials = await essentialsModel.findOne();
      if (!essentials) essentials = new essentialsModel();

      essentials.heroImage = imageUrl;
      await essentials.save();

  
      req.flash("success", "Hero image updated successfully!");
      return res.redirect("/seller/upload-hero");
    } catch (err) {
      console.log("Error:", err);
      req.flash("error", "Error updating hero image: " + err.message);
      return res.redirect("/seller/upload-hero");
    }
  }
);

router.get('/testimonial', isLoggedIn, isSeller, async (req, res) => {
  try {
    let seller = await userModel.findOne({ username: req.user.username });
    let error = req.flash('error');
    let success = req.flash('success');

    let testimonials = await testimonial.find({ addedBy: req.user.username });
    
    let editingTestimonial = null;
    if (req.query.edit) {
      editingTestimonial = await testimonial.findById(req.query.edit);
    }

    res.render('testimonial', { 
      user: req.user, 
      cart: seller.cart,
      error: error,
      success: success,
      testimonials,
      editingTestimonial
    });
  } catch (error) {
    req.flash("serverError", "Something went wrong");
    res.redirect("/");
  }
});

router.post('/testimonial', isLoggedIn, isSeller, async (req, res) => {
  try {
    const { username, message, instagramLink } = req.body;

    let addTestimonial = new testimonial({ username, message, instagramLink, addedBy: req.user.username });

    await addTestimonial.save();

    res.redirect('/seller/testimonial');
  } catch (err) {
    console.log(err);
    res.send('Error adding testimonial');
  }
});
router.post('/testimonial/delete/:id', isLoggedIn, async (req, res) => {
  const t = await testimonial.findById(req.params.id);
  if (t.addedBy === req.user.username) {
    await testimonial.findByIdAndDelete(req.params.id);
  }
  res.redirect('/seller/testimonial');
});

router.get('/testimonial/edit/:id', async (req, res) => {
  try {
    let test = await testimonial.findById(req.params.id);
    res.render('editTestimonial', { test });
  } catch (error) {
    console.log(error);
    res.redirect('/seller/testimonial');
  }
});

router.post('/testimonial/edit/:id', isLoggedIn, async (req, res) => {
  const t = await testimonial.findById(req.params.id);
  if (t.addedBy === req.user.username) {
    const { message, instagramLink, username } = req.body;
    await testimonial.findByIdAndUpdate(req.params.id, { message, instagramLink, username });
  }
  res.redirect('/seller/testimonial');
});

module.exports = router