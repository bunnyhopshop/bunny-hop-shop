const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require('../models/user-model');
require('dotenv').config();

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await userModel.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user exists
                let user = await userModel.findOne({ email: profile.emails[0].value });

                if (user) {
                    // If user exists but no googleId (legacy user), link it? 
                    // For now just logging in.
                    return done(null, user);
                } else {
                    // Create new user
                    // Generate a random password since they use Google
                    const randomPassword = Math.random().toString(36).slice(-8);
                    // Hash it if needed, but we might just skip password check for google users
                    // However, model might require password.

                    const newUser = await userModel.create({
                        username: profile.displayName,
                        fullName: profile.displayName,
                        email: profile.emails[0].value,
                        password: randomPassword, // Placeholder, they won't use it
                        isSeller: false,
                    });
                    return done(null, newUser);
                }
            } catch (err) {
                return done(err, null);
            }
        }));
} else {
    console.warn("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing. OAuth will not work.");
}

module.exports = passport;
