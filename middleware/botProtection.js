/**
 * Bot Protection Middleware
 * 检测并阻止明显的机器人请求
 */

// 已知的bot User-Agent关键词
const BOT_KEYWORDS = [
  'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
  'python-requests', 'java/', 'go-http-client', 'axios/',
  'postman', 'insomnia', 'headless', 'phantom', 'selenium',
  'playwright', 'puppeteer', 'scrapy', 'beautifulsoup',
  'apache-httpclient', 'okhttp', 'httpclient', 'requests/'
];

// 允许的搜索引擎爬虫（不阻止，因为需要SEO）
const ALLOWED_BOTS = [
  'googlebot', 'bingbot', 'baiduspider', 'yandexbot',
  'duckduckbot', 'slurp', 'teoma', 'facebookexternalhit'
];

// IP黑名单（可以添加已知的恶意IP）
const IP_BLACKLIST = [
  // Detected bot IPs from AWS servers (past 24 hours analysis)
  '44.250.190.174',  // AWS bot - Nov 13, 2025
  '54.189.136.231',  // AWS bot - Nov 13, 2025
  '54.188.183.156',  // AWS bot - Nov 13, 2025
  '34.219.37.125',   // AWS bot - Nov 13, 2025
  '35.88.120.190',   // AWS bot - Nov 13, 2025
  '35.94.96.25',     // AWS bot - Nov 12, 2025
  '34.222.210.104',  // AWS bot - Nov 12, 2025
  '54.200.90.220',   // AWS bot - Nov 12, 2025 (2 submissions)
  '35.88.138.207',   // AWS bot - Nov 12, 2025
  '35.94.97.181',    // AWS bot - Nov 12, 2025
];

// IP白名单（允许的IP，比如你自己的办公室IP）
const IP_WHITELIST = [
  // '123.456.789.0',  // 示例：你的办公室IP
];

/**
 * 检查是否是恶意bot
 */
function isSuspiciousBot(userAgent, ip) {
  if (!userAgent) {
    return { isBot: true, reason: 'Missing User-Agent header' };
  }

  const lowerUA = userAgent.toLowerCase();

  // 1. 检查是否是允许的搜索引擎
  const isAllowedBot = ALLOWED_BOTS.some(bot => lowerUA.includes(bot));
  if (isAllowedBot) {
    return { isBot: false, reason: 'Allowed search engine bot' };
  }

  // 2. 检查User-Agent是否过短（通常真实浏览器UA很长）
  if (userAgent.length < 20) {
    return { isBot: true, reason: `User-Agent too short: "${userAgent}"` };
  }

  // 3. 检查是否包含bot关键词
  for (const keyword of BOT_KEYWORDS) {
    if (lowerUA.includes(keyword)) {
      return { isBot: true, reason: `Detected bot keyword: "${keyword}"` };
    }
  }

  // 4. 检查User-Agent是否像真实浏览器
  const hasValidBrowser = /mozilla|chrome|safari|firefox|edge|opera/i.test(userAgent);
  if (!hasValidBrowser) {
    return { isBot: true, reason: 'No valid browser signature' };
  }

  // 5. 检查是否包含版本号（真实浏览器通常有）
  const hasVersion = /\d+\.\d+/.test(userAgent);
  if (!hasVersion) {
    return { isBot: true, reason: 'No browser version found' };
  }

  return { isBot: false, reason: 'Passed all checks' };
}

/**
 * Bot保护中间件 - 用于所有API端点
 */
function botProtectionMiddleware(req, res, next) {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  // 1. IP白名单检查（跳过所有检测）
  if (IP_WHITELIST.includes(ip)) {
    console.log(`✅ [Bot Protection] IP whitelisted: ${ip}`);
    return next();
  }

  // 2. IP黑名单检查
  if (IP_BLACKLIST.includes(ip)) {
    console.log(`🚫 [Bot Protection] Blocked blacklisted IP: ${ip}`);
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Your IP has been flagged for suspicious activity.',
      code: 'IP_BLACKLISTED'
    });
  }

  // 3. User-Agent检查
  const botCheck = isSuspiciousBot(userAgent, ip);

  if (botCheck.isBot) {
    console.log(`🤖 [Bot Protection] Blocked request:`);
    console.log(`   IP: ${ip}`);
    console.log(`   User-Agent: ${userAgent}`);
    console.log(`   Reason: ${botCheck.reason}`);
    console.log(`   Path: ${req.method} ${req.path}`);

    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Automated requests are not allowed.',
      code: 'BOT_DETECTED',
      hint: 'If you believe this is an error, please contact support.'
    });
  }

  // 4. 记录可疑但未阻止的请求
  if (userAgent.length < 50) {
    console.log(`⚠️  [Bot Protection] Suspicious but allowed:`);
    console.log(`   IP: ${ip}`);
    console.log(`   User-Agent: ${userAgent}`);
    console.log(`   Reason: Short UA but has browser signature`);
  }

  next();
}

/**
 * 严格的Bot保护 - 用于表单提交等敏感端点
 */
function strictBotProtection(req, res, next) {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  // 白名单优先
  if (IP_WHITELIST.includes(ip)) {
    return next();
  }

  // 黑名单
  if (IP_BLACKLIST.includes(ip)) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied.',
      code: 'IP_BLACKLISTED'
    });
  }

  // 更严格的检查
  const lowerUA = userAgent.toLowerCase();

  // 1. 必须有User-Agent
  if (!userAgent || userAgent.length < 30) {
    console.log(`🚫 [Strict Bot Protection] Blocked: User-Agent too short or missing`);
    return res.status(403).json({
      status: 'error',
      message: 'Invalid request. Please use a standard web browser.',
      code: 'INVALID_USER_AGENT'
    });
  }

  // 2. 必须看起来像真实浏览器
  const isBrowser = /mozilla.*\(.*\).*applewebkit.*\(.*\).*chrome.*safari/i.test(userAgent) ||
                    /mozilla.*\(.*\).*gecko.*firefox/i.test(userAgent) ||
                    /mozilla.*\(.*\).*applewebkit.*\(.*\).*version.*safari/i.test(userAgent);

  if (!isBrowser) {
    console.log(`🚫 [Strict Bot Protection] Blocked: Not a valid browser`);
    console.log(`   UA: ${userAgent.substring(0, 100)}`);
    return res.status(403).json({
      status: 'error',
      message: 'Please submit the form using a web browser.',
      code: 'NOT_A_BROWSER'
    });
  }

  // 3. 不能包含bot关键词
  for (const keyword of BOT_KEYWORDS) {
    if (lowerUA.includes(keyword)) {
      console.log(`🚫 [Strict Bot Protection] Blocked: Contains bot keyword "${keyword}"`);
      return res.status(403).json({
        status: 'error',
        message: 'Automated submissions are not allowed.',
        code: 'BOT_DETECTED'
      });
    }
  }

  next();
}

/**
 * 添加IP到黑名单
 */
function blockIP(ip) {
  if (!IP_BLACKLIST.includes(ip)) {
    IP_BLACKLIST.push(ip);
    console.log(`🚫 [Bot Protection] Added IP to blacklist: ${ip}`);
  }
}

/**
 * 从黑名单移除IP
 */
function unblockIP(ip) {
  const index = IP_BLACKLIST.indexOf(ip);
  if (index > -1) {
    IP_BLACKLIST.splice(index, 1);
    console.log(`✅ [Bot Protection] Removed IP from blacklist: ${ip}`);
  }
}

/**
 * 获取当前黑名单
 */
function getBlacklist() {
  return [...IP_BLACKLIST];
}

module.exports = {
  botProtectionMiddleware,
  strictBotProtection,
  isSuspiciousBot,
  blockIP,
  unblockIP,
  getBlacklist
};
