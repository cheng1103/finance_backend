const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const VisitorTracking = require('../models/VisitorTracking');
const WhatsAppTracking = require('../models/WhatsAppTracking');
const { authenticateAdmin } = require('../middleware/auth');

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

// POST /api/customers/applications - Create quick application (Public with rate limit)
router.post('/applications', applicationLimiter, async (req, res) => {
  try {
    const { name, email, phone, loanAmount, purpose } = req.body;

    // Check if customer exists
    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingCustomer) {
      // Update existing customer
      existingCustomer.loanAmount = loanAmount;
      existingCustomer.purpose = purpose;
      existingCustomer.inquiryType = 'quick_application';
      existingCustomer.whatsappStatus = 'new';
      existingCustomer.followUpNotes.push({
        note: `New quick application submitted: RM ${loanAmount} for ${purpose}`,
        action: 'new_application'
      });

      await existingCustomer.save();

      res.json({
        success: true,
        message: 'Application updated successfully',
        customerId: existingCustomer._id,
        isExisting: true
      });
    } else {
      // Create new customer
      const newCustomer = new Customer({
        name,
        email,
        phone,
        loanAmount: parseFloat(loanAmount),
        purpose,
        inquiryType: 'quick_application',
        whatsappStatus: 'new',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer') || ''
      });

      await newCustomer.save();

      res.json({
        success: true,
        message: 'Application submitted successfully',
        customerId: newCustomer._id,
        isExisting: false
      });
    }

  } catch (error) {
    console.error('Customer application error:', error);
    res.status(500).json({
      error: 'Failed to submit application',
      details: error.message
    });
  }
});

// POST /api/customers/inquiries - Create detailed inquiry (Public with rate limit)
router.post('/inquiries', applicationLimiter, async (req, res) => {
  try {
    const { name, email, phone, company, loanAmount, purpose, monthlyIncome } = req.body;

    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingCustomer) {
      existingCustomer.loanAmount = loanAmount;
      existingCustomer.purpose = purpose;
      existingCustomer.company = company || '';
      existingCustomer.monthlyIncome = monthlyIncome || '';
      existingCustomer.inquiryType = 'detailed_inquiry';
      existingCustomer.whatsappStatus = 'new';
      existingCustomer.followUpNotes.push({
        note: `New detailed inquiry: RM ${loanAmount} for ${purpose}, Income: ${monthlyIncome}`,
        action: 'new_inquiry'
      });

      await existingCustomer.save();

      res.json({
        success: true,
        message: 'Inquiry updated successfully',
        customerId: existingCustomer._id,
        isExisting: true
      });
    } else {
      const newCustomer = new Customer({
        name,
        email,
        phone,
        loanAmount: parseFloat(loanAmount),
        purpose,
        company: company || '',
        monthlyIncome: monthlyIncome || '',
        inquiryType: 'detailed_inquiry',
        whatsappStatus: 'new',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer') || ''
      });

      await newCustomer.save();

      res.json({
        success: true,
        message: 'Inquiry submitted successfully',
        customerId: newCustomer._id,
        isExisting: false
      });
    }

  } catch (error) {
    console.error('Customer inquiry error:', error);
    res.status(500).json({
      error: 'Failed to submit inquiry',
      details: error.message
    });
  }
});

// GET /api/customers/stats - Get customer statistics (Admin only)
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    // Basic statistics
    const totalCustomers = await Customer.countDocuments();
    const newCustomersToday = await Customer.countDocuments({
      createdAt: { $gte: today }
    });
    const newCustomersThisMonth = await Customer.countDocuments({
      createdAt: { $gte: thisMonth }
    });

    // WhatsApp statistics
    const whatsappStats = await WhatsAppTracking.aggregate([
      {
        $match: {
          timestamp: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    const whatsappStatsMonth = await WhatsAppTracking.aggregate([
      {
        $match: {
          timestamp: { $gte: thisMonth }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    // Visit statistics
    const visitsToday = await VisitorTracking.countDocuments({
      visitDate: { $gte: today }
    });

    const visitsThisMonth = await VisitorTracking.countDocuments({
      visitDate: { $gte: thisMonth }
    });

    res.json({
      success: true,
      data: {
        totalCustomers,
        newCustomersToday,
        newCustomersThisMonth,
        visitsToday,
        visitsThisMonth,
        whatsappToday: whatsappStats.reduce((acc, stat) => acc + stat.count, 0),
        whatsappThisMonth: whatsappStatsMonth.reduce((acc, stat) => acc + stat.count, 0),
        whatsappBreakdown: {
          today: whatsappStats,
          thisMonth: whatsappStatsMonth
        }
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
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { status, type, limit = 50, page = 1 } = req.query;

    const query = {};
    if (status) query.whatsappStatus = status;
    if (type) query.inquiryType = type;

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit);

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
router.get('/:id', authenticateAdmin, async (req, res) => {
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
router.put('/:id', authenticateAdmin, async (req, res) => {
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
router.delete('/:id', authenticateAdmin, async (req, res) => {
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
router.put('/:id/status', authenticateAdmin, async (req, res) => {
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
router.post('/:id/whatsapp-action', authenticateAdmin, async (req, res) => {
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

module.exports = router;
