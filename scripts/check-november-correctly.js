const mongoose = require('mongoose');

async function check() {
  try {
    const uri = "mongodb+srv://baabaa311_db_user:cheng1103@e-finance.boazyyj.mongodb.net/?appName=E-finance";
    await mongoose.connect(uri);

    const db = mongoose.connection.db;

    // 11月1日 00:00:00
    const nov1 = new Date('2025-11-01T00:00:00.000+08:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('📊 查询参数:');
    console.log('   11月1日: ' + nov1.toLocaleString('zh-CN'));
    console.log('   今天: ' + today.toLocaleString('zh-CN'));
    console.log('');

    // 查询11月至今的数据
    const novCount = await db.collection('visitortrackings').countDocuments({
      visitDate: { $gte: nov1 }
    });

    console.log('📊 11月1日至今的访问记录: ' + novCount + ' 条');

    // 今天的数据
    const todayCount = await db.collection('visitortrackings').countDocuments({
      visitDate: { $gte: today }
    });

    console.log('📊 今天的访问记录: ' + todayCount + ' 条');

    // 查看最近的几条记录
    console.log('\n📊 最近10条访问记录:');
    const recent = await db.collection('visitortrackings')
      .find()
      .sort({ visitDate: -1 })
      .limit(10)
      .toArray();

    recent.forEach((doc, i) => {
      const date = new Date(doc.visitDate);
      console.log((i+1) + '. ' + date.toLocaleString('zh-CN') + ' - ' + doc.page);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

check();
