/**
 * SEO Automation System - Main Entry Point
 *
 * Usage:
 *   node index.js                  - Start scheduler
 *   node index.js run              - Run immediately (manual trigger)
 *   node index.js generate <keyword> - Generate single article
 */

const { validateConfig } = require('./config');
const { startScheduler, runDailyAutomation } = require('./scheduler');
const logger = require('./utils/logger');

// Parse command line arguments
const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  try {
    // Validate configuration first
    validateConfig();

    logger.info('═══════════════════════════════════════');
    logger.info('🤖 SEO Automation System');
    logger.info('═══════════════════════════════════════\n');

    switch (command) {
      case 'run':
        // Manual trigger - run immediately
        logger.info('Running automation immediately (manual trigger)...\n');
        await runDailyAutomation();
        logger.success('\n✅ Manual run completed');
        process.exit(0);
        break;

      case 'generate':
        // Generate article for specific keyword
        if (!arg) {
          logger.error('Please provide a keyword: node index.js generate "your keyword"');
          process.exit(1);
        }
        const { processKeyword } = require('./scheduler');
        logger.info(`Generating article for: "${arg}"\n`);
        const result = await processKeyword(arg);
        if (result.success) {
          logger.success(`\n✅ Article generated and published: ${result.url}`);
        } else {
          logger.fail(`\n❌ Failed to process keyword: ${result.error}`);
          process.exit(1);
        }
        process.exit(0);
        break;

      case 'stats':
        // Show keyword statistics
        const { getKeywordStats } = require('./utils/keywords');
        const stats = getKeywordStats();
        logger.info('📊 Keyword Statistics:');
        logger.info(`Total keywords: ${stats.total}`);
        logger.info(`Used: ${stats.used} (${stats.percentageUsed}%)`);
        logger.info(`Available: ${stats.available}`);
        if (stats.recentlyUsed.length > 0) {
          logger.info('\nRecently used keywords:');
          stats.recentlyUsed.forEach(entry => {
            logger.info(`  • ${entry.keyword} (${new Date(entry.usedAt).toLocaleDateString()})`);
          });
        }
        process.exit(0);
        break;

      case 'test':
        // Test configuration
        logger.success('✅ Configuration is valid');
        logger.info('All systems ready');
        process.exit(0);
        break;

      default:
        // Start scheduler (default behavior)
        logger.info('Starting scheduler mode...\n');
        startScheduler();
        break;
    }

  } catch (error) {
    logger.fail('Fatal error', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n🛑 Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Run main function
main();
