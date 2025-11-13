require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

async function checkSubmissionsByTime() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 获取过去7天的所有提交
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const submissions = await Customer.find({
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: -1 });

    console.log('📋 所有Form提交 - 按时间排序（最新的在前）');
    console.log('='.repeat(120));
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

      console.log(`${isBot ? '🤖 BOT' : '✅ 正常'} #${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📅 提交日期:   ${dateStr}`);
      console.log(`⏰ 提交时间:   ${timeStr}`);
      console.log(`👤 姓名:       ${customer.name}`);
      console.log(`📞 电话:       ${customer.phone}`);
      console.log(`📧 Email:      ${customer.email}`);
      console.log(`🌐 IP地址:     ${customer.metadata?.ipAddress || '未记录'}`);
      console.log(`💻 User-Agent: ${ua}`);

      if (isBot) {
        const detectedTypes = botKeywords.filter(keyword => lowerUA.includes(keyword));
        console.log(`⚠️  Bot类型:    ${detectedTypes.join(', ')}`);
      }

      // 显示贷款申请详情
      if (customer.loanApplications && customer.loanApplications.length > 0) {
        console.log(`💵 贷款申请:`);
        customer.loanApplications.forEach((loan, i) => {
          console.log(`   ${i + 1}. RM ${loan.amount.toLocaleString()} - ${loan.purpose}`);
        });
      }

      console.log('');
    });

    console.log('='.repeat(120));
    console.log('📊 统计总结');
    console.log('='.repeat(120));

    const botCount = submissions.filter(s => {
      const ua = s.metadata?.userAgent || '';
      return botKeywords.some(keyword => ua.toLowerCase().includes(keyword));
    }).length;

    const normalCount = submissions.length - botCount;

    console.log(`总提交数:      ${submissions.length}`);
    console.log(`✅ 正常提交:    ${normalCount} (${((normalCount/Math.max(submissions.length, 1))*100).toFixed(1)}%)`);
    console.log(`🤖 Bot提交:     ${botCount} (${((botCount/Math.max(submissions.length, 1))*100).toFixed(1)}%)`);
    console.log('');

    // 按日期分组统计
    console.log('📅 按日期分组:');
    console.log('─'.repeat(120));
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
        console.log(`${date}:  总共 ${stats.total} | 正常 ${stats.normal} | Bot ${stats.bot}`);
      });

    console.log('');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkSubmissionsByTime();
