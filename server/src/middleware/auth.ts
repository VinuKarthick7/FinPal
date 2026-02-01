import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models';
import config from '../config';

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };

    // Get user from token (user ID is the source of truth)
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found. Please log in again.',
      });
      return;
    }

    // Ensure email is verified for protected routes
    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email to access this feature.',
      });
      return;
    }

    // Attach validated user to request (user ID verified via JWT)
    (req as any).user = user;
    console.log(`✅ Authenticated request from user: ${user.email} (ID: ${user._id})`);
    next();
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

export default protect;
