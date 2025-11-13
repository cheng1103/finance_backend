require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

// 第二批客户名单
const customerNames = [
  'ZHARIF FIRDAUS LUKMAN',
  'FARHAN BARIQ BIN MOHD BADRUN',
  'ZUL FAHMI BIN KADIS',
  'EASTER LIMAH',
  'KISHEN KUMAR GANESAN',
  'AIMAN KARAMI BIN AHMAD ZULKIFLI',
  'NUR IRALIAYANA BINTI LAHALI',
  'NOR FIZAH BT MD YUSOF',
  'NURRIEZSYERLYN BINTI ROSELAN'
];

async function checkMoreCustomers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           🔍 检查第二批客户名单 - ' + customerNames.length + '个客户                                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    const botKeywords = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java', 'go-http', 'axios', 'postman', 'node', 'headless', 'phantom', 'selenium', 'playwright', 'puppeteer'];

    let foundCount = 0;
    let notFoundCount = 0;
    let realUserCount = 0;
    let suspiciousBotCount = 0;

    for (let i = 0; i < customerNames.length; i++) {
      const name = customerNames[i];

      console.log(`\n${'='.repeat(100)}`);
      console.log(`检查客户 ${i + 1}/${customerNames.length}: ${name}`);
      console.log('='.repeat(100));

      // 精确搜索名字（不区分大小写）
      const customer = await Customer.findOne({
        name: { $regex: `^${name}$`, $options: 'i' }
      }).sort({ createdAt: -1 });

      if (!customer) {
        console.log(`❌ 未找到: "${name}"`);
        console.log(`   💡 可能通过电话/WhatsApp联系你，或名字拼写不同`);
        notFoundCount++;
        continue;
      }

      foundCount++;

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

      console.log(`\n✅ 找到了！`);
      console.log(`   📅 提交时间:    ${dateStr} ${timeStr}`);
      console.log(`   👤 姓名:        ${customer.name}`);
      console.log(`   📞 电话:        ${customer.phone}`);
      console.log(`   📧 Email:       ${customer.email}`);
      console.log(`   🌐 IP地址:      ${ip} ${isAWSIP ? '⚠️  AWS服务器' : '✅ 正常IP'}`);
      console.log(`   💻 User-Agent:  ${ua}`);
      console.log(``);
      console.log(`   🔍 分析:`);
      console.log(`      • UA长度: ${ua.length} 字符`);
      console.log(`      • 是否是Bot UA: ${isBot ? '🚨 是 (包含bot关键词)' : '✅ 否'}`);
      console.log(`      • IP来源: ${isAWSIP ? '⚠️  AWS云服务器' : '✅ 不是AWS'}`);

      if (isBot) {
        const detectedTypes = botKeywords.filter(keyword => lowerUA.includes(keyword));
        console.log(`      • 🚨 检测到的Bot类型: ${detectedTypes.join(', ')}`);
        suspiciousBotCount++;
      } else {
        realUserCount++;
      }

      // 贷款申请
      if (customer.loanApplications && customer.loanApplications.length > 0) {
        console.log(`   💵 贷款申请 (${customer.loanApplications.length}个):`);
        customer.loanApplications.forEach((loan, idx) => {
          console.log(`      ${idx + 1}. RM ${loan.amount.toLocaleString()} - ${loan.purpose}`);
        });
      }

      // 判断
      console.log(``);
      if (isBot && ua === 'node') {
        console.log(`   🚨 警告: User-Agent是"node"（只有4个字符）- 这是bot脚本！`);
        console.log(`   💡 判断: 可能有人冒用这个客户名字进行bot攻击`);
      } else if (isBot) {
        console.log(`   ⚠️  警告: User-Agent包含bot关键词，但不是"node"`);
      } else {
        console.log(`   ✅ 这是真实用户！User-Agent是正常的${ua.includes('Chrome') ? 'Chrome' : ua.includes('Safari') ? 'Safari' : ua.includes('Firefox') ? 'Firefox' : '浏览器'}`);
      }
    }

    // 总结
    console.log(`\n\n${'═'.repeat(100)}`);
    console.log('📊 检查总结');
    console.log('═'.repeat(100));
    console.log(`总共检查:           ${customerNames.length} 个客户`);
    console.log(`✅ 在数据库中:       ${foundCount} 个`);
    console.log(`   - 真实用户:       ${realUserCount} 个 (User-Agent是正常浏览器)`);
    console.log(`   - 可疑bot:        ${suspiciousBotCount} 个 (User-Agent是"node"或包含bot关键词)`);
    console.log(`❌ 未找到:           ${notFoundCount} 个`);
    console.log(``);

    if (realUserCount > 0) {
      console.log(`✅ 好消息：`);
      console.log(`   ${realUserCount} 个客户的User-Agent是正常浏览器！`);
      console.log(`   我们的bot保护不会阻止他们！`);
      console.log(``);
    }

    if (suspiciousBotCount > 0) {
      console.log(`⚠️  发现${suspiciousBotCount}个可疑提交：`);
      console.log(`   这些提交的User-Agent是"node"或包含bot关键词`);
      console.log(`   建议：直接联系这些客户确认是否真的提交了表单`);
      console.log(`   如果他们说没有提交，那就是有人冒用他们的名字`);
      console.log(``);
    }

    console.log(``);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkMoreCustomers();
