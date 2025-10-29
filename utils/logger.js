const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define transports
const transports = [];

// Console transport (always enabled in development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// File transport for errors (always enabled)
transports.push(
  new DailyRotateFile({
    filename: path.join(__dirname, '../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d', // Keep logs for 14 days
    format: format,
  })
);

// File transport for all logs (production only)
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new DailyRotateFile({
      filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d', // Keep logs for 7 days
      format: format,
    })
  );
}

// File transport for HTTP requests (production only)
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new DailyRotateFile({
      filename: path.join(__dirname, '../logs/http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '20m',
      maxFiles: '3d', // Keep HTTP logs for 3 days
      format: format,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
logger.logRequest = (req, message = 'Request received') => {
  logger.info(message, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
};

logger.logError = (error, req = null) => {
  const logData = {
    message: error.message,
    stack: error.stack,
  };

  if (req) {
    logData.method = req.method;
    logData.url = req.originalUrl;
    logData.ip = req.ip;
    logData.userAgent = req.get('user-agent');
  }

  logger.error(error.message, logData);
};

logger.logAuth = (action, userId, success, details = {}) => {
  logger.info(`Auth: ${action}`, {
    action,
    userId,
    success,
    ...details,
  });
};

logger.logLoan = (action, applicationId, details = {}) => {
  logger.info(`Loan: ${action}`, {
    action,
    applicationId,
    ...details,
  });
};

logger.logAdmin = (action, adminId, details = {}) => {
  logger.info(`Admin: ${action}`, {
    action,
    adminId,
    ...details,
  });
};

module.exports = logger;
