function checkoutCheck(req,res,next) {
    if(req.session.checkoutDone){
        return next()
    } else{
        req.flash('error', 'You must place an order first')
        return res.redirect('/cart')
    }
}
module.exports = checkoutCheck