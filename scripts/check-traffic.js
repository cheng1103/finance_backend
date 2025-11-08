#!/usr/bin/env node

/**
 * 流量检查脚本
 * 用途：查询网站访问流量数据，找出流量下降原因
 */

require('dotenv').config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
  require('dotenv').config(); // fallback to .env
}
const mongoose = require('mongoose');

// MongoDB连接
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB连接成功\n');
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message);
    process.exit(1);
  }
};

// VisitorTracking模型 - 使用正确的collection名字
const VisitorTracking = mongoose.model('VisitorTracking', new mongoose.Schema({}, { strict: false }), 'visitortrackings');

// 主函数
async function checkTraffic() {
  console.log('='.repeat(60));
  console.log('🔍 网站流量检查报告');
  console.log('='.repeat(60));
  console.log();

  // 1. 查询今天的流量
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await VisitorTracking.countDocuments({
    visitDate: { $gte: today }
  });

  console.log('📊 今天的流量 (2024-11-07):');
  console.log(`   总访问数: ${todayCount} 次`);
  console.log();

  // 2. 查询11月5日、6日、7日的流量对比
  console.log('📊 过去3天流量对比:');
  console.log('-'.repeat(60));

  for (let day = 5; day <= 7; day++) {
    const count = await VisitorTracking.countDocuments({
      year: 2024,
      month: 11,
      day: day
    });
    console.log(`   11月${day}日: ${count} 次访问`);
  }
  console.log();

  // 3. 查询11月6日按小时的流量分布
  console.log('📊 11月6日按小时流量分布:');
  console.log('-'.repeat(60));

  const hourlyData = await VisitorTracking.aggregate([
    {
      $match: {
        year: 2024,
        month: 11,
        day: 6
      }
    },
    {
      $project: {
        hour: { $hour: '$visitDate' }
      }
    },
    {
      $group: {
        _id: '$hour',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  // 创建完整的24小时数组
  const hourlyMap = {};
  hourlyData.forEach(item => {
    hourlyMap[item._id] = item.count;
  });

  for (let hour = 0; hour < 24; hour++) {
    const count = hourlyMap[hour] || 0;
    const bar = '█'.repeat(Math.floor(count / 5));
    const time = `${hour.toString().padStart(2, '0')}:00`;
    console.log(`   ${time} - ${time.replace(':00', ':59')}: ${count.toString().padStart(3, ' ')} 次 ${bar}`);

    // 标注晚上8点
    if (hour === 19) {
      console.log('   ' + '↑'.repeat(30) + ' 晚上8点之前');
    }
    if (hour === 20) {
      console.log('   ' + '↓'.repeat(30) + ' 晚上8点之后 ⚠️');
    }
  }
  console.log();

  // 4. 查询11月6日的流量来源 (referrer)
  console.log('📊 11月6日流量来源分析:');
  console.log('-'.repeat(60));

  const referrerData = await VisitorTracking.aggregate([
    {
      $match: {
        year: 2024,
        month: 11,
        day: 6
      }
    },
    {
      $group: {
        _id: '$referrer',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 10
    }
  ]);

  referrerData.forEach((item, index) => {
    const source = item._id || '(直接访问/Direct)';
    const percentage = ((item.count / (hourlyData.reduce((sum, h) => sum + h.count, 0) || 1)) * 100).toFixed(1);
    console.log(`   ${index + 1}. ${source}`);
    console.log(`      访问数: ${item.count} 次 (${percentage}%)`);
    console.log();
  });

  // 5. 查询设备类型分布
  console.log('📊 11月6日设备类型分布:');
  console.log('-'.repeat(60));

  const deviceData = await VisitorTracking.aggregate([
    {
      $match: {
        year: 2024,
        month: 11,
        day: 6
      }
    },
    {
      $group: {
        _id: '$deviceType',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  deviceData.forEach(item => {
    const device = item._id || '未知';
    console.log(`   ${device}: ${item.count} 次`);
  });
  console.log();

  // 6. 查询最近访问的页面
  console.log('📊 最受欢迎的页面:');
  console.log('-'.repeat(60));

  const pageData = await VisitorTracking.aggregate([
    {
      $match: {
        year: 2024,
        month: 11,
        day: 6
      }
    },
    {
      $group: {
        _id: '$page',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 10
    }
  ]);

  pageData.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item._id}: ${item.count} 次访问`);
  });
  console.log();

  // 7. 检查是否有可疑的bot流量
  console.log('📊 User Agent分析 (检查是否有爬虫):');
  console.log('-'.repeat(60));

  const botCount = await VisitorTracking.countDocuments({
    year: 2024,
    month: 11,
    day: 6,
    userAgent: { $regex: /bot|crawler|spider|scraper/i }
  });

  const totalNov6 = await VisitorTracking.countDocuments({
    year: 2024,
    month: 11,
    day: 6
  });

  console.log(`   可疑爬虫流量: ${botCount} 次`);
  console.log(`   真实用户流量: ${totalNov6 - botCount} 次`);
  console.log(`   爬虫占比: ${((botCount / (totalNov6 || 1)) * 100).toFixed(1)}%`);
  console.log();

  // 8. 总结
  console.log('='.repeat(60));
  console.log('📋 总结与建议:');
  console.log('='.repeat(60));

  const nov5Count = await VisitorTracking.countDocuments({ year: 2024, month: 11, day: 5 });
  const nov6Count = await VisitorTracking.countDocuments({ year: 2024, month: 11, day: 6 });
  const nov7Count = await VisitorTracking.countDocuments({ year: 2024, month: 11, day: 7 });

  console.log(`1. 11月5日流量: ${nov5Count} 次`);
  console.log(`2. 11月6日流量: ${nov6Count} 次`);
  console.log(`3. 11月7日流量(今天): ${nov7Count} 次`);
  console.log();

  if (nov6Count < nov5Count * 0.5) {
    console.log('⚠️  警告: 11月6日流量下降超过50%！');
  }

  if (nov7Count < nov5Count * 0.5) {
    console.log('⚠️  警告: 今天流量仍然偏低！');
  } else if (nov7Count > nov6Count) {
    console.log('✅ 好消息: 今天流量正在恢复！');
  }

  console.log();
  console.log('='.repeat(60));
}

// 运行
connectDB()
  .then(() => checkTraffic())
  .then(() => {
    console.log('✅ 检查完成！');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 错误:', error);
    process.exit(1);
  });
