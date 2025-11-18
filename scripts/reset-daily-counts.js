require('dotenv').config();
const mongoose = require('mongoose');
const WhatsAppAgent = require('../models/WhatsAppAgent');

/**
 * 每日重置计数
 * 建议设置cron job每天00:00运行
 *
 * Cron设置:
 * 0 0 * * * cd /path/to/finance_backend && node scripts/reset-daily-counts.js
 */

async function resetDailyCounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const result = await WhatsAppAgent.updateMany(
      {},
      {
        $set: {
          'workload.todayAssigned': 0,
          'workload.currentLeads': 0  // 也重置当前leads（假设每天处理完）
        }
      }
    );

    console.log(`🔄 重置完成: ${result.modifiedCount} 个agents`);
    console.log(`📅 日期: ${new Date().toLocaleDateString('zh-CN')}`);
    console.log('');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
  }
}

resetDailyCounts();
