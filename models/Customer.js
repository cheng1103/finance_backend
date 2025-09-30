const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },

  // WhatsApp 信息
  whatsappNumber: {
    type: String,
    trim: true
  },

  // Work information
  company: {
    type: String,
    trim: true,
    default: ''
  },
  position: {
    type: String,
    trim: true,
    default: ''
  },
  monthlyIncome: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },

  // 贷款申请列表 (支持多个申请)
  loanApplications: [{
    amount: Number,
    purpose: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],

  // 联系咨询列表
  inquiries: [{
    subject: String,
    message: String,
    submittedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved'],
      default: 'new'
    }
  }],

  // WhatsApp 跟进状态
  whatsappStatus: {
    type: String,
    enum: ['new', 'contacted', 'in_progress', 'completed', 'rejected'],
    default: 'new'
  },

  // 跟进记录
  followUpNotes: [{
    date: { type: Date, default: Date.now },
    note: String,
    action: String, // 'whatsapp_sent', 'called', 'email_sent', etc.
    addedBy: String
  }],

  // WhatsApp 互动记录
  whatsappInteractions: [{
    date: { type: Date, default: Date.now },
    type: String, // 'message_sent', 'message_received', 'file_sent', 'whatsapp_opened'
    message: String,
    initiatedBy: String
  }],

  // 系统记录
  metadata: {
    source: {
      type: String,
      default: 'website'
    },
    ipAddress: String,
    userAgent: String,
    referrer: String
  },

  // 时间戳
  lastContact: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新 updatedAt 字段
customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 索引
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ whatsappNumber: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ whatsappStatus: 1 });

module.exports = mongoose.model('Customer', customerSchema);