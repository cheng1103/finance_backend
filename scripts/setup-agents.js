require('dotenv').config();
const mongoose = require('mongoose');
const WhatsAppAgent = require('../models/WhatsAppAgent');

/**
 * 初始化WhatsApp Agents
 * 设置你的销售团队
 */

const agents = [
  {
    name: 'Agent 1 (你的名字)',
    whatsappNumber: '+60123456789',  // 改成你的WhatsApp号码
    email: 'agent1@example.com',
    status: 'active',
    specialties: {
      loanAmountRange: {
        min: 0,
        max: 100000  // RM 100K以下都接
      },
      loanTypes: ['personal', 'business', 'debt-consolidation', 'home-improvement', 'auto', 'education', 'medical', 'other'],
      serviceStates: ['Johor', 'Selangor', 'Kuala Lumpur', 'Penang'],  // 你服务的州属
      languages: ['Malay', 'English', 'Chinese']
    },
    workload: {
      currentLeads: 0,
      maxLeads: 20,  // 最多同时处理20个leads
      todayAssigned: 0,
      monthAssigned: 0,
      totalAssigned: 0
    },
    performance: {
      conversionRate: 0,
      avgResponseTime: 0,
      closedDeals: 0,
      totalLoanAmount: 0
    },
    priority: 10,  // 最高优先级（1-10）
    notes: '主要负责人'
  },

  // 如果你有第二个agent，取消注释这个
  /*
  {
    name: 'Agent 2',
    whatsappNumber: '+60198765432',
    email: 'agent2@example.com',
    status: 'active',
    specialties: {
      loanAmountRange: {
        min: 0,
        max: 50000  // 专门处理小额贷款
      },
      loanTypes: ['personal', 'debt-consolidation'],
      serviceStates: ['Johor', 'Melaka'],
      languages: ['Malay', 'English']
    },
    workload: {
      currentLeads: 0,
      maxLeads: 15,
      todayAssigned: 0,
      monthAssigned: 0,
      totalAssigned: 0
    },
    performance: {
      conversionRate: 0,
      avgResponseTime: 0,
      closedDeals: 0,
      totalLoanAmount: 0
    },
    priority: 8,
    notes: '专门负责小额贷款'
  },
  */
];

async function setupAgents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║          🤖 设置WhatsApp Agents                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');

    // 清除现有agents（可选）
    const existingCount = await WhatsAppAgent.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  发现 ${existingCount} 个现有agents`);
      console.log('   是否删除现有agents? (手动修改脚本)');
      console.log('');
      // await WhatsAppAgent.deleteMany({}); // 取消注释以删除现有agents
    }

    // 添加新agents
    console.log(`📝 添加 ${agents.length} 个agents...\n`);

    for (const agentData of agents) {
      // 检查是否已存在
      const existing = await WhatsAppAgent.findOne({
        whatsappNumber: agentData.whatsappNumber
      });

      if (existing) {
        console.log(`⏭️  跳过: ${agentData.name} (已存在)`);
        continue;
      }

      const agent = new WhatsAppAgent(agentData);
      await agent.save();

      console.log(`✅ 添加: ${agent.name}`);
      console.log(`   WhatsApp: ${agent.whatsappNumber}`);
      console.log(`   最大leads: ${agent.workload.maxLeads}`);
      console.log(`   优先级: ${agent.priority}/10`);
      console.log('');
    }

    // 显示所有agents
    console.log('═'.repeat(100));
    console.log('📊 所有Agents:');
    console.log('═'.repeat(100));
    console.log('');

    const allAgents = await WhatsAppAgent.find();

    allAgents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.name}`);
      console.log(`   状态: ${agent.status === 'active' ? '🟢 活跃' : '🔴 不活跃'}`);
      console.log(`   WhatsApp: ${agent.whatsappNumber}`);
      console.log(`   当前工作量: ${agent.workload.currentLeads}/${agent.workload.maxLeads}`);
      console.log(`   转化率: ${agent.performance.conversionRate.toFixed(1)}%`);
      console.log(`   优先级: ${agent.priority}/10`);
      console.log('');
    });

    console.log('✅ 设置完成！');
    console.log('');
    console.log('💡 下一步:');
    console.log('   1. 修改agents数组添加你的team成员');
    console.log('   2. 重新运行这个脚本');
    console.log('   3. 测试提交表单，AI会自动分配！');
    console.log('');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

setupAgents();
