import { Router, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/auth';
import { uploadAvatar } from '../middleware/upload';
import User from '../models/User';
import { validationResult } from 'express-validator';
import config from '../config';

const router = Router();

// All routes are protected
router.use(protect);

// Helper function to safely delete avatar files (prevents path traversal)
const safeDeleteAvatar = (avatarPath: string): boolean => {
  try {
    if (!avatarPath || !avatarPath.startsWith('/uploads/avatars/')) {
      return false;
    }
    
    const uploadsDir = path.resolve(__dirname, '../../uploads/avatars');
    const fullPath = path.resolve(__dirname, '../..', avatarPath);
    
    // Ensure the resolved path is within the uploads directory
    if (!fullPath.startsWith(uploadsDir)) {
      console.warn('Attempted path traversal detected:', avatarPath);
      return false;
    }
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return false;
  }
};

// Update profile validation
const updateProfileValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit phone number'),
];

// Change password validation
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain uppercase, lowercase, and number'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

// @route   PUT /api/profile
// @desc    Update user profile
// @access  Private
router.put('/', updateProfileValidation, async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { fullName, phone } = req.body;
    const userId = req.user._id;

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/profile/password
// @desc    Change user password
// @access  Private
router.put('/password', changePasswordValidation, async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Get user with password
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user has a password (OAuth users might not)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change password for OAuth accounts. Please use your social login.',
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/profile
// @desc    Delete user account
// @access  Private
router.delete('/', async (req: any, res) => {
  try {
    const userId = req.user._id;

    // Delete user's avatar if exists (using safe helper)
    const user = await User.findById(userId);
    if (user?.avatar) {
      safeDeleteAvatar(user.avatar);
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/profile/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', uploadAvatar.single('avatar'), async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }

    const userId = req.user._id;
    
    // Get current user to delete old avatar (using safe helper)
    const currentUser = await User.findById(userId);
    if (currentUser?.avatar) {
      safeDeleteAvatar(currentUser.avatar);
    }

    // Create avatar URL path
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update user with new avatar
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar: avatarUrl,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error: any) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

// @route   DELETE /api/profile/avatar
// @desc    Remove user avatar
// @access  Private
router.delete('/avatar', async (req: any, res: Response) => {
  try {
    const userId = req.user._id;

    // Get current user to delete avatar file (using safe helper)
    const user = await User.findById(userId);
    if (user?.avatar) {
      safeDeleteAvatar(user.avatar);
    }

    // Update user to remove avatar
    await User.findByIdAndUpdate(userId, { avatar: null });

    res.json({
      success: true,
      message: 'Avatar removed successfully',
      data: {
        avatar: null,
      },
    });
  } catch (error: any) {
    console.error('Remove avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
