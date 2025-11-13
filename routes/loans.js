const express = require('express');
const { body, validationResult } = require('express-validator');
const LoanApplication = require('../models/LoanApplication');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { strictBotProtection } = require('../middleware/botProtection');

const router = express.Router();

const loanApplicationValidation = [
  body('personalInfo.firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters.'),
  body('personalInfo.lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters.'),
  body('personalInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address.'),
  body('personalInfo.phone')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number.'),
  body('loanDetails.amount')
    .isNumeric()
    .isFloat({ min: 1000, max: 100000 })
    .withMessage('Loan amount must be between RM 1,000 and RM 100,000.'),
  body('loanDetails.purpose')
    .isIn(['debt-consolidation', 'home-improvement', 'auto-purchase', 'education', 'medical', 'business', 'other'])
    .withMessage('Please select a valid loan purpose.'),
  body('loanDetails.term')
    .isIn([12, 24, 36, 48, 60, 72, 84, 96, 108])
    .withMessage('Please select a valid loan tenure.'),
  body('financialInfo.annualIncome')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Annual income must be a positive number.'),
  body('financialInfo.employmentStatus')
    .isIn(['full-time', 'part-time', 'self-employed', 'unemployed', 'retired', 'student'])
    .withMessage('Employment status is not valid.'),
  body('financialInfo.creditScore')
    .isIn(['excellent', 'good', 'fair', 'poor', 'very-poor', 'unknown'])
    .withMessage('Credit score category is not valid.')
];

router.post('/apply', strictBotProtection, optionalAuth, loanApplicationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed.',
        errors: errors.array()
      });
    }

    const { personalInfo, loanDetails, financialInfo } = req.body;

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
        referrer: req.get('Referer')
      }
    });

    const monthlyPayment = loanApplication.calculateMonthlyPayment();
    const totalPayment = loanApplication.calculateTotalPayment();
    const totalInterest = loanApplication.calculateTotalInterest();

    await loanApplication.save();

    res.status(201).json({
      status: 'success',
      message: 'Loan application submitted successfully.',
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
    console.error('[Loans] Create application error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to submit loan application at this time.'
    });
  }
});

router.get('/applications', authenticate, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { user: req.user.id };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const applications = await LoanApplication.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-metadata -internalNotes');

    const total = await LoanApplication.countDocuments(query);

    const applicationsWithCalculations = applications.map((application) => {
      const monthlyPayment = application.calculateMonthlyPayment();
      const totalPayment = application.calculateTotalPayment();
      const totalInterest = application.calculateTotalInterest();

      return {
        ...application.toObject(),
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
    console.error('[Loans] List applications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch loan applications.'
    });
  }
});

router.get('/applications/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const application = await LoanApplication.findById(id)
      .populate('user', 'firstName lastName email')
      .populate('approval.approvedBy', 'firstName lastName')
      .populate('rejection.rejectedBy', 'firstName lastName');

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan application not found.'
      });
    }

    if (req.user) {
      const isOwner = application.user && application.user._id.toString() === req.user.id;
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to view this application.'
        });
      }
    } else {
      const { email } = req.query;
      if (!email || application.personalInfo.email !== email) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission to view this application.'
        });
      }
    }

    const monthlyPayment = application.calculateMonthlyPayment();
    const totalPayment = application.calculateTotalPayment();
    const totalInterest = application.calculateTotalInterest();

    const responseData = {
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

    if (application.approval && application.status === 'approved') {
      responseData.approval = application.approval;
    }

    if (application.rejection && application.status === 'rejected') {
      responseData.rejection = {
        reason: application.rejection.reason,
        rejectedAt: application.rejection.rejectedAt
      };
    }

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
    console.error('[Loans] Fetch application detail error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch loan application details.'
    });
  }
});

router.get('/applications/number/:applicationNumber', async (req, res) => {
  try {
    const { applicationNumber } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email address is required.'
      });
    }

    const application = await LoanApplication.findOne({
      applicationNumber,
      'personalInfo.email': email
    }).select('applicationNumber status personalInfo.firstName personalInfo.lastName loanDetails createdAt updatedAt');

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan application not found.'
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
          updatedAt: application.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('[Loans] Fetch by application number error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch loan application.'
    });
  }
});

router.put('/applications/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const application = await LoanApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan application not found.'
      });
    }

    const isOwner = application.user && application.user.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to cancel this application.'
      });
    }

    if (!['pending', 'under-review'].includes(application.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Only pending or under-review applications can be cancelled.'
      });
    }

    application.status = 'cancelled';
    await application.save();

    res.json({
      status: 'success',
      message: 'Application cancelled successfully.',
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
    console.error('[Loans] Cancel application error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to cancel loan application.'
    });
  }
});

router.get('/statistics', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin privileges are required to view statistics.'
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
    console.error('[Loans] Statistics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch loan statistics.'
    });
  }
});

module.exports = router;
