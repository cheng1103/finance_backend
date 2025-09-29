const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 测试数据库连接...');
console.log('MongoDB URI:', process.env.MONGODB_URI ? '已配置' : '未配置');

const connectDB = async () => {
  try {
    console.log('🔄 正在连接 MongoDB Atlas...');

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5秒超时
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB Atlas 连接成功!');
    console.log(`📍 数据库主机: ${conn.connection.host}`);
    console.log(`🗄️  数据库名称: ${conn.connection.name}`);

    // 测试创建一个简单文档
    const testSchema = new mongoose.Schema({
      message: String,
      timestamp: { type: Date, default: Date.now }
    });

    const TestModel = mongoose.model('ConnectionTest', testSchema);

    const testDoc = new TestModel({
      message: 'Database connection test successful'
    });

    await testDoc.save();
    console.log('✅ 测试文档创建成功');

    // 删除测试文档
    await testDoc.deleteOne();
    console.log('✅ 测试文档清理完成');

    await mongoose.connection.close();
    console.log('✅ 数据库连接测试完成');

  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);

    if (error.message.includes('authentication failed')) {
      console.log('💡 解决方案: 检查用户名和密码是否正确');
    } else if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.log('💡 解决方案: 检查IP白名单设置');
      console.log('   1. 登录 MongoDB Atlas');
      console.log('   2. 进入 Network Access');
      console.log('   3. 添加 0.0.0.0/0 (允许所有IP)');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 解决方案: 检查网络连接和DNS设置');
    }

    process.exit(1);
  }
};

connectDB();