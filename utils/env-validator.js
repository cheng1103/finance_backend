/**
 * Runtime Environment Variables Validator
 * Validates critical environment variables on server startup
 */

const logger = require('./logger');

const REQUIRED_VARS = [
  'NODE_ENV',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'FRONTEND_URL',
];

const PRODUCTION_REQUIRED = [
  'ADMIN_URL',
];

const validateEnv = () => {
  const errors = [];
  const warnings = [];

  // Check required variables
  REQUIRED_VARS.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Check production-specific variables
  if (process.env.NODE_ENV === 'production') {
    PRODUCTION_REQUIRED.forEach(varName => {
      if (!process.env[varName]) {
        warnings.push(`Missing recommended variable for production: ${varName}`);
      }
    });

    // Check for placeholder values
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.includes('your-')) {
      errors.push('JWT_SECRET appears to be a placeholder value!');
    }

    if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('username:password')) {
      errors.push('MONGODB_URI contains placeholder credentials!');
    }
  }

  // Security checks
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters for better security');
  }

  // Log results
  if (errors.length > 0) {
    errors.forEach(error => logger.error(`Environment validation: ${error}`));
    throw new Error('Environment validation failed. Check logs for details.');
  }

  if (warnings.length > 0) {
    warnings.forEach(warning => logger.warn(`Environment validation: ${warning}`));
  }

  logger.info('Environment variables validated successfully', {
    environment: process.env.NODE_ENV,
    validatedVars: REQUIRED_VARS.length,
  });
};

module.exports = { validateEnv };
