const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const LoanApplication = require('../models/LoanApplication');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters.'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters.'),
  body('phone')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number.'),
  body('profile.annualIncome')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Annual income must be a positive number.'),
  body('profile.employmentStatus')
    .optional()
    .isIn(['full-time', 'part-time', 'self-employed', 'unemployed', 'retired', 'student'])
    .withMessage('Employment status is not valid.'),
  body('profile.creditScore')
    .optional()
    .isIn(['excellent', 'good', 'fair', 'poor', 'very-poor', 'unknown'])
    .withMessage('Credit score value is not valid.')
];

const changePasswordValidation = [
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Current password is required.'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must include uppercase, lowercase letters, and numbers.'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation must match the new password.');
      }
      return true;
    })
];

const deleteAccountValidation = [
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required to delete the account.'),
  body('confirmation')
    .equals('DELETE')
    .withMessage('Please type DELETE in uppercase to confirm account removal.')
];

const updatePreferencesValidation = [
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Email notification preference must be true or false.'),
  body('smsNotifications')
    .optional()
    .isBoolean()
    .withMessage('SMS notification preference must be true or false.'),
  body('language')
    .optional()
    .isIn(['zh', 'en', 'ms'])
    .withMessage('Preferred language must be zh, en, or ms.')
];

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed.',
      errors: errors.array()
    });
  }
  return null;
};

router.get('/profile', authenticate, async (req, res) => {
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
    console.error('[Users] Fetch profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch profile.'
    });
  }
});

router.put('/profile', authenticate, updateProfileValidation, async (req, res) => {
  if (handleValidation(req, res)) {
    return;
  }

  try {
    const allowedUpdates = ['firstName', 'lastName', 'phone', 'profile', 'preferences'];
    const updates = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (req.body.profile) {
      updates.profile = { ...req.body.profile };
    }

    if (req.body.preferences) {
      updates.preferences = { ...req.body.preferences };
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.'
      });
    }

    res.json({
      status: 'success',
      message: 'Profile updated successfully.',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          profile: user.profile,
          preferences: user.preferences,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('[Users] Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to update profile.'
    });
  }
});

router.put('/change-password', authenticate, changePasswordValidation, async (req, res) => {
  if (handleValidation(req, res)) {
    return;
  }

  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.'
      });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect.'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password updated successfully.'
    });
  } catch (error) {
    console.error('[Users] Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to change password.'
    });
  }
});

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

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

    const recentApplications = await LoanApplication.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('applicationNumber status loanDetails.amount createdAt');

    const pendingApplications = await LoanApplication.find({
      user: userId,
      status: { $in: ['pending', 'under-review'] }
    }).select('applicationNumber status loanDetails.amount createdAt');

    const totalApplications = await LoanApplication.countDocuments({ user: userId });
    const totalLoanAmount = await LoanApplication.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$loanDetails.amount' } } }
    ]);

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

    const formatApplication = (app) => ({
      id: app._id,
      applicationNumber: app.applicationNumber,
      status: app.status,
      amount: app.loanDetails.amount,
      submittedAt: app.createdAt
    });

    res.json({
      status: 'success',
      data: {
        dashboard: {
          statistics: stats,
          recentApplications: recentApplications.map(formatApplication),
          pendingApplications: pendingApplications.map(formatApplication)
        }
      }
    });
  } catch (error) {
    console.error('[Users] Dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to load dashboard data.'
    });
  }
});

router.delete('/account', authenticate, deleteAccountValidation, async (req, res) => {
  if (handleValidation(req, res)) {
    return;
  }

  try {
    const { password } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is incorrect.'
      });
    }

    const pendingApplications = await LoanApplication.countDocuments({
      user: req.user.id,
      status: { $in: ['pending', 'under-review', 'approved'] }
    });

    if (pendingApplications > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please resolve all active loan applications before deleting your account.'
      });
    }

    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    res.json({
      status: 'success',
      message: 'Account deleted successfully.'
    });
  } catch (error) {
    console.error('[Users] Delete account error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to delete account.'
    });
  }
});

router.get('/notifications', authenticate, async (req, res) => {
  try {
    const applications = await LoanApplication.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('applicationNumber status loanDetails.amount updatedAt createdAt');

    const buildMessage = (application) => {
      switch (application.status) {
        case 'pending':
          return {
            type: 'info',
            message: `Loan application ${application.applicationNumber} has been received.`
          };
        case 'under-review':
          return {
            type: 'info',
            message: `Loan application ${application.applicationNumber} is under review.`
          };
        case 'approved':
          return {
            type: 'success',
            message: `Loan application ${application.applicationNumber} has been approved.`
          };
        case 'rejected':
          return {
            type: 'error',
            message: `Loan application ${application.applicationNumber} has been rejected.`
          };
        case 'cancelled':
          return {
            type: 'warning',
            message: `Loan application ${application.applicationNumber} has been cancelled.`
          };
        default:
          return {
            type: 'info',
            message: `Loan application ${application.applicationNumber} has been updated.`
          };
      }
    };

    const notifications = applications.map((application) => {
      const { type, message } = buildMessage(application);
      return {
        id: application._id,
        message,
        type,
        applicationNumber: application.applicationNumber,
        amount: application.loanDetails.amount,
        status: application.status,
        timestamp: application.updatedAt,
        isRead: true
      };
    });

    res.json({
      status: 'success',
      data: {
        notifications,
        unreadCount: 0
      }
    });
  } catch (error) {
    console.error('[Users] Notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch notifications.'
    });
  }
});

router.put('/preferences', authenticate, updatePreferencesValidation, async (req, res) => {
  if (handleValidation(req, res)) {
    return;
  }

  try {
    const updates = {};

    if (typeof req.body.emailNotifications === 'boolean') {
      updates['preferences.emailNotifications'] = req.body.emailNotifications;
    }

    if (typeof req.body.smsNotifications === 'boolean') {
      updates['preferences.smsNotifications'] = req.body.smsNotifications;
    }

    if (req.body.language) {
      updates['preferences.language'] = req.body.language;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found.'
      });
    }

    res.json({
      status: 'success',
      message: 'Preferences updated successfully.',
      data: {
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('[Users] Update preferences error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to update preferences.'
    });
  }
});

module.exports = router;
