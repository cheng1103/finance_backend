const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const VisitorTracking = require('../models/VisitorTracking');
const WhatsAppTracking = require('../models/WhatsAppTracking');
const AdminUser = require('../models/AdminUser');
const { authenticateAdmin } = require('../middleware/auth');
const { permissions } = require('../middleware/permissions');

// Rate limiting middleware for public endpoints
const rateLimit = require('express-rate-limit');

// Rate limiter for customer applications (stricter)
const applicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    success: false,
    error: 'Too many applications from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation for Quick Application
const quickApplicationValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2-100 characters')
    .escape(),

  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('phone')
    .trim()
    .matches(/^\+60[0-9]{9,10}$/)
    .withMessage('Please provide a valid Malaysian phone number starting with +60'),

  body('loanAmount')
    .isNumeric()
    .isFloat({ min: 1000, max: 100000 })
    .withMessage('Loan amount must be between RM 1,000 and RM 100,000'),

  body('purpose')
    .trim()
    .notEmpty()
    .withMessage('Loan purpose is required')
    .isLength({ min: 2, max: 500 })
    .withMessage('Purpose must be between 2-500 characters')
    .escape(),

  body('captchaVerified')
    .isBoolean()
    .custom((value) => value === true)
    .withMessage('Captcha verification required')
];

// POST /api/customers/applications - Create quick application (Public with rate limit)
router.post('/applications', applicationLimiter, quickApplicationValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, email, phone, loanAmount, purpose } = req.body;

    // Check if customer exists
    let customer = await Customer.findOne({
      $or: [{ email }, { phone }]
    });

    if (customer) {
      // Add to quickApplications array
      customer.quickApplications.push({
        name,
        email,
        phone,
        amount: parseFloat(loanAmount),
        purpose,
        status: 'pending',
        submittedAt: new Date()
      });
      customer.whatsappStatus = 'new';
      customer.followUpNotes.push({
        note: `New quick application: RM ${loanAmount} for ${purpose}`,
        action: 'quick_application'
      });

      await customer.save();

      res.json({
        success: true,
        message: 'Quick application submitted successfully',
        customerId: customer._id,
        isExisting: true
      });
    } else {
      // Create new customer with quick application
      const newCustomer = new Customer({
        name,
        email,
        phone,
        whatsappNumber: phone,
        quickApplications: [{
          name,
          email,
          phone,
          amount: parseFloat(loanAmount),
          purpose,
          status: 'pending',
          submittedAt: new Date()
        }],
        whatsappStatus: 'new',
        metadata: {
          source: 'quick_application',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          referrer: req.get('Referer') || ''
        }
      });

      await newCustomer.save();

      res.json({
        success: true,
        message: 'Quick application submitted successfully',
        customerId: newCustomer._id,
        isExisting: false
      });
    }

  } catch (error) {
    console.error('Quick application error:', error);
    res.status(500).json({
      error: 'Failed to submit quick application',
      details: error.message
    });
  }
});

// Validation for Detailed Inquiry
const detailedInquiryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2-100 characters')
    .escape(),

  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('phone')
    .trim()
    .matches(/^\+60[0-9]{9,10}$/)
    .withMessage('Please provide a valid Malaysian phone number starting with +60'),

  body('company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name too long')
    .escape(),

  body('loanAmount')
    .isNumeric()
    .isFloat({ min: 1000, max: 100000 })
    .withMessage('Loan amount must be between RM 1,000 and RM 100,000'),

  body('purpose')
    .trim()
    .notEmpty()
    .withMessage('Loan purpose is required')
    .isLength({ min: 2, max: 500 })
    .withMessage('Purpose must be between 2-500 characters')
    .escape(),

  body('monthlyIncome')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .escape(),

  body('captchaVerified')
    .optional()
    .isBoolean()
    .custom((value) => value === true)
    .withMessage('Captcha verification required')
];

// POST /api/customers/inquiries - Create detailed inquiry (Public with rate limit)
router.post('/inquiries', applicationLimiter, detailedInquiryValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, email, phone, company, loanAmount, purpose, monthlyIncome } = req.body;

    let customer = await Customer.findOne({
      $or: [{ email }, { phone }]
    });

    if (customer) {
      // Add to detailedInquiries array
      customer.detailedInquiries.push({
        name,
        email,
        phone,
        company: company || '',
        amount: parseFloat(loanAmount),
        purpose,
        monthlyIncome: monthlyIncome || '',
        status: 'pending',
        submittedAt: new Date()
      });
      customer.whatsappStatus = 'new';
      customer.followUpNotes.push({
        note: `New detailed inquiry: RM ${loanAmount} for ${purpose}`,
        action: 'detailed_inquiry'
      });

      await customer.save();

      res.json({
        success: true,
        message: 'Detailed inquiry submitted successfully',
        customerId: customer._id,
        isExisting: true
      });
    } else {
      // Create new customer with detailed inquiry
      const newCustomer = new Customer({
        name,
        email,
        phone,
        whatsappNumber: phone,
        company: company || '',
        monthlyIncome: monthlyIncome || '',
        detailedInquiries: [{
          name,
          email,
          phone,
          company: company || '',
          amount: parseFloat(loanAmount),
          purpose,
          monthlyIncome: monthlyIncome || '',
          status: 'pending',
          submittedAt: new Date()
        }],
        whatsappStatus: 'new',
        metadata: {
          source: 'detailed_inquiry',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          referrer: req.get('Referer') || ''
        }
      });

      await newCustomer.save();

      res.json({
        success: true,
        message: 'Detailed inquiry submitted successfully',
        customerId: newCustomer._id,
        isExisting: false
      });
    }

  } catch (error) {
    console.error('Detailed inquiry error:', error);
    res.status(500).json({
      error: 'Failed to submit detailed inquiry',
      details: error.message
    });
  }
});

// GET /api/customers/stats - Get customer statistics (Admin only)
router.get('/stats', permissions.canView, async (req, res) => {
  try {
    const { period = 'all' } = req.query; // 1month, 3months, 6months, 1year, all

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Calculate start date based on period
    let startDate = new Date(2020, 0, 1); // Default to 2020 for "all"
    if (period === '1month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === '3months') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
    } else if (period === '6months') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 6);
    } else if (period === '1year') {
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
    }

    // Total counts (all time)
    const totalVisitors = await VisitorTracking.countDocuments();
    const totalCustomers = await Customer.countDocuments();

    // Period-specific visitor stats
    const visitorsInPeriod = await VisitorTracking.countDocuments({
      visitDate: { $gte: startDate }
    });

    // Get all applications from all customers
    const customers = await Customer.find().lean();

    // Count all applications (all time)
    let totalLoanApplications = 0;
    let totalQuickApplications = 0;
    let totalDetailedInquiries = 0;

    // Count applications in period
    let loanApplicationsInPeriod = 0;
    let quickApplicationsInPeriod = 0;
    let detailedInquiriesInPeriod = 0;

    // Applications by status (all time and period)
    const applicationsByStatus = {
      all: { pending: 0, approved: 0, rejected: 0, cancelled: 0 },
      period: { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
    };

    customers.forEach(customer => {
      // Loan Applications
      if (customer.loanApplications) {
        totalLoanApplications += customer.loanApplications.length;
        customer.loanApplications.forEach(app => {
          applicationsByStatus.all[app.status] = (applicationsByStatus.all[app.status] || 0) + 1;
          if (new Date(app.submittedAt) >= startDate) {
            loanApplicationsInPeriod++;
            applicationsByStatus.period[app.status] = (applicationsByStatus.period[app.status] || 0) + 1;
          }
        });
      }

      // Quick Applications
      if (customer.quickApplications) {
        totalQuickApplications += customer.quickApplications.length;
        customer.quickApplications.forEach(app => {
          applicationsByStatus.all[app.status] = (applicationsByStatus.all[app.status] || 0) + 1;
          if (new Date(app.submittedAt) >= startDate) {
            quickApplicationsInPeriod++;
            applicationsByStatus.period[app.status] = (applicationsByStatus.period[app.status] || 0) + 1;
          }
        });
      }

      // Detailed Inquiries
      if (customer.detailedInquiries) {
        totalDetailedInquiries += customer.detailedInquiries.length;
        customer.detailedInquiries.forEach(app => {
          applicationsByStatus.all[app.status] = (applicationsByStatus.all[app.status] || 0) + 1;
          if (new Date(app.submittedAt) >= startDate) {
            detailedInquiriesInPeriod++;
            applicationsByStatus.period[app.status] = (applicationsByStatus.period[app.status] || 0) + 1;
          }
        });
      }
    });

    const totalApplications = totalLoanApplications + totalQuickApplications + totalDetailedInquiries;
    const applicationsInPeriod = loanApplicationsInPeriod + quickApplicationsInPeriod + detailedInquiriesInPeriod;

    // Monthly trend data (for charts)
    const monthlyData = await VisitorTracking.aggregate([
      {
        $match: {
          visitDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$visitDate' },
            month: { $month: '$visitDate' }
          },
          visitors: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      success: true,
      period,
      data: {
        // All time totals
        totalVisitors,
        totalCustomers,
        totalApplications,
        totalLoanApplications,
        totalQuickApplications,
        totalDetailedInquiries,

        // Period-specific
        visitorsInPeriod,
        applicationsInPeriod,
        loanApplicationsInPeriod,
        quickApplicationsInPeriod,
        detailedInquiriesInPeriod,

        // Status breakdown
        applicationsByStatus,

        // Conversion rate
        conversionRate: totalVisitors > 0 ? ((totalApplications / totalVisitors) * 100).toFixed(2) : 0,
        periodConversionRate: visitorsInPeriod > 0 ? ((applicationsInPeriod / visitorsInPeriod) * 100).toFixed(2) : 0,

        // Chart data
        monthlyData,

        // Date range
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

// GET /api/customers - Get all customers (Admin only)
router.get('/', permissions.canView, async (req, res) => {
  try {
    const { status, type, limit = 100, page = 1 } = req.query;

    const query = {};
    if (status) query.whatsappStatus = status;
    if (type) query.inquiryType = type;

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit)
      .select('+loanApplications +quickApplications +detailedInquiries +inquiries') // Include all form arrays
      .populate('loanApplications.assignedTo', 'username fullName')
      .populate('quickApplications.assignedTo', 'username fullName')
      .populate('detailedInquiries.assignedTo', 'username fullName');

    const totalCustomers = await Customer.countDocuments(query);

    res.json({
      success: true,
      data: customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCustomers,
        pages: Math.ceil(totalCustomers / limit)
      }
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      error: 'Failed to fetch customers',
      details: error.message
    });
  }
});

// GET /api/customers/:id - Get single customer by ID (Admin only)
router.get('/:id', permissions.canView, async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer',
      details: error.message
    });
  }
});

// PUT /api/customers/:id - Update customer (Admin only)
router.put('/:id', permissions.canEdit, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'createdAt' && updateData[key] !== undefined) {
        customer[key] = updateData[key];
      }
    });

    // Add update note
    customer.followUpNotes.push({
      note: 'Customer information updated by admin',
      action: 'admin_update'
    });

    await customer.save();

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });

  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update customer',
      details: error.message
    });
  }
});

// DELETE /api/customers/:id - Delete customer (Admin only)
router.delete('/:id', permissions.canDelete, async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Delete related WhatsApp tracking records
    await WhatsAppTracking.deleteMany({ customerId: id });

    // Delete customer
    await Customer.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Customer deleted successfully',
      deletedId: id
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete customer',
      details: error.message
    });
  }
});

// PUT /api/customers/:id/status - Update customer WhatsApp status (Admin only)
router.put('/:id/status', permissions.canEdit, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    customer.whatsappStatus = status;
    if (status === 'contacted') {
      customer.lastContactedAt = new Date();
    }

    if (note) {
      customer.followUpNotes.push({
        note,
        action: `status_changed_to_${status}`
      });
    }

    await customer.save();

    res.json({
      success: true,
      message: 'Customer status updated',
      customer
    });

  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({
      error: 'Failed to update customer status',
      details: error.message
    });
  }
});

// POST /api/customers/:id/whatsapp-action - Record WhatsApp action (Admin only)
router.post('/:id/whatsapp-action', permissions.canView, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminName, messageContent, fileType, fileName } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Record WhatsApp tracking
    const whatsappTracking = new WhatsAppTracking({
      customerId: id,
      whatsappNumber: customer.whatsappNumber,
      customerName: customer.name,
      action,
      adminName,
      messageContent,
      fileType,
      fileName
    });
    await whatsappTracking.save();

    // Update customer record
    customer.whatsappInteractions.push({
      type: action,
      message: messageContent || `${action} by ${adminName}`
    });

    if (action === 'whatsapp_opened' || action === 'message_sent') {
      customer.lastContactedAt = new Date();
      customer.whatsappStatus = 'contacted';
    }

    await customer.save();

    res.json({
      success: true,
      message: 'WhatsApp action recorded',
      trackingId: whatsappTracking._id
    });

  } catch (error) {
    console.error('WhatsApp action error:', error);
    res.status(500).json({
      error: 'Failed to record WhatsApp action',
      details: error.message
    });
  }
});

// PUT /api/customers/:customerId/assign-application - Assign application to admin
router.put('/:customerId/assign-application', permissions.canView, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { applicationType, applicationIndex, assignedToId } = req.body;

    // Validate input
    if (!applicationType || applicationIndex === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Application type and index are required'
      });
    }

    // Verify admin user exists if assignedToId is provided
    if (assignedToId) {
      const adminUser = await AdminUser.findById(assignedToId);
      if (!adminUser) {
        return res.status(404).json({
          success: false,
          error: 'Admin user not found'
        });
      }
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Update assignment based on application type
    let applicationArray;
    switch (applicationType) {
      case 'loanApplications':
        applicationArray = customer.loanApplications;
        break;
      case 'quickApplications':
        applicationArray = customer.quickApplications;
        break;
      case 'detailedInquiries':
        applicationArray = customer.detailedInquiries;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid application type'
        });
    }

    if (!applicationArray[applicationIndex]) {
      return res.status(404).json({
        success: false,
        error: 'Application not found at specified index'
      });
    }

    // Update assignment
    applicationArray[applicationIndex].assignedTo = assignedToId || null;
    applicationArray[applicationIndex].assignedAt = assignedToId ? new Date() : null;

    await customer.save();

    // Populate the assignedTo field for response
    await customer.populate(`${applicationType}.${applicationIndex}.assignedTo`, 'username fullName');

    res.json({
      success: true,
      message: assignedToId ? 'Application assigned successfully' : 'Application unassigned successfully',
      data: {
        application: applicationArray[applicationIndex]
      }
    });

  } catch (error) {
    console.error('Assign application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign application',
      details: error.message
    });
  }
});

module.exports = router;
