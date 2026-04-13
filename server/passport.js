/**
 * server/passport.js
 * BUG FIXED: GoogleStrategy constructor was missing the closing `},` between the
 * options object and the async callback — this caused a runtime syntax crash on startup.
 */

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('./models/User');

passport.use(new GoogleStrategy(
    // Options object — properly closed with }, before callback
    {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
        passReqToCallback: true, // gives us access to req.query.state (the role)
    },
    // ↑ options closed here — callback follows as second argument
    async (req, accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value?.toLowerCase();
            const avatar = profile.photos?.[0]?.value;

            // Role was passed through OAuth state param from the frontend
            const requestedRole = req.query.state === 'company' ? 'company' : 'candidate';

            // Check if user exists (by googleId or email)
            let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

            if (user) {
                // Link googleId if they signed up via email/password before
                if (!user.googleId) {
                    user.googleId = profile.id;
                    user.avatar = avatar;
                    user.isEmailVerified = true;
                    await user.save();
                }
                // Their stored role is the source of truth — return as-is
                return done(null, user);
            }

            // New user — use the role they selected on the login screen
            user = await User.create({
                name: profile.displayName,
                email,
                googleId: profile.id,
                avatar,
                role: requestedRole,
                isEmailVerified: true
            });

            done(null, user);
        } catch (err) {
            done(err, null);
        }
    }
));

// Not using sessions — stateless JWT via URL param
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;