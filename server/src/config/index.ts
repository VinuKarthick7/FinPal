import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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

  // Email (SMTP)
  // If SMTP_HOST is not set, emails are not sent and links are logged to console (dev-friendly).
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpSecure: process.env.SMTP_SECURE === 'true',
  emailFrom: process.env.EMAIL_FROM || 'FinPal <no-reply@finpal.local>',
  
  // OpenAI (RAG Chatbot — FinMate)
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  
  // Apple OAuth
  appleClientId: process.env.APPLE_CLIENT_ID || '',
  appleTeamId: process.env.APPLE_TEAM_ID || '',
  appleKeyId: process.env.APPLE_KEY_ID || '',
  applePrivateKey: process.env.APPLE_PRIVATE_KEY || '',

  // Razorpay (UPI Payments)
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};

export default config;
