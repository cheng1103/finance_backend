const express = require('express');
const { body, validationResult } = require('express-validator');
const AdminUser = require('../models/AdminUser');
const { authenticateAdmin } = require('../middleware/auth');
const { permissions } = require('../middleware/permissions');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// @route   GET /api/admin/users/test-permission
// @desc    Test permission system
// @access  Private (All authenticated users)
router.get('/test-permission', authenticateAdmin, async (req, res) => {
  try {
    res.json({
      status: 'success',
      data: {
        user: req.user,
        message: 'Permission test successful',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Permission test error:', error);
    res.status(500).json({ status: 'error', message: 'Permission test failed' });
  }
});

// @route   GET /api/admin/users/list-for-assignment
// @desc    Get simplified list of admins for assignment dropdown (All authenticated admins)
// @access  Private (All authenticated users)
router.get('/list-for-assignment', authenticateAdmin, async (req, res) => {
  try {
    const users = await AdminUser.find({ isActive: true })
      .select('username fullName role')
      .sort({ fullName: 1 });

    res.json({
      status: 'success',
      data: users.map(user => ({
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      }))
    });

  } catch (error) {
    console.error('Get admin list for assignment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch admin list'
    });
  }
});

// Rate limiting for user creation
const createUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 user creations per IP per 15 minutes
  message: {
    status: 'error',
    message: 'Too many user creation attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation for creating new admin user
const createUserValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2-100 characters'),
  body('role')
    .isIn(['admin', 'viewer'])
    .withMessage('Role must be either admin or viewer')
];

// @route   GET /api/admin/users
// @desc    Get all admin users (Superadmin only)
// @access  Private
router.get('/', permissions.canCreateUsers, async (req, res) => {
  try {
    // Check if user has permission to view users
    if (req.user.role !== 'superadmin' && !req.user.permissions?.canCreateUsers) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions to view users'
      });
    }

    const users = await AdminUser.find()
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      data: {
        users: users.map(user => ({
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          permissions: user.permissions,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          createdBy: user.createdBy
        }))
      }
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch admin users'
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create new admin user (Superadmin only)
// @access  Private
router.post('/', createUserLimiter, permissions.canCreateUsers, createUserValidation, async (req, res) => {
  try {
    // Check if user has permission to create users
    // Allow legacy admin (id: 'legacy-admin') to create users
    if (req.user.userId === 'legacy-admin' || req.user.role === 'superadmin' || req.user.permissions?.canCreateUsers) {
    } else {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions to create users'
      });
    }

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password, fullName, role } = req.body;

    // Check if username already exists
    const existingUser = await AdminUser.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Username or email already exists'
      });
    }

    // Create new admin user
    // Handle legacy admin case - set createdBy to null for legacy admin
    const createdBy = req.user.userId === 'legacy-admin' ? null : req.user.userId;
    
    const newUser = new AdminUser({
      username,
      email,
      password,
      fullName,
      role,
      createdBy: createdBy
    });

    await newUser.save();

    // Remove password from response
    const userResponse = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      permissions: newUser.permissions,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      createdBy: newUser.createdBy
    };

    res.status(201).json({
      status: 'success',
      message: 'Admin user created successfully',
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    console.error('Create admin user error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to create admin user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update admin user (Superadmin only)
// @access  Private
router.put('/:id', permissions.canCreateUsers, async (req, res) => {
  try {
    // Check if user has permission to edit users
    if (req.user.role !== 'superadmin' && !req.user.permissions?.canCreateUsers) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions to edit users'
      });
    }

    const { id } = req.params;
    const { fullName, role, isActive } = req.body;

    // Prevent editing superadmin accounts
    const targetUser = await AdminUser.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (targetUser.role === 'superadmin' && req.user.userId !== id) {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot edit superadmin accounts'
      });
    }

    // Build update object
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (role && role !== 'superadmin') updateData.role = role; // Prevent role escalation
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const updatedUser = await AdminUser.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -passwordResetToken -passwordResetExpires');

    res.json({
      status: 'success',
      message: 'User updated successfully',
      data: {
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          role: updatedUser.role,
          permissions: updatedUser.permissions,
          isActive: updatedUser.isActive,
          lastLogin: updatedUser.lastLogin,
          createdAt: updatedUser.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete admin user (Superadmin only)
// @access  Private
router.delete('/:id', permissions.canCreateUsers, async (req, res) => {
  try {
    // Check if user has permission to delete users
    if (req.user.role !== 'superadmin' && !req.user.permissions?.canCreateUsers) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions to delete users'
      });
    }

    const { id } = req.params;

    // Prevent deleting superadmin accounts
    const targetUser = await AdminUser.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (targetUser.role === 'superadmin') {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot delete superadmin accounts'
      });
    }

    // Prevent deleting own account
    if (req.user.userId === id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete your own account'
      });
    }

    await AdminUser.findByIdAndDelete(id);

    res.json({
      status: 'success',
      message: 'User deleted successfully',
      data: {
        deletedId: id
      }
    });

  } catch (error) {
    console.error('Delete admin user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user'
    });
  }
});

// @route   PUT /api/admin/users/:id/password
// @desc    Reset user password (Superadmin only)
// @access  Private
router.put('/:id/password', permissions.canCreateUsers, [
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    // Check if user has permission to manage users
    if (req.user.role !== 'superadmin' && !req.user.permissions?.canCreateUsers) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions to reset passwords'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    const user = await AdminUser.findById(id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset password'
    });
  }
});

// @route   GET /api/admin/users/stats
// @desc    Get user statistics (Superadmin only)
// @access  Private
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    // Check if user has permission to view stats
    if (req.user.role !== 'superadmin' && !req.user.permissions?.canCreateUsers) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions to view statistics'
      });
    }

    const totalUsers = await AdminUser.countDocuments();
    const activeUsers = await AdminUser.countDocuments({ isActive: true });
    const superadmins = await AdminUser.countDocuments({ role: 'superadmin' });
    const admins = await AdminUser.countDocuments({ role: 'admin' });
    const viewers = await AdminUser.countDocuments({ role: 'viewer' });

    // Recent logins (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLogins = await AdminUser.countDocuments({
      lastLogin: { $gte: sevenDaysAgo }
    });

    res.json({
      status: 'success',
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        byRole: {
          superadmins,
          admins,
          viewers
        },
        recentLogins,
        lastWeek: Math.round((recentLogins / totalUsers) * 100) || 0 // Percentage
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user statistics'
    });
  }
});

module.exports = router;
