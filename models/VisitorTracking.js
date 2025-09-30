const mongoose = require('mongoose');

const visitorTrackingSchema = new mongoose.Schema({
  // 访问信息
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  referrer: {
    type: String,
    default: ''
  },

  // 页面信息
  page: {
    type: String,
    required: true
  },
  pageTitle: {
    type: String,
    default: ''
  },

  // 地理位置 (可选)
  country: String,
  city: String,

  // 设备信息
  deviceType: {
    type: String,
    enum: ['mobile', 'tablet', 'desktop'],
    default: 'desktop'
  },
  browser: String,
  os: String,

  // 会话信息
  sessionId: String,
  isNewVisitor: {
    type: Boolean,
    default: true
  },

  // 停留时间 (秒)
  timeOnPage: {
    type: Number,
    default: 0
  },

  // 时间戳
  visitDate: {
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
  },

  // 额外元数据（用于特殊追踪）
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// 索引
visitorTrackingSchema.index({ visitDate: -1 });
visitorTrackingSchema.index({ year: 1, month: 1, day: 1 });
visitorTrackingSchema.index({ ipAddress: 1 });
visitorTrackingSchema.index({ page: 1 });
visitorTrackingSchema.index({ sessionId: 1 });

module.exports = mongoose.model('VisitorTracking', visitorTrackingSchema);