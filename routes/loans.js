const express = require('express');
const { body, validationResult, query } = require('express-validator');
const LoanApplication = require('../models/LoanApplication');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 贷款申请验证规则
const loanApplicationValidation = [
  // 个人信息验证
  body('personalInfo.firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('名字长度必须在1-50个字符之间'),
  body('personalInfo.lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('姓氏长度必须在1-50个字符之间'),
  body('personalInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请提供有效的邮箱地址'),
  body('personalInfo.phone')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('请提供有效的电话号码'),

  // 贷款详情验证
  body('loanDetails.amount')
    .isNumeric()
    .isFloat({ min: 1000, max: 100000 })
    .withMessage('贷款金额必须在RM 1,000 到 RM 100,000 之间'),
  body('loanDetails.purpose')
    .isIn(['debt-consolidation', 'home-improvement', 'auto-purchase', 'education', 'medical', 'business', 'other'])
    .withMessage('请选择有效的贷款用途'),
  body('loanDetails.term')
    .isIn([12, 24, 36, 48, 60, 72, 84, 96, 108])
    .withMessage('请选择有效的贷款期限'),

  // 财务信息验证
  body('financialInfo.annualIncome')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('年收入必须是有效的数字'),
  body('financialInfo.employmentStatus')
    .isIn(['full-time', 'part-time', 'self-employed', 'unemployed', 'retired', 'student'])
    .withMessage('请选择有效的就业状态'),
  body('financialInfo.creditScore')
    .isIn(['excellent', 'good', 'fair', 'poor', 'very-poor', 'unknown'])
    .withMessage('请选择有效的信用评分范围')
];

// @route   POST /api/loans/apply
// @desc    提交贷款申请
// @access  Public (支持匿名申请)
router.post('/apply', optionalAuth, loanApplicationValidation, async (req, res) => {
  try {
    // 检查验证错误
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '数据验证失败',
        errors: errors.array()
      });
    }

    const { personalInfo, loanDetails, financialInfo } = req.body;

    // 创建贷款申请
    const loanApplication = new LoanApplication({
      user: req.user ? req.user.id : undefined,
      personalInfo,
      loanDetails: {
        ...loanDetails,
        interestRate: process.env.DEFAULT_INTEREST_RATE || 4.88
      },
      financialInfo,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referrer')
      }
    });

    // 计算贷款详情
    const monthlyPayment = loanApplication.calculateMonthlyPayment();
    const totalPayment = loanApplication.calculateTotalPayment();
    const totalInterest = loanApplication.calculateTotalInterest();

    await loanApplication.save();

    res.status(201).json({
      status: 'success',
      message: '贷款申请提交成功',
      data: {
        application: {
          id: loanApplication._id,
          applicationNumber: loanApplication.applicationNumber,
          status: loanApplication.status,
          personalInfo: loanApplication.personalInfo,
          loanDetails: loanApplication.loanDetails,
          financialInfo: loanApplication.financialInfo,
          calculations: {
            monthlyPayment,
            totalPayment,
            totalInterest
          },
          submittedAt: loanApplication.createdAt
        }
      }
    });

  } catch (error) {
    console.error('贷款申请错误:', error);
    res.status(500).json({
      status: 'error',
      message: '提交申请失败，请稍后再试'
    });
  }
});

// @route   GET /api/loans/applications
// @desc    获取用户的贷款申请列表
// @access  Private
router.get('/applications', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 查询条件
    const query = { user: req.user.id };
    
    // 状态过滤
    if (req.query.status) {
      query.status = req.query.status;
    }

    // 获取申请列表
    const applications = await LoanApplication.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-metadata -internalNotes');

    // 获取总数
    const total = await LoanApplication.countDocuments(query);

    // 计算每个申请的详细信息
    const applicationsWithCalculations = applications.map(app => {
      const monthlyPayment = app.calculateMonthlyPayment();
      const totalPayment = app.calculateTotalPayment();
      const totalInterest = app.calculateTotalInterest();

      return {
        ...app.toObject(),
        calculations: {
          monthlyPayment,
          totalPayment,
          totalInterest
        }
      };
    });

    res.json({
      status: 'success',
      data: {
        applications: applicationsWithCalculations,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    console.error('获取申请列表错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取申请列表失败'
    });
  }
});

// @route   GET /api/loans/applications/:id
// @desc    获取特定贷款申请详情
// @access  Private/Public (根据是否为申请人判断)
router.get('/applications/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查找申请
    const application = await LoanApplication.findById(id)
      .populate('user', 'firstName lastName email')
      .populate('approval.approvedBy', 'firstName lastName')
      .populate('rejection.rejectedBy', 'firstName lastName');

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: '未找到该贷款申请'
      });
    }

    // 权限检查：只有申请人或管理员可以查看
    if (req.user) {
      // 已登录用户
      if (application.user && application.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: '无权访问该申请'
        });
      }
    } else {
      // 未登录用户只能通过邮箱验证查看自己的申请
      if (!req.query.email || application.personalInfo.email !== req.query.email) {
        return res.status(403).json({
          status: 'error',
          message: '无权访问该申请'
        });
      }
    }

    // 计算贷款详情
    const monthlyPayment = application.calculateMonthlyPayment();
    const totalPayment = application.calculateTotalPayment();
    const totalInterest = application.calculateTotalInterest();

    // 根据用户角色决定返回的信息
    let responseData = {
      id: application._id,
      applicationNumber: application.applicationNumber,
      status: application.status,
      personalInfo: application.personalInfo,
      loanDetails: application.loanDetails,
      financialInfo: application.financialInfo,
      calculations: {
        monthlyPayment,
        totalPayment,
        totalInterest
      },
      submittedAt: application.createdAt,
      updatedAt: application.updatedAt
    };

    // 如果已审批，添加审批信息
    if (application.approval && application.status === 'approved') {
      responseData.approval = application.approval;
    }

    // 如果被拒绝，添加拒绝信息
    if (application.rejection && application.status === 'rejected') {
      responseData.rejection = {
        reason: application.rejection.reason,
        rejectedAt: application.rejection.rejectedAt
      };
    }

    // 管理员可以看到所有信息
    if (req.user && req.user.role === 'admin') {
      responseData.internalNotes = application.internalNotes;
      responseData.communications = application.communications;
      responseData.documents = application.documents;
    }

    res.json({
      status: 'success',
      data: {
        application: responseData
      }
    });

  } catch (error) {
    console.error('获取申请详情错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取申请详情失败'
    });
  }
});

// @route   GET /api/loans/applications/number/:applicationNumber
// @desc    通过申请编号查询申请状态
// @access  Public
router.get('/applications/number/:applicationNumber', async (req, res) => {
  try {
    const { applicationNumber } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: '请提供邮箱地址进行验证'
      });
    }

    const application = await LoanApplication.findOne({
      applicationNumber,
      'personalInfo.email': email
    }).select('applicationNumber status personalInfo.firstName personalInfo.lastName loanDetails createdAt updatedAt');

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: '未找到匹配的申请记录'
      });
    }

    res.json({
      status: 'success',
      data: {
        application: {
          id: application._id,
          applicationNumber: application.applicationNumber,
          status: application.status,
          applicantName: `${application.personalInfo.firstName} ${application.personalInfo.lastName}`,
          loanAmount: application.loanDetails.amount,
          submittedAt: application.createdAt,
          lastUpdated: application.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('查询申请状态错误:', error);
    res.status(500).json({
      status: 'error',
      message: '查询申请状态失败'
    });
  }
});

// @route   PUT /api/loans/applications/:id/cancel
// @desc    取消贷款申请
// @access  Private
router.put('/applications/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await LoanApplication.findById(id);
    
    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: '未找到该贷款申请'
      });
    }

    // 权限检查
    if (application.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: '无权操作该申请'
      });
    }

    // 状态检查
    if (!['pending', 'under-review'].includes(application.status)) {
      return res.status(400).json({
        status: 'error',
        message: '只能取消待处理或审核中的申请'
      });
    }

    application.status = 'cancelled';
    await application.save();

    res.json({
      status: 'success',
      message: '申请已取消',
      data: {
        application: {
          id: application._id,
          applicationNumber: application.applicationNumber,
          status: application.status,
          updatedAt: application.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('取消申请错误:', error);
    res.status(500).json({
      status: 'error',
      message: '取消申请失败'
    });
  }
});

// @route   GET /api/loans/statistics
// @desc    获取贷款统计信息（管理员）
// @access  Private (Admin only)
router.get('/statistics', authenticate, async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: '需要管理员权限'
      });
    }

    const stats = await LoanApplication.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$loanDetails.amount' },
          avgAmount: { $avg: '$loanDetails.amount' }
        }
      }
    ]);

    const totalApplications = await LoanApplication.countDocuments();
    const todayApplications = await LoanApplication.countDocuments({
      createdAt: { 
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    res.json({
      status: 'success',
      data: {
        statistics: {
          total: totalApplications,
          today: todayApplications,
          byStatus: stats.reduce((acc, stat) => {
            acc[stat._id] = {
              count: stat.count,
              totalAmount: stat.totalAmount,
              avgAmount: Math.round(stat.avgAmount)
            };
            return acc;
          }, {})
        }
      }
    });

  } catch (error) {
    console.error('获取统计信息错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取统计信息失败'
    });
  }
});

module.exports = router;

