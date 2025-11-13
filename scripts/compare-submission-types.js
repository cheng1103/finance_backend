require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

// 用户提供的真实客户名单（全部36个）
const realCustomerNames = [
  // Batch 1
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
  'NUR FADHLINA BINTI ZAINAL ABIDIN SHAHA',
  // Batch 2
  'ZHARIF FIRDAUS LUKMAN',
  'FARHAN BARIQ BIN MOHD BADRUN',
  'ZUL FAHMI BIN KADIS',
  'EASTER LIMAH',
  'KISHEN KUMAR GANESAN',
  'AIMAN KARAMI BIN AHMAD ZULKIFLI',
  'NUR IRALIAYANA BINTI LAHALI',
  'NOR FIZAH BT MD YUSOF',
  'NURRIEZSYERLYN BINTI ROSELAN',
  // Batch 3
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

async function compareSubmissionTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    🔬 深度分析: Browser提交 vs "node"提交 - 真实顾客对比                                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    // 找出所有真实客户的提交记录
    const realCustomers = [];
    for (const name of realCustomerNames) {
      const customer = await Customer.findOne({
        name: { $regex: `^${name}$`, $options: 'i' }
      }).sort({ createdAt: -1 });

      if (customer) {
        realCustomers.push(customer);
      }
    }

    console.log(`📊 找到 ${realCustomers.length}/${realCustomerNames.length} 个真实客户在数据库中\n`);

    // 分类
    const browserSubmissions = realCustomers.filter(c => {
      const ua = c.metadata?.userAgent || '';
      return ua.length > 30 && !ua.toLowerCase().includes('node');
    });

    const nodeSubmissions = realCustomers.filter(c => {
      const ua = c.metadata?.userAgent || '';
      return ua.toLowerCase() === 'node';
    });

    console.log('═'.repeat(100));
    console.log('📊 提交类型分布:');
    console.log('═'.repeat(100));
    console.log(`✅ 正常浏览器提交:  ${browserSubmissions.length} 个`);
    console.log(`🤖 "node"提交:       ${nodeSubmissions.length} 个`);
    console.log(`❓ 总计:             ${realCustomers.length} 个\n`);

    // 时间分布分析
    console.log('═'.repeat(100));
    console.log('📅 时间分布分析:');
    console.log('═'.repeat(100));

    const browserByMonth = {};
    browserSubmissions.forEach(c => {
      const month = c.createdAt.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit' });
      browserByMonth[month] = (browserByMonth[month] || 0) + 1;
    });

    const nodeByMonth = {};
    nodeSubmissions.forEach(c => {
      const month = c.createdAt.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit' });
      nodeByMonth[month] = (nodeByMonth[month] || 0) + 1;
    });

    console.log('\n正常浏览器提交 - 按月份:');
    Object.entries(browserByMonth).sort().forEach(([month, count]) => {
      console.log(`  ${month}: ${count} 个提交`);
    });

    console.log('\n"node"提交 - 按月份:');
    Object.entries(nodeByMonth).sort().forEach(([month, count]) => {
      console.log(`  ${month}: ${count} 个提交`);
    });

    // IP地址分析
    console.log('\n═'.repeat(100));
    console.log('🌐 IP地址来源分析:');
    console.log('═'.repeat(100));

    const browserIPs = browserSubmissions.map(c => c.metadata?.ipAddress || 'Unknown');
    const nodeIPs = nodeSubmissions.map(c => c.metadata?.ipAddress || 'Unknown');

    const browserAWSCount = browserIPs.filter(ip =>
      ip.startsWith('44.') || ip.startsWith('54.') || ip.startsWith('34.') ||
      ip.startsWith('35.') || ip.startsWith('52.') || ip.startsWith('18.') || ip.startsWith('16.')
    ).length;

    const nodeAWSCount = nodeIPs.filter(ip =>
      ip.startsWith('44.') || ip.startsWith('54.') || ip.startsWith('34.') ||
      ip.startsWith('35.') || ip.startsWith('52.') || ip.startsWith('18.') || ip.startsWith('16.')
    ).length;

    console.log('\n正常浏览器提交:');
    console.log(`  总计: ${browserSubmissions.length} 个`);
    console.log(`  AWS IP: ${browserAWSCount} 个 (${((browserAWSCount/Math.max(browserSubmissions.length,1))*100).toFixed(1)}%)`);
    console.log(`  非AWS IP: ${browserSubmissions.length - browserAWSCount} 个 (${(((browserSubmissions.length - browserAWSCount)/Math.max(browserSubmissions.length,1))*100).toFixed(1)}%)`);

    console.log('\n"node"提交:');
    console.log(`  总计: ${nodeSubmissions.length} 个`);
    console.log(`  AWS IP: ${nodeAWSCount} 个 (${((nodeAWSCount/Math.max(nodeSubmissions.length,1))*100).toFixed(1)}%)`);
    console.log(`  非AWS IP: ${nodeSubmissions.length - nodeAWSCount} 个 (${(((nodeSubmissions.length - nodeAWSCount)/Math.max(nodeSubmissions.length,1))*100).toFixed(1)}%)`);

    // IP地址唯一性分析
    const uniqueNodeIPs = [...new Set(nodeIPs)];
    console.log(`\n"node"提交的唯一IP数量: ${uniqueNodeIPs.length}`);
    console.log('IP分布:');
    const ipCounts = {};
    nodeIPs.forEach(ip => {
      ipCounts[ip] = (ipCounts[ip] || 0) + 1;
    });
    Object.entries(ipCounts).sort((a, b) => b[1] - a[1]).forEach(([ip, count]) => {
      const isAWS = ip.startsWith('44.') || ip.startsWith('54.') || ip.startsWith('34.') ||
                    ip.startsWith('35.') || ip.startsWith('52.') || ip.startsWith('18.') || ip.startsWith('16.');
      console.log(`  ${ip} - ${count} 次提交 ${isAWS ? '(AWS)' : ''}`);
    });

    // 数据质量对比
    console.log('\n═'.repeat(100));
    console.log('📋 数据质量对比:');
    console.log('═'.repeat(100));

    const browserWithLoans = browserSubmissions.filter(c => c.loanApplications && c.loanApplications.length > 0).length;
    const nodeWithLoans = nodeSubmissions.filter(c => c.loanApplications && c.loanApplications.length > 0).length;

    const browserWithEmail = browserSubmissions.filter(c => c.email && c.email.length > 0).length;
    const nodeWithEmail = nodeSubmissions.filter(c => c.email && c.email.length > 0).length;

    console.log('\n正常浏览器提交:');
    console.log(`  有贷款申请: ${browserWithLoans}/${browserSubmissions.length} (${((browserWithLoans/Math.max(browserSubmissions.length,1))*100).toFixed(1)}%)`);
    console.log(`  有Email: ${browserWithEmail}/${browserSubmissions.length} (${((browserWithEmail/Math.max(browserSubmissions.length,1))*100).toFixed(1)}%)`);

    console.log('\n"node"提交:');
    console.log(`  有贷款申请: ${nodeWithLoans}/${nodeSubmissions.length} (${((nodeWithLoans/Math.max(nodeSubmissions.length,1))*100).toFixed(1)}%)`);
    console.log(`  有Email: ${nodeWithEmail}/${nodeSubmissions.length} (${((nodeWithEmail/Math.max(nodeSubmissions.length,1))*100).toFixed(1)}%)`);

    // 时间模式分析 - 一天中的哪个时段
    console.log('\n═'.repeat(100));
    console.log('⏰ 提交时间模式分析:');
    console.log('═'.repeat(100));

    const browserByHour = {};
    browserSubmissions.forEach(c => {
      const hour = c.createdAt.getHours();
      browserByHour[hour] = (browserByHour[hour] || 0) + 1;
    });

    const nodeByHour = {};
    nodeSubmissions.forEach(c => {
      const hour = c.createdAt.getHours();
      nodeByHour[hour] = (nodeByHour[hour] || 0) + 1;
    });

    console.log('\n正常浏览器提交 - 按小时分布:');
    Object.keys(browserByHour).sort((a, b) => parseInt(a) - parseInt(b)).forEach(hour => {
      const count = browserByHour[hour];
      const bar = '█'.repeat(count);
      console.log(`  ${String(hour).padStart(2, '0')}:00 - ${bar} (${count})`);
    });

    console.log('\n"node"提交 - 按小时分布:');
    Object.keys(nodeByHour).sort((a, b) => parseInt(a) - parseInt(b)).forEach(hour => {
      const count = nodeByHour[hour];
      const bar = '█'.repeat(count);
      console.log(`  ${String(hour).padStart(2, '0')}:00 - ${bar} (${count})`);
    });

    // 详细列表
    console.log('\n═'.repeat(100));
    console.log('📋 "node"提交详细列表 (所有都是真实客户):');
    console.log('═'.repeat(100));

    nodeSubmissions.sort((a, b) => a.createdAt - b.createdAt).forEach((customer, index) => {
      const dateStr = customer.createdAt.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
      });
      const timeStr = customer.createdAt.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const ip = customer.metadata?.ipAddress || 'Unknown';
      const isAWS = ip.startsWith('44.') || ip.startsWith('54.') || ip.startsWith('34.') ||
                    ip.startsWith('35.') || ip.startsWith('52.') || ip.startsWith('18.') || ip.startsWith('16.');

      console.log(`\n${index + 1}. ${customer.name}`);
      console.log(`   📅 ${dateStr} ${timeStr}`);
      console.log(`   📞 ${customer.phone}`);
      console.log(`   📧 ${customer.email || 'No email'}`);
      console.log(`   🌐 IP: ${ip} ${isAWS ? '(AWS)' : '(正常)'}`);
      if (customer.loanApplications && customer.loanApplications.length > 0) {
        console.log(`   💵 Loan: RM ${customer.loanApplications[0].amount.toLocaleString()}`);
      }
    });

    // 关键发现
    console.log('\n\n═'.repeat(100));
    console.log('🔍 关键发现:');
    console.log('═'.repeat(100));
    console.log('');
    console.log('1. 时间模式:');
    console.log(`   - 正常浏览器提交主要在: 10月`);
    console.log(`   - "node"提交主要在: 11月`);
    console.log(`   - 这表明11月开始有新的提交来源`);
    console.log('');
    console.log('2. IP来源:');
    if (nodeAWSCount === nodeSubmissions.length) {
      console.log(`   - 所有"node"提交都来自AWS服务器 (${nodeAWSCount}/${nodeSubmissions.length})`);
      console.log(`   - 这强烈表明是自动化系统在提交`);
    } else {
      console.log(`   - ${nodeAWSCount}/${nodeSubmissions.length} 个"node"提交来自AWS`);
      console.log(`   - ${nodeSubmissions.length - nodeAWSCount} 个来自其他IP`);
    }
    console.log('');
    console.log('3. 数据质量:');
    console.log(`   - 浏览器提交有贷款申请: ${((browserWithLoans/Math.max(browserSubmissions.length,1))*100).toFixed(1)}%`);
    console.log(`   - "node"提交有贷款申请: ${((nodeWithLoans/Math.max(nodeSubmissions.length,1))*100).toFixed(1)}%`);
    console.log(`   - 数据完整性${browserWithLoans > nodeWithLoans ? '浏览器' : nodeWithLoans > browserWithLoans ? '"node"' : '两者'}提交更高`);
    console.log('');
    console.log('4. 最重要的发现:');
    console.log(`   ⚠️  用户确认: 全部${realCustomers.length}个客户（包括${nodeSubmissions.length}个"node"提交）都是真实客户`);
    console.log(`   ⚠️  用户确认: 全部都成功关闭交易（closed deals）`);
    console.log(`   ⚠️  用户确认: 没有lead generation合作伙伴`);
    console.log('');
    console.log('═'.repeat(100));
    console.log('💡 可能的解释:');
    console.log('═'.repeat(100));
    console.log('');
    console.log('理论1: Lead Aggregator（贷款聚合平台）');
    console.log('  - 客户在其他贷款比较网站填表');
    console.log('  - 那个平台自动转发到多个贷款公司（包括你）');
    console.log('  - 使用Node.js脚本自动提交');
    console.log(`  - 证据: ${nodeAWSCount}/${nodeSubmissions.length} 来自AWS，11月突然开始`);
    console.log('');
    console.log('理论2: Data Broker（数据经纪人）');
    console.log('  - 有人收集真实客户的贷款需求信息');
    console.log('  - 通过脚本自动提交到你的网站');
    console.log('  - 可能从Facebook群组、论坛等收集');
    console.log(`  - 证据: 全部真实客户，但User-Agent不正常`);
    console.log('');
    console.log('理论3: 第三方App/服务');
    console.log('  - 客户通过某个贷款申请APP填表');
    console.log('  - APP后端用Node.js提交到你的网站');
    console.log('  - 客户不知道数据被提交到你这里');
    console.log(`  - 证据: 客户说"不记得填过表单"`);
    console.log('');
    console.log('═'.repeat(100));
    console.log('🚨 重要结论:');
    console.log('═'.repeat(100));
    console.log('');
    console.log('❌ 不能部署当前的bot protection！');
    console.log('   原因: 会阻止这些"node"提交，而这些都是真实客户');
    console.log('');
    console.log('✅ 需要的策略:');
    console.log('   1. 区分真实Lead和恶意Bot的新方法');
    console.log('   2. 可能需要接受"node" User-Agent作为合法来源');
    console.log('   3. 使用其他指标检测恶意提交（重复提交、假数据等）');
    console.log('');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

compareSubmissionTypes();
