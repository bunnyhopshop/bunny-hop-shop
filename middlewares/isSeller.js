const userModel = require('../models/user-model')
async function isSeller(req, res, next) {
    if (req.user === 'unsigned') {
        req.flash('sellerError', 'Please create a account to sell products')
        return res.redirect('/access')
    }
    else {
        try {
            let seller = await userModel.findOne({username: req.user.username})
            if (seller && seller.isSeller === true) {
                return next()
            }
            else {
                req.flash('sellerError', 'Please create a seller account to sell products')
                return res.redirect('/seller/signup')
            }

        } catch (error) {
            req.flash('sellerError', 'something went wrong')
            res.redirect('/seller/signup')
        }

    }


}
module.exports = isSeller