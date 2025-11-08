const mongoose = require('mongoose');

async function checkNov() {
  try {
    const uri = "mongodb+srv://baabaa311_db_user:cheng1103@e-finance.boazyyj.mongodb.net/?appName=E-finance";
    await mongoose.connect(uri);

    const db = mongoose.connection.db;

    console.log('🔍 查找11月的数据...\n');

    // 查找year=2024, month=11
    const nov2024 = await db.collection('visitortrackings').countDocuments({
      year: 2024,
      month: 11
    });

    // 查找year=2025, month=11
    const nov2025 = await db.collection('visitortrackings').countDocuments({
      year: 2025,
      month: 11
    });

    console.log('2024年11月数据: ' + nov2024 + ' 条');
    console.log('2025年11月数据: ' + nov2025 + ' 条');

    // 查看所有有数据的月份
    const allDates = await db.collection('visitortrackings').aggregate([
      {
        $group: {
          _id: { year: '$year', month: '$month' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray();

    console.log('\n📅 数据库中有数据的月份:');
    allDates.forEach(item => {
      console.log('   ' + item._id.year + '年' + item._id.month + '月: ' + item.count + ' 条记录');
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

checkNov();
