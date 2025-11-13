require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

// 你提供的客户名单
const customerNames = [
  'MUFTI BIN IBRAHIM',
  'KONINE SUMI ANAK ROGER MORRIE',
  'NURSYAFINAS BINTI ABDULLAH',
  'NUR FATIHAH BINTI MOHAMAD MOIDEN',
  'TULASIDEVI A/P THAMILMARAN',
  'NIK ADAM IRFAN BIN MOHD AZRI',
  'SHASIKAALA A/P LETCHIMANAN',
  'SYAHRIL BIN SAMSUDIN',
  'NIK MOHD AIDIL SHAHRIN BIN NIK MUKHTAR',
  'NUR ATIRA BINTI MOHARI',
  'NORFARAHAIN BINTI ZULKAPLI',
  'FATIN FIRZANAH BINTI MOHAMAD PANI',
  'NUR FADHLINA BINTI ZAINAL ABIDIN SHAHA'
];

async function checkSpecificCustomers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           🔍 检查你的客户名单 - ' + customerNames.length + '个客户                                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    const botKeywords = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java', 'go-http', 'axios', 'postman', 'node', 'headless', 'phantom', 'selenium', 'playwright', 'puppeteer'];

    let foundCount = 0;
    let notFoundCount = 0;

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
        console.log(`   💡 这个客户可能：`);
        console.log(`      1. 不是通过网站form提交的（可能通过电话/WhatsApp联系你）`);
        console.log(`      2. 名字拼写不完全一样`);
        console.log(`      3. 提交时间在7天以前`);
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
      console.log(`      • 是否是Bot UA: ${isBot ? '🚨 是 (User-Agent包含bot关键词)' : '✅ 否'}`);
      console.log(`      • IP来源: ${isAWSIP ? '⚠️  AWS云服务器（通常是bot）' : '✅ 不是AWS'}`);

      if (isBot) {
        const detectedTypes = botKeywords.filter(keyword => lowerUA.includes(keyword));
        console.log(`      • 🚨 检测到的Bot类型: ${detectedTypes.join(', ')}`);
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
      if (isBot && isAWSIP) {
        console.log(`   ⚠️  警告: 这个提交的User-Agent是"${ua}"，来自AWS服务器`);
        console.log(`   💡 可能情况:`);
        console.log(`      1. 有人冒用这个真实客户的名字进行bot攻击`);
        console.log(`      2. 这是竞争对手在测试你的系统`);
        console.log(`      3. 客户本人真的用了AWS服务器（极少见）`);
      } else if (isBot) {
        console.log(`   ⚠️  警告: User-Agent显示为bot，但不是AWS IP`);
      } else {
        console.log(`   ✅ 看起来是真实用户提交！`);
      }
    }

    // 总结
    console.log(`\n\n${'═'.repeat(100)}`);
    console.log('📊 检查总结');
    console.log('═'.repeat(100));
    console.log(`总共检查:       ${customerNames.length} 个客户`);
    console.log(`✅ 在数据库中:   ${foundCount} 个`);
    console.log(`❌ 未找到:       ${notFoundCount} 个`);
    console.log(``);

    if (notFoundCount > 0) {
      console.log(`💡 未找到的客户可能：`);
      console.log(`   1. 通过电话或WhatsApp直接联系你（不是通过网站form）`);
      console.log(`   2. 名字拼写不完全匹配`);
      console.log(`   3. 提交时间较早（不在最近的记录里）`);
      console.log(``);
    }

    if (foundCount > 0) {
      console.log(`⚠️  重要发现：`);
      console.log(`   如果找到的客户都显示User-Agent为"node"且来自AWS，`);
      console.log(`   这说明可能有人在冒用真实客户名字进行bot攻击！`);
      console.log(``);
      console.log(`💡 建议：`);
      console.log(`   1. 直接联系这些客户，确认他们是否真的提交了表单`);
      console.log(`   2. 询问他们提交时使用的设备（手机/电脑/浏览器）`);
      console.log(`   3. 如果他们说没有提交，那就确认是bot冒用`);
    }

    console.log(``);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkSpecificCustomers();
