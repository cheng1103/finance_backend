/**
 * Configuration File for SEO Automation System
 * Loads environment variables and exports configuration
 */

require('dotenv').config();
const path = require('path');

const config = {
  // Google Gemini API Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 2048,
  },

  // WordPress Configuration
  wordpress: {
    apiUrl: process.env.WP_API_URL || 'https://eplatformcredit.com/wp-json/wp/v2/posts',
    username: process.env.WP_USER,
    password: process.env.WP_APP_PASSWORD, // WordPress Application Password
    status: process.env.WP_STATUS || 'publish', // 'draft' or 'publish'
    author: parseInt(process.env.WP_AUTHOR_ID) || 1,
    categories: process.env.WP_CATEGORIES ? process.env.WP_CATEGORIES.split(',').map(id => parseInt(id)) : [],
    tags: process.env.WP_TAGS ? process.env.WP_TAGS.split(',').map(id => parseInt(id)) : [],
  },

  // Google Search Console / Indexing API Configuration
  google: {
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    projectId: process.env.GOOGLE_PROJECT_ID,
    indexingApiEndpoint: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
    siteUrl: process.env.SITE_URL || 'https://eplatformcredit.com',
  },

  // Scheduler Configuration
  scheduler: {
    articlesPerDay: parseInt(process.env.ARTICLES_PER_DAY) || 3,
    cronSchedule: process.env.CRON_SCHEDULE || '0 9 * * *', // 9 AM daily (server timezone)
    delayBetweenArticles: parseInt(process.env.DELAY_BETWEEN_ARTICLES) || 30000, // 30 seconds
    enabled: process.env.SCHEDULER_ENABLED !== 'false', // Default enabled
  },

  // Article Generation Settings
  article: {
    minWords: parseInt(process.env.MIN_WORDS) || 800,
    maxWords: parseInt(process.env.MAX_WORDS) || 1200,
    language: process.env.LANGUAGE || 'English',
    locale: process.env.LOCALE || 'Malaysia',
    includeImages: process.env.INCLUDE_IMAGES === 'true',
    includeFAQ: process.env.INCLUDE_FAQ !== 'false', // Default true
    includeCTA: process.env.INCLUDE_CTA !== 'false', // Default true
    ctaText: process.env.CTA_TEXT || 'Contact us via WhatsApp for fast approval!',
    ctaLink: process.env.CTA_LINK || 'https://wa.me/60123456789',
  },

  // Paths
  paths: {
    root: __dirname,
    output: path.join(__dirname, 'output'),
    logs: path.join(__dirname, 'logs'),
    keywords: path.join(__dirname, 'data', 'used-keywords.json'),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info', // 'debug', 'info', 'warn', 'error'
    console: process.env.LOG_CONSOLE !== 'false',
    file: process.env.LOG_FILE !== 'false',
  },
};

/**
 * Validate required environment variables
 */
function validateConfig() {
  const errors = [];
  const warnings = [];

  // Required
  if (!config.gemini.apiKey) {
    errors.push('GEMINI_API_KEY is required');
  }

  // Warnings for optional but recommended
  if (!config.wordpress.username || !config.wordpress.password) {
    warnings.push('WordPress credentials not configured - publishing will be disabled');
  }

  if (!config.google.clientEmail || !config.google.privateKey) {
    warnings.push('Google API credentials not configured - indexing will be disabled');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(err => console.error(`   - ${err}`));
    throw new Error('Invalid configuration. Please check your .env file.');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    warnings.forEach(warn => console.warn(`   - ${warn}`));
  }

  console.log('✅ Configuration loaded successfully');
  return true;
}

module.exports = {
  config,
  validateConfig,
};
