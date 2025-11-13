require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

/**
 * 追踪和比较不同提交类型的质量
 *
 * 目的：
 * 1. 比较browser vs automated提交的数量
 * 2. 比较转化质量（approved率、数据完整性等）
 * 3. 帮助决定是否应该阻止automated提交
 */

async function trackSubmissionTypes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 获取指定时间范围的数据
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                        📊 提交类型追踪分析报告 (Submission Type Tracking)                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    // 1. 总体统计
    console.log('═'.repeat(100));
    console.log('1️⃣  总体统计 (所有时间)');
    console.log('═'.repeat(100));
    console.log('');

    const allCustomers = await Customer.find();

    const browserCount = allCustomers.filter(c => c.metadata?.submissionType === 'browser').length;
    const automatedCount = allCustomers.filter(c => c.metadata?.submissionType === 'automated').length;
    const unknownCount = allCustomers.filter(c => !c.metadata?.submissionType || c.metadata?.submissionType === 'unknown').length;

    console.log(`总客户数:          ${allCustomers.length}`);
    console.log(`  🌐 Browser:      ${browserCount} (${((browserCount/Math.max(allCustomers.length,1))*100).toFixed(1)}%)`);
    console.log(`  🤖 Automated:    ${automatedCount} (${((automatedCount/Math.max(allCustomers.length,1))*100).toFixed(1)}%)`);
    console.log(`  ❓ Unknown:      ${unknownCount} (${((unknownCount/Math.max(allCustomers.length,1))*100).toFixed(1)}%)`);
    console.log('');

    // 2. 最近7天统计
    console.log('═'.repeat(100));
    console.log('2️⃣  最近7天统计');
    console.log('═'.repeat(100));
    console.log('');

    const recentCustomers = await Customer.find({
      createdAt: { $gte: sevenDaysAgo }
    });

    const recentBrowser = recentCustomers.filter(c => c.metadata?.submissionType === 'browser').length;
    const recentAutomated = recentCustomers.filter(c => c.metadata?.submissionType === 'automated').length;
    const recentUnknown = recentCustomers.filter(c => !c.metadata?.submissionType || c.metadata?.submissionType === 'unknown').length;

    console.log(`最近7天新客户:     ${recentCustomers.length}`);
    console.log(`  🌐 Browser:      ${recentBrowser} (${((recentBrowser/Math.max(recentCustomers.length,1))*100).toFixed(1)}%)`);
    console.log(`  🤖 Automated:    ${recentAutomated} (${((recentAutomated/Math.max(recentCustomers.length,1))*100).toFixed(1)}%)`);
    console.log(`  ❓ Unknown:      ${recentUnknown} (${((recentUnknown/Math.max(recentCustomers.length,1))*100).toFixed(1)}%)`);
    console.log('');

    // 3. 数据质量比较
    console.log('═'.repeat(100));
    console.log('3️⃣  数据质量对比');
    console.log('═'.repeat(100));
    console.log('');

    const browserCustomers = allCustomers.filter(c => c.metadata?.submissionType === 'browser');
    const automatedCustomers = allCustomers.filter(c => c.metadata?.submissionType === 'automated');

    // Email完整性
    const browserWithEmail = browserCustomers.filter(c => c.email && c.email.length > 0).length;
    const automatedWithEmail = automatedCustomers.filter(c => c.email && c.email.length > 0).length;

    // 贷款申请数量
    let browserLoans = 0;
    let automatedLoans = 0;

    browserCustomers.forEach(c => {
      browserLoans += (c.loanApplications?.length || 0) + (c.quickApplications?.length || 0) + (c.detailedInquiries?.length || 0);
    });

    automatedCustomers.forEach(c => {
      automatedLoans += (c.loanApplications?.length || 0) + (c.quickApplications?.length || 0) + (c.detailedInquiries?.length || 0);
    });

    // 平均贷款金额
    let browserTotalAmount = 0;
    let browserLoanCount = 0;
    let automatedTotalAmount = 0;
    let automatedLoanCount = 0;

    browserCustomers.forEach(c => {
      c.loanApplications?.forEach(l => { browserTotalAmount += l.amount || 0; browserLoanCount++; });
      c.quickApplications?.forEach(l => { browserTotalAmount += l.amount || 0; browserLoanCount++; });
      c.detailedInquiries?.forEach(l => { browserTotalAmount += l.amount || 0; browserLoanCount++; });
    });

    automatedCustomers.forEach(c => {
      c.loanApplications?.forEach(l => { automatedTotalAmount += l.amount || 0; automatedLoanCount++; });
      c.quickApplications?.forEach(l => { automatedTotalAmount += l.amount || 0; automatedLoanCount++; });
      c.detailedInquiries?.forEach(l => { automatedTotalAmount += l.amount || 0; automatedLoanCount++; });
    });

    const browserAvgAmount = browserLoanCount > 0 ? browserTotalAmount / browserLoanCount : 0;
    const automatedAvgAmount = automatedLoanCount > 0 ? automatedTotalAmount / automatedLoanCount : 0;

    console.log('🌐 BROWSER提交:');
    console.log(`   客户数:              ${browserCustomers.length}`);
    console.log(`   Email完整性:         ${browserWithEmail}/${browserCustomers.length} (${((browserWithEmail/Math.max(browserCustomers.length,1))*100).toFixed(1)}%)`);
    console.log(`   贷款申请数:          ${browserLoans}`);
    console.log(`   平均申请/客户:       ${(browserLoans/Math.max(browserCustomers.length,1)).toFixed(2)}`);
    console.log(`   平均贷款金额:        RM ${browserAvgAmount.toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    console.log('');

    console.log('🤖 AUTOMATED提交:');
    console.log(`   客户数:              ${automatedCustomers.length}`);
    console.log(`   Email完整性:         ${automatedWithEmail}/${automatedCustomers.length} (${((automatedWithEmail/Math.max(automatedCustomers.length,1))*100).toFixed(1)}%)`);
    console.log(`   贷款申请数:          ${automatedLoans}`);
    console.log(`   平均申请/客户:       ${(automatedLoans/Math.max(automatedCustomers.length,1)).toFixed(2)}`);
    console.log(`   平均贷款金额:        RM ${automatedAvgAmount.toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    console.log('');

    // 4. 转化率分析（如果有status数据）
    console.log('═'.repeat(100));
    console.log('4️⃣  转化率分析 (Conversion Rates)');
    console.log('═'.repeat(100));
    console.log('');

    const browserStatusCounts = { pending: 0, approved: 0, rejected: 0, cancelled: 0, total: 0 };
    const automatedStatusCounts = { pending: 0, approved: 0, rejected: 0, cancelled: 0, total: 0 };

    browserCustomers.forEach(c => {
      [...(c.loanApplications || []), ...(c.quickApplications || []), ...(c.detailedInquiries || [])].forEach(app => {
        browserStatusCounts[app.status] = (browserStatusCounts[app.status] || 0) + 1;
        browserStatusCounts.total++;
      });
    });

    automatedCustomers.forEach(c => {
      [...(c.loanApplications || []), ...(c.quickApplications || []), ...(c.detailedInquiries || [])].forEach(app => {
        automatedStatusCounts[app.status] = (automatedStatusCounts[app.status] || 0) + 1;
        automatedStatusCounts.total++;
      });
    });

    console.log('🌐 BROWSER提交状态:');
    console.log(`   ⏳ Pending:         ${browserStatusCounts.pending} (${((browserStatusCounts.pending/Math.max(browserStatusCounts.total,1))*100).toFixed(1)}%)`);
    console.log(`   ✅ Approved:        ${browserStatusCounts.approved} (${((browserStatusCounts.approved/Math.max(browserStatusCounts.total,1))*100).toFixed(1)}%)`);
    console.log(`   ❌ Rejected:        ${browserStatusCounts.rejected} (${((browserStatusCounts.rejected/Math.max(browserStatusCounts.total,1))*100).toFixed(1)}%)`);
    console.log(`   🚫 Cancelled:       ${browserStatusCounts.cancelled} (${((browserStatusCounts.cancelled/Math.max(browserStatusCounts.total,1))*100).toFixed(1)}%)`);
    console.log('');

    console.log('🤖 AUTOMATED提交状态:');
    console.log(`   ⏳ Pending:         ${automatedStatusCounts.pending} (${((automatedStatusCounts.pending/Math.max(automatedStatusCounts.total,1))*100).toFixed(1)}%)`);
    console.log(`   ✅ Approved:        ${automatedStatusCounts.approved} (${((automatedStatusCounts.approved/Math.max(automatedStatusCounts.total,1))*100).toFixed(1)}%)`);
    console.log(`   ❌ Rejected:        ${automatedStatusCounts.rejected} (${((automatedStatusCounts.rejected/Math.max(automatedStatusCounts.total,1))*100).toFixed(1)}%)`);
    console.log(`   🚫 Cancelled:       ${automatedStatusCounts.cancelled} (${((automatedStatusCounts.cancelled/Math.max(automatedStatusCounts.total,1))*100).toFixed(1)}%)`);
    console.log('');

    // 5. 按日期趋势
    console.log('═'.repeat(100));
    console.log('5️⃣  最近30天每日趋势');
    console.log('═'.repeat(100));
    console.log('');

    const thirtyDaysCustomers = await Customer.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: 1 });

    const dailyStats = {};

    thirtyDaysCustomers.forEach(c => {
      const dateKey = c.createdAt.toLocaleDateString('zh-CN');
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { browser: 0, automated: 0, unknown: 0, total: 0 };
      }

      const type = c.metadata?.submissionType || 'unknown';
      dailyStats[dateKey][type]++;
      dailyStats[dateKey].total++;
    });

    console.log('日期'.padEnd(15) + 'Total'.padStart(6) + 'Browser'.padStart(10) + 'Automated'.padStart(12) + 'Unknown'.padStart(10));
    console.log('-'.repeat(100));

    Object.keys(dailyStats).sort().forEach(date => {
      const stats = dailyStats[date];
      console.log(
        date.padEnd(15) +
        String(stats.total).padStart(6) +
        String(stats.browser).padStart(10) +
        String(stats.automated).padStart(12) +
        String(stats.unknown).padStart(10)
      );
    });

    console.log('');

    // 6. 建议
    console.log('═'.repeat(100));
    console.log('💡 分析和建议');
    console.log('═'.repeat(100));
    console.log('');

    const automatedApprovalRate = automatedStatusCounts.total > 0 ?
      (automatedStatusCounts.approved / automatedStatusCounts.total) * 100 : 0;
    const browserApprovalRate = browserStatusCounts.total > 0 ?
      (browserStatusCounts.approved / browserStatusCounts.total) * 100 : 0;

    console.log('📊 关键指标:');
    console.log(`   Browser批准率:       ${browserApprovalRate.toFixed(1)}%`);
    console.log(`   Automated批准率:     ${automatedApprovalRate.toFixed(1)}%`);
    console.log(`   平均金额差异:        ${automatedAvgAmount > browserAvgAmount ? '+' : ''}RM ${(automatedAvgAmount - browserAvgAmount).toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    console.log('');

    console.log('💭 建议:');
    if (automatedCount === 0 && unknownCount === browserCount) {
      console.log('   ⚠️  所有提交都是"unknown"类型');
      console.log('   ✅ 这是正常的 - 因为middleware刚刚部署');
      console.log('   ✅ 从现在开始，新的提交会被正确分类');
      console.log('   ➡️  建议: 等待7-14天收集数据后再次运行这个脚本');
    } else if (automatedCount > 0) {
      if (automatedApprovalRate >= browserApprovalRate * 0.8) {
        console.log('   ✅ Automated提交的质量接近或超过Browser提交');
        console.log('   ✅ Automated提交带来真实客户和业务');
        console.log('   ➡️  建议: 继续接受automated提交，不要阻止');
      } else if (automatedApprovalRate >= browserApprovalRate * 0.5) {
        console.log('   ⚠️  Automated提交的质量略低于Browser提交');
        console.log('   ⚠️  但仍然有一定价值');
        console.log('   ➡️  建议: 继续观察，考虑添加额外验证步骤');
      } else {
        console.log('   🚨 Automated提交的质量明显低于Browser提交');
        console.log('   🚨 可能包含大量无效leads');
        console.log('   ➡️  建议: 考虑阻止automated提交或添加更严格的验证');
      }
    }

    if (automatedCount > 0 && automatedAvgAmount > browserAvgAmount * 1.2) {
      console.log('   💰 Automated提交的平均金额较高');
      console.log('   ➡️  这可能表明高价值客户通过聚合平台来的');
    }

    console.log('');
    console.log('═'.repeat(100));
    console.log('📝 下一步');
    console.log('═'.repeat(100));
    console.log('');
    console.log('1. 定期运行这个脚本（每周一次）追踪趋势');
    console.log('2. 记录每次运行的结果对比变化');
    console.log('3. 如果automated提交质量持续良好，保持现状');
    console.log('4. 如果automated提交质量下降，考虑添加额外保护');
    console.log('5. 使用 `node scripts/submission-monthly-report.js` 生成更详细的月度报告');
    console.log('');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

trackSubmissionTypes();
