#!/usr/bin/env node

const mongoose = require('mongoose');

async function checkCollections() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://baabaa311_db_user:cheng1103@e-finance.boazyyj.mongodb.net/?appName=E-finance";

    await mongoose.connect(uri);
    console.log('✅ MongoDB连接成功\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log('📊 数据库中的Collections:');
    console.log('='.repeat(60));

    if (collections.length === 0) {
      console.log('   ⚠️  数据库是空的，没有任何collection！');
    } else {
      for (const coll of collections) {
        const count = await db.collection(coll.name).countDocuments();
        console.log(`   ${coll.name}: ${count} 条记录`);

        // 如果是customers或visitortracks，显示最近的记录
        if ((coll.name === 'customers' || coll.name === 'visitortracks') && count > 0) {
          const recent = await db.collection(coll.name)
            .find()
            .sort({ createdAt: -1, visitDate: -1 })
            .limit(1)
            .toArray();

          if (recent.length > 0) {
            const date = recent[0].createdAt || recent[0].visitDate;
            console.log(`      最近记录: ${date ? new Date(date).toLocaleString('zh-CN') : '未知时间'}`);
          }
        }
      }
    }

    console.log('\n='.repeat(60));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

checkCollections();
