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
          const email = profile.emails?.[0]?.value;
          
          if (!email) {
            return done(new Error('No email provided by Google'), undefined);
          }

          // Normalize email to lowercase for consistent lookup
          const normalizedEmail = email.toLowerCase().trim();

          // Check if user exists with this Google ID
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            // Update user info if email changed
            if (user.email !== normalizedEmail) {
              user.email = normalizedEmail;
              await user.save();
            }
            return done(null, user);
          }

          // Check if user exists with this email (case-insensitive)
          user = await User.findOne({ email: normalizedEmail });
          if (user) {
            // Link Google account to existing user and verify the account
            user.googleId = profile.id;
            user.avatar = user.avatar || profile.photos?.[0]?.value;
            user.isVerified = true; // Google accounts are always verified
            await user.save();
            console.log(`✅ Linked Google account to existing user: ${normalizedEmail}`);
            return done(null, user);
          }

          // Create new user with verified status
          user = await User.create({
            fullName: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 'Google User',
            email: normalizedEmail,
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value,
            phone: '', // OAuth users don't have phone initially
            password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12), // Random password for OAuth users (meets 8 char requirement)
            isVerified: true, // Google accounts are pre-verified
          });

          console.log(`✅ Created new user via Google OAuth: ${normalizedEmail}`);
          return done(null, user);
        } catch (error) {
          console.error('Google OAuth error:', error);
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

          // Normalize email if provided
          const normalizedEmail = email ? email.toLowerCase().trim() : `${appleId}@privaterelay.appleid.com`;

          // Check if user exists with this Apple ID
          let user = await User.findOne({ appleId });

          if (user) {
            // Update user info if email changed
            if (user.email !== normalizedEmail) {
              user.email = normalizedEmail;
              await user.save();
            }
            return done(null, user);
          }

          // Check if user exists with this email (case-insensitive)
          user = await User.findOne({ email: normalizedEmail });
          if (user) {
            // Link Apple account to existing user and verify the account
            user.appleId = appleId;
            user.isVerified = true; // Apple accounts are always verified
            await user.save();
            console.log(`✅ Linked Apple account to existing user: ${normalizedEmail}`);
            return done(null, user);
          }

          // Create new user with verified status
          user = await User.create({
            fullName,
            email: normalizedEmail,
            appleId,
            phone: '',
            password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12), // Random password (meets 8 char requirement)
            isVerified: true, // Apple accounts are pre-verified
          });

          console.log(`✅ Created new user via Apple OAuth: ${normalizedEmail}`);
          return done(null, user);
        } catch (error) {
          console.error('Apple OAuth error:', error);
          return done(error as Error, undefined);
        }
      }
    )
  );
}

export default passport;
