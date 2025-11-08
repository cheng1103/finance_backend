const uri = process.env.MONGODB_URI || "mongodb+srv://baabaa311_db_user:cheng1103@e-finance.boazyyj.mongodb.net/?appName=E-finance";
const mongoose = require('mongoose');
const VisitorTracking = require('./models/VisitorTracking');

async function checkNovemberVisits() {
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB连接成功\n');

    // 11月1号到现在
    const novemberStart = new Date('2025-11-01T00:00:00Z');
    const now = new Date();

    console.log(`📅 查询时间范围: ${novemberStart.toISOString()} 到 ${now.toISOString()}\n`);

    // 总访客数
    const totalVisitors = await VisitorTracking.countDocuments();
    console.log(`📊 数据库中总访客记录: ${totalVisitors} 条`);

    // 11月的访客数
    const novemberVisitors = await VisitorTracking.countDocuments({
      visitDate: { $gte: novemberStart, $lte: now }
    });
    console.log(`📊 11月访客记录: ${novemberVisitors} 条\n`);

    // 按日期分组统计
    const dailyStats = await VisitorTracking.aggregate([
      {
        $match: {
          visitDate: { $gte: novemberStart, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$visitDate' },
            month: { $month: '$visitDate' },
            day: { $dayOfMonth: '$visitDate' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    console.log('📊 每日访客统计:');
    dailyStats.forEach(stat => {
      const date = `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}-${String(stat._id.day).padStart(2, '0')}`;
      console.log(`   ${date}: ${stat.count} 次访问`);
    });

    // 获取几条样本
    console.log('\n📝 最近5条访客记录样本:');
    const samples = await VisitorTracking.find({
      visitDate: { $gte: novemberStart }
    }).sort({ visitDate: -1 }).limit(5);

    samples.forEach((visit, idx) => {
      console.log(`${idx + 1}. 时间: ${visit.visitDate.toISOString()}, 页面: ${visit.page}, IP: ${visit.ipAddress}, 设备: ${visit.deviceType}`);
    });

    // 检查最早和最新的记录
    const oldest = await VisitorTracking.findOne().sort({ visitDate: 1 });
    const newest = await VisitorTracking.findOne().sort({ visitDate: -1 });
    console.log('\n📅 数据时间范围:');
    console.log(`   最早记录: ${oldest?.visitDate?.toISOString() || '无'}`);
    console.log(`   最新记录: ${newest?.visitDate?.toISOString() || '无'}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

checkNovemberVisits();
