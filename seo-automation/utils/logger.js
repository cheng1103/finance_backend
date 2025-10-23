/**
 * Logger Utility Module
 * Handles console and file logging
 */

const fs = require('fs');
const path = require('path');
const { config } = require('../config');

const logsDir = config.paths.logs;

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

class Logger {
  constructor() {
    this.logFile = path.join(logsDir, this.getLogFileName());
  }

  getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return `seo-automation-${date}.log`;
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let msg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (data) {
      msg += '\n' + JSON.stringify(data, null, 2);
    }
    return msg;
  }

  writeToFile(message) {
    if (!config.logging.file) return;
    try {
      fs.appendFileSync(this.logFile, message + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  log(level, message, data = null) {
    const formattedMessage = this.formatMessage(level, message, data);

    if (config.logging.console) {
      const color = COLORS[level] || COLORS.reset;
      console.log(`${color}${formattedMessage}${COLORS.reset}`);
    }

    this.writeToFile(formattedMessage);
  }

  debug(message, data = null) {
    if (config.logging.level === 'debug') {
      this.log('debug', message, data);
    }
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  success(message, data = null) {
    this.info(`✅ ${message}`, data);
  }

  fail(message, data = null) {
    this.error(`❌ ${message}`, data);
  }
}

const logger = new Logger();

module.exports = logger;
