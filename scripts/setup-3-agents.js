require('dotenv').config();
const mongoose = require('mongoose');
const WhatsAppAgent = require('../models/WhatsAppAgent');

/**
 * 设置3个WhatsApp Agents - 轮流分配
 * 一天10个leads，平均每人3-4个
 */

const agents = [
  // ========== Agent 1 - 你自己 ==========
  {
    name: 'Agent 1',  // 改成你的名字
    whatsappNumber: '+60123456789',  // 改成你的WhatsApp号码
    email: 'agent1@example.com',
    status: 'active',
    specialties: {
      loanAmountRange: {
        min: 0,
        max: 100000
      },
      loanTypes: ['personal', 'business', 'debt-consolidation', 'home-improvement', 'auto', 'education', 'medical', 'other'],
      serviceStates: ['Johor', 'Selangor', 'Kuala Lumpur', 'Penang', 'Melaka', 'Negeri Sembilan'],
      languages: ['Malay', 'English', 'Chinese']
    },
    workload: {
      currentLeads: 0,
      maxLeads: 10,  // 每天最多10个（以防某些天很忙）
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
    priority: 10,  // 优先级相同，确保轮流分配
    notes: 'Agent 1'
  },

  // ========== Agent 2 ==========
  {
    name: 'Agent 2',  // 改成第二个agent名字
    whatsappNumber: '+60198765432',  // 改成第二个agent的WhatsApp
    email: 'agent2@example.com',
    status: 'active',
    specialties: {
      loanAmountRange: {
        min: 0,
        max: 100000
      },
      loanTypes: ['personal', 'business', 'debt-consolidation', 'home-improvement', 'auto', 'education', 'medical', 'other'],
      serviceStates: ['Johor', 'Selangor', 'Kuala Lumpur', 'Penang', 'Melaka', 'Negeri Sembilan'],
      languages: ['Malay', 'English', 'Chinese']
    },
    workload: {
      currentLeads: 0,
      maxLeads: 10,
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
    priority: 10,  // 优先级相同
    notes: 'Agent 2'
  },

  // ========== Agent 3 ==========
  {
    name: 'Agent 3',  // 改成第三个agent名字
    whatsappNumber: '+60187654321',  // 改成第三个agent的WhatsApp
    email: 'agent3@example.com',
    status: 'active',
    specialties: {
      loanAmountRange: {
        min: 0,
        max: 100000
      },
      loanTypes: ['personal', 'business', 'debt-consolidation', 'home-improvement', 'auto', 'education', 'medical', 'other'],
      serviceStates: ['Johor', 'Selangor', 'Kuala Lumpur', 'Penang', 'Melaka', 'Negeri Sembilan'],
      languages: ['Malay', 'English', 'Chinese']
    },
    workload: {
      currentLeads: 0,
      maxLeads: 10,
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
    priority: 10,  // 优先级相同
    notes: 'Agent 3'
  }
];

async function setupAgents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║          🤖 设置3个WhatsApp Agents (轮流分配模式)              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');

    // 清除现有agents
    const existingCount = await WhatsAppAgent.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  发现 ${existingCount} 个现有agents，删除中...`);
      await WhatsAppAgent.deleteMany({});
      console.log('✅ 已清除\n');
    }

    // 添加3个agents
    console.log(`📝 添加 ${agents.length} 个agents...\n`);

    for (const agentData of agents) {
      const agent = new WhatsAppAgent(agentData);
      await agent.save();

      console.log(`✅ 添加: ${agent.name}`);
      console.log(`   WhatsApp: ${agent.whatsappNumber}`);
      console.log(`   最大leads: ${agent.workload.maxLeads}/天`);
      console.log('');
    }

    // 显示分配预览
    console.log('═'.repeat(100));
    console.log('📊 轮流分配预览 (一天10个leads):');
    console.log('═'.repeat(100));
    console.log('');

    const allAgents = await WhatsAppAgent.find().sort({ 'workload.todayAssigned': 1 });

    console.log('Lead 1  → ' + allAgents[0].name);
    console.log('Lead 2  → ' + allAgents[1].name);
    console.log('Lead 3  → ' + allAgents[2].name);
    console.log('Lead 4  → ' + allAgents[0].name);
    console.log('Lead 5  → ' + allAgents[1].name);
    console.log('Lead 6  → ' + allAgents[2].name);
    console.log('Lead 7  → ' + allAgents[0].name);
    console.log('Lead 8  → ' + allAgents[1].name);
    console.log('Lead 9  → ' + allAgents[2].name);
    console.log('Lead 10 → ' + allAgents[0].name);
    console.log('');

    console.log('结果:');
    console.log(`  ${allAgents[0].name}: 4个leads`);
    console.log(`  ${allAgents[1].name}: 3个leads`);
    console.log(`  ${allAgents[2].name}: 3个leads`);
    console.log('');

    console.log('✅ 设置完成！');
    console.log('');
    console.log('💡 下一步:');
    console.log('   1. ✏️  编辑这个文件，填入3个agents的真实信息');
    console.log('      - 名字');
    console.log('      - WhatsApp号码');
    console.log('      - Email (可选)');
    console.log('');
    console.log('   2. 🔄 重新运行: node scripts/setup-3-agents.js');
    console.log('');
    console.log('   3. 🎯 测试: 提交表单，查看AI自动轮流分配');
    console.log('');
    console.log('   4. 📊 查看报告: node scripts/agent-distribution-report.js');
    console.log('');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

setupAgents();
