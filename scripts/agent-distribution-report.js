require('dotenv').config();
const mongoose = require('mongoose');
const leadDistributionAI = require('../services/leadDistributionAI');
const WhatsAppAgent = require('../models/WhatsAppAgent');
const Customer = require('../models/Customer');

/**
 * Agent分配报告
 * 查看每个agent的工作量和绩效
 */

async function generateReport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                             📊 WhatsApp Agent分配报告                                                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    // 获取所有agents
    const agents = await WhatsAppAgent.find().sort({ priority: -1 });

    if (agents.length === 0) {
      console.log('⚠️  没有找到agents！');
      console.log('   请先运行: node scripts/setup-agents.js');
      console.log('');
      return;
    }

    // 总体统计
    console.log('═'.repeat(100));
    console.log('📈 总体统计');
    console.log('═'.repeat(100));
    console.log('');

    const totalAgents = agents.length;
    const activeAgents = agents.filter(a => a.status === 'active').length;
    const totalCurrentLeads = agents.reduce((sum, a) => sum + a.workload.currentLeads, 0);
    const totalCapacity = agents.reduce((sum, a) => sum + a.workload.maxLeads, 0);
    const totalTodayAssigned = agents.reduce((sum, a) => sum + a.workload.todayAssigned, 0);
    const totalMonthAssigned = agents.reduce((sum, a) => sum + a.workload.monthAssigned, 0);

    console.log(`总Agents数:           ${totalAgents}`);
    console.log(`活跃Agents:           ${activeAgents}`);
    console.log(`当前处理中leads:      ${totalCurrentLeads}`);
    console.log(`总容量:               ${totalCapacity}`);
    console.log(`利用率:               ${((totalCurrentLeads/Math.max(totalCapacity,1))*100).toFixed(1)}%`);
    console.log(`今天已分配:           ${totalTodayAssigned}`);
    console.log(`本月已分配:           ${totalMonthAssigned}`);
    console.log('');

    // 每个agent详情
    console.log('═'.repeat(100));
    console.log('👥 Agent详情');
    console.log('═'.repeat(100));
    console.log('');

    agents.forEach((agent, index) => {
      const loadPercentage = (agent.workload.currentLeads / Math.max(agent.workload.maxLeads, 1)) * 100;
      let statusEmoji = '🟢';
      if (loadPercentage >= 100) statusEmoji = '🔴';
      else if (loadPercentage >= 80) statusEmoji = '🟡';

      console.log(`${index + 1}. ${agent.name} ${statusEmoji}`);
      console.log(`   状态:         ${agent.status === 'active' ? '✅ 活跃' : '❌ 不活跃'}`);
      console.log(`   WhatsApp:     ${agent.whatsappNumber}`);
      console.log(`   工作量:       ${agent.workload.currentLeads}/${agent.workload.maxLeads} (${loadPercentage.toFixed(1)}%)`);
      console.log(`   今天分配:     ${agent.workload.todayAssigned}`);
      console.log(`   本月分配:     ${agent.workload.monthAssigned}`);
      console.log(`   总分配:       ${agent.workload.totalAssigned}`);
      console.log(`   转化率:       ${agent.performance.conversionRate.toFixed(1)}%`);
      console.log(`   成交数:       ${agent.performance.closedDeals}`);
      console.log(`   优先级:       ${agent.priority}/10`);

      // 专长
      if (agent.specialties.loanAmountRange) {
        console.log(`   金额范围:     RM ${agent.specialties.loanAmountRange.min.toLocaleString()} - RM ${agent.specialties.loanAmountRange.max.toLocaleString()}`);
      }

      if (agent.specialties.serviceStates && agent.specialties.serviceStates.length > 0) {
        console.log(`   服务地区:     ${agent.specialties.serviceStates.join(', ')}`);
      }

      console.log('');
    });

    // 最近的分配记录
    console.log('═'.repeat(100));
    console.log('🕐 最近10个分配记录');
    console.log('═'.repeat(100));
    console.log('');

    const recentCustomers = await Customer.find({
      'assignedAgent.agentId': { $exists: true }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('assignedAgent.agentId');

    if (recentCustomers.length === 0) {
      console.log('   还没有分配记录');
    } else {
      recentCustomers.forEach((customer, index) => {
        const dateStr = customer.createdAt.toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        console.log(`${index + 1}. ${dateStr} | ${customer.name.padEnd(30)} → ${customer.assignedAgent?.agentName || 'Unknown'}`);
      });
    }

    console.log('');

    // 工作量平衡分析
    console.log('═'.repeat(100));
    console.log('⚖️  工作量平衡分析');
    console.log('═'.repeat(100));
    console.log('');

    const activeAgentsList = agents.filter(a => a.status === 'active');
    if (activeAgentsList.length > 0) {
      const avgLeads = totalCurrentLeads / activeAgentsList.length;
      const maxLeads = Math.max(...activeAgentsList.map(a => a.workload.currentLeads));
      const minLeads = Math.min(...activeAgentsList.map(a => a.workload.currentLeads));
      const variance = maxLeads - minLeads;

      console.log(`平均每人:     ${avgLeads.toFixed(1)} leads`);
      console.log(`最多:         ${maxLeads} leads`);
      console.log(`最少:         ${minLeads} leads`);
      console.log(`差异:         ${variance} leads`);
      console.log('');

      if (variance <= 3) {
        console.log('✅ 工作量分配非常均衡！');
      } else if (variance <= 5) {
        console.log('🟡 工作量分配基本均衡');
      } else {
        console.log('⚠️  工作量分配不均衡，建议调整');
      }
    }

    console.log('');

    // AI分配建议
    console.log('═'.repeat(100));
    console.log('💡 AI分配建议');
    console.log('═'.repeat(100));
    console.log('');

    const fullAgents = activeAgentsList.filter(a => a.workload.currentLeads >= a.workload.maxLeads);
    const availableAgents = activeAgentsList.filter(a => a.workload.currentLeads < a.workload.maxLeads);

    if (fullAgents.length > 0) {
      console.log(`⚠️  ${fullAgents.length} 个agents已满载:`);
      fullAgents.forEach(a => {
        console.log(`   - ${a.name}: ${a.workload.currentLeads}/${a.workload.maxLeads}`);
      });
      console.log('');
      console.log('建议:');
      console.log('   1. 增加maxLeads限制');
      console.log('   2. 或添加更多agents');
      console.log('');
    }

    if (availableAgents.length > 0) {
      console.log(`✅ ${availableAgents.length} 个agents可接新leads:`);
      availableAgents.forEach(a => {
        const remaining = a.workload.maxLeads - a.workload.currentLeads;
        console.log(`   - ${a.name}: 还可接 ${remaining} 个leads`);
      });
    } else {
      console.log('🚨 所有agents都满载！无法接新leads');
      console.log('   请立即添加更多agents或增加容量');
    }

    console.log('');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

generateReport();
