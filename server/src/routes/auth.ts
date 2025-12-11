import { Router } from 'express';
import { body } from 'express-validator';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { register, login, getMe, forgotPassword } from '../controllers/authController';
import { protect } from '../middleware/auth';
import config from '../config';
import { IUser } from '../models/User';

const router = Router();

// Generate JWT Token
const generateToken = (id: string): string => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: '7d',
  });
};

// OAuth callback handler
const handleOAuthCallback = (req: any, res: any) => {
  try {
    const user = req.user as IUser;
    const token = generateToken(user._id.toString());
    
    // Create user data object for frontend
    const userData = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      avatar: user.avatar,
      isVerified: user.isVerified,
    };

    // Redirect to frontend with token and user data
    const redirectUrl = `${config.clientUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
    res.redirect(redirectUrl);
  } catch (error) {
    res.redirect(`${config.clientUrl}/login?error=oauth_failed`);
  }
};

// Validation rules
const registerValidation = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit phone number'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email'),
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);

// Google OAuth routes
router.get('/google', (req, res, next) => {
  if (!config.googleClientId || !config.googleClientSecret) {
    return res.status(501).json({
      success: false,
      message: 'Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables.',
    });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    if (!config.googleClientId || !config.googleClientSecret) {
      return res.redirect(`${config.clientUrl}/login?error=google_not_configured`);
    }
    passport.authenticate('google', { session: false, failureRedirect: `${config.clientUrl}/login?error=google_failed` })(req, res, next);
  },
  handleOAuthCallback
);

// Apple OAuth routes
router.get('/apple', (req, res, next) => {
  if (!config.appleClientId || !config.appleTeamId || !config.appleKeyId || !config.applePrivateKey) {
    return res.status(501).json({
      success: false,
      message: 'Apple OAuth is not configured. Please add Apple OAuth credentials to your environment variables.',
    });
  }
  passport.authenticate('apple')(req, res, next);
});

router.post(
  '/apple/callback',
  (req, res, next) => {
    if (!config.appleClientId || !config.appleTeamId || !config.appleKeyId || !config.applePrivateKey) {
      return res.redirect(`${config.clientUrl}/login?error=apple_not_configured`);
    }
    passport.authenticate('apple', { session: false, failureRedirect: `${config.clientUrl}/login?error=apple_failed` })(req, res, next);
  },
  handleOAuthCallback
);

export default router;
