/**
 * Performance Monitoring Middleware
 * Tracks response times and logs slow requests
 */

const logger = require('../utils/logger');

// Threshold for slow requests (in milliseconds)
const SLOW_REQUEST_THRESHOLD = process.env.SLOW_REQUEST_THRESHOLD || 3000;

// Track response times
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();

  // Store original send function
  const originalSend = res.send;

  // Override send function to capture timing
  res.send = function (data) {
    const duration = Date.now() - startTime;

    // Log slow requests
    if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    // Add performance header
    res.set('X-Response-Time', `${duration}ms`);

    // Log all requests in production (via logger.http)
    if (process.env.NODE_ENV === 'production') {
      logger.http(`${req.method} ${req.originalUrl}`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

// Aggregate performance stats (stored in memory)
class PerformanceStats {
  constructor() {
    this.stats = {
      totalRequests: 0,
      slowRequests: 0,
      totalDuration: 0,
      byEndpoint: {},
    };
  }

  record(endpoint, duration) {
    this.stats.totalRequests++;
    this.stats.totalDuration += duration;

    if (duration > SLOW_REQUEST_THRESHOLD) {
      this.stats.slowRequests++;
    }

    if (!this.stats.byEndpoint[endpoint]) {
      this.stats.byEndpoint[endpoint] = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
      };
    }

    const endpointStats = this.stats.byEndpoint[endpoint];
    endpointStats.count++;
    endpointStats.totalDuration += duration;
    endpointStats.avgDuration = Math.round(endpointStats.totalDuration / endpointStats.count);
  }

  getStats() {
    return {
      ...this.stats,
      avgDuration: this.stats.totalRequests > 0
        ? Math.round(this.stats.totalDuration / this.stats.totalRequests)
        : 0,
    };
  }

  reset() {
    this.stats = {
      totalRequests: 0,
      slowRequests: 0,
      totalDuration: 0,
      byEndpoint: {},
    };
  }
}

const perfStats = new PerformanceStats();

// Enhanced monitoring with stats tracking
const performanceMonitorWithStats = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - startTime;

    // Record stats
    const endpoint = `${req.method} ${req.route?.path || req.originalUrl}`;
    perfStats.record(endpoint, duration);

    // Log slow requests
    if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        ip: req.ip,
      });
    }

    // Add performance header
    res.set('X-Response-Time', `${duration}ms`);

    return originalSend.call(this, data);
  };

  next();
};

module.exports = {
  performanceMonitor,
  performanceMonitorWithStats,
  perfStats,
};
