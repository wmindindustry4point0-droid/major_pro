const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('./models/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    passReqToCallback: true  // gives us access to req.query.state (the role)
},
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

            // If existing user is trying to log in via the wrong role portal,
            // still let them in but their actual stored role takes precedence.
            // Return the user as-is — their saved role is the source of truth.
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
}));

// Not using sessions — stateless JWT-style via URL param
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;