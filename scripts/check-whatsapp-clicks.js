require('dotenv').config();
const mongoose = require('mongoose');
const WhatsAppTracking = require('../models/WhatsAppTracking');

async function checkWhatsAppClicks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 检查最近1小时的WhatsApp点击
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    console.log('🔍 分析最近1小时的WhatsApp点击...\n');
    console.log('时间范围:', oneHourAgo.toLocaleString('zh-CN'), '至', new Date().toLocaleString('zh-CN'));
    console.log('=' .repeat(100));

    // 获取所有WhatsApp tracking记录
    const clicks = await WhatsAppTracking.find({
      timestamp: { $gte: oneHourAgo }
    }).sort({ timestamp: -1 });

    console.log(`\n📊 最近1小时WhatsApp点击数: ${clicks.length}\n`);

    if (clicks.length === 0) {
      console.log('✅ 没有WhatsApp点击记录');
      return;
    }

    // 统计
    const ipStats = {};
    const phoneStats = {};
    const sourceStats = {};
    const userAgentStats = {};

    clicks.forEach(click => {
      // IP统计
      const ip = click.details?.ipAddress || 'unknown';
      ipStats[ip] = (ipStats[ip] || []).concat({
        time: click.timestamp,
        phone: click.customerPhone,
        ua: click.details?.userAgent || 'unknown'
      });

      // 电话号码统计
      const phone = click.customerPhone || 'unknown';
      phoneStats[phone] = (phoneStats[phone] || 0) + 1;

      // 来源统计
      const source = click.source || 'unknown';
      sourceStats[source] = (sourceStats[source] || 0) + 1;

      // User-Agent统计
      const ua = click.details?.userAgent || 'unknown';
      userAgentStats[ua] = (userAgentStats[ua] || 0) + 1;
    });

    // 1. 检测可疑IP（同一IP多次点击）
    console.log('\n🚨 可疑IP地址分析 (点击次数 > 2):');
    console.log('-'.repeat(100));

    const suspiciousIPs = Object.entries(ipStats)
      .filter(([ip, clicks]) => clicks.length > 2)
      .sort((a, b) => b[1].length - a[1].length);

    if (suspiciousIPs.length === 0) {
      console.log('✅ 没有发现可疑IP');
    } else {
      suspiciousIPs.forEach(([ip, clickList]) => {
        console.log(`\n⚠️  IP: ${ip}`);
        console.log(`   点击次数: ${clickList.length}`);
        console.log(`   详细记录:`);

        clickList.forEach((click, index) => {
          console.log(`   ${index + 1}. ${click.time.toLocaleTimeString('zh-CN')} - 电话: ${click.phone}`);
        });

        // 计算点击时间间隔
        if (clickList.length > 1) {
          const intervals = [];
          for (let i = 1; i < clickList.length; i++) {
            const diff = Math.abs((clickList[i-1].time - clickList[i].time) / 1000);
            intervals.push(diff);
          }
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          console.log(`   平均点击间隔: ${avgInterval.toFixed(1)} 秒`);

          if (avgInterval < 5) {
            console.log(`   ⚠️  警告: 点击间隔过短，可能是机器人！`);
          }
        }

        // 检查User-Agent
        const ua = clickList[0].ua.toLowerCase();
        const botKeywords = ['bot', 'crawler', 'spider', 'curl', 'python', 'node', 'axios'];
        const isBot = botKeywords.some(keyword => ua.includes(keyword));
        if (isBot) {
          console.log(`   🤖 User-Agent显示为机器人: ${clickList[0].ua.substring(0, 60)}...`);
        }
      });
    }

    // 2. 电话号码统计
    console.log('\n📱 点击的电话号码统计:');
    console.log('-'.repeat(100));
    Object.entries(phoneStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([phone, count]) => {
        console.log(`${phone.padEnd(20)} - ${count} 次点击`);
      });

    // 3. 来源统计
    console.log('\n🔗 点击来源统计:');
    console.log('-'.repeat(100));
    Object.entries(sourceStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        console.log(`${source.padEnd(30)} - ${count} 次`);
      });

    // 4. User-Agent分析
    console.log('\n🤖 User-Agent分析:');
    console.log('-'.repeat(100));

    const botKeywords = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java', 'node', 'axios'];

    Object.entries(userAgentStats).forEach(([ua, count]) => {
      const lowerUA = ua.toLowerCase();
      const isBot = botKeywords.some(keyword => lowerUA.includes(keyword));

      if (isBot) {
        console.log(`🤖 [BOT] ${ua.substring(0, 80)}... (${count} 次)`);
      } else if (count > 3) {
        console.log(`⚠️  [可疑] ${ua.substring(0, 80)}... (${count} 次)`);
      }
    });

    // 5. 时间模式分析
    console.log('\n⏰ 时间模式分析:');
    console.log('-'.repeat(100));

    if (clicks.length > 1) {
      const intervals = [];
      for (let i = 1; i < clicks.length; i++) {
        const diff = Math.abs((clicks[i-1].timestamp - clicks[i].timestamp) / 1000);
        intervals.push(diff);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      console.log(`总点击数: ${clicks.length}`);
      console.log(`平均点击间隔: ${avgInterval.toFixed(2)} 秒`);
      console.log(`标准差: ${stdDev.toFixed(2)} 秒`);

      if (stdDev < 3 && clicks.length > 5) {
        console.log('⚠️  警告: 点击时间间隔非常规律，可能是机器人自动化脚本！');
      } else if (avgInterval < 10 && clicks.length > 10) {
        console.log('⚠️  警告: 点击频率异常高（平均间隔 < 10秒），可能是攻击！');
      } else {
        console.log('✅ 点击模式看起来正常');
      }
    }

    // 6. 总结和建议
    console.log('\n' + '='.repeat(100));
    console.log('🎯 检测总结和建议:');
    console.log('='.repeat(100));

    const highFrequency = clicks.length > 20;
    const hasSuspiciousIPs = suspiciousIPs.length > 0;
    const hasBotUAs = Object.keys(userAgentStats).some(ua =>
      botKeywords.some(keyword => ua.toLowerCase().includes(keyword))
    );

    if (highFrequency || hasSuspiciousIPs || hasBotUAs) {
      console.log('\n⚠️  检测到可疑的WhatsApp点击活动！\n');
      console.log('建议采取的措施:');
      console.log('1. ✅ 在WhatsApp按钮添加Rate Limiting (每IP每小时最多3次点击)');
      console.log('2. ✅ 添加CAPTCHA验证 (点击WhatsApp前需验证)');
      console.log('3. ✅ 阻止明显的bot User-Agent');
      console.log('4. ✅ 添加JavaScript验证 (确保是真实浏览器)');
      console.log('5. ⚠️  考虑使用Cloudflare Turnstile (免费的CAPTCHA替代)');
    } else {
      console.log('\n✅ WhatsApp点击模式看起来正常');
      console.log('\n但仍建议添加基础保护:');
      console.log('1. Rate Limiting (防止滥用)');
      console.log('2. Bot User-Agent检测');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkWhatsAppClicks();
