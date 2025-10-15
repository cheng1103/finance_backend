/**
 * Scheduler Module
 * Runs automated article generation daily using cron
 */

const cron = require('node-cron');
const { config, validateConfig } = require('./config');
const logger = require('./utils/logger');
const { getTodayKeywords, markKeywordAsUsed, updateKeywordUrl } = require('./utils/keywords');
const { generateArticle } = require('./modules/generateArticle');
const { publishToWordPress } = require('./modules/publishToWP');
const { submitToGoogleIndexing } = require('./modules/submitToGoogle');

/**
 * Process a single keyword (generate + publish + index)
 */
async function processKeyword(keyword) {
  const result = {
    keyword,
    success: false,
    article: null,
    published: false,
    indexed: false,
    url: null,
    error: null,
  };

  try {
    // Step 1: Generate article
    logger.info(`[1/3] Generating article for: "${keyword}"`);
    result.article = await generateArticle(keyword);

    // Step 2: Publish to WordPress
    logger.info(`[2/3] Publishing to WordPress: "${keyword}"`);
    const wpResult = await publishToWordPress(result.article);

    if (wpResult.success) {
      result.published = true;
      result.url = wpResult.url;

      // Mark keyword as used
      markKeywordAsUsed(keyword);
      updateKeywordUrl(keyword, wpResult.url);

      // Step 3: Submit to Google Indexing
      logger.info(`[3/3] Submitting to Google Indexing: "${keyword}"`);
      const googleResult = await submitToGoogleIndexing(wpResult.url);

      if (googleResult.success) {
        result.indexed = true;
      }
    }

    result.success = result.published; // Success if published
    logger.success(`✅ Completed processing: "${keyword}"`);

  } catch (error) {
    result.error = error.message;
    logger.fail(`❌ Failed processing: "${keyword}"`, {
      error: error.message,
      stack: error.stack,
    });
  }

  return result;
}

/**
 * Run the daily automation
 */
async function runDailyAutomation() {
  try {
    logger.info('═══════════════════════════════════════');
    logger.info('🚀 Starting Daily SEO Automation');
    logger.info('═══════════════════════════════════════');

    // Get keywords for today
    const keywords = getTodayKeywords(config.scheduler.articlesPerDay);

    if (keywords.length === 0) {
      logger.warn('No keywords available for processing');
      return;
    }

    logger.info(`Processing ${keywords.length} keywords:`, keywords);

    const results = [];

    // Process each keyword
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];

      logger.info(`\n📝 Processing keyword ${i + 1}/${keywords.length}: "${keyword}"`);

      const result = await processKeyword(keyword);
      results.push(result);

      // Delay between articles (except for the last one)
      if (i < keywords.length - 1) {
        const delay = config.scheduler.delayBetweenArticles;
        logger.info(`⏳ Waiting ${delay / 1000} seconds before next article...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    logger.info('\n═══════════════════════════════════════');
    logger.info('📊 Daily Automation Summary');
    logger.info('═══════════════════════════════════════');
    logger.info(`Total keywords processed: ${results.length}`);
    logger.info(`✅ Successful: ${successful}`);
    logger.info(`❌ Failed: ${failed}`);

    if (successful > 0) {
      logger.info('\nPublished URLs:');
      results.forEach(r => {
        if (r.success && r.url) {
          logger.info(`  • ${r.url}`);
        }
      });
    }

    logger.info('═══════════════════════════════════════\n');

    return results;

  } catch (error) {
    logger.fail('Daily automation failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  try {
    // Validate configuration
    validateConfig();

    if (!config.scheduler.enabled) {
      logger.warn('Scheduler is disabled in configuration');
      return;
    }

    logger.info('🕐 Starting SEO Automation Scheduler');
    logger.info(`Schedule: ${config.scheduler.cronSchedule}`);
    logger.info(`Articles per day: ${config.scheduler.articlesPerDay}`);

    // Schedule the cron job
    cron.schedule(config.scheduler.cronSchedule, async () => {
      logger.info(`⏰ Cron job triggered at ${new Date().toISOString()}`);
      await runDailyAutomation();
    });

    logger.success('✅ Scheduler started successfully');

    // Keep the process running
    logger.info('Scheduler is running. Press Ctrl+C to stop.\n');

  } catch (error) {
    logger.fail('Failed to start scheduler', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Export functions
module.exports = {
  startScheduler,
  runDailyAutomation,
  processKeyword,
};

// If this file is run directly, start the scheduler
if (require.main === module) {
  startScheduler();
}
