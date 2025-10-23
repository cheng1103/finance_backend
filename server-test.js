const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 基本中间件
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// 模拟数据存储
let users = [];
let applications = [];
let nextAppId = 1;
let whatsappRedirects = [];

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '金融平台API服务正常运行（测试模式）',
    timestamp: new Date().toISOString(),
    environment: 'test'
  });
});

// 贷款计算器API
app.post('/api/calculator/calculate', (req, res) => {
  try {
    const { amount, term, interestRate = 4.88 } = req.body;

    if (!amount || !term) {
      return res.status(400).json({
        status: 'error',
        message: '请提供贷款金额和期限'
      });
    }

    // 马来西亚贷款计算
    const principal = parseFloat(amount);
    const monthlyRate = parseFloat(interestRate) / 100 / 12;
    const numberOfPayments = parseInt(term);

    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = principal / numberOfPayments;
    } else {
      monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
                      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    }

    const totalPayment = monthlyPayment * numberOfPayments;
    const totalInterest = totalPayment - principal;

    res.json({
      status: 'success',
      data: {
        calculation: {
          loanAmount: principal,
          interestRate: parseFloat(interestRate),
          termMonths: numberOfPayments,
          termYears: parseFloat((numberOfPayments / 12).toFixed(1)),
          monthlyPayment: Math.round(monthlyPayment * 100) / 100,
          totalPayment: Math.round(totalPayment * 100) / 100,
          totalInterest: Math.round(totalInterest * 100) / 100,
          interestPercentage: Math.round((totalInterest / principal) * 100 * 100) / 100,
          calculationMethod: 'standard_formula',
          currency: 'MYR'
        }
      }
    });

  } catch (error) {
    console.error('计算错误:', error);
    res.status(500).json({
      status: 'error',
      message: '计算失败'
    });
  }
});

// 贷款申请API
app.post('/api/loans/apply', (req, res) => {
  try {
    const { personalInfo, loanDetails, financialInfo } = req.body;

    if (!personalInfo || !loanDetails || !financialInfo) {
      return res.status(400).json({
        status: 'error',
        message: '请提供完整的申请信息'
      });
    }

    // 生成申请编号
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const applicationNumber = `LA${timestamp.slice(-8)}${random}`;

    // 创建申请记录
    const application = {
      id: nextAppId++,
      applicationNumber,
      status: 'pending',
      personalInfo,
      loanDetails: {
        ...loanDetails,
        interestRate: 4.88
      },
      financialInfo,
      submittedAt: new Date().toISOString()
    };

    applications.push(application);

    res.status(201).json({
      status: 'success',
      message: '贷款申请提交成功',
      data: {
        application
      }
    });

  } catch (error) {
    console.error('申请提交错误:', error);
    res.status(500).json({
      status: 'error',
      message: '提交申请失败'
    });
  }
});

// 用户注册API（简化版）
app.post('/api/auth/register', (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: '请提供完整的注册信息'
      });
    }

    // 检查邮箱是否已存在
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: '该邮箱已被注册'
      });
    }

    // 创建用户
    const user = {
      id: users.length + 1,
      firstName,
      lastName,
      email,
      phone,
      isActive: true,
      role: 'user',
      emailVerified: false,
      createdAt: new Date().toISOString()
    };

    users.push(user);

    // 模拟JWT令牌
    const token = `mock_jwt_token_${user.id}_${Date.now()}`;

    res.status(201).json({
      status: 'success',
      message: '注册成功',
      data: {
        token,
        user
      }
    });

  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      status: 'error',
      message: '注册失败'
    });
  }
});

// 用户登录API（简化版）
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: '请提供邮箱和密码'
      });
    }

    // 查找用户
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: '邮箱或密码错误'
      });
    }

    // 模拟JWT令牌
    const token = `mock_jwt_token_${user.id}_${Date.now()}`;

    res.json({
      status: 'success',
      message: '登录成功',
      data: {
        token,
        user
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      status: 'error',
      message: '登录失败'
    });
  }
});

// 获取利率信息
app.get('/api/calculator/rates', (req, res) => {
  res.json({
    status: 'success',
    data: {
      rates: {
        default: 4.88,
        ranges: {
          excellent: { min: 4.88, max: 7.00, description: 'Excellent Credit (750+)' },
          good: { min: 4.88, max: 10.32, description: 'Good Credit (700-749)' },
          fair: { min: 4.88, max: 14.68, description: 'Fair Credit (650-699)' },
          poor: { min: 4.88, max: 18.00, description: 'Poor Credit (600-649)' }
        },
        features: [
          'Fixed rate for all qualified applicants',
          '1 business day approval',
          'Follows Bank Negara Malaysia guidelines'
        ],
        lastUpdated: new Date().toISOString()
      }
    }
  });
});

// 404处理
// WhatsApp 跳转追踪 API
app.post('/api/track-whatsapp', (req, res) => {
  try {
    const { phone, timestamp } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number is required'
      });
    }

    // 记录WhatsApp跳转
    const redirectRecord = {
      id: whatsappRedirects.length + 1,
      phone,
      timestamp: timestamp || new Date().toISOString(),
      date: new Date().toDateString()
    };

    whatsappRedirects.push(redirectRecord);

    console.log(`📱 WhatsApp redirect tracked: ${phone} at ${redirectRecord.timestamp}`);

    res.json({
      status: 'success',
      message: 'WhatsApp redirect tracked successfully',
      data: redirectRecord
    });
  } catch (error) {
    console.error('❌ Error tracking WhatsApp redirect:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track WhatsApp redirect'
    });
  }
});

// 获取WhatsApp跳转统计
app.get('/api/whatsapp-stats', (req, res) => {
  try {
    const today = new Date().toDateString();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const todayRedirects = whatsappRedirects.filter(record => 
      record.date === today
    ).length;

    const thisMonthRedirects = whatsappRedirects.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate.getMonth() === currentMonth && 
             recordDate.getFullYear() === currentYear;
    }).length;

    res.json({
      status: 'success',
      data: {
        whatsappRedirectsToday: todayRedirects,
        whatsappRedirectsThisMonth: thisMonthRedirects,
        totalRedirects: whatsappRedirects.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting WhatsApp stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get WhatsApp statistics'
    });
  }
});

app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `找不到路由: ${req.originalUrl}`
  });
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 金融平台API测试服务器启动成功!`);
  console.log(`📍 服务器地址: http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`⚠️  注意：这是测试模式，使用内存存储`);
  console.log(`🔄 服务器正在监听端口 ${PORT}...`);
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('📴 收到SIGTERM信号，关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📴 收到SIGINT信号，关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;
