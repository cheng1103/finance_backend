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

  // Mongoose验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      status: 'error',
      message: '数据验证失败',
      details: message
    });
  }

  // Mongoose重复字段错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field}已存在，请使用其他值`;
    return res.status(400).json({
      status: 'error',
      message
    });
  }

  // Mongoose ObjectId错误
  if (err.name === 'CastError') {
    const message = '无效的ID格式';
    return res.status(400).json({
      status: 'error',
      message
    });
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的访问令牌';
    return res.status(401).json({
      status: 'error',
      message
    });
  }

  // JWT过期错误
  if (err.name === 'TokenExpiredError') {
    const message = '访问令牌已过期';
    return res.status(401).json({
      status: 'error',
      message
    });
  }

  // 默认服务器错误
  res.status(error.statusCode || 500).json({
    status: 'error',
    message: error.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
