require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

// 从命令行获取搜索关键词
const searchTerm = process.argv[2];

if (!searchTerm) {
  console.log('');
  console.log('使用方法:');
  console.log('  node scripts/search-customer.js "姓名或电话"');
  console.log('');
  console.log('例如:');
  console.log('  node scripts/search-customer.js "Ahmad"');
  console.log('  node scripts/search-customer.js "+60123456789"');
  console.log('  node scripts/search-customer.js "0123456789"');
  console.log('');
  process.exit(1);
}

async function searchCustomer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 搜索匹配的客户
    const customers = await Customer.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm.replace(/[^0-9+]/g, ''), $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    console.log(`🔍 搜索结果: "${searchTerm}"`);
    console.log('='.repeat(100));
    console.log(`找到 ${customers.length} 个匹配的客户\n`);

    if (customers.length === 0) {
      console.log('❌ 没有找到匹配的客户');
      console.log('');
      console.log('💡 建议:');
      console.log('  - 检查拼写是否正确');
      console.log('  - 尝试只输入名字的一部分');
      console.log('  - 如果是电话号码，确保格式正确');
      console.log('');
      return;
    }

    const botKeywords = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java', 'go-http', 'axios', 'postman', 'node', 'headless', 'phantom', 'selenium', 'playwright', 'puppeteer'];

    customers.forEach((customer, index) => {
      const ua = customer.metadata?.userAgent || 'Unknown';
      const lowerUA = ua.toLowerCase();
      const isBot = botKeywords.some(keyword => lowerUA.includes(keyword));

      const submitTime = customer.createdAt;
      const dateStr = submitTime.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
      });
      const timeStr = submitTime.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const ip = customer.metadata?.ipAddress || 'Unknown';
      const isAWSIP = ip.startsWith('44.') || ip.startsWith('54.') || ip.startsWith('34.') ||
                      ip.startsWith('35.') || ip.startsWith('52.') || ip.startsWith('18.') ||
                      ip.startsWith('16.');
      const uaLength = ua.length;
      const hasValidBrowser = /mozilla.*chrome|mozilla.*firefox|mozilla.*safari|mozilla.*edge/i.test(ua);

      console.log(`┌${'─'.repeat(98)}┐`);
      console.log(`│ ${isBot ? '🤖 检测为BOT' : '✅ 可能是真实用户'} - 客户 #${index + 1}`.padEnd(100) + '│');
      console.log(`├${'─'.repeat(98)}┤`);
      console.log(`│ 📅 提交时间:    ${dateStr} ${timeStr}`.padEnd(100) + '│');
      console.log(`│ 👤 姓名:        ${customer.name}`.padEnd(100) + '│');
      console.log(`│ 📞 电话:        ${customer.phone}`.padEnd(100) + '│');
      console.log(`│ 📧 Email:       ${customer.email}`.padEnd(100) + '│');
      console.log(`│`.padEnd(100) + '│');
      console.log(`│ 🌐 IP地址:      ${ip} ${isAWSIP ? '⚠️  AWS服务器' : '✅ 正常IP'}`.padEnd(100) + '│');
      console.log(`│ 💻 User-Agent:  ${ua.substring(0, 70)}`.padEnd(100) + '│');
      if (ua.length > 70) {
        console.log(`│                 ${ua.substring(70, 140)}`.padEnd(100) + '│');
      }
      console.log(`│`.padEnd(100) + '│');

      // 详细分析
      console.log(`│ 🔍 详细分析:`.padEnd(100) + '│');
      console.log(`│    • User-Agent长度: ${uaLength} 字符 ${uaLength < 30 ? '⚠️  太短（可能是bot）' : uaLength > 80 ? '✅ 正常' : '⚠️  偏短'}`.padEnd(100) + '│');
      console.log(`│    • 浏览器签名: ${hasValidBrowser ? '✅ 有效' : '❌ 无效（可能是脚本）'}`.padEnd(100) + '│');
      console.log(`│    • IP来源: ${isAWSIP ? '⚠️  AWS云服务器' : '✅ 不是云服务器'}`.padEnd(100) + '│');

      if (isBot) {
        const detectedTypes = botKeywords.filter(keyword => lowerUA.includes(keyword));
        console.log(`│    • 🚨 Bot关键词: ${detectedTypes.join(', ')}`.padEnd(100) + '│');
      }

      // 贷款申请
      if (customer.loanApplications && customer.loanApplications.length > 0) {
        console.log(`│`.padEnd(100) + '│');
        console.log(`│ 💵 贷款申请 (${customer.loanApplications.length}个):`.padEnd(100) + '│');
        customer.loanApplications.forEach((loan, i) => {
          const amount = `RM ${loan.amount.toLocaleString()}`.padEnd(15);
          const purpose = loan.purpose.substring(0, 50);
          console.log(`│    ${i + 1}. ${amount} - ${purpose}`.padEnd(100) + '│');
        });
      }

      // 可信度评分
      let trustScore = 100;
      if (isBot) trustScore -= 80;
      if (isAWSIP) trustScore -= 50;
      if (uaLength < 30) trustScore -= 40;
      if (!hasValidBrowser) trustScore -= 30;
      trustScore = Math.max(0, trustScore);

      console.log(`│`.padEnd(100) + '│');
      if (trustScore >= 60) {
        console.log(`│ ⭐ 可信度评分: ${trustScore}/100 - ✅ 很可能是真实用户`.padEnd(100) + '│');
      } else if (trustScore >= 30) {
        console.log(`│ ⭐ 可信度评分: ${trustScore}/100 - ⚠️  可疑，需要确认`.padEnd(100) + '│');
      } else {
        console.log(`│ ⭐ 可信度评分: ${trustScore}/100 - 🚨 几乎确定是bot`.padEnd(100) + '│');
      }

      console.log(`└${'─'.repeat(98)}┘`);
      console.log('');
    });

    // 总结
    console.log('='.repeat(100));
    console.log('💡 判断建议:');
    console.log('='.repeat(100));
    console.log('');
    console.log('如果这是真实顾客:');
    console.log('  ✅ 可信度评分 > 60: 肯定是真实用户，我们的保护不会阻止');
    console.log('  ⚠️  可信度评分 30-60: 可疑，但如果你确认是真实的，我们可以加入白名单');
    console.log('  🚨 可信度评分 < 30: 几乎确定是bot');
    console.log('');
    console.log('如果可信度评分很低但你确认是真实客户:');
    console.log('  1. 记下他们的IP地址');
    console.log('  2. 告诉我，我可以把这个IP加入白名单');
    console.log('  3. 或者，这个顾客可能通过其他渠道（电话/WhatsApp）联系你的');
    console.log('');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

searchCustomer();
