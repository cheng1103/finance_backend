require('dotenv').config();
const mongoose = require('mongoose');
const VisitorTracking = require('./models/VisitorTracking');

async function checkVisitors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const totalCount = await VisitorTracking.countDocuments();
    console.log('\n总访客记录数:', totalCount);

    if (totalCount > 0) {
      // Get some sample records
      const samples = await VisitorTracking.find().sort({ visitDate: -1 }).limit(5);
      console.log('\n最近5条访客记录:');
      samples.forEach((visitor, idx) => {
        console.log(`${idx + 1}. IP: ${visitor.ipAddress}, 页面: ${visitor.page}, 时间: ${visitor.visitDate}`);
      });

      // Check date range
      const oldest = await VisitorTracking.findOne().sort({ visitDate: 1 });
      const newest = await VisitorTracking.findOne().sort({ visitDate: -1 });
      console.log('\n时间范围:');
      console.log('最早记录:', oldest.visitDate);
      console.log('最新记录:', newest.visitDate);
    } else {
      console.log('\n⚠️ 数据库中没有访客记录！');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

checkVisitors();
