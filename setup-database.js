#!/usr/bin/env node

/**
 * 数据库设置和测试脚本
 * 用于验证 MongoDB Atlas 连接和初始化数据
 */

require('dotenv').config();
const { connectDB, checkDBHealth } = require('./config/database');
const User = require('./models/User');
const LoanApplication = require('./models/LoanApplication');
const WhatsAppTracking = require('./models/WhatsAppTracking');

async function setupDatabase() {
  console.log('🚀 开始数据库设置和测试...\n');
  
  try {
    // 1. 测试数据库连接
    console.log('📡 步骤 1: 测试数据库连接');
    await connectDB();
    
    // 2. 检查数据库健康状态
    console.log('\n🔍 步骤 2: 检查数据库健康状态');
    const health = await checkDBHealth();
    console.log('数据库状态:', health);
    
    // 3. 验证模型
    console.log('\n📋 步骤 3: 验证数据模型');
    console.log('✅ User 模型已加载');
    console.log('✅ LoanApplication 模型已加载');
    console.log('✅ WhatsAppTracking 模型已加载');
    
    // 4. 检查现有数据
    console.log('\n📊 步骤 4: 检查现有数据');
    const userCount = await User.countDocuments();
    const loanCount = await LoanApplication.countDocuments();
    const trackingCount = await WhatsAppTracking.countDocuments();
    
    console.log(`用户数量: ${userCount}`);
    console.log(`贷款申请数量: ${loanCount}`);
    console.log(`WhatsApp 追踪记录: ${trackingCount}`);
    
    // 5. 创建测试管理员账户（如果不存在）
    console.log('\n👤 步骤 5: 检查管理员账户');
    const adminExists = await User.findOne({ email: 'admin@finance-platform.com' });
    
    if (!adminExists) {
      console.log('创建默认管理员账户...');
      const admin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@finance-platform.com',
        phone: '+60123456789',
        password: 'admin123456',
        role: 'admin',
        emailVerified: true,
        profile: {
          annualIncome: 100000,
          employmentStatus: 'full-time',
          creditScore: 'excellent'
        }
      });
      
      await admin.save();
      console.log('✅ 默认管理员账户创建成功');
      console.log('   邮箱: admin@finance-platform.com');
      console.log('   密码: admin123456');
      console.log('   ⚠️  请在生产环境中更改默认密码！');
    } else {
      console.log('✅ 管理员账户已存在');
    }
    
    // 6. 创建示例数据（如果需要）
    if (userCount === 0 || userCount === 1) {
      console.log('\n📝 步骤 6: 创建示例数据');
      await createSampleData();
    } else {
      console.log('\n✅ 步骤 6: 数据库已包含数据，跳过示例数据创建');
    }
    
    // 7. 测试 WhatsApp 追踪功能
    console.log('\n📱 步骤 7: 测试 WhatsApp 追踪功能');
    const testTracking = new WhatsAppTracking({
      customerPhone: '+60123456789',
      trackingType: 'redirect',
      source: 'admin_dashboard',
      details: {
        userAgent: 'Test Agent',
        ipAddress: '127.0.0.1'
      }
    });
    
    await testTracking.save();
    console.log('✅ WhatsApp 追踪功能测试成功');
    
    // 8. 完成设置
    console.log('\n🎉 数据库设置完成！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 设置摘要:');
    console.log(`   数据库状态: ${health.status}`);
    console.log(`   数据库主机: ${health.host}`);
    console.log(`   用户总数: ${await User.countDocuments()}`);
    console.log(`   贷款申请: ${await LoanApplication.countDocuments()}`);
    console.log(`   追踪记录: ${await WhatsAppTracking.countDocuments()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 你的应用现在可以启动了！');
    console.log('   运行: npm run dev');
    
  } catch (error) {
    console.error('❌ 数据库设置失败:', error.message);
    console.error('\n💡 解决方案:');
    console.error('1. 检查 .env 文件是否存在且配置正确');
    console.error('2. 确保 MONGODB_URI 连接字符串正确');
    console.error('3. 检查网络连接和 MongoDB Atlas 白名单设置');
    console.error('4. 验证 MongoDB Atlas 用户名和密码');
    
    process.exit(1);
  } finally {
    // 关闭数据库连接
    process.exit(0);
  }
}

// 创建示例数据
async function createSampleData() {
  try {
    // 创建示例用户
    const sampleUsers = [
      {
        firstName: 'Ahmad',
        lastName: 'Hassan',
        email: 'ahmad.hassan@email.com',
        phone: '+60123456789',
        password: 'password123',
        role: 'user',
        profile: {
          annualIncome: 66000,
          employmentStatus: 'full-time',
          creditScore: 'good',
          address: {
            street: 'No. 15, Jalan Ampang',
            city: 'Kuala Lumpur',
            state: 'Kuala Lumpur',
            zipCode: '50450',
            country: 'Malaysia'
          }
        }
      },
      {
        firstName: 'Siti',
        lastName: 'Nurhaliza',
        email: 'siti.nurhaliza@email.com',
        phone: '+60187654321',
        password: 'password123',
        role: 'user',
        profile: {
          annualIncome: 86400,
          employmentStatus: 'full-time',
          creditScore: 'excellent',
          address: {
            street: 'No. 22, Jalan Sultan Ismail',
            city: 'Kuala Lumpur',
            state: 'Kuala Lumpur',
            zipCode: '50250',
            country: 'Malaysia'
          }
        }
      }
    ];
    
    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ 创建示例用户: ${userData.firstName} ${userData.lastName}`);
      }
    }
    
    // 创建示例贷款申请
    const users = await User.find({ role: 'user' }).limit(2);
    if (users.length > 0) {
      const sampleLoan = new LoanApplication({
        user: users[0]._id,
        personalInfo: {
          firstName: users[0].firstName,
          lastName: users[0].lastName,
          email: users[0].email,
          phone: users[0].phone
        },
        loanDetails: {
          amount: 50000,
          purpose: 'home-improvement',
          term: 36,
          interestRate: 4.88
        },
        financialInfo: {
          annualIncome: users[0].profile.annualIncome,
          employmentStatus: users[0].profile.employmentStatus,
          creditScore: users[0].profile.creditScore
        },
        status: 'pending'
      });
      
      await sampleLoan.save();
      console.log('✅ 创建示例贷款申请');
    }
    
  } catch (error) {
    console.error('创建示例数据时出错:', error.message);
  }
}

// 运行设置
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };

















