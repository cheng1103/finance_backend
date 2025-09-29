const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const LoanApplication = require('../models/LoanApplication');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 更新用户资料验证规则
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('名字长度必须在1-50个字符之间'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('姓氏长度必须在1-50个字符之间'),
  body('phone')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('请提供有效的电话号码'),
  body('profile.annualIncome')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('年收入必须是有效的数字'),
  body('profile.employmentStatus')
    .optional()
    .isIn(['full-time', 'part-time', 'self-employed', 'unemployed', 'retired', 'student'])
    .withMessage('请选择有效的就业状态'),
  body('profile.creditScore')
    .optional()
    .isIn(['excellent', 'good', 'fair', 'poor', 'very-poor', 'unknown'])
    .withMessage('请选择有效的信用评分范围')
];

// @route   GET /api/users/profile
// @desc    获取用户完整资料
// @access  Private
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          isActive: user.isActive,
          role: user.role,
          emailVerified: user.emailVerified,
          profile: user.profile,
          preferences: user.preferences,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('获取用户资料错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取用户资料失败'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    更新用户资料
// @access  Private
router.put('/profile', authenticate, updateProfileValidation, async (req, res) => {
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

    const allowedUpdates = ['firstName', 'lastName', 'phone', 'profile', 'preferences'];
    const updates = {};

    // 只允许更新指定字段
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // 特殊处理嵌套对象
    if (req.body.profile) {
      updates.profile = { ...req.body.profile };
    }
    
    if (req.body.preferences) {
      updates.preferences = { ...req.body.preferences };
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    res.json({
      status: 'success',
      message: '用户资料更新成功',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          profile: user.profile,
          preferences: user.preferences,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('更新用户资料错误:', error);
    res.status(500).json({
      status: 'error',
      message: '更新用户资料失败'
    });
  }
});

// @route   PUT /api/users/change-password
// @desc    修改密码
// @access  Private
router.put('/change-password', authenticate, [
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('请提供当前密码'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码至少需要6个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('新密码必须包含至少一个小写字母、一个大写字母和一个数字'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('确认密码与新密码不匹配');
      }
      return true;
    })
], async (req, res) => {
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

    const { currentPassword, newPassword } = req.body;

    // 获取用户（包含密码）
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: '当前密码错误'
      });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      status: 'error',
      message: '修改密码失败'
    });
  }
});

// @route   GET /api/users/dashboard
// @desc    获取用户仪表板数据
// @access  Private
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取用户的贷款申请统计
    const applicationStats = await LoanApplication.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$loanDetails.amount' }
        }
      }
    ]);

    // 获取最近的申请
    const recentApplications = await LoanApplication.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('applicationNumber status loanDetails.amount createdAt');

    // 获取待处理的申请
    const pendingApplications = await LoanApplication.find({
      user: userId,
      status: { $in: ['pending', 'under-review'] }
    }).select('applicationNumber status loanDetails.amount createdAt');

    // 计算总贷款金额
    const totalApplications = await LoanApplication.countDocuments({ user: userId });
    const totalLoanAmount = await LoanApplication.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$loanDetails.amount' } } }
    ]);

    // 组织统计数据
    const stats = {
      total: totalApplications,
      totalAmount: totalLoanAmount.length > 0 ? totalLoanAmount[0].total : 0,
      byStatus: applicationStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount
        };
        return acc;
      }, {})
    };

    res.json({
      status: 'success',
      data: {
        dashboard: {
          statistics: stats,
          recentApplications: recentApplications.map(app => ({
            id: app._id,
            applicationNumber: app.applicationNumber,
            status: app.status,
            amount: app.loanDetails.amount,
            submittedAt: app.createdAt
          })),
          pendingApplications: pendingApplications.map(app => ({
            id: app._id,
            applicationNumber: app.applicationNumber,
            status: app.status,
            amount: app.loanDetails.amount,
            submittedAt: app.createdAt
          }))
        }
      }
    });

  } catch (error) {
    console.error('获取仪表板数据错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取仪表板数据失败'
    });
  }
});

// @route   DELETE /api/users/account
// @desc    删除用户账户
// @access  Private
router.delete('/account', authenticate, [
  body('password')
    .isLength({ min: 1 })
    .withMessage('请提供密码确认删除操作'),
  body('confirmation')
    .equals('DELETE')
    .withMessage('请输入"DELETE"确认删除账户')
], async (req, res) => {
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

    const { password } = req.body;

    // 获取用户（包含密码）
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: '密码错误'
      });
    }

    // 检查是否有待处理的贷款申请
    const pendingApplications = await LoanApplication.countDocuments({
      user: req.user.id,
      status: { $in: ['pending', 'under-review', 'approved'] }
    });

    if (pendingApplications > 0) {
      return res.status(400).json({
        status: 'error',
        message: '您还有待处理或已批准的贷款申请，无法删除账户'
      });
    }

    // 软删除：将用户标记为非活跃而不是真正删除
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    res.json({
      status: 'success',
      message: '账户已成功删除'
    });

  } catch (error) {
    console.error('删除账户错误:', error);
    res.status(500).json({
      status: 'error',
      message: '删除账户失败'
    });
  }
});

// @route   GET /api/users/notifications
// @desc    获取用户通知
// @access  Private
router.get('/notifications', authenticate, async (req, res) => {
  try {
    // 获取用户的贷款申请状态变更作为通知
    const applications = await LoanApplication.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('applicationNumber status loanDetails.amount updatedAt createdAt');

    const notifications = applications.map(app => {
      let message;
      let type;

      switch (app.status) {
        case 'pending':
          message = `您的贷款申请 ${app.applicationNumber} 已提交，等待审核`;
          type = 'info';
          break;
        case 'under-review':
          message = `您的贷款申请 ${app.applicationNumber} 正在审核中`;
          type = 'info';
          break;
        case 'approved':
          message = `恭喜！您的贷款申请 ${app.applicationNumber} 已获批准`;
          type = 'success';
          break;
        case 'rejected':
          message = `很抱歉，您的贷款申请 ${app.applicationNumber} 未获批准`;
          type = 'error';
          break;
        case 'cancelled':
          message = `您的贷款申请 ${app.applicationNumber} 已取消`;
          type = 'warning';
          break;
        default:
          message = `贷款申请 ${app.applicationNumber} 状态已更新`;
          type = 'info';
      }

      return {
        id: app._id,
        message,
        type,
        applicationNumber: app.applicationNumber,
        amount: app.loanDetails.amount,
        status: app.status,
        timestamp: app.updatedAt,
        isRead: true // 简化实现，实际可以添加已读状态
      };
    });

    res.json({
      status: 'success',
      data: {
        notifications,
        unreadCount: 0 // 简化实现
      }
    });

  } catch (error) {
    console.error('获取通知错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取通知失败'
    });
  }
});

// @route   PUT /api/users/preferences
// @desc    更新用户偏好设置
// @access  Private
router.put('/preferences', authenticate, [
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('邮件通知设置必须是布尔值'),
  body('smsNotifications')
    .optional()
    .isBoolean()
    .withMessage('短信通知设置必须是布尔值'),
  body('language')
    .optional()
    .isIn(['zh', 'en', 'ms'])
    .withMessage('请选择有效的语言')
], async (req, res) => {
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

    const { emailNotifications, smsNotifications, language } = req.body;
    const updates = {};

    if (typeof emailNotifications === 'boolean') {
      updates['preferences.emailNotifications'] = emailNotifications;
    }
    if (typeof smsNotifications === 'boolean') {
      updates['preferences.smsNotifications'] = smsNotifications;
    }
    if (language) {
      updates['preferences.language'] = language;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '用户不存在'
      });
    }

    res.json({
      status: 'success',
      message: '偏好设置更新成功',
      data: {
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('更新偏好设置错误:', error);
    res.status(500).json({
      status: 'error',
      message: '更新偏好设置失败'
    });
  }
});

module.exports = router;



