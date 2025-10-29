#!/usr/bin/env node

/**
 * SEO Weekly Report Generator
 *
 * Fetches data from Google Search Console API
 * and generates weekly performance report
 *
 * Setup Requirements:
 * 1. Enable Google Search Console API in Google Cloud Console
 * 2. Create service account and download credentials JSON
 * 3. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 * 4. Grant service account access to Search Console property
 *
 * Usage:
 *   node scripts/seo-weekly-report.js
 *
 * For manual data entry (without API):
 *   node scripts/seo-weekly-report.js --manual
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SITE_URL = 'https://www.eplatformcredit.com';
const REPORT_DIR = path.join(__dirname, '../reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

/**
 * Calculate date range for last week
 */
function getLastWeekDateRange() {
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);

  return {
    current: {
      start: lastWeek.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    },
    previous: {
      start: twoWeeksAgo.toISOString().split('T')[0],
      end: lastWeek.toISOString().split('T')[0]
    }
  };
}

/**
 * Generate manual report template
 */
function generateManualReport() {
  const dateRange = getLastWeekDateRange();
  const today = new Date();

  const report = {
    reportDate: today.toISOString().split('T')[0],
    period: {
      start: dateRange.current.start,
      end: dateRange.current.end
    },
    siteUrl: SITE_URL,
    metrics: {
      impressions: 0, // Fill manually from GSC
      clicks: 0,      // Fill manually from GSC
      ctr: 0,         // Fill manually from GSC
      position: 0     // Fill manually from GSC
    },
    comparison: {
      impressions: { value: 0, change: '+0%' },
      clicks: { value: 0, change: '+0%' },
      ctr: { value: 0, change: '+0%' },
      position: { value: 0, change: '+0 positions' }
    },
    topKeywords: [
      // Fill manually - top 10 keywords by clicks
      { keyword: 'example keyword', position: 0, clicks: 0, impressions: 0, ctr: 0 }
    ],
    topPages: [
      // Fill manually - top 5 pages by clicks
      { url: '/example', clicks: 0, impressions: 0, ctr: 0, position: 0 }
    ],
    newRankings: [
      // Keywords that entered top 20 this week
    ],
    improvements: [
      // Keywords that improved by 3+ positions
    ],
    declines: [
      // Keywords that dropped by 3+ positions
    ],
    schemaStatus: {
      errors: 0,
      warnings: 0,
      validItems: 0
    },
    indexStatus: {
      totalIndexed: 0,
      newlyIndexed: 0,
      errors: 0
    },
    notes: [
      '// Add any important notes or observations here',
      '// Example: "Published 2 new blog posts this week"'
    ]
  };

  // Save report
  const filename = `seo-report-${today.toISOString().split('T')[0]}.json`;
  const filepath = path.join(REPORT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

  return { report, filepath };
}

/**
 * Display report summary in console
 */
function displayReport(report) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEO WEEKLY REPORT');
  console.log('='.repeat(60));
  console.log(`Report Date: ${report.reportDate}`);
  console.log(`Period: ${report.period.start} to ${report.period.end}`);
  console.log(`Site: ${report.siteUrl}`);
  console.log('');

  console.log('📈 Performance Metrics:');
  console.log('─'.repeat(60));
  console.log(`  Impressions: ${report.metrics.impressions.toLocaleString()}`);
  console.log(`  Clicks: ${report.metrics.clicks.toLocaleString()}`);
  console.log(`  Average CTR: ${report.metrics.ctr}%`);
  console.log(`  Average Position: ${report.metrics.position}`);
  console.log('');

  if (report.topKeywords.length > 0 && report.topKeywords[0].keyword !== 'example keyword') {
    console.log('🔑 Top Keywords:');
    console.log('─'.repeat(60));
    report.topKeywords.slice(0, 5).forEach((kw, idx) => {
      console.log(`  ${idx + 1}. "${kw.keyword}" - Pos ${kw.position}, ${kw.clicks} clicks`);
    });
    console.log('');
  }

  if (report.topPages.length > 0 && report.topPages[0].url !== '/example') {
    console.log('📄 Top Pages:');
    console.log('─'.repeat(60));
    report.topPages.slice(0, 5).forEach((page, idx) => {
      console.log(`  ${idx + 1}. ${page.url} - ${page.clicks} clicks`);
    });
    console.log('');
  }

  console.log('📋 Status:');
  console.log('─'.repeat(60));
  console.log(`  Schema Errors: ${report.schemaStatus.errors}`);
  console.log(`  Schema Warnings: ${report.schemaStatus.warnings}`);
  console.log(`  Total Indexed Pages: ${report.indexStatus.totalIndexed}`);
  console.log(`  Newly Indexed: ${report.indexStatus.newlyIndexed}`);
  console.log('');

  console.log('='.repeat(60));
}

/**
 * Export report to Markdown format
 */
function exportToMarkdown(report, filepath) {
  const mdContent = `# SEO Weekly Report

**Report Date:** ${report.reportDate}
**Period:** ${report.period.start} to ${report.period.end}
**Site:** ${report.siteUrl}

---

## 📈 Performance Metrics

| Metric | Value | Change |
|--------|-------|--------|
| Impressions | ${report.metrics.impressions.toLocaleString()} | ${report.comparison.impressions.change} |
| Clicks | ${report.metrics.clicks.toLocaleString()} | ${report.comparison.clicks.change} |
| Average CTR | ${report.metrics.ctr}% | ${report.comparison.ctr.change} |
| Average Position | ${report.metrics.position} | ${report.comparison.position.change} |

---

## 🔑 Top Keywords

| Keyword | Position | Clicks | Impressions | CTR |
|---------|----------|--------|-------------|-----|
${report.topKeywords.slice(0, 10).map((kw, idx) =>
  `| ${kw.keyword} | ${kw.position} | ${kw.clicks} | ${kw.impressions} | ${kw.ctr}% |`
).join('\n')}

---

## 📄 Top Pages

| URL | Clicks | Impressions | CTR | Position |
|-----|--------|-------------|-----|----------|
${report.topPages.slice(0, 5).map(page =>
  `| ${page.url} | ${page.clicks} | ${page.impressions} | ${page.ctr}% | ${page.position} |`
).join('\n')}

---

## 📊 Schema & Index Status

- **Schema Errors:** ${report.schemaStatus.errors}
- **Schema Warnings:** ${report.schemaStatus.warnings}
- **Total Indexed Pages:** ${report.indexStatus.totalIndexed}
- **Newly Indexed:** ${report.indexStatus.newlyIndexed}

---

## 📝 Notes

${report.notes.join('\n')}

---

*Generated by SEO Weekly Report Generator*
`;

  const mdFilepath = filepath.replace('.json', '.md');
  fs.writeFileSync(mdFilepath, mdContent);
  console.log(`✅ Markdown report saved: ${mdFilepath}`);

  return mdFilepath;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const isManual = args.includes('--manual');

  console.log('🔄 Generating SEO Weekly Report...\n');

  if (isManual) {
    console.log('📝 Manual mode - generating template...\n');
    const { report, filepath } = generateManualReport();
    console.log(`✅ Report template created: ${filepath}`);
    console.log('\n📌 Next Steps:');
    console.log('   1. Open Google Search Console');
    console.log('   2. Navigate to Performance');
    console.log('   3. Set date range to last 7 days');
    console.log('   4. Fill in the metrics in the JSON file');
    console.log('   5. Re-run this script to generate formatted report\n');
    displayReport(report);
  } else {
    console.log('🔌 API mode (not yet implemented)');
    console.log('\n💡 To use manual mode, run:');
    console.log('   node scripts/seo-weekly-report.js --manual\n');
    console.log('📚 For API setup instructions, see:');
    console.log('   VALIDATION_AND_MONITORING_COMPLETE.md\n');
  }
}

main().catch(console.error);
