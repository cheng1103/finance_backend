const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log error with structured logging
  logger.logError(err, req);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred.';
  const payload = {};

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed.';
    payload.details = Object.values(err.errors).map((val) => val.message).join(', ');
  } else if (err.code === 11000) {
    statusCode = 400;
    const duplicateField = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${duplicateField} already exists.`;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid identifier supplied.';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired.';
  }

  if (process.env.NODE_ENV === 'development' && err.stack) {
    payload.stack = err.stack;
  }

  // Generate unique error ID for tracking
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log error with ID for tracing
  logger.error('Request error', {
    errorId,
    statusCode,
    message,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(statusCode).json({
    status: 'error',
    message,
    errorId, // Include error ID for support/debugging
    timestamp: new Date().toISOString(),
    ...payload
  });
};

module.exports = errorHandler;
