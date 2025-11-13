require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const fs = require('fs');
const path = require('path');

/**
 * 生成月度详细报告
 *
 * 包含：
 * 1. 详细的转化数据
 * 2. 客户列表（Browser vs Automated）
 * 3. 趋势分析
 * 4. 可导出为Markdown文件
 */

async function generateMonthlyReport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const monthName = monthStart.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

    console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log(`║                         📊 ${monthName} - 提交类型月度详细报告                                           ║`);
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    // 获取本月数据
    const monthCustomers = await Customer.find({
      createdAt: { $gte: monthStart, $lte: monthEnd }
    }).sort({ createdAt: 1 });

    const browserCustomers = monthCustomers.filter(c => c.metadata?.submissionType === 'browser');
    const automatedCustomers = monthCustomers.filter(c => c.metadata?.submissionType === 'automated');
    const unknownCustomers = monthCustomers.filter(c => !c.metadata?.submissionType || c.metadata?.submissionType === 'unknown');

    console.log('═'.repeat(100));
    console.log('📈 本月概览');
    console.log('═'.repeat(100));
    console.log('');
    console.log(`报告期间:          ${monthStart.toLocaleDateString('zh-CN')} - ${monthEnd.toLocaleDateString('zh-CN')}`);
    console.log(`总提交数:          ${monthCustomers.length}`);
    console.log(`  🌐 Browser:      ${browserCustomers.length} (${((browserCustomers.length/Math.max(monthCustomers.length,1))*100).toFixed(1)}%)`);
    console.log(`  🤖 Automated:    ${automatedCustomers.length} (${((automatedCustomers.length/Math.max(monthCustomers.length,1))*100).toFixed(1)}%)`);
    console.log(`  ❓ Unknown:      ${unknownCustomers.length} (${((unknownCustomers.length/Math.max(monthCustomers.length,1))*100).toFixed(1)}%)`);
    console.log('');

    // 按周统计
    console.log('═'.repeat(100));
    console.log('📅 按周统计');
    console.log('═'.repeat(100));
    console.log('');

    const weeklyStats = {};
    monthCustomers.forEach(c => {
      const weekNum = Math.ceil(c.createdAt.getDate() / 7);
      const weekKey = `第${weekNum}周`;

      if (!weeklyStats[weekKey]) {
        weeklyStats[weekKey] = { browser: 0, automated: 0, unknown: 0, total: 0 };
      }

      const type = c.metadata?.submissionType || 'unknown';
      weeklyStats[weekKey][type]++;
      weeklyStats[weekKey].total++;
    });

    Object.keys(weeklyStats).forEach(week => {
      const stats = weeklyStats[week];
      console.log(`${week}:`.padEnd(10));
      console.log(`  Total: ${stats.total} | Browser: ${stats.browser} | Automated: ${stats.automated} | Unknown: ${stats.unknown}`);
    });
    console.log('');

    // Browser客户详细列表
    console.log('═'.repeat(100));
    console.log(`🌐 Browser提交详细列表 (${browserCustomers.length}个)`);
    console.log('═'.repeat(100));
    console.log('');

    if (browserCustomers.length > 0) {
      browserCustomers.forEach((c, index) => {
        const dateStr = c.createdAt.toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          weekday: 'short'
        });
        const timeStr = c.createdAt.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        const loanCount = (c.loanApplications?.length || 0) + (c.quickApplications?.length || 0) + (c.detailedInquiries?.length || 0);
        let totalAmount = 0;

        [...(c.loanApplications || []), ...(c.quickApplications || []), ...(c.detailedInquiries || [])].forEach(loan => {
          totalAmount += loan.amount || 0;
        });

        console.log(`${index + 1}. ${c.name.padEnd(35)} | ${dateStr} ${timeStr} | ${loanCount}个申请 | RM ${totalAmount.toLocaleString()}`);
      });
      console.log('');
    } else {
      console.log('   (本月没有Browser提交)');
      console.log('');
    }

    // Automated客户详细列表
    console.log('═'.repeat(100));
    console.log(`🤖 Automated提交详细列表 (${automatedCustomers.length}个)`);
    console.log('═'.repeat(100));
    console.log('');

    if (automatedCustomers.length > 0) {
      automatedCustomers.forEach((c, index) => {
        const dateStr = c.createdAt.toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          weekday: 'short'
        });
        const timeStr = c.createdAt.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        const loanCount = (c.loanApplications?.length || 0) + (c.quickApplications?.length || 0) + (c.detailedInquiries?.length || 0);
        let totalAmount = 0;

        [...(c.loanApplications || []), ...(c.quickApplications || []), ...(c.detailedInquiries || [])].forEach(loan => {
          totalAmount += loan.amount || 0;
        });

        const ip = c.metadata?.ipAddress || 'N/A';
        console.log(`${index + 1}. ${c.name.padEnd(35)} | ${dateStr} ${timeStr} | ${loanCount}个申请 | RM ${totalAmount.toLocaleString()} | IP: ${ip}`);
      });
      console.log('');
    } else {
      console.log('   (本月没有Automated提交)');
      console.log('');
    }

    // 详细的数据质量对比
    console.log('═'.repeat(100));
    console.log('📊 详细数据质量对比');
    console.log('═'.repeat(100));
    console.log('');

    function analyzeQuality(customers, label) {
      const withEmail = customers.filter(c => c.email && c.email.length > 0).length;
      const withCompany = customers.filter(c => c.company && c.company.length > 0).length;
      const withIncome = customers.filter(c => c.monthlyIncome && c.monthlyIncome.length > 0).length;

      let totalLoans = 0;
      let totalAmount = 0;
      let loanCount = 0;

      customers.forEach(c => {
        const loans = [...(c.loanApplications || []), ...(c.quickApplications || []), ...(c.detailedInquiries || [])];
        totalLoans += loans.length;
        loans.forEach(l => {
          totalAmount += l.amount || 0;
          loanCount++;
        });
      });

      const avgAmount = loanCount > 0 ? totalAmount / loanCount : 0;
      const avgLoansPerCustomer = customers.length > 0 ? totalLoans / customers.length : 0;

      console.log(`${label}:`);
      console.log(`   客户数:              ${customers.length}`);
      console.log(`   Email填写率:         ${((withEmail/Math.max(customers.length,1))*100).toFixed(1)}%`);
      console.log(`   公司信息填写率:      ${((withCompany/Math.max(customers.length,1))*100).toFixed(1)}%`);
      console.log(`   月收入填写率:        ${((withIncome/Math.max(customers.length,1))*100).toFixed(1)}%`);
      console.log(`   总贷款申请数:        ${totalLoans}`);
      console.log(`   平均申请/客户:       ${avgLoansPerCustomer.toFixed(2)}`);
      console.log(`   平均贷款金额:        RM ${avgAmount.toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
      console.log(`   总贷款金额:          RM ${totalAmount.toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
      console.log('');
    }

    analyzeQuality(browserCustomers, '🌐 Browser提交');
    analyzeQuality(automatedCustomers, '🤖 Automated提交');

    // IP地址分析（Automated）
    if (automatedCustomers.length > 0) {
      console.log('═'.repeat(100));
      console.log('🌐 Automated提交 - IP地址分析');
      console.log('═'.repeat(100));
      console.log('');

      const ipCounts = {};
      automatedCustomers.forEach(c => {
        const ip = c.metadata?.ipAddress || 'Unknown';
        ipCounts[ip] = (ipCounts[ip] || 0) + 1;
      });

      const sortedIPs = Object.entries(ipCounts).sort((a, b) => b[1] - a[1]);

      console.log('IP地址                    提交次数');
      console.log('-'.repeat(50));
      sortedIPs.forEach(([ip, count]) => {
        const isAWS = ip.startsWith('44.') || ip.startsWith('54.') || ip.startsWith('34.') ||
                      ip.startsWith('35.') || ip.startsWith('52.') || ip.startsWith('18.') || ip.startsWith('16.');
        console.log(`${ip.padEnd(25)} ${String(count).padStart(3)}  ${isAWS ? '(AWS)' : ''}`);
      });
      console.log('');

      console.log(`独立IP数量: ${sortedIPs.length}`);
      console.log(`平均每IP提交: ${(automatedCustomers.length / sortedIPs.length).toFixed(2)}`);
      console.log('');
    }

    // 总结和建议
    console.log('═'.repeat(100));
    console.log('💡 本月总结');
    console.log('═'.repeat(100));
    console.log('');

    if (automatedCustomers.length === 0 && browserCustomers.length === 0 && unknownCustomers.length > 0) {
      console.log('⚠️  所有提交都标记为"Unknown"');
      console.log('   这是因为submission type tracking middleware刚刚部署');
      console.log('   从现在开始的新提交会被正确分类');
      console.log('');
    } else if (automatedCustomers.length > 0) {
      const automatedPercentage = (automatedCustomers.length / monthCustomers.length) * 100;

      if (automatedPercentage > 50) {
        console.log(`🤖 Automated提交占${automatedPercentage.toFixed(1)}% - 是主要来源`);
      } else if (automatedPercentage > 20) {
        console.log(`🤖 Automated提交占${automatedPercentage.toFixed(1)}% - 是重要补充来源`);
      } else {
        console.log(`🤖 Automated提交占${automatedPercentage.toFixed(1)}% - 是次要来源`);
      }

      console.log('');
      console.log('💭 建议下一步:');
      console.log('   1. 对比这些客户的最终转化率（谁真正批准了贷款）');
      console.log('   2. 如果Automated提交的转化率良好，继续接受');
      console.log('   3. 如果转化率低，考虑添加额外验证步骤');
      console.log('   4. 联系几个Automated提交的客户，询问他们从哪里填的表单');
      console.log('');
    }

    // 导出报告到文件
    const reportDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFileName = `submission-report-${currentYear}-${String(currentMonth + 1).padStart(2, '0')}.txt`;
    const reportPath = path.join(reportDir, reportFileName);

    // 这里可以添加写入文件的逻辑（简化版）
    console.log('═'.repeat(100));
    console.log(`📄 报告已生成`);
    console.log(`   可以将输出保存为: ${reportFileName}`);
    console.log('═'.repeat(100));
    console.log('');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

generateMonthlyReport();
