/**
 * WordPress Publishing Module
 * Publishes articles to WordPress via REST API
 */

const axios = require('axios');
const { marked } = require('marked');
const { config } = require('../config');
const logger = require('../utils/logger');

/**
 * Publish article to WordPress
 * @param {Object} articleData - Article data from generateArticle
 * @returns {Promise<Object>} WordPress post response
 */
async function publishToWordPress(articleData) {
  try {
    logger.info(`Publishing article to WordPress: "${articleData.title}"`);

    // Check if WordPress is configured
    if (!config.wordpress.username || !config.wordpress.password) {
      logger.warn('WordPress credentials not configured. Skipping publish.');
      return { skipped: true, reason: 'No WordPress credentials' };
    }

    // Convert markdown to HTML
    const htmlContent = convertMarkdownToHTML(articleData);

    // Prepare WordPress post data
    const postData = {
      title: articleData.title,
      content: htmlContent,
      status: config.wordpress.status,
      author: config.wordpress.author,
      excerpt: articleData.metaDescription || '',
      categories: config.wordpress.categories,
      tags: config.wordpress.tags,
      meta: {
        _yoast_wpseo_metadesc: articleData.metaDescription || '',
        _yoast_wpseo_focuskw: articleData.keyword || '',
      },
    };

    // Create Basic Auth token
    const auth = Buffer.from(
      `${config.wordpress.username}:${config.wordpress.password}`
    ).toString('base64');

    // Make API request
    const response = await axios.post(
      config.wordpress.apiUrl,
      postData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        timeout: 30000,
      }
    );

    const postUrl = response.data.link;

    logger.success(`Article published to WordPress`, {
      title: articleData.title,
      url: postUrl,
      id: response.data.id,
      status: response.data.status,
    });

    return {
      success: true,
      url: postUrl,
      id: response.data.id,
      status: response.data.status,
    };

  } catch (error) {
    logger.fail(`Failed to publish to WordPress`, {
      title: articleData.title,
      error: error.message,
      response: error.response?.data,
    });

    throw error;
  }
}

/**
 * Convert markdown article to HTML
 */
function convertMarkdownToHTML(articleData) {
  let fullContent = articleData.content;

  // Add FAQ section if present
  if (articleData.faq) {
    fullContent += '\n\n' + articleData.faq;
  }

  // Add CTA if configured
  if (config.article.includeCTA) {
    fullContent += `\n\n## ${config.article.ctaText}\n\n`;
    fullContent += `[Contact us now via WhatsApp](${config.article.ctaLink})`;
  }

  // Convert to HTML using marked
  const html = marked.parse(fullContent);

  return html;
}

/**
 * Update existing WordPress post
 */
async function updateWordPressPost(postId, articleData) {
  try {
    logger.info(`Updating WordPress post: ${postId}`);

    const htmlContent = convertMarkdownToHTML(articleData);

    const postData = {
      title: articleData.title,
      content: htmlContent,
      excerpt: articleData.metaDescription || '',
    };

    const auth = Buffer.from(
      `${config.wordpress.username}:${config.wordpress.password}`
    ).toString('base64');

    const updateUrl = `${config.wordpress.apiUrl}/${postId}`;

    const response = await axios.post(
      updateUrl,
      postData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    logger.success(`WordPress post updated`, {
      id: postId,
      url: response.data.link,
    });

    return {
      success: true,
      url: response.data.link,
      id: postId,
    };

  } catch (error) {
    logger.fail(`Failed to update WordPress post: ${postId}`, {
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  publishToWordPress,
  updateWordPressPost,
};
