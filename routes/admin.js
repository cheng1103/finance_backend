const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Admin credentials (should be stored in database or environment variables in production)
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  // This is bcrypt hash of 'AdminSecure2024!'
  // In production, read from environment variable or database
  passwordHash: process.env.ADMIN_PASSWORD_HASH || '$2a$10$rQXvJZYlF.KgFc8qF7DqJ.xzVNqH8kJMmO2c9yKfLmEXMPLNqXG2e'
};

// Strict rate limiting for admin login
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 login attempts per IP per 15 minutes
  message: {
    status: 'error',
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin login validation rules
const adminLoginValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Invalid username format'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Invalid password format')
];

// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post('/login', adminLoginLimiter, adminLoginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, password } = req.body;

    // Check username
    if (username !== ADMIN_CREDENTIALS.username) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, ADMIN_CREDENTIALS.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: 'admin',
        username: username,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          username: username,
          role: 'admin'
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed, please try again later'
    });
  }
});

// @route   POST /api/admin/verify
// @desc    Verify admin token
// @access  Private
router.post('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No authentication token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: {
          username: decoded.username,
          role: decoded.role
        }
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      status: 'error',
      message: 'Invalid or expired authentication token'
    });
  }
});

// @route   POST /api/admin/logout
// @desc    Admin logout
// @access  Private
router.post('/logout', async (req, res) => {
  try {
    // In production, you may want to add token to blacklist
    res.json({
      status: 'success',
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Logout failed'
    });
  }
});

// @route   POST /api/admin/change-password
// @desc    Change admin password
// @access  Private
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No authentication token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 8 characters long'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, ADMIN_CREDENTIALS.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Generate new password hash
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // In production, update the password in database or environment config
    // For now, we'll just respond with success
    // NOTE: In production, you should update the password in your database or secure storage
    console.log('New password hash generated:', newPasswordHash);
    console.log('⚠️  WARNING: Update ADMIN_PASSWORD_HASH in environment variables with the new hash above');

    res.json({
      status: 'success',
      message: 'Password changed successfully. Please update the environment variable ADMIN_PASSWORD_HASH with the new hash shown in server logs.',
      data: {
        newPasswordHash: newPasswordHash
      }
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password'
    });
  }
});

module.exports = router;
