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

// Create Express app
const app: Application = express();

// Connect to MongoDB
connectDB();

// Security: Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS (must come before rate limiting so preflight requests get CORS headers)
const allowedOrigins = new Set([
  config.clientUrl,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
]);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (no Origin header)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
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
  max: 100, // Limit each IP to 100 requests per windowMs
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

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════╗
  ║                                                    ║
  ║   🚀 FinPal Server is running!                    ║
  ║                                                    ║
  ║   📍 Local:    http://localhost:${PORT}             ║
  ║   🔧 Mode:     ${config.nodeEnv.padEnd(28)}║
  ║                                                    ║
  ╚════════════════════════════════════════════════════╝
  `);
});

export default app;
