const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 登录速率限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP 15分钟内最多5次登录尝试
  message: {
    status: 'error',
    message: '登录尝试次数过多，请15分钟后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 注册验证规则
const registerValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('名字长度必须在1-50个字符之间'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('姓氏长度必须在1-50个字符之间'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请提供有效的邮箱地址'),
  body('phone')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('请提供有效的电话号码'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少需要6个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字')
];

// 登录验证规则
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请提供有效的邮箱地址'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('请提供密码')
];

// @route   POST /api/auth/register
// @desc    用户注册
// @access  Public
router.post('/register', registerValidation, async (req, res) => {
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

    const { firstName, lastName, email, phone, password } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: '该邮箱已被注册'
      });
    }

    // 创建新用户
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password
    });

    await user.save();

    // 生成JWT令牌
    const token = user.generateAuthToken();

    // 更新最后登录时间
    await user.updateLastLogin();

    res.status(201).json({
      status: 'success',
      message: '注册成功',
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          isActive: user.isActive,
          role: user.role,
          emailVerified: user.emailVerified
        }
      }
    });

  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      status: 'error',
      message: '注册失败，请稍后再试'
    });
  }
});

// @route   POST /api/auth/login
// @desc    用户登录
// @access  Public
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
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

    const { email, password } = req.body;

    // 查找用户（包含密码字段）
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: '邮箱或密码错误'
      });
    }

    // 检查用户状态
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: '账户已被禁用，请联系客服'
      });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: '邮箱或密码错误'
      });
    }

    // 生成JWT令牌
    const token = user.generateAuthToken();

    // 更新最后登录时间
    await user.updateLastLogin();

    res.json({
      status: 'success',
      message: '登录成功',
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          isActive: user.isActive,
          role: user.role,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      status: 'error',
      message: '登录失败，请稍后再试'
    });
  }
});

// @route   GET /api/auth/me
// @desc    获取当前用户信息
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
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
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取用户信息失败'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    用户登出
// @access  Private
router.post('/logout', authenticate, async (req, res) => {
  try {
    // 在实际应用中，您可能想要将令牌加入黑名单
    // 这里我们只是返回成功响应
    res.json({
      status: 'success',
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      status: 'error',
      message: '登出失败'
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    忘记密码
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('请提供有效的邮箱地址')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '请提供有效的邮箱地址'
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    // 无论用户是否存在，都返回相同的响应（安全考虑）
    res.json({
      status: 'success',
      message: '如果该邮箱已注册，您将收到密码重置邮件'
    });

    // 如果用户存在，生成重置令牌（实际环境中需要发送邮件）
    if (user) {
      const resetToken = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });

      console.log(`密码重置令牌 (${email}): ${resetToken}`);
      // TODO: 在实际环境中，这里应该发送邮件
    }

  } catch (error) {
    console.error('忘记密码错误:', error);
    res.status(500).json({
      status: 'error',
      message: '处理请求失败，请稍后再试'
    });
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    重置密码
// @access  Public
router.post('/reset-password/:token', [
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少需要6个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: '密码格式不符合要求',
        errors: errors.array()
      });
    }

    const { password } = req.body;
    const { token } = req.params;

    // 哈希化重置令牌
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 查找用户
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: '密码重置令牌无效或已过期'
      });
    }

    // 重置密码
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.json({
      status: 'success',
      message: '密码重置成功，请使用新密码登录'
    });

  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({
      status: 'error',
      message: '密码重置失败，请稍后再试'
    });
  }
});

module.exports = router;

