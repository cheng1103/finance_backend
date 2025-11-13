require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

async function detailedBotAnalysis() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 检查过去1小时
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    console.log('🔍 详细分析过去1小时的所有提交...\n');
    console.log('时间范围:', oneHourAgo.toLocaleString('zh-CN'), '至', new Date().toLocaleString('zh-CN'));
    console.log('=' .repeat(100));

    // 获取所有提交
    const allCustomers = await Customer.find({
      createdAt: { $gte: oneHourAgo }
    }).sort({ createdAt: -1 });

    console.log(`\n📊 过去1小时总提交数: ${allCustomers.length}\n`);

    if (allCustomers.length === 0) {
      console.log('✅ 没有新提交');
      return;
    }

    // 机器人检测关键词
    const botKeywords = [
      'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
      'python', 'java', 'go-http', 'axios', 'postman', 'node',
      'headless', 'phantom', 'selenium', 'playwright', 'puppeteer'
    ];

    // 分析每个提交
    allCustomers.forEach((customer, index) => {
      console.log(`\n${'='.repeat(100)}`);
      console.log(`提交 #${index + 1} - ${customer.name}`);
      console.log('='.repeat(100));

      // 基本信息
      console.log(`📅 提交时间: ${customer.createdAt.toLocaleString('zh-CN')}`);
      console.log(`👤 姓名:     ${customer.name}`);
      console.log(`📧 Email:    ${customer.email}`);
      console.log(`📱 电话:     ${customer.phone}`);
      console.log(`💼 公司:     ${customer.company || '未提供'}`);
      console.log(`💰 月收入:   ${customer.monthlyIncome || '未提供'}`);

      // 检查贷款申请
      if (customer.loanApplications && customer.loanApplications.length > 0) {
        const loan = customer.loanApplications[0];
        console.log(`💵 贷款金额: RM ${loan.amount || '未指定'}`);
        console.log(`📝 目的:     ${loan.purpose || '未指定'}`);
      }

      // 元数据分析
      console.log(`\n🔍 技术信息:`);
      console.log(`IP地址:      ${customer.metadata?.ipAddress || '未记录'}`);

      const userAgent = customer.metadata?.userAgent || 'unknown';
      console.log(`User-Agent:  ${userAgent}`);
      console.log(`来源:        ${customer.metadata?.referrer || '直接访问'}`);

      // BOT检测
      const lowerUA = userAgent.toLowerCase();
      const detectedBotTypes = botKeywords.filter(keyword => lowerUA.includes(keyword));

      if (detectedBotTypes.length > 0) {
        console.log(`\n🚨 ${'='.repeat(80)}`);
        console.log(`⚠️  机器人检测: 是`);
        console.log(`🤖 检测到的Bot类型: ${detectedBotTypes.join(', ')}`);
        console.log(`❌ 这很可能是自动化脚本提交，不是真人！`);
        console.log('='.repeat(80));

        // IP分析
        const ip = customer.metadata?.ipAddress || '';
        if (ip.startsWith('44.') || ip.startsWith('54.') || ip.startsWith('52.')) {
          console.log(`⚠️  AWS IP地址 - 可能是云服务器上的脚本`);
        } else if (ip.startsWith('34.') || ip.startsWith('35.')) {
          console.log(`⚠️  Google Cloud IP - 可能是云服务器上的脚本`);
        } else if (ip.startsWith('20.') || ip.startsWith('40.')) {
          console.log(`⚠️  Azure IP - 可能是云服务器上的脚本`);
        }
      } else {
        console.log(`\n✅ 机器人检测: 否 (看起来像真人)`);
      }

      // 检查提交速度（如果有多个申请）
      if (customer.loanApplications && customer.loanApplications.length > 1) {
        console.log(`\n⚠️  警告: 同一客户有 ${customer.loanApplications.length} 个贷款申请`);

        // 计算时间间隔
        for (let i = 1; i < customer.loanApplications.length; i++) {
          const prevTime = customer.loanApplications[i-1].submittedAt;
          const currTime = customer.loanApplications[i].submittedAt;
          const diffSeconds = Math.abs((prevTime - currTime) / 1000);
          console.log(`   申请 ${i} 和 ${i+1} 间隔: ${diffSeconds.toFixed(1)} 秒`);
          if (diffSeconds < 10) {
            console.log(`   ⚠️  间隔过短 - 可能是机器人`);
          }
        }
      }
    });

    // 统计总结
    console.log(`\n\n${'='.repeat(100)}`);
    console.log('📊 统计总结');
    console.log('='.repeat(100));

    const totalSubmissions = allCustomers.length;
    const suspiciousBots = allCustomers.filter(c => {
      const ua = (c.metadata?.userAgent || '').toLowerCase();
      return botKeywords.some(keyword => ua.includes(keyword));
    }).length;

    const legitSubmissions = totalSubmissions - suspiciousBots;

    console.log(`\n总提交数:        ${totalSubmissions}`);
    console.log(`✅ 正常提交:      ${legitSubmissions} (${((legitSubmissions/totalSubmissions)*100).toFixed(1)}%)`);
    console.log(`🤖 机器人提交:    ${suspiciousBots} (${((suspiciousBots/totalSubmissions)*100).toFixed(1)}%)`);

    // IP统计
    const ipCounts = {};
    allCustomers.forEach(c => {
      const ip = c.metadata?.ipAddress || 'unknown';
      ipCounts[ip] = (ipCounts[ip] || 0) + 1;
    });

    console.log(`\n🌐 IP地址分布:`);
    Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([ip, count]) => {
        if (count > 1) {
          console.log(`   ${ip.padEnd(20)} - ${count} 次 ${count > 2 ? '⚠️  (可疑)' : ''}`);
        }
      });

    // 建议
    console.log(`\n\n${'='.repeat(100)}`);
    console.log('💡 保护建议');
    console.log('='.repeat(100));

    if (suspiciousBots > 0) {
      console.log(`\n⚠️  检测到 ${suspiciousBots} 个机器人提交！\n`);
      console.log('立即采取的措施:');
      console.log('1. ✅ 在表单添加 Google reCAPTCHA v3');
      console.log('2. ✅ 添加Rate Limiting (限制每IP每小时最多3次提交)');
      console.log('3. ✅ 添加Honeypot隐藏字段');
      console.log('4. ✅ 检测User-Agent，拒绝明显的bot');
      console.log('5. ✅ 启用Cloudflare Bot Protection');
      console.log('\n可选措施:');
      console.log('6. 添加手机验证码 (SMS OTP)');
      console.log('7. 阻止已知的bot IP范围');
      console.log('8. 添加JavaScript挑战 (验证浏览器环境)');
    } else {
      console.log('\n✅ 未检测到明显的机器人活动');
      console.log('\n但仍建议添加基础保护:');
      console.log('1. Google reCAPTCHA v3');
      console.log('2. Rate Limiting');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

detailedBotAnalysis();
