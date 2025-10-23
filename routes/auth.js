const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 'error',
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters.'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters.'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address.'),
  body('phone')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number.'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must include uppercase, lowercase letters, and numbers.')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address.'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required.')
];

router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'A user with this email already exists.'
      });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password
    });

    await user.save();

    const token = user.generateAuthToken();
    await user.updateLastLogin();

    res.status(201).json({
      status: 'success',
      message: 'Registration successful.',
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
    console.error('[Auth] Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to complete registration. Please try again later.'
    });
  }
});

router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is disabled. Please contact support.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    const token = user.generateAuthToken();
    await user.updateLastLogin();

    res.json({
      status: 'success',
      message: 'Login successful.',
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
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to complete login. Please try again later.'
    });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
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
    console.error('[Auth] Fetch current user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve user profile.'
    });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    res.json({
      status: 'success',
      message: 'Logout successful.'
    });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete logout.'
    });
  }
});

router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.'
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    res.json({
      status: 'success',
      message: 'If the email is registered, you will receive a password reset link shortly.'
    });

    if (user) {
      const resetToken = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });
      });
    }
  } catch (error) {
    console.error('[Auth] Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to process the request. Please try again later.'
    });
  }
});

router.post('/reset-password/:token', [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must include uppercase, lowercase letters, and numbers.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Password does not meet requirements.',
        errors: errors.array()
      });
    }

    const { password } = req.body;
    const { token } = req.params;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Password reset token is invalid or has expired.'
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.json({
      status: 'success',
      message: 'Password reset successful. Please use your new password to sign in.'
    });
  } catch (error) {
    console.error('[Auth] Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to reset password. Please try again later.'
    });
  }
});

module.exports = router;
