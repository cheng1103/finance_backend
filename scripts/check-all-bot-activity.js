require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const WhatsAppTracking = require('../models/WhatsAppTracking');

async function checkAllBotActivity() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 检查过去24小时
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log('🔍 完整Bot活动分析 - 过去24小时\n');
    console.log('时间范围:', twentyFourHoursAgo.toLocaleString('zh-CN'), '至', new Date().toLocaleString('zh-CN'));
    console.log('=' .repeat(100));

    // ========== 1. 检查Form提交 ==========
    console.log('\n\n📝 FORM提交分析');
    console.log('='.repeat(100));

    const formSubmissions = await Customer.find({
      createdAt: { $gte: twentyFourHoursAgo }
    }).sort({ createdAt: -1 });

    console.log(`\n总提交数: ${formSubmissions.length}\n`);

    const botKeywords = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java', 'go-http', 'axios', 'postman', 'node', 'headless', 'phantom', 'selenium', 'playwright', 'puppeteer'];

    let botSubmissions = 0;
    let normalSubmissions = 0;

    formSubmissions.forEach((customer, index) => {
      const ua = customer.metadata?.userAgent || '';
      const lowerUA = ua.toLowerCase();
      const isBot = botKeywords.some(keyword => lowerUA.includes(keyword));

      if (isBot) {
        botSubmissions++;
        console.log(`\n❌ BOT提交 #${index + 1}:`);
      } else {
        normalSubmissions++;
        console.log(`\n✅ 正常提交 #${index + 1}:`);
      }

      console.log(`   姓名:       ${customer.name}`);
      console.log(`   电话:       ${customer.phone}`);
      console.log(`   Email:      ${customer.email}`);
      console.log(`   提交时间:   ${customer.createdAt.toLocaleString('zh-CN')}`);
      console.log(`   IP:         ${customer.metadata?.ipAddress || '未记录'}`);
      console.log(`   User-Agent: ${ua.substring(0, 80)}${ua.length > 80 ? '...' : ''}`);

      if (isBot) {
        const detectedTypes = botKeywords.filter(keyword => lowerUA.includes(keyword));
        console.log(`   🤖 Bot类型:  ${detectedTypes.join(', ')}`);
      }

      // 检查是否有贷款申请
      if (customer.loanApplications && customer.loanApplications.length > 0) {
        console.log(`   💵 贷款申请: ${customer.loanApplications.length} 个`);
        customer.loanApplications.forEach((loan, i) => {
          console.log(`      ${i + 1}. RM ${loan.amount} - ${loan.purpose}`);
        });
      }
    });

    // Form提交统计
    console.log('\n' + '='.repeat(100));
    console.log('📊 Form提交统计:');
    console.log('='.repeat(100));
    console.log(`总提交数:      ${formSubmissions.length}`);
    console.log(`✅ 正常提交:    ${normalSubmissions} (${((normalSubmissions/Math.max(formSubmissions.length, 1))*100).toFixed(1)}%)`);
    console.log(`🤖 Bot提交:     ${botSubmissions} (${((botSubmissions/Math.max(formSubmissions.length, 1))*100).toFixed(1)}%)`);

    // ========== 2. 检查WhatsApp点击 ==========
    console.log('\n\n\n💬 WHATSAPP点击分析');
    console.log('='.repeat(100));

    const whatsappClicks = await WhatsAppTracking.find({
      timestamp: { $gte: twentyFourHoursAgo }
    }).sort({ timestamp: -1 });

    console.log(`\n总点击数: ${whatsappClicks.length}\n`);

    // IP统计
    const ipStats = {};
    let whatsappBotClicks = 0;
    let whatsappNormalClicks = 0;

    whatsappClicks.forEach((click, index) => {
      const ua = click.details?.userAgent || '';
      const lowerUA = ua.toLowerCase();
      const isBot = botKeywords.some(keyword => lowerUA.includes(keyword));
      const ip = click.details?.ipAddress || 'unknown';

      if (isBot) {
        whatsappBotClicks++;
      } else {
        whatsappNormalClicks++;
      }

      // IP统计
      if (!ipStats[ip]) {
        ipStats[ip] = { count: 0, clicks: [] };
      }
      ipStats[ip].count++;
      ipStats[ip].clicks.push({
        time: click.timestamp,
        phone: click.customerPhone,
        isBot,
        ua: ua.substring(0, 60)
      });

      // 显示详情
      if (index < 20) {  // 只显示前20个
        if (isBot) {
          console.log(`❌ BOT点击 #${index + 1}:`);
        } else {
          console.log(`✅ 正常点击 #${index + 1}:`);
        }

        console.log(`   电话:       ${click.customerPhone}`);
        console.log(`   时间:       ${click.timestamp.toLocaleString('zh-CN')}`);
        console.log(`   IP:         ${ip}`);
        console.log(`   来源:       ${click.source || '未知'}`);
        console.log(`   User-Agent: ${ua.substring(0, 80)}${ua.length > 80 ? '...' : ''}`);

        if (isBot) {
          const detectedTypes = botKeywords.filter(keyword => lowerUA.includes(keyword));
          console.log(`   🤖 Bot类型:  ${detectedTypes.join(', ')}`);
        }
        console.log('');
      }
    });

    // 显示可疑IP
    console.log('\n🚨 可疑IP分析 (点击 > 2次):');
    console.log('-'.repeat(100));

    const suspiciousIPs = Object.entries(ipStats)
      .filter(([ip, data]) => data.count > 2)
      .sort((a, b) => b[1].count - a[1].count);

    if (suspiciousIPs.length > 0) {
      suspiciousIPs.forEach(([ip, data]) => {
        console.log(`\n⚠️  IP: ${ip} - ${data.count} 次点击`);

        // 检查点击间隔
        if (data.clicks.length > 1) {
          const intervals = [];
          for (let i = 1; i < data.clicks.length; i++) {
            const diff = Math.abs((data.clicks[i-1].time - data.clicks[i].time) / 1000);
            intervals.push(diff);
          }
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          console.log(`   平均间隔: ${avgInterval.toFixed(1)} 秒`);

          if (avgInterval < 10) {
            console.log(`   ⚠️  警告: 点击间隔过短，可能是机器人！`);
          }
        }

        // 检查是否有bot
        const botClickCount = data.clicks.filter(c => c.isBot).length;
        if (botClickCount > 0) {
          console.log(`   🤖 Bot点击: ${botClickCount}/${data.count}`);
        }

        // 显示详情
        data.clicks.slice(0, 5).forEach((click, i) => {
          console.log(`   ${i + 1}. ${click.time.toLocaleTimeString('zh-CN')} - ${click.phone}`);
        });
      });
    } else {
      console.log('✅ 没有发现可疑IP');
    }

    // WhatsApp统计
    console.log('\n' + '='.repeat(100));
    console.log('📊 WhatsApp点击统计:');
    console.log('='.repeat(100));
    console.log(`总点击数:      ${whatsappClicks.length}`);
    console.log(`✅ 正常点击:    ${whatsappNormalClicks} (${((whatsappNormalClicks/Math.max(whatsappClicks.length, 1))*100).toFixed(1)}%)`);
    console.log(`🤖 Bot点击:     ${whatsappBotClicks} (${((whatsappBotClicks/Math.max(whatsappClicks.length, 1))*100).toFixed(1)}%)`);

    // ========== 3. 总体统计和建议 ==========
    console.log('\n\n\n' + '='.repeat(100));
    console.log('🎯 总体分析和建议');
    console.log('='.repeat(100));

    const totalBotActivity = botSubmissions + whatsappBotClicks;
    const totalNormalActivity = normalSubmissions + whatsappNormalClicks;
    const totalActivity = totalBotActivity + totalNormalActivity;

    console.log(`\n📈 总体统计:`);
    console.log(`   总活动:      ${totalActivity}`);
    console.log(`   ✅ 正常:      ${totalNormalActivity} (${((totalNormalActivity/Math.max(totalActivity, 1))*100).toFixed(1)}%)`);
    console.log(`   🤖 Bot:       ${totalBotActivity} (${((totalBotActivity/Math.max(totalActivity, 1))*100).toFixed(1)}%)`);

    console.log(`\n📝 Form提交:`);
    console.log(`   正常: ${normalSubmissions} | Bot: ${botSubmissions}`);

    console.log(`\n💬 WhatsApp点击:`);
    console.log(`   正常: ${whatsappNormalClicks} | Bot: ${whatsappBotClicks}`);

    if (totalBotActivity > 0) {
      console.log(`\n\n⚠️  ⚠️  ⚠️  检测到BOT活动！ ⚠️  ⚠️  ⚠️\n`);
      console.log('立即采取的措施:');
      console.log('1. ✅ Form已启用Bot Protection');
      console.log('2. ⚠️  WhatsApp按钮需要添加保护！');
      console.log('3. ⚠️  添加Rate Limiting');
      console.log('4. ⚠️  添加CAPTCHA验证');
      console.log('5. ⚠️  启用Cloudflare Bot Protection');
    } else {
      console.log('\n✅ 过去24小时未检测到明显的bot活动');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllBotActivity();
