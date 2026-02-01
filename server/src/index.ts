import dotenv from 'dotenv';

dotenv.config();

import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import config from './config';
import { connectDB } from './config/database';
import passport from './config/passport';
import routes from './routes';
import { errorHandler, notFound } from './middleware';
import { initializeAchievementScheduler } from './utils/achievementScheduler';

// Create Express app
const app: Application = express();

// Connect to MongoDB
connectDB();

// Security: Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS - LOCALHOST ONLY (no network access)
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
]);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow only localhost origins
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    console.log(`❌ CORS blocked for origin: ${origin}`);
    return callback(new Error(`Access denied. Localhost only.`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Serve static files (uploads) with security headers
// Alias: support both `/uploads/*` and `/api/uploads/*` to avoid client/server path mismatches.
// Note: mounted before API rate limiting so images/assets don't consume API quota.
const uploadsStatic = express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'public, max-age=31536000');
  },
});

app.use('/uploads', uploadsStatic);
app.use('/api/uploads', uploadsStatic);

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development - Limit each IP to 1000 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Strict rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 auth attempts per 15 minutes
  message: { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Middleware
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security: Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Security: Prevent parameter pollution
app.use(hpp());

// Session for OAuth
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Logging in development
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to FinPal API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server - LOCALHOST ONLY (127.0.0.1)
const PORT = config.port;
const HOST = '127.0.0.1'; // Bind to localhost only, no network access

app.listen(PORT, HOST, () => {
  console.log(`
  ╔════════════════════════════════════════════════════╗
  ║                                                    ║
  ║   🚀 FinPal Server - LOCALHOST ONLY               ║
  ║                                                    ║
  ║   📍 Local:    http://localhost:${PORT}             ║
  ║   🔧 Mode:     ${config.nodeEnv.padEnd(28)}║
  ║   🔒 Access:   Localhost only (no network)        ║
  ║                                                    ║
  ╚════════════════════════════════════════════════════╝
  `);
  
  // Initialize achievement scheduler
  initializeAchievementScheduler();
});

export default app;
