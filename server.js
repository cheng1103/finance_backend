const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { validateEnv } = require('./utils/env-validator');
const { performanceMonitorWithStats, perfStats } = require('./middleware/performance');

// Validate environment variables on startup
validateEnv();

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const adminUsersRoutes = require('./routes/adminUsers');
const loanRoutes = require('./routes/loans');
const calculatorRoutes = require('./routes/calculator');
const userRoutes = require('./routes/users');
const whatsappRoutes = require('./routes/whatsapp');
const customerRoutes = require('./routes/customers');
const trackingRoutes = require('./routes/tracking');

const app = express();

// Trust proxy (for Nginx)
app.set('trust proxy', 1);

// Connect to database
connectDB();

// CORS MUST be before other middleware to handle preflight requests
const allowedOrigins = [
  'https://eplatformcredit.com',
  'https://www.eplatformcredit.com',
  'https://admin.eplatformcredit.com',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL
].filter(Boolean);

// Add localhost only in development
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:3002');
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Production: Use Winston stream for structured logging
  app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting - Relaxed limits for better admin dashboard experience
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to 1000 requests per windowMs (was 500)
  message: {
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Relaxed limiter for write operations (POST/PUT/DELETE)
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased to 500 write operations per 15 minutes (was 100)
  message: {
    error: 'Too many write operations, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
});

// Relaxed limiter for sensitive operations
const sensitiveOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased to 300 attempts per 15 minutes (was 100)
  message: {
    error: 'Too many attempts on sensitive operation, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general limiter to all routes
app.use(generalLimiter);

// Apply write limiter to all routes (will skip GET requests)
app.use(writeLimiter);

// Performance monitoring (before other middleware)
app.use(performanceMonitorWithStats);

// Parse JSON request body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser for session management
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// CSRF Protection
const { csrfTokenMiddleware, csrfProtection, getCsrfToken } = require('./middleware/csrf');
app.use(csrfTokenMiddleware);

// CSRF token endpoint
app.get('/api/csrf-token', getCsrfToken);

// Apply CSRF protection to all routes (except public ones defined in middleware)
app.use(csrfProtection);

// Performance stats endpoint (for monitoring)
app.get('/api/performance-stats', (req, res) => {
  const stats = perfStats.getStats();
  res.json({
    status: 'success',
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    services: {}
  };

  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    healthCheck.services.database = {
      status: dbState === 1 ? 'up' : 'down',
      state: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState]
    };

    // Check memory usage
    const memUsage = process.memoryUsage();
    healthCheck.services.memory = {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    };

    // Overall health status
    if (dbState !== 1) {
      healthCheck.status = 'degraded';
    }

    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthCheck);

  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/users', userRoutes);
app.use('/api', whatsappRoutes);
// Apply sensitive limiter to customer routes (contains sensitive data)
app.use('/api/customers', sensitiveOperationsLimiter, customerRoutes);
app.use('/api/tracking', trackingRoutes);

// Simple form submission routes
const simpleFormRoutes = require('./routes/simpleForm');
app.use('/api', simpleFormRoutes);

// 404 error handling
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.originalUrl}`
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info('Finance Platform API started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV,
    healthCheck: `/health`,
  });
});

const shutdown = (signal) => {
  logger.info(`Received ${signal}. Beginning graceful shutdown.`);
  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
