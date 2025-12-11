import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Generate secure random secrets for development
const generateDevSecret = () => crypto.randomBytes(64).toString('hex');

// In production, secrets must be set via environment variables
const getSecret = (envVar: string, devFallback: string): string => {
  const value = process.env[envVar];
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`${envVar} must be set in production`);
  }
  return value || devFallback;
};

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/finpal',
  jwtSecret: getSecret('JWT_SECRET', generateDevSecret()),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  serverUrl: process.env.SERVER_URL || 'http://localhost:5000',
  sessionSecret: getSecret('SESSION_SECRET', generateDevSecret()),
  
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  
  // Apple OAuth
  appleClientId: process.env.APPLE_CLIENT_ID || '',
  appleTeamId: process.env.APPLE_TEAM_ID || '',
  appleKeyId: process.env.APPLE_KEY_ID || '',
  applePrivateKey: process.env.APPLE_PRIVATE_KEY || '',
};

export default config;
