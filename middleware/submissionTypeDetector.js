/**
 * Submission Type Detector Middleware
 *
 * 目的: 自动检测并标记提交类型（浏览器 vs 自动化系统）
 *
 * 重要: 这个middleware只检测和标记，不阻止任何请求！
 * 用于追踪和分析不同来源的lead质量
 */

const AUTOMATED_INDICATORS = {
  // Bot关键词
  botKeywords: [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
    'python-requests', 'java/', 'go-http-client', 'axios/',
    'postman', 'insomnia', 'headless', 'phantom', 'selenium',
    'playwright', 'puppeteer', 'node'
  ],

  // 浏览器签名
  browserSignatures: [
    'mozilla', 'chrome', 'safari', 'firefox', 'edge', 'opera'
  ],

  // AWS服务器IP前缀
  awsIPPrefixes: ['44.', '54.', '34.', '35.', '52.', '18.', '16.']
};

/**
 * 检测提交类型
 */
function detectSubmissionType(req, res, next) {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress || '';

  let submissionType = 'unknown';
  let confidence = 0; // 0-100 置信度
  let indicators = []; // 检测到的指标

  // 1. 检查User-Agent长度
  if (userAgent.length < 30) {
    confidence += 40;
    indicators.push('短UA长度');
  } else if (userAgent.length > 80) {
    confidence -= 20; // 倾向于browser
    indicators.push('正常UA长度');
  }

  // 2. 检查bot关键词
  const lowerUA = userAgent.toLowerCase();
  const detectedBotKeywords = AUTOMATED_INDICATORS.botKeywords.filter(
    keyword => lowerUA.includes(keyword)
  );

  if (detectedBotKeywords.length > 0) {
    confidence += 50;
    indicators.push(`Bot关键词: ${detectedBotKeywords.join(', ')}`);
  }

  // 3. 检查浏览器签名
  const hasBrowserSignature = AUTOMATED_INDICATORS.browserSignatures.some(
    sig => lowerUA.includes(sig)
  );

  if (hasBrowserSignature) {
    confidence -= 30; // 倾向于browser
    indicators.push('浏览器签名');
  } else {
    confidence += 20;
    indicators.push('无浏览器签名');
  }

  // 4. 检查AWS IP
  const isAWSIP = AUTOMATED_INDICATORS.awsIPPrefixes.some(
    prefix => ip.startsWith(prefix)
  );

  if (isAWSIP) {
    confidence += 30;
    indicators.push('AWS服务器IP');
  }

  // 5. 特殊情况: User-Agent完全等于"node"
  if (userAgent.trim().toLowerCase() === 'node') {
    confidence = 95;
    indicators = ['UA="node"'];
  }

  // 判断类型
  if (confidence >= 50) {
    submissionType = 'automated';
  } else if (confidence <= -10) {
    submissionType = 'browser';
  } else if (hasBrowserSignature && userAgent.length > 50) {
    // 特殊规则: 如果有浏览器签名且UA长度正常，默认为browser
    submissionType = 'browser';
    confidence = 40;
  }

  // 将检测结果添加到request对象
  req.submissionDetection = {
    type: submissionType,
    confidence: Math.max(0, Math.min(100, confidence + 50)), // 转换为0-100
    userAgent: userAgent,
    ip: ip,
    isAWSIP: isAWSIP,
    indicators: indicators,
    detectedAt: new Date()
  };

  // 记录日志（用于调试和追踪）
  console.log(`📊 [Submission Type] ${submissionType.toUpperCase()} (${req.submissionDetection.confidence}%)`, {
    ua: userAgent.substring(0, 50),
    ip: ip,
    indicators: indicators.join('; ')
  });

  // 不阻止请求，继续处理
  next();
}

/**
 * 将检测结果添加到customer对象的metadata
 * 在保存customer之前调用这个函数
 */
function attachSubmissionType(customerData, req) {
  if (!customerData.metadata) {
    customerData.metadata = {};
  }

  if (req.submissionDetection) {
    customerData.metadata.submissionType = req.submissionDetection.type;

    // 可选: 保存更多检测信息到一个单独的字段（用于深度分析）
    customerData.metadata.submissionDetectionDetails = {
      confidence: req.submissionDetection.confidence,
      indicators: req.submissionDetection.indicators,
      detectedAt: req.submissionDetection.detectedAt
    };
  }

  return customerData;
}

module.exports = {
  detectSubmissionType,
  attachSubmissionType
};
