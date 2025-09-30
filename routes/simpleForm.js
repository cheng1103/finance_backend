const express = require('express');
const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');
const VisitorTracking = require('../models/VisitorTracking');

const router = express.Router();

// Simple validation for Malaysian phone numbers and email
const simpleApplicationValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2-100 characters'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('phone')
    .matches(/^\+60[0-9]{9,10}$/)
    .withMessage('Please provide a valid Malaysian phone number starting with +60'),

  body('loanAmount')
    .isNumeric()
    .isFloat({ min: 1000, max: 100000 })
    .withMessage('Loan amount must be between RM 1,000 and RM 100,000'),

  body('purpose')
    .trim()
    .notEmpty()
    .withMessage('Loan purpose is required'),

  body('captchaVerified')
    .isBoolean()
    .custom((value) => value === true)
    .withMessage('Captcha verification required')
];

// @route   POST /api/applications
// @desc    简单贷款申请表单提交
// @access  Public
router.post('/applications', simpleApplicationValidation, async (req, res) => {
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

    const { name, email, phone, loanAmount, purpose, monthlyIncome } = req.body;

    // Create or update customer record
    let customer = await Customer.findOne({ email });

    if (customer) {
      // Update existing customer
      customer.name = name;
      customer.phone = phone;
      customer.whatsappNumber = phone; // Use phone as WhatsApp number
      customer.loanApplications.push({
        amount: parseFloat(loanAmount),
        purpose,
        status: 'pending',
        submittedAt: new Date()
      });
      customer.lastContact = new Date();
      await customer.save();
    } else {
      // Create new customer
      customer = new Customer({
        name,
        email,
        phone,
        whatsappNumber: phone,
        company: monthlyIncome || 'Not provided',
        loanApplications: [{
          amount: parseFloat(loanAmount),
          purpose,
          status: 'pending',
          submittedAt: new Date()
        }],
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          source: 'website_loan_form'
        }
      });
      await customer.save();
    }

    // Log application
    console.log('='.repeat(60));
    console.log('📋 New Loan Application Received (from Backend):');
    console.log('='.repeat(60));
    console.log('Customer ID:', customer._id);
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Loan Amount: RM', loanAmount);
    console.log('Purpose:', purpose);
    console.log('Monthly Income:', monthlyIncome || 'Not provided');
    console.log('Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      id: customer._id.toString()
    });

  } catch (error) {
    console.error('❌ Application submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application',
      details: error.message
    });
  }
});

// @route   POST /api/inquiries
// @desc    简单联系表单提交
// @access  Public
router.post('/inquiries', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').matches(/^\+60[0-9]{9,10}$/).withMessage('Valid Malaysian phone number required'),
  body('captchaVerified').custom(val => val === true).withMessage('Captcha required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, email, phone, subject, message, purpose } = req.body;

    // Create or update customer record for inquiry
    let customer = await Customer.findOne({ email });

    if (customer) {
      customer.name = name;
      customer.phone = phone;
      customer.whatsappNumber = phone;
      customer.inquiries.push({
        subject: subject || purpose || 'General Inquiry',
        message: message || 'Contact form submission',
        submittedAt: new Date()
      });
      customer.lastContact = new Date();
      await customer.save();
    } else {
      customer = new Customer({
        name,
        email,
        phone,
        whatsappNumber: phone,
        inquiries: [{
          subject: subject || purpose || 'General Inquiry',
          message: message || 'Contact form submission',
          submittedAt: new Date()
        }],
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          source: 'website_contact_form'
        }
      });
      await customer.save();
    }

    console.log('='.repeat(60));
    console.log('💬 New Contact Inquiry Received (from Backend):');
    console.log('='.repeat(60));
    console.log('Customer ID:', customer._id);
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Subject:', subject || purpose);
    console.log('Message:', message);
    console.log('='.repeat(60));

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      id: customer._id.toString()
    });

  } catch (error) {
    console.error('❌ Inquiry submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit inquiry',
      details: error.message
    });
  }
});

module.exports = router;