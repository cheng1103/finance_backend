require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

async function verifyAllSubmissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 获取过去7天的所有提交
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const submissions = await Customer.find({
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: -1 });

    console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                        📋 过去7天所有提交 - 详细验证列表                                                ║');
    console.log('║                    Total: ' + submissions.length + ' submissions                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    const botKeywords = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java', 'go-http', 'axios', 'postman', 'node', 'headless', 'phantom', 'selenium', 'playwright', 'puppeteer'];

    submissions.forEach((customer, index) => {
      const ua = customer.metadata?.userAgent || 'Unknown';
      const lowerUA = ua.toLowerCase();
      const isBot = botKeywords.some(keyword => lowerUA.includes(keyword));

      // 格式化时间
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

      // 额外的分析
      const ip = customer.metadata?.ipAddress || 'Unknown';
      const isAWSIP = ip.startsWith('44.') || ip.startsWith('54.') || ip.startsWith('34.') ||
                      ip.startsWith('35.') || ip.startsWith('52.') || ip.startsWith('18.') ||
                      ip.startsWith('16.');
      const uaLength = ua.length;
      const hasValidBrowser = /mozilla.*chrome|mozilla.*firefox|mozilla.*safari|mozilla.*edge/i.test(ua);

      console.log(`┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐`);
      console.log(`│ 提交 #${String(index + 1).padEnd(3)} ${isBot ? '🤖 可能是BOT' : '✅ 可能是真实用户'.padEnd(20)}`);
      console.log(`├─────────────────────────────────────────────────────────────────────────────────────────────────────┤`);
      console.log(`│ 📅 提交日期:    ${dateStr}                                                                          `);
      console.log(`│ ⏰ 提交时间:    ${timeStr}                                                                           `);
      console.log(`│ 👤 姓名:        ${customer.name.padEnd(50)} │`);
      console.log(`│ 📞 电话:        ${customer.phone.padEnd(50)} │`);
      console.log(`│ 📧 Email:       ${customer.email.padEnd(50)} │`);
      console.log(`│                                                                                                     │`);
      console.log(`│ 🌐 IP地址:      ${ip.padEnd(20)} ${isAWSIP ? '⚠️  AWS服务器IP' : '✅ 看起来像真实IP'.padEnd(20)}`);
      console.log(`│ 💻 User-Agent:  ${ua.substring(0, 85)}│`);
      if (ua.length > 85) {
        console.log(`│                 ${ua.substring(85, 170).padEnd(85)}│`);
      }
      console.log(`│                                                                                                     │`);

      // 详细分析
      console.log(`│ 🔍 详细分析:                                                                                         │`);
      console.log(`│    • User-Agent长度: ${uaLength} 字符 ${uaLength < 30 ? '⚠️  太短（可能是bot）' : uaLength > 80 ? '✅ 正常长度' : '⚠️  有点短'}`);
      console.log(`│    • 浏览器签名: ${hasValidBrowser ? '✅ 有效的浏览器' : '❌ 没有浏览器签名（可能是脚本）'}`);
      console.log(`│    • IP来源: ${isAWSIP ? '⚠️  AWS云服务器（通常是bot）' : '✅ 不是云服务器'}`);

      if (isBot) {
        const detectedTypes = botKeywords.filter(keyword => lowerUA.includes(keyword));
        console.log(`│    • 🚨 检测到Bot关键词: ${detectedTypes.join(', ')}`);
      }

      // 显示贷款申请详情
      if (customer.loanApplications && customer.loanApplications.length > 0) {
        console.log(`│                                                                                                     │`);
        console.log(`│ 💵 贷款申请 (${customer.loanApplications.length}个):                                                                      │`);
        customer.loanApplications.forEach((loan, i) => {
          const amount = `RM ${loan.amount.toLocaleString()}`.padEnd(15);
          const purpose = loan.purpose.substring(0, 60);
          console.log(`│    ${i + 1}. ${amount} - ${purpose.padEnd(60)}│`);
        });
      }

      // 可信度评分
      let trustScore = 100;
      if (isBot) trustScore -= 80;
      if (isAWSIP) trustScore -= 50;
      if (uaLength < 30) trustScore -= 40;
      if (!hasValidBrowser) trustScore -= 30;
      trustScore = Math.max(0, trustScore);

      console.log(`│                                                                                                     │`);
      if (trustScore >= 60) {
        console.log(`│ ⭐ 可信度评分: ${trustScore}/100 - ✅ 很可能是真实用户                                                  │`);
      } else if (trustScore >= 30) {
        console.log(`│ ⭐ 可信度评分: ${trustScore}/100 - ⚠️  可疑，需要人工确认                                              │`);
      } else {
        console.log(`│ ⭐ 可信度评分: ${trustScore}/100 - 🚨 几乎确定是bot                                                    │`);
      }

      console.log(`└─────────────────────────────────────────────────────────────────────────────────────────────────────┘`);
      console.log('');
    });

    // 统计总结
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                       📊 统计总结                                                       ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝');

    const botCount = submissions.filter(s => {
      const ua = s.metadata?.userAgent || '';
      return botKeywords.some(keyword => ua.toLowerCase().includes(keyword));
    }).length;

    const awsCount = submissions.filter(s => {
      const ip = s.metadata?.ipAddress || '';
      return ip.startsWith('44.') || ip.startsWith('54.') || ip.startsWith('34.') ||
             ip.startsWith('35.') || ip.startsWith('52.') || ip.startsWith('18.') ||
             ip.startsWith('16.');
    }).length;

    const shortUACount = submissions.filter(s => {
      const ua = s.metadata?.userAgent || '';
      return ua.length < 30;
    }).length;

    const normalCount = submissions.length - botCount;

    console.log('');
    console.log(`总提交数:                  ${submissions.length}`);
    console.log(`✅ 可能是真实用户:          ${normalCount} (${((normalCount/Math.max(submissions.length, 1))*100).toFixed(1)}%)`);
    console.log(`🤖 明确的Bot (UA=node):     ${botCount} (${((botCount/Math.max(submissions.length, 1))*100).toFixed(1)}%)`);
    console.log(`⚠️  来自AWS服务器:          ${awsCount} (${((awsCount/Math.max(submissions.length, 1))*100).toFixed(1)}%)`);
    console.log(`⚠️  User-Agent太短(<30字):  ${shortUACount} (${((shortUACount/Math.max(submissions.length, 1))*100).toFixed(1)}%)`);
    console.log('');

    // 按日期分组
    console.log('📅 按日期分组:');
    console.log('─'.repeat(100));
    const byDate = {};
    submissions.forEach(s => {
      const dateKey = s.createdAt.toLocaleDateString('zh-CN');
      if (!byDate[dateKey]) {
        byDate[dateKey] = { total: 0, bot: 0, normal: 0 };
      }
      byDate[dateKey].total++;

      const ua = s.metadata?.userAgent || '';
      const isBot = botKeywords.some(keyword => ua.toLowerCase().includes(keyword));
      if (isBot) {
        byDate[dateKey].bot++;
      } else {
        byDate[dateKey].normal++;
      }
    });

    Object.entries(byDate)
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .forEach(([date, stats]) => {
        console.log(`${date.padEnd(15)}: 总共 ${String(stats.total).padStart(2)} | 真实 ${String(stats.normal).padStart(2)} | Bot ${String(stats.bot).padStart(2)}`);
      });

    console.log('');
    console.log('═'.repeat(100));
    console.log('💡 建议:');
    console.log('═'.repeat(100));
    console.log('');
    console.log('如果你在上面的列表中看到任何"可信度评分"高于60的提交:');
    console.log('  1. 检查那个客户的电话和email是否真实');
    console.log('  2. 如果是真实客户，记下他们的IP地址');
    console.log('  3. 可以把那些IP加入白名单，确保他们不会被阻止');
    console.log('');
    console.log('如果所有提交的"可信度评分"都是0-20分:');
    console.log('  ✅ 恭喜！这说明我们的bot检测非常准确');
    console.log('  ✅ 部署bot保护后，不会有真实客户被误判');
    console.log('  ✅ 可以放心部署到生产环境');
    console.log('');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

verifyAllSubmissions();
