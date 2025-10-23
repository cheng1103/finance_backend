/**
 * Google Indexing API Module
 * Submits URLs to Google for indexing
 */

const { google } = require('googleapis');
const { config } = require('../config');
const logger = require('../utils/logger');

/**
 * Submit URL to Google Indexing API
 * @param {string} url - The URL to submit
 * @returns {Promise<Object>} Submission result
 */
async function submitToGoogleIndexing(url) {
  try {
    logger.info(`Submitting URL to Google Indexing: ${url}`);

    // Check if Google credentials are configured
    if (!config.google.clientEmail || !config.google.privateKey) {
      logger.warn('Google API credentials not configured. Skipping indexing.');
      return { skipped: true, reason: 'No Google credentials' };
    }

    // Create JWT client
    const jwtClient = new google.auth.JWT(
      config.google.clientEmail,
      null,
      config.google.privateKey,
      ['https://www.googleapis.com/auth/indexing'],
      null
    );

    // Authorize the client
    await jwtClient.authorize();

    // Create the indexing service
    const indexing = google.indexing({
      version: 'v3',
      auth: jwtClient,
    });

    // Submit the URL
    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: 'URL_UPDATED', // or 'URL_DELETED'
      },
    });

    logger.success(`URL submitted to Google Indexing`, {
      url: url,
      response: response.data,
    });

    return {
      success: true,
      url: url,
      response: response.data,
    };

  } catch (error) {
    logger.fail(`Failed to submit URL to Google Indexing`, {
      url: url,
      error: error.message,
      details: error.response?.data,
    });

    // Don't throw error - indexing failure shouldn't stop the process
    return {
      success: false,
      url: url,
      error: error.message,
    };
  }
}

/**
 * Get indexing status for a URL
 */
async function getIndexingStatus(url) {
  try {
    logger.info(`Checking indexing status for: ${url}`);

    if (!config.google.clientEmail || !config.google.privateKey) {
      logger.warn('Google API credentials not configured.');
      return { skipped: true };
    }

    const jwtClient = new google.auth.JWT(
      config.google.clientEmail,
      null,
      config.google.privateKey,
      ['https://www.googleapis.com/auth/indexing'],
      null
    );

    await jwtClient.authorize();

    const indexing = google.indexing({
      version: 'v3',
      auth: jwtClient,
    });

    const response = await indexing.urlNotifications.getMetadata({
      url: url,
    });

    logger.info(`Indexing status retrieved`, {
      url: url,
      data: response.data,
    });

    return {
      success: true,
      url: url,
      metadata: response.data,
    };

  } catch (error) {
    logger.warn(`Could not get indexing status`, {
      url: url,
      error: error.message,
    });

    return {
      success: false,
      url: url,
      error: error.message,
    };
  }
}

/**
 * Batch submit multiple URLs
 */
async function batchSubmitUrls(urls) {
  logger.info(`Batch submitting ${urls.length} URLs to Google Indexing`);

  const results = [];

  for (const url of urls) {
    const result = await submitToGoogleIndexing(url);
    results.push(result);

    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;

  logger.info(`Batch submission completed`, {
    total: results.length,
    successful,
    failed,
  });

  return results;
}

module.exports = {
  submitToGoogleIndexing,
  getIndexingStatus,
  batchSubmitUrls,
};
