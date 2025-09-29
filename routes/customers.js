const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const VisitorTracking = require('../models/VisitorTracking');
const WhatsAppTracking = require('../models/WhatsAppTracking');

// POST /api/customers/applications - 接收快速申请
router.post('/applications', async (req, res) => {
  try {
    const { name, email, phone, loanAmount, purpose } = req.body;

    // 检查是否已存在客户 (邮箱或电话)
    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingCustomer) {
      // 更新现有客户信息
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
      // 创建新客户
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

// POST /api/customers/inquiries - 接收详细咨询
router.post('/inquiries', async (req, res) => {
  try {
    const { name, email, phone, company, loanAmount, purpose, monthlyIncome } = req.body;

    // 检查是否已存在客户
    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingCustomer) {
      // 更新现有客户信息
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
      // 创建新客户
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

// GET /api/customers - 获取所有客户 (Admin用)
router.get('/', async (req, res) => {
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

// PUT /api/customers/:id/status - 更新客户WhatsApp状态
router.put('/:id/status', async (req, res) => {
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

// POST /api/customers/:id/whatsapp-action - 记录WhatsApp动作
router.post('/:id/whatsapp-action', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminName, messageContent, fileType, fileName } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // 记录到WhatsApp追踪
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

    // 更新客户记录
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

// GET /api/customers/stats - 获取客户统计数据
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    // 基本统计
    const totalCustomers = await Customer.countDocuments();
    const newCustomersToday = await Customer.countDocuments({
      createdAt: { $gte: today }
    });
    const newCustomersThisMonth = await Customer.countDocuments({
      createdAt: { $gte: thisMonth }
    });

    // WhatsApp统计
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

    // 访问统计
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
      error: 'Failed to fetch statistics',
      details: error.message
    });
  }
});

module.exports = router;