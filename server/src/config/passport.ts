import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import AppleStrategy from 'passport-apple';
import { User, IUser } from '../models';
import config from './index';

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (config.googleClientId && config.googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: config.googleClientSecret,
        callbackURL: `${config.serverUrl}/api/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with this Google ID
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

          // Check if user exists with this email
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await User.findOne({ email });
            if (user) {
              // Link Google account to existing user
              user.googleId = profile.id;
              user.avatar = user.avatar || profile.photos?.[0]?.value;
              await user.save();
              return done(null, user);
            }
          }

          // Create new user
          user = await User.create({
            fullName: profile.displayName || `${profile.name?.givenName} ${profile.name?.familyName}`,
            email: email,
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value,
            phone: '', // OAuth users don't have phone initially
            password: Math.random().toString(36).slice(-12), // Random password for OAuth users
            isVerified: true, // Google accounts are verified
          });

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}

// Apple OAuth Strategy
if (config.appleClientId && config.appleTeamId && config.appleKeyId && config.applePrivateKey) {
  passport.use(
    new AppleStrategy(
      {
        clientID: config.appleClientId,
        teamID: config.appleTeamId,
        keyID: config.appleKeyId,
        privateKeyString: config.applePrivateKey,
        callbackURL: `${config.serverUrl}/api/auth/apple/callback`,
        scope: ['name', 'email'],
      },
      async (accessToken: string, refreshToken: string, idToken: any, profile: any, done: any) => {
        try {
          const appleId = profile.id || idToken.sub;
          const email = profile.email || idToken.email;
          const fullName = profile.name
            ? `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim()
            : 'Apple User';

          // Check if user exists with this Apple ID
          let user = await User.findOne({ appleId });

          if (user) {
            return done(null, user);
          }

          // Check if user exists with this email
          if (email) {
            user = await User.findOne({ email });
            if (user) {
              // Link Apple account to existing user
              user.appleId = appleId;
              await user.save();
              return done(null, user);
            }
          }

          // Create new user
          user = await User.create({
            fullName,
            email: email || `${appleId}@privaterelay.appleid.com`,
            appleId,
            phone: '',
            password: Math.random().toString(36).slice(-12),
            isVerified: true,
          });

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}

export default passport;
