#!/usr/bin/env node

/**
 * 流量检查脚本 - 简化版
 * 用途：快速查询网站访问流量数据
 */

const readline = require('readline');
const mongoose = require('mongoose');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// VisitorTracking模型
const VisitorTracking = mongoose.model('VisitorTracking', new mongoose.Schema({}, { strict: false }), 'visitortracks');

async function checkTraffic() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 网站流量检查报告');
  console.log('='.repeat(60) + '\n');

  try {
    // 查询今天的流量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await VisitorTracking.countDocuments({
      visitDate: { $gte: today }
    });

    console.log('📊 今天的流量 (2024-11-07):');
    console.log(`   总访问数: ${todayCount} 次\n`);

    // 过去3天流量对比
    console.log('📊 过去3天流量对比:');
    console.log('-'.repeat(60));

    const nov5 = await VisitorTracking.countDocuments({ year: 2024, month: 11, day: 5 });
    const nov6 = await VisitorTracking.countDocuments({ year: 2024, month: 11, day: 6 });
    const nov7 = await VisitorTracking.countDocuments({ year: 2024, month: 11, day: 7 });

    console.log(`   11月5日 (星期二): ${nov5} 次访问`);
    console.log(`   11月6日 (星期三): ${nov6} 次访问 ${nov6 < nov5 * 0.5 ? '⚠️ 大幅下降！' : ''}`);
    console.log(`   11月7日 (星期四/今天): ${nov7} 次访问 ${nov7 > nov6 ? '✅ 正在恢复' : ''}\n`);

    // 11月6日按小时流量分布
    console.log('📊 11月6日按小时流量分布:');
    console.log('-'.repeat(60));

    const hourlyData = await VisitorTracking.aggregate([
      { $match: { year: 2024, month: 11, day: 6 } },
      { $project: { hour: { $hour: '$visitDate' } } },
      { $group: { _id: '$hour', count: { $sum: 1 } } },
      { $sort: { '_id': 1 } }
    ]);

    const hourlyMap = {};
    hourlyData.forEach(item => hourlyMap[item._id] = item.count);

    let total8pmBefore = 0;
    let total8pmAfter = 0;

    for (let hour = 0; hour < 24; hour++) {
      const count = hourlyMap[hour] || 0;
      const bar = '█'.repeat(Math.max(1, Math.floor(count / 3)));
      const time = `${hour.toString().padStart(2, '0')}:00`;

      if (hour < 20) total8pmBefore += count;
      else total8pmAfter += count;

      console.log(`   ${time}: ${count.toString().padStart(3, ' ')} 次 ${bar}`);

      if (hour === 19) {
        console.log('   ' + '↑'.repeat(20) + ' 晚上8点之前 (共 ' + total8pmBefore + ' 次)');
      }
      if (hour === 19) {
        console.log('   ' + '─'.repeat(50));
      }
    }
    console.log('   ' + '↓'.repeat(20) + ' 晚上8点之后 (共 ' + total8pmAfter + ' 次) ⚠️\n');

    // 流量来源分析
    console.log('📊 11月6日流量来源分析:');
    console.log('-'.repeat(60));

    const referrerData = await VisitorTracking.aggregate([
      { $match: { year: 2024, month: 11, day: 6 } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    referrerData.forEach((item, index) => {
      const source = item._id || '(直接访问/书签/WhatsApp)';
      const percentage = ((item.count / nov6) * 100).toFixed(1);
      console.log(`   ${index + 1}. ${source.substring(0, 50)}`);
      console.log(`      ${item.count} 次 (${percentage}%)\n`);
    });

    // 设备类型
    console.log('📊 设备类型分布:');
    console.log('-'.repeat(60));

    const deviceData = await VisitorTracking.aggregate([
      { $match: { year: 2024, month: 11, day: 6 } },
      { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    deviceData.forEach(item => {
      const device = item._id || '未知';
      const percentage = ((item.count / nov6) * 100).toFixed(1);
      console.log(`   ${device}: ${item.count} 次 (${percentage}%)`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('📋 总结:');
    console.log('='.repeat(60));
    console.log(`1. 晚上8点之前: ${total8pmBefore} 次访问`);
    console.log(`2. 晚上8点之后: ${total8pmAfter} 次访问`);
    console.log(`3. 下降幅度: ${((1 - total8pmAfter / total8pmBefore) * 100).toFixed(1)}%`);

    if (nov7 > nov6) {
      console.log(`\n✅ 好消息: 今天流量正在恢复！(${nov7} vs ${nov6})`);
    } else {
      console.log(`\n⚠️  今天流量仍然偏低 (${nov7} 次)`);
    }

    console.log('\n='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }

  await mongoose.connection.close();
  process.exit(0);
}

// 主程序
console.log('\n🔐 MongoDB连接设置');
console.log('-'.repeat(60));

rl.question('请输入MongoDB URI (或直接回车使用环境变量): ', async (mongoUri) => {
  rl.close();

  // 如果没有输入，尝试从环境变量读取
  if (!mongoUri.trim()) {
    require('dotenv').config();
    mongoUri = process.env.MONGODB_URI;
  }

  if (!mongoUri) {
    console.error('\n❌ 错误: 未提供MongoDB URI');
    console.log('\n请使用以下方式之一:');
    console.log('1. 直接运行脚本并输入MongoDB URI');
    console.log('2. 在backend目录创建.env文件，添加MONGODB_URI变量\n');
    process.exit(1);
  }

  try {
    console.log('\n⏳ 正在连接MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 连接成功！\n');

    await checkTraffic();
  } catch (error) {
    console.error('\n❌ 连接失败:', error.message);
    console.log('\n请检查:');
    console.log('1. MongoDB URI格式是否正确');
    console.log('2. 网络连接是否正常');
    console.log('3. MongoDB Atlas是否允许你的IP访问\n');
    process.exit(1);
  }
});
