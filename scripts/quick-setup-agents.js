require('dotenv').config();
const mongoose = require('mongoose');
const WhatsAppAgent = require('../models/WhatsAppAgent');
const agentConfig = require('../config/agents.config');

/**
 * 🚀 一键设置Agents
 *
 * 使用方法：
 * 1. 编辑 config/agents.config.js
 * 2. 填入3个WhatsApp号码
 * 3. 运行: node scripts/quick-setup-agents.js
 */

async function quickSetup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║          🚀 一键设置WhatsApp Agents                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');

    const { agents, defaultSettings } = agentConfig;

    // 验证配置
    console.log('🔍 检查配置...');
    let hasError = false;

    agents.forEach((agent, index) => {
      if (agent.whatsappNumber === '+60123456789' ||
          agent.whatsappNumber === '+60198765432' ||
          agent.whatsappNumber === '+60187654321') {
        console.log(`⚠️  Agent ${index + 1}: 还在使用默认号码 ${agent.whatsappNumber}`);
        console.log(`   请编辑 config/agents.config.js 填入真实WhatsApp号码`);
        hasError = true;
      }
    });

    if (hasError) {
      console.log('');
      console.log('❌ 请先填写真实的WhatsApp号码！');
      console.log('');
      console.log('📝 编辑方法:');
      console.log('   nano config/agents.config.js');
      console.log('');
      return;
    }

    console.log('✅ 配置检查通过\n');

    // 清除现有agents
    const existingCount = await WhatsAppAgent.countDocuments();
    if (existingCount > 0) {
      console.log(`🗑️  删除现有 ${existingCount} 个agents...`);
      await WhatsAppAgent.deleteMany({});
      console.log('✅ 已清除\n');
    }

    // 创建新agents
    console.log(`📝 创建 ${agents.length} 个agents...\n`);

    const createdAgents = [];

    for (const agentConfig of agents) {
      const agentData = {
        name: agentConfig.name,
        whatsappNumber: agentConfig.whatsappNumber,
        email: agentConfig.email,
        status: defaultSettings.status,
        specialties: defaultSettings.specialties,
        workload: {
          currentLeads: 0,
          maxLeads: agentConfig.maxLeadsPerDay,
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
        priority: defaultSettings.priority,
        notes: `Created via quick-setup on ${new Date().toLocaleDateString()}`
      };

      const agent = new WhatsAppAgent(agentData);
      await agent.save();
      createdAgents.push(agent);

      console.log(`✅ ${agent.name}`);
      console.log(`   📱 WhatsApp: ${agent.whatsappNumber}`);
      console.log(`   📊 最大leads: ${agent.workload.maxLeads}/天`);
      console.log('');
    }

    // 显示分配预览
    console.log('═'.repeat(100));
    console.log('📊 轮流分配预览 (一天10个leads):');
    console.log('═'.repeat(100));
    console.log('');

    for (let i = 1; i <= 10; i++) {
      const agentIndex = (i - 1) % 3;
      console.log(`Lead ${String(i).padStart(2)}  → ${createdAgents[agentIndex].name}`);
    }

    console.log('');
    console.log('预计分配结果:');
    console.log(`  ${createdAgents[0].name}: 4个leads`);
    console.log(`  ${createdAgents[1].name}: 3个leads`);
    console.log(`  ${createdAgents[2].name}: 3个leads`);
    console.log('');

    // 显示agent能力
    console.log('═'.repeat(100));
    console.log('✅ Agents能力设置:');
    console.log('═'.repeat(100));
    console.log('');
    console.log(`📊 贷款金额范围: RM ${defaultSettings.specialties.loanAmountRange.min.toLocaleString()} - RM ${defaultSettings.specialties.loanAmountRange.max.toLocaleString()}`);
    console.log(`📍 服务地区: 西马所有州属 (${defaultSettings.specialties.serviceStates.length}个)`);
    console.log(`🗣️  语言: ${defaultSettings.specialties.languages.join(', ')}`);
    console.log(`📋 贷款类型: 所有类型`);
    console.log('');

    console.log('═'.repeat(100));
    console.log('🎉 设置完成！');
    console.log('═'.repeat(100));
    console.log('');
    console.log('✅ 系统已准备就绪！');
    console.log('');
    console.log('💡 下一步:');
    console.log('   1. 📊 查看报告: node scripts/agent-distribution-report.js');
    console.log('   2. 🧪 测试: 提交表单，AI会自动轮流分配');
    console.log('   3. 📝 查看日志: pm2 logs --lines 50');
    console.log('');
    console.log('🔄 每日自动重置:');
    console.log('   node scripts/reset-daily-counts.js');
    console.log('   (或设置cron job自动运行)');
    console.log('');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

quickSetup();
