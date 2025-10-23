const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Mock data for testing
const mockCustomers = [
  {
    _id: '67020ab47b01234567890001',
    name: 'Ahmad bin Hassan',
    email: 'ahmad@example.com',
    phone: '+60123456789',
    whatsappNumber: '+60123456789',
    loanAmount: 50000,
    purpose: 'Business expansion',
    company: 'Tech Solutions',
    inquiryType: 'quick_application',
    whatsappStatus: 'new',
    createdAt: new Date('2024-09-28'),
    followUpNotes: [],
    whatsappInteractions: []
  },
  {
    _id: '67020ab47b01234567890002',
    name: 'Siti Nurhaliza',
    email: 'siti@example.com',
    phone: '+60187654321',
    whatsappNumber: '+60187654321',
    loanAmount: 30000,
    purpose: 'Home renovation',
    company: 'Marketing Agency',
    inquiryType: 'detailed_inquiry',
    whatsappStatus: 'contacted',
    createdAt: new Date('2024-09-27'),
    followUpNotes: [],
    whatsappInteractions: []
  }
];

const mockVisitors = [
  { visitDate: new Date(), page: '/', deviceType: 'desktop', isNewVisitor: true },
  { visitDate: new Date(), page: '/about', deviceType: 'mobile', isNewVisitor: false },
  { visitDate: new Date(), page: '/login', deviceType: 'desktop', isNewVisitor: true }
];

const mockWhatsAppActions = [
  { action: 'whatsapp_opened', timestamp: new Date(), customerId: '67020ab47b01234567890001' },
  { action: 'message_sent', timestamp: new Date(), customerId: '67020ab47b01234567890002' }
];

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Test Finance Platform API is running',
    timestamp: new Date().toISOString()
  });
});

// Customer routes
app.post('/api/customers/applications', (req, res) => {
  console.log('Application received:', req.body);
  const newCustomer = {
    _id: '67020ab47b01234567890' + Math.floor(Math.random() * 1000),
    ...req.body,
    whatsappNumber: req.body.phone.startsWith('+60') ? req.body.phone : '+60' + req.body.phone,
    inquiryType: 'quick_application',
    whatsappStatus: 'new',
    createdAt: new Date()
  };
  mockCustomers.push(newCustomer);

  res.json({
    success: true,
    message: 'Application submitted successfully',
    customerId: newCustomer._id,
    isExisting: false
  });
});

app.post('/api/customers/inquiries', (req, res) => {
  console.log('Inquiry received:', req.body);
  const newCustomer = {
    _id: '67020ab47b01234567890' + Math.floor(Math.random() * 1000),
    ...req.body,
    whatsappNumber: req.body.phone.startsWith('+60') ? req.body.phone : '+60' + req.body.phone,
    inquiryType: 'detailed_inquiry',
    whatsappStatus: 'new',
    createdAt: new Date()
  };
  mockCustomers.push(newCustomer);

  res.json({
    success: true,
    message: 'Inquiry submitted successfully',
    customerId: newCustomer._id,
    isExisting: false
  });
});

app.get('/api/customers', (req, res) => {
  const { limit = 20 } = req.query;
  const customers = mockCustomers.slice(0, parseInt(limit));

  res.json({
    success: true,
    data: customers,
    pagination: {
      page: 1,
      limit: parseInt(limit),
      total: mockCustomers.length,
      pages: Math.ceil(mockCustomers.length / parseInt(limit))
    }
  });
});

app.get('/api/customers/stats', (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const newCustomersToday = mockCustomers.filter(c =>
    new Date(c.createdAt) >= today
  ).length;

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const newCustomersThisMonth = mockCustomers.filter(c =>
    new Date(c.createdAt) >= thisMonth
  ).length;

  res.json({
    success: true,
    data: {
      totalCustomers: mockCustomers.length,
      newCustomersToday,
      newCustomersThisMonth,
      whatsappToday: mockWhatsAppActions.filter(a =>
        new Date(a.timestamp) >= today
      ).length,
      whatsappThisMonth: mockWhatsAppActions.filter(a =>
        new Date(a.timestamp) >= thisMonth
      ).length
    }
  });
});

app.post('/api/customers/:id/whatsapp-action', (req, res) => {
  const { id } = req.params;
  const { action, adminName, messageContent } = req.body;

  console.log(`WhatsApp action: ${action} for customer ${id}`);

  mockWhatsAppActions.push({
    customerId: id,
    action,
    adminName,
    messageContent,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'WhatsApp action recorded',
    trackingId: 'track_' + Date.now()
  });
});

// Visitor tracking routes
app.post('/api/tracking/visit', (req, res) => {
  console.log('Visit tracked:', req.body);

  mockVisitors.push({
    ...req.body,
    visitDate: new Date(),
    ipAddress: req.ip
  });

  res.json({
    success: true,
    message: 'Visit tracked successfully',
    trackingId: 'visit_' + Date.now()
  });
});

app.get('/api/tracking/stats', (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visitsToday = mockVisitors.filter(v =>
    new Date(v.visitDate) >= today
  ).length;

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const visitsThisMonth = mockVisitors.filter(v =>
    new Date(v.visitDate) >= thisMonth
  ).length;

  res.json({
    success: true,
    data: {
      summary: {
        visitsToday,
        visitsThisMonth,
        totalVisits: mockVisitors.length,
        newVisitorsToday: mockVisitors.filter(v =>
          new Date(v.visitDate) >= today && v.isNewVisitor
        ).length
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.originalUrl}`
  });
});

const PORT = 3001;
const server = app.listen(PORT, () => {
  console.log(`🧪 Test Finance Platform API Server Started!`);
  console.log(`📍 Server Address: http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🎯 Using mock data for testing`);
});

module.exports = app;