const mongoose = require('mongoose');

const whatsappTrackingSchema = new mongoose.Schema({
  // 客户信息
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  whatsappNumber: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },

  // WhatsApp 动作
  action: {
    type: String,
    enum: ['number_copied', 'whatsapp_opened', 'message_sent', 'file_sent'],
    required: true
  },

  // 管理员信息
  adminId: String,
  adminName: String,

  // 消息内容 (如果是发送消息)
  messageContent: String,

  // 文件信息 (如果是发送文件)
  fileType: String,
  fileName: String,

  // 来源
  source: {
    type: String,
    enum: ['admin_dashboard', 'mobile_app', 'api'],
    default: 'admin_dashboard'
  },

  // 时间戳
  timestamp: {
    type: Date,
    default: Date.now
  },

  // 年月日 (用于统计)
  year: {
    type: Number,
    default: function() { return new Date().getFullYear(); }
  },
  month: {
    type: Number,
    default: function() { return new Date().getMonth() + 1; }
  },
  day: {
    type: Number,
    default: function() { return new Date().getDate(); }
  }
});

// 索引
whatsappTrackingSchema.index({ timestamp: -1 });
whatsappTrackingSchema.index({ customerId: 1 });
whatsappTrackingSchema.index({ whatsappNumber: 1 });
whatsappTrackingSchema.index({ year: 1, month: 1, day: 1 });
whatsappTrackingSchema.index({ action: 1 });

module.exports = mongoose.model('WhatsAppTracking', whatsappTrackingSchema);




