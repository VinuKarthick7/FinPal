import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';
import config from '../config';
import { buildVerifyEmailHtml, sendEmail } from '../utils/email';
import { createVerificationToken, hashToken } from '../utils/tokens';

// Generate JWT Token
const generateToken = (id: string): string => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: '7d',
  });
};

const sendVerificationEmail = async (email: string, token: string) => {
  const verifyUrl = `${config.serverUrl}/api/auth/verify-email?token=${token}`;
  const html = buildVerifyEmailHtml(verifyUrl);
  const text = `Verify your email: ${verifyUrl}`;
  await sendEmail({
    to: email,
    subject: 'Verify your FinPal email',
    html,
    text,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const fullName = String(req.body?.fullName || '').trim();
    const rawEmail = String(req.body?.email || '');
    const email = rawEmail.toLowerCase().trim();
    const phone = String(req.body?.phone || '').trim();
    const password = String(req.body?.password || '');

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
        return;
      }

      // User exists but is not verified: resend verification email instead of blocking registration.
      const { token, tokenHash, expiresAt } = createVerificationToken();
      existingUser.emailVerificationTokenHash = tokenHash;
      existingUser.emailVerificationExpires = expiresAt;
      await existingUser.save();

      let emailSent = true;
      try {
        await sendVerificationEmail(existingUser.email, token);
      } catch (err) {
        emailSent = false;
        console.error('Verification email send failed (register-resend):', err);
      }

      res.status(200).json({
        success: true,
        message: emailSent
          ? 'Verification email resent. Please check your inbox.'
          : 'Account exists but email could not be sent. Please try again using resend verification.',
        data: {
          requiresEmailVerification: true,
          emailSent,
        },
      });
      return;
    }

    // Check if phone exists
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
      res.status(400).json({
        success: false,
        message: 'User with this phone number already exists',
      });
      return;
      }
    }

    // Create user
    const user = await User.create({ fullName, email, phone, password });

    // Create verification token (store hash + expiry)
    const { token, tokenHash, expiresAt } = createVerificationToken();
    user.emailVerificationTokenHash = tokenHash;
    user.emailVerificationExpires = expiresAt;
    await user.save();

    // Send verification email (or log in dev if SMTP not configured)
    let emailSent = true;
    try {
      await sendVerificationEmail(user.email, token);
    } catch (err) {
      emailSent = false;
      console.error('Verification email send failed (register):', err);
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? 'Registration successful. Please verify your email to activate your account.'
        : 'Registration successful, but we could not send the verification email. Please use resend verification.',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        requiresEmailVerification: true,
        emailSent,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const password = String(req.body?.password || '');

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
      return;
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before signing in.',
      });
      return;
    }

    // Generate token
    const token = generateToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
    });
  }
};

// @desc    Get current user with data summary
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as IUser;
    
    // Get user's data summary for better UX
    const [transactionCount, budgetCount, reminderCount] = await Promise.all([
      User.db.collection('transactions').countDocuments({ userId: user._id }),
      User.db.collection('budgets').countDocuments({ userId: user._id }),
      User.db.collection('reminders').countDocuments({ userId: user._id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          isVerified: user.isVerified,
          aiConsent: user.aiConsent,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        dataSummary: {
          transactions: transactionCount,
          budgets: budgetCount,
          reminders: reminderCount,
        },
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user',
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent',
      });
      return;
    }

    // TODO: Implement email sending with reset token
    // For now, just return success
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process request',
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email?token=...
// @access  Public
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.query.token || '');
    if (!token) {
      res.redirect(`${config.clientUrl}/login?verified=0`);
      return;
    }

    const tokenHash = hashToken(token);

    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationTokenHash +emailVerificationExpires');

    if (!user) {
      res.redirect(`${config.clientUrl}/login?verified=0`);
      return;
    }

    user.isVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.redirect(`${config.clientUrl}/login?verified=1`);
  } catch (error) {
    res.redirect(`${config.clientUrl}/login?verified=0`);
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();

    // Always return success to avoid leaking whether a user exists.
    const okResponse = () =>
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a verification link has been sent.',
      });

    if (!email) {
      okResponse();
      return;
    }

    const user = await User.findOne({ email }).select('+emailVerificationTokenHash +emailVerificationExpires');
    if (!user) {
      okResponse();
      return;
    }

    if (user.isVerified) {
      okResponse();
      return;
    }

    const { token, tokenHash, expiresAt } = createVerificationToken();
    user.emailVerificationTokenHash = tokenHash;
    user.emailVerificationExpires = expiresAt;
    await user.save();
    await sendVerificationEmail(user.email, token);

    okResponse();
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a verification link has been sent.',
    });
  }
};

export default { register, login, getMe, forgotPassword, verifyEmail, resendVerification };
