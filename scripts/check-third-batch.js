require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

// 第三批客户名单
const customerNames = [
  'MOHD HAFIZ BIN MOHD YUSOF',
  'TANG SU JUAN',
  'JACQUELLINE CORLENE JULIAN',
  'SYAFIQ ALIMIN BIN RUSLAN',
  'NURUL HAZIQAH BINTI MOHAMAD HUSAINI',
  'SUA REN YONG',
  'KONG YAU KIET',
  'DANIA SAFIYYA BINTI SYAHRULNIZAM',
  'GOH TZE XIAN',
  'SITI JAMILAH BINTI SAIUN',
  'LUQMAN HAKIM BIN MAHMOOD ZUHDI',
  'YUVAASSRI A/P SARAVANA KIMAR',
  'MUHAMMAD SAIFULLAH BIN BAHARUDIN',
  'FAIRUZ NABILAH BINTI ARIF SHAH'
];

async function checkThirdBatch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           🔍 检查第三批客户名单 - ' + customerNames.length + '个客户                                       ║');
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
      console.log(`   🌐 IP:          ${ip} ${isAWSIP ? '⚠️  AWS' : '✅ 正常'}`);
      console.log(`   💻 User-Agent:  ${ua}`);
      console.log(``);
      console.log(`   🔍 分析:`);
      console.log(`      • UA长度: ${ua.length} 字符`);
      console.log(`      • Bot UA: ${isBot ? '🚨 是' : '✅ 否'}`);

      if (isBot) {
        const detectedTypes = botKeywords.filter(keyword => lowerUA.includes(keyword));
        console.log(`      • Bot类型: ${detectedTypes.join(', ')}`);
        suspiciousBotCount++;
      } else {
        realUserCount++;
      }

      // 贷款申请
      if (customer.loanApplications && customer.loanApplications.length > 0) {
        console.log(`   💵 贷款: ${customer.loanApplications.length}个`);
        customer.loanApplications.forEach((loan, idx) => {
          console.log(`      ${idx + 1}. RM ${loan.amount.toLocaleString()} - ${loan.purpose}`);
        });
      }

      // 判断
      console.log(``);
      if (isBot && ua === 'node') {
        console.log(`   🚨 User-Agent="node" - Bot脚本攻击！`);
      } else if (isBot) {
        console.log(`   ⚠️  包含bot关键词`);
      } else {
        console.log(`   ✅ 真实用户 - 正常浏览器`);
      }
    }

    // 总结
    console.log(`\n\n${'═'.repeat(100)}`);
    console.log('📊 第三批总结');
    console.log('═'.repeat(100));
    console.log(`总共检查:       ${customerNames.length} 个`);
    console.log(`✅ 找到:         ${foundCount} 个`);
    console.log(`   - 真实用户:   ${realUserCount} 个 (正常浏览器)`);
    console.log(`   - Bot冒用:    ${suspiciousBotCount} 个 (User-Agent="node")`);
    console.log(`❌ 未找到:       ${notFoundCount} 个`);
    console.log(``);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkThirdBatch();
