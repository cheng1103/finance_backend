/**
 * Keywords Management Module
 * Manages SEO keywords for article generation
 */

const fs = require('fs');
const path = require('path');
const { config } = require('../config');

// Main keyword list for Malaysian loan/credit market (eplatformcredit.com)
const keywordList = [
  // CTOS & Credit-related
  "low ctos loan malaysia",
  "personal loan without ctos check malaysia",
  "ctos score low loan approval",
  "blacklist loan malaysia",
  "ctos repair loan malaysia",
  "bad credit personal loan malaysia",

  // Personal Loans
  "personal loan without payslip malaysia",
  "urgent cash loan for employees malaysia",
  "same day approval loan kl",
  "instant personal loan malaysia",
  "online loan approval malaysia 2025",
  "fast cash loan selangor",
  "emergency loan malaysia",
  "personal loan bad credit malaysia approved",
  "24 hour loan approval malaysia",

  // Business Loans
  "business loan for sme malaysia",
  "easy business loan penang",
  "sme loan without collateral malaysia",
  "startup business loan malaysia 2025",
  "working capital loan malaysia",
  "business expansion loan malaysia",
  "sme financing malaysia",

  // Specific Loan Types
  "wedding loan malaysia low interest",
  "education loan malaysia without guarantor",
  "medical emergency loan malaysia",
  "home renovation loan malaysia",
  "car loan bad credit malaysia",
  "debt consolidation loan malaysia",
  "bridging loan malaysia",

  // Platform & Fintech
  "best online loan platform malaysia",
  "licensed money lender vs bank loan malaysia",
  "peer to peer lending malaysia 2025",
  "fintech loan malaysia",
  "digital loan malaysia",
  "instant approve loan malaysia",

  // Location-based
  "quick cash loan kuala lumpur",
  "personal loan johor bahru",
  "business loan penang",
  "urgent loan selangor",
  "fast loan approval kl",
  "money lender malaysia trusted",

  // Specific Needs
  "salary loan malaysia",
  "loan for freelancers malaysia",
  "loan for gig workers malaysia",
  "loan without employment letter malaysia",
  "personal loan for self employed malaysia",
];

const keywordsFilePath = path.join(config.paths.root, 'data', 'used-keywords.json');

/**
 * Ensure data directory and file exist
 */
function ensureDataDirectory() {
  const dataDir = path.dirname(keywordsFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(keywordsFilePath)) {
    fs.writeFileSync(keywordsFilePath, JSON.stringify([], null, 2));
  }
}

/**
 * Load used keywords from file
 */
function loadUsedKeywords() {
  try {
    ensureDataDirectory();
    const data = fs.readFileSync(keywordsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Could not load used keywords:', error.message);
    return [];
  }
}

/**
 * Save used keywords to file
 */
function saveUsedKeywords(keywords) {
  try {
    ensureDataDirectory();
    fs.writeFileSync(keywordsFilePath, JSON.stringify(keywords, null, 2));
  } catch (error) {
    console.error('Could not save used keywords:', error.message);
  }
}

/**
 * Mark a keyword as used
 */
function markKeywordAsUsed(keyword) {
  const used = loadUsedKeywords();
  const entry = {
    keyword,
    usedAt: new Date().toISOString(),
    publishedUrl: null, // Will be updated after publishing
  };
  used.push(entry);
  saveUsedKeywords(used);
}

/**
 * Update keyword entry with published URL
 */
function updateKeywordUrl(keyword, url) {
  const used = loadUsedKeywords();
  const entry = used.find(e => e.keyword === keyword);
  if (entry) {
    entry.publishedUrl = url;
    saveUsedKeywords(used);
  }
}

/**
 * Get available (unused) keywords
 */
function getAvailableKeywords() {
  const used = loadUsedKeywords();
  const usedKeywordStrings = used.map(entry => entry.keyword.toLowerCase());
  return keywordList.filter(kw => !usedKeywordStrings.includes(kw.toLowerCase()));
}

/**
 * Get N random keywords from available pool
 */
function getTodayKeywords(count = 3) {
  let available = getAvailableKeywords();

  // If no keywords available, reset the pool
  if (available.length === 0) {
    console.log('🔄 All keywords used. Resetting keyword pool...');
    saveUsedKeywords([]);
    available = [...keywordList];
  }

  // If requesting more than available
  if (count > available.length) {
    console.warn(`⚠️  Requested ${count} keywords but only ${available.length} available`);
    count = available.length;
  }

  // Shuffle and pick random keywords
  const shuffled = available.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Get keyword statistics
 */
function getKeywordStats() {
  const used = loadUsedKeywords();
  const available = getAvailableKeywords();

  return {
    total: keywordList.length,
    used: used.length,
    available: available.length,
    percentageUsed: ((used.length / keywordList.length) * 100).toFixed(2),
    recentlyUsed: used.slice(-5).reverse(), // Last 5 used keywords
  };
}

/**
 * Reset all used keywords
 */
function resetUsedKeywords() {
  saveUsedKeywords([]);
  console.log('✅ Keyword history reset successfully');
}

module.exports = {
  keywordList,
  getTodayKeywords,
  markKeywordAsUsed,
  updateKeywordUrl,
  getAvailableKeywords,
  getKeywordStats,
  resetUsedKeywords,
};
