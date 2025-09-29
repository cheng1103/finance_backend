const errorHandler = (err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  let error = { ...err };
  error.message = err.message;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      status: 'error',
      message: 'Data validation failed',
      details: message
    });
  }

  // Mongoose duplicate field error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists, please use a different value`;
    return res.status(400).json({
      status: 'error',
      message
    });
  }

  // Mongoose ObjectId error
  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    return res.status(400).json({
      status: 'error',
      message
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid access token';
    return res.status(401).json({
      status: 'error',
      message
    });
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Access token has expired';
    return res.status(401).json({
      status: 'error',
      message
    });
  }

  // Default server error
  res.status(error.statusCode || 500).json({
    status: 'error',
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
