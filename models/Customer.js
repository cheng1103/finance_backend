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
    default: function() {
      // 如果电话号码以+60开头，直接使用，否则添加+60
      if (this.phone.startsWith('+60')) {
        return this.phone;
      } else if (this.phone.startsWith('60')) {
        return '+' + this.phone;
      } else if (this.phone.startsWith('0')) {
        return '+6' + this.phone;
      } else {
        return '+60' + this.phone;
      }
    }
  },

  // 贷款信息
  loanAmount: {
    type: Number,
    required: true
  },
  purpose: {
    type: String,
    required: true,
    trim: true
  },

  // 可选信息
  company: {
    type: String,
    trim: true,
    default: ''
  },
  monthlyIncome: {
    type: String,
    trim: true,
    default: ''
  },

  // 申请类型
  inquiryType: {
    type: String,
    enum: ['quick_application', 'detailed_inquiry'],
    required: true
  },

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
    action: String // 'whatsapp_sent', 'called', 'email_sent', etc.
  }],

  // WhatsApp 互动记录
  whatsappInteractions: [{
    date: { type: Date, default: Date.now },
    type: String, // 'message_sent', 'message_received', 'file_sent'
    message: String
  }],

  // 系统记录
  source: {
    type: String,
    default: 'website'
  },
  ipAddress: String,
  userAgent: String,
  referrer: String,

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastContactedAt: {
    type: Date
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