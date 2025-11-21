const jwt = require('jsonwebtoken');
const flash = require('connect-flash')
function isLoggedIn(req, res, next) {
    if(req.cookies.token) {
        if(process.env.TOKEN){
            try {
                jwt.verify(req.cookies.token, process.env.TOKEN, (err, data) => {
                    if (err) console.log(err)
                    req.user = data
                    next()
                })
            } catch (error) {
                console.log(error.message)
            }
        }
    } else{
        req.user = 'unsigned'
        req.session.seller = false
        next()
    }
}
function isLoggedInStrict(req, res, next) {
    if(req.cookies.token) {
        if(process.env.TOKEN){
            try {
                jwt.verify(req.cookies.token, process.env.TOKEN, (err, data) => {
                    if (err) console.log(err)
                    req.user = data
                    next()
                })
            } catch (error) {
                console.log(error.message)
            }
        }
    } else{
        req.user = 'unsigned'
        req.flash('sellerError', 'Please create an account first')
        res.redirect('/access')
    }
}
function redirectIfLogin(req,res,next) {
    if(req.cookies.token) {
        res.redirect('/')
    }
    else{
        next()
    }
}
module.exports.isLoggedIn = isLoggedIn
module.exports.isLoggedInStrict = isLoggedInStrict
module.exports.redirectIfLogin = redirectIfLogin