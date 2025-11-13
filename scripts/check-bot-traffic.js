require('dotenv').config();
const mongoose = require('mongoose');
const VisitorTracking = require('../models/VisitorTracking');
const Customer = require('../models/Customer');

async function analyzeBotTraffic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 获取最近10分钟的访问
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    console.log('🔍 分析最近10分钟的流量...\n');
    console.log('时间范围:', tenMinutesAgo.toLocaleString(), '至', new Date().toLocaleString());
    console.log('=' .repeat(80));

    // 1. 获取最近10分钟的访客
    const recentVisitors = await VisitorTracking.find({
      timestamp: { $gte: tenMinutesAgo }
    }).sort({ timestamp: -1 });

    console.log(`\n📊 最近10分钟访问数量: ${recentVisitors.length}`);

    // 2. 分析IP地址
    const ipStats = {};
    const userAgentStats = {};
    const referrerStats = {};
    const pageStats = {};

    recentVisitors.forEach(visitor => {
      // IP统计
      const ip = visitor.ipAddress || 'unknown';
      ipStats[ip] = (ipStats[ip] || 0) + 1;

      // User-Agent统计
      const ua = visitor.userAgent || 'unknown';
      userAgentStats[ua] = (userAgentStats[ua] || 0) + 1;

      // Referrer统计
      const ref = visitor.referrer || 'direct';
      referrerStats[ref] = (referrerStats[ref] || 0) + 1;

      // 页面统计
      const page = visitor.page || 'unknown';
      pageStats[page] = (pageStats[page] || 0) + 1;
    });

    // 3. 检测可疑IP（同一IP多次访问）
    console.log('\n🚨 可疑IP地址 (访问次数 > 3):');
    console.log('-'.repeat(80));
    const suspiciousIPs = Object.entries(ipStats)
      .filter(([ip, count]) => count > 3)
      .sort((a, b) => b[1] - a[1]);

    if (suspiciousIPs.length === 0) {
      console.log('✅ 没有发现可疑IP');
    } else {
      suspiciousIPs.forEach(([ip, count]) => {
        console.log(`⚠️  IP: ${ip.padEnd(45)} 访问次数: ${count}`);

        // 显示这个IP的详细访问记录
        const ipVisits = recentVisitors.filter(v => v.ipAddress === ip);
        ipVisits.forEach(visit => {
          console.log(`    └─ ${visit.timestamp.toLocaleTimeString()} - ${visit.page} - ${visit.deviceType}`);
        });
      });
    }

    // 4. 检测机器人User-Agent
    console.log('\n🤖 User-Agent分析:');
    console.log('-'.repeat(80));

    const botKeywords = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java', 'go-http-client', 'axios', 'postman'];

    Object.entries(userAgentStats).forEach(([ua, count]) => {
      const lowerUA = ua.toLowerCase();
      const isBot = botKeywords.some(keyword => lowerUA.includes(keyword));

      if (isBot) {
        console.log(`🤖 [BOT] ${ua.substring(0, 60)}... (${count} 次)`);
      } else if (count > 3) {
        console.log(`⚠️  [可疑] ${ua.substring(0, 60)}... (${count} 次)`);
      }
    });

    // 5. 检查最近10分钟的客户提交
    const recentCustomers = await Customer.find({
      createdAt: { $gte: tenMinutesAgo }
    }).sort({ createdAt: -1 });

    console.log('\n📝 最近10分钟的表单提交:');
    console.log('-'.repeat(80));
    console.log(`总提交数: ${recentCustomers.length}`);

    if (recentCustomers.length > 0) {
      recentCustomers.forEach((customer, index) => {
        console.log(`\n${index + 1}. ${customer.name} (${customer.phone})`);
        console.log(`   Email: ${customer.email}`);
        console.log(`   时间: ${customer.createdAt.toLocaleString()}`);
        console.log(`   IP: ${customer.metadata?.ipAddress || 'unknown'}`);
        console.log(`   User-Agent: ${(customer.metadata?.userAgent || 'unknown').substring(0, 60)}...`);

        // 检查是否是bot
        const ua = customer.metadata?.userAgent || '';
        const isBot = botKeywords.some(keyword => ua.toLowerCase().includes(keyword));
        if (isBot) {
          console.log(`   ⚠️  可能是机器人!`);
        }
      });
    }

    // 6. 分析访问模式
    console.log('\n📈 访问模式分析:');
    console.log('-'.repeat(80));

    // 检查是否有规律的时间间隔（机器人特征）
    if (recentVisitors.length > 2) {
      const timeIntervals = [];
      for (let i = 1; i < recentVisitors.length; i++) {
        const diff = recentVisitors[i-1].timestamp - recentVisitors[i].timestamp;
        timeIntervals.push(Math.abs(diff / 1000)); // 转换为秒
      }

      const avgInterval = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length;
      const variance = timeIntervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / timeIntervals.length;
      const stdDev = Math.sqrt(variance);

      console.log(`平均访问间隔: ${avgInterval.toFixed(2)} 秒`);
      console.log(`标准差: ${stdDev.toFixed(2)} 秒`);

      if (stdDev < 2 && recentVisitors.length > 5) {
        console.log('⚠️  警告: 访问时间间隔非常规律，可能是机器人!');
      } else if (avgInterval < 5 && recentVisitors.length > 10) {
        console.log('⚠️  警告: 访问频率异常高 (平均间隔 < 5秒)!');
      } else {
        console.log('✅ 访问模式看起来正常');
      }
    }

    // 7. Referrer分析
    console.log('\n🔗 流量来源 (Referrer):');
    console.log('-'.repeat(80));
    Object.entries(referrerStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([ref, count]) => {
        console.log(`${ref.padEnd(50)} ${count} 次`);
      });

    // 8. 页面访问统计
    console.log('\n📄 页面访问统计:');
    console.log('-'.repeat(80));
    Object.entries(pageStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([page, count]) => {
        console.log(`${page.padEnd(50)} ${count} 次`);
      });

    // 9. 总结和建议
    console.log('\n' + '='.repeat(80));
    console.log('🎯 检测总结和建议:');
    console.log('='.repeat(80));

    const suspiciousCount = suspiciousIPs.length;
    const highFrequency = recentVisitors.length > 20;
    const multipleSubmissions = recentCustomers.length > 3;

    if (suspiciousCount > 0 || highFrequency || multipleSubmissions) {
      console.log('\n⚠️  检测到可疑活动!');
      console.log('\n建议采取的措施:');
      console.log('1. 启用 Google reCAPTCHA v3 (表单提交)');
      console.log('2. 添加 Rate Limiting (限制同一IP的请求频率)');
      console.log('3. 启用 Cloudflare Bot Management');
      console.log('4. 添加蜜罐字段 (Honeypot fields)');
      console.log('5. 检查并阻止可疑IP地址');
    } else {
      console.log('\n✅ 流量模式看起来正常');
      console.log('\n但建议仍然添加基础保护:');
      console.log('1. Google reCAPTCHA (防止自动提交)');
      console.log('2. Rate Limiting (防止暴力攻击)');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

analyzeBotTraffic();
