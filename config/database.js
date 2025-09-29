const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔄 正在连接 MongoDB Atlas...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // MongoDB 6.0+ 推荐的连接选项
      maxPoolSize: 10, // 最大连接池大小
      serverSelectionTimeoutMS: 5000, // 服务器选择超时
      socketTimeoutMS: 45000, // Socket 超时
    });

    console.log(`✅ MongoDB Atlas 连接成功!`);
    console.log(`📍 数据库主机: ${conn.connection.host}`);
    console.log(`📊 数据库名称: ${conn.connection.name}`);
    console.log(`🌍 连接状态: ${conn.connection.readyState === 1 ? '已连接' : '未连接'}`);

    // 监听连接事件
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose 已连接到 MongoDB Atlas');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Atlas 连接错误:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose 已断开与 MongoDB Atlas 的连接');
    });

    // 优雅关闭连接
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('📴 MongoDB Atlas 连接已优雅关闭');
        process.exit(0);
      } catch (error) {
        console.error('❌ 关闭数据库连接时出错:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ MongoDB Atlas 连接失败:', error.message);
    
    // 提供详细的错误信息和解决方案
    if (error.message.includes('authentication failed')) {
      console.error('🔐 认证失败 - 请检查用户名和密码');
    } else if (error.message.includes('network')) {
      console.error('🌐 网络连接问题 - 请检查网络连接和 IP 白名单');
    } else if (error.message.includes('MONGODB_URI')) {
      console.error('⚙️  请检查 .env 文件中的 MONGODB_URI 配置');
    }
    
    console.error('💡 解决方案:');
    console.error('   1. 确保 .env 文件存在且包含正确的 MONGODB_URI');
    console.error('   2. 检查 MongoDB Atlas 用户名和密码');
    console.error('   3. 确保 IP 地址已添加到 Atlas 白名单 (0.0.0.0/0 允许所有)');
    console.error('   4. 检查网络连接');
    
    process.exit(1);
  }
};

// 数据库健康检查
const checkDBHealth = async () => {
  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: '已断开',
      1: '已连接',
      2: '正在连接',
      3: '正在断开'
    };
    
    return {
      status: state === 1 ? 'healthy' : 'unhealthy',
      state: states[state],
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
};

module.exports = { connectDB, checkDBHealth };
