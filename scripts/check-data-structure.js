const mongoose = require('mongoose');

async function checkData() {
  try {
    const uri = "mongodb+srv://baabaa311_db_user:cheng1103@e-finance.boazyyj.mongodb.net/?appName=E-finance";
    await mongoose.connect(uri);
    console.log('✅ 连接成功\n');

    const db = mongoose.connection.db;

    // 查看visitortrackings的记录
    console.log('📊 visitortrackings collection 数据:');
    console.log('='.repeat(60));

    const total = await db.collection('visitortrackings').countDocuments();
    console.log('总记录数: ' + total + '\n');

    // 获取最近的几条记录
    const recent = await db.collection('visitortrackings')
      .find()
      .sort({ _id: -1 })
      .limit(5)
      .toArray();

    console.log('最近5条记录:');
    recent.forEach((doc, index) => {
      console.log('\n' + (index + 1) + '. ID: ' + doc._id);
      console.log('   visitDate: ' + doc.visitDate);
      console.log('   page: ' + doc.page);
      console.log('   referrer: ' + (doc.referrer || '(空)'));
      console.log('   deviceType: ' + doc.deviceType);
      console.log('   year: ' + doc.year + ', month: ' + doc.month + ', day: ' + doc.day);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

checkData();
