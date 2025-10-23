const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const AdminUser = require('../models/AdminUser');

const router = express.Router();

let cachedAdminCredentials = null;

function getAdminCredentials() {
  if (cachedAdminCredentials) {
    return cachedAdminCredentials;
  }

  const username = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!username || !passwordHash) {
    const missing = [];
    if (!username) missing.push('ADMIN_USERNAME');
    if (!passwordHash) missing.push('ADMIN_PASSWORD_HASH');
    throw new Error(
      `Admin credentials are not configured. Please set ${missing.join(
        ' and '
      )} environment variable${missing.length > 1 ? 's' : ''}.`
    );
  }

  cachedAdminCredentials = { username, passwordHash };
  return cachedAdminCredentials;
}

// Relaxed rate limiting for admin login
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased to 20 login attempts per IP per 15 minutes (was 3)
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
// @desc    Admin login (supports both legacy and new AdminUser)
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

    // First, try to find user in AdminUser collection
    const adminUser = await AdminUser.findOne({ 
      $or: [{ username }, { email: username }] 
    }).select('+password');

    if (adminUser) {
      // New AdminUser login
      
      // Check if account is locked
      if (adminUser.isLocked) {
        return res.status(401).json({
          status: 'error',
          message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
        });
      }

      // Check if account is active
      if (!adminUser.isActive) {
        return res.status(401).json({
          status: 'error',
          message: 'Account is disabled'
        });
      }

      // Verify password
      const isPasswordValid = await adminUser.comparePassword(password);
      if (!isPasswordValid) {
        // Increment login attempts
        await adminUser.incLoginAttempts();
        return res.status(401).json({
          status: 'error',
          message: 'Invalid username or password'
        });
      }

      // Reset login attempts and update last login
      await adminUser.updateLastLogin();

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: adminUser._id,
          username: adminUser.username,
          role: adminUser.role,
          permissions: adminUser.permissions
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
            id: adminUser._id,
            username: adminUser.username,
            email: adminUser.email,
            fullName: adminUser.fullName,
            role: adminUser.role,
            permissions: adminUser.permissions,
            lastLogin: adminUser.lastLogin
          }
        }
      });

    } else {
      // Legacy admin login (fallback)
      const adminCredentials = getAdminCredentials();
      
      // Check username
      if (username !== adminCredentials.username) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid username or password'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, adminCredentials.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid username or password'
        });
      }

      // Generate JWT token for legacy admin
      const token = jwt.sign(
        {
          userId: 'legacy-admin',
          id: 'legacy-admin', // For backward compatibility
          username: username,
          role: 'superadmin',
          permissions: {
            canView: true,
            canEdit: true,
            canDelete: true,
            canCreateUsers: true,
            canManageSettings: true
          }
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
            id: 'legacy-admin',
            username: username,
            email: 'admin@eplatformcredit.com',
            fullName: 'System Administrator',
            role: 'superadmin',
            permissions: {
              canView: true,
              canEdit: true,
              canDelete: true,
              canCreateUsers: true,
              canManageSettings: true
            }
          }
        }
      });
    }

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
    const adminCredentials = getAdminCredentials();

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, adminCredentials.passwordHash);
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
    console.log('WARNING: Update ADMIN_PASSWORD_HASH in environment variables with the new hash above');

    cachedAdminCredentials = {
      username: adminCredentials.username,
      passwordHash: newPasswordHash
    };

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
