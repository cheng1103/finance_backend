const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const loanRoutes = require('./routes/loans');
const calculatorRoutes = require('./routes/calculator');
const userRoutes = require('./routes/users');
const whatsappRoutes = require('./routes/whatsapp');
const customerRoutes = require('./routes/customers');
const trackingRoutes = require('./routes/tracking');

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later'
  }
});
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: [
    'https://eplatformcredit.com',
    'https://www.eplatformcredit.com',  // 添加 www 版本
    'https://admin.eplatformcredit.com',
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    'http://localhost:3000',  // 开发环境
    'http://localhost:3002'   // 管理后台开发环境
  ].filter(Boolean), // 过滤掉 undefined 值
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Parse JSON request body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Finance Platform API is running normally',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/users', userRoutes);
app.use('/api', whatsappRoutes);
app.use('/api/customers', customerRoutes);
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

// Global error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Finance Platform API Server Started Successfully!`);
  console.log(`📍 Server Address: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM signal, starting graceful shutdown...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT signal, starting graceful shutdown...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
