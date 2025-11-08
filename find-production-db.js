const mongoose = require('mongoose');
const VisitorTracking = require('./models/VisitorTracking');

// 可能的MongoDB URIs
const possibleURIs = [
  // 我们刚才用的（密码：cheng1103）
  "mongodb+srv://baabaa311_db_user:cheng1103@e-finance.boazyyj.mongodb.net/?appName=E-finance",

  // 文档中提到的（密码：1jjMb368BQslysRQ）
  "mongodb+srv://baabaa311_db_user:1jjMb368BQslysRQ@e-finance.boazyyj.mongodb.net/E-finance?retryWrites=true&w=majority&appName=E-finance",

  // 不指定数据库名的版本
  "mongodb+srv://baabaa311_db_user:1jjMb368BQslysRQ@e-finance.boazyyj.mongodb.net/?retryWrites=true&w=majority&appName=E-finance",
];

async function checkDatabase(uri, index) {
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`检查数据库 #${index + 1}:`);
    console.log(`URI: ${uri.replace(/:[^:@]+@/, ':****@')}`);
    console.log('='.repeat(70));

    await mongoose.connect(uri);

    const dbName = mongoose.connection.name;
    console.log(`✅ 连接成功! 数据库名: ${dbName}`);

    // 检查11月数据
    const novemberStart = new Date('2025-11-01T00:00:00Z');
    const now = new Date();

    const totalVisitors = await VisitorTracking.countDocuments();
    const novemberVisitors = await VisitorTracking.countDocuments({
      visitDate: { $gte: novemberStart, $lte: now }
    });

    console.log(`📊 总访客记录: ${totalVisitors} 条`);
    console.log(`📊 11月访客记录: ${novemberVisitors} 条`);

    if (novemberVisitors > 0) {
      // 按日期统计
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

      console.log('\n📅 11月每日访客统计:');
      dailyStats.forEach(stat => {
        const date = `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}-${String(stat._id.day).padStart(2, '0')}`;
        console.log(`   ${date}: ${stat.count} 次访问`);
      });

      console.log(`\n✨ 找到了！这个数据库有11月的数据！`);
    }

    await mongoose.disconnect();

    return {
      uri,
      dbName,
      totalVisitors,
      novemberVisitors
    };
  } catch (error) {
    console.log(`❌ 连接失败: ${error.message}`);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    return null;
  }
}

async function findProductionDB() {
  console.log('🔍 开始搜索生产环境使用的数据库...\n');

  const results = [];

  for (let i = 0; i < possibleURIs.length; i++) {
    const result = await checkDatabase(possibleURIs[i], i);
    if (result) {
      results.push(result);
    }

    // 等待一下再检查下一个
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 总结:');
  console.log('='.repeat(70));

  results.forEach((result, index) => {
    console.log(`\n数据库 #${index + 1}:`);
    console.log(`  数据库名: ${result.dbName}`);
    console.log(`  总记录: ${result.totalVisitors}`);
    console.log(`  11月记录: ${result.novemberVisitors}`);
    if (result.novemberVisitors > 0) {
      console.log(`  ⭐ 这个很可能是生产环境使用的数据库！`);
    }
  });
}

findProductionDB();
