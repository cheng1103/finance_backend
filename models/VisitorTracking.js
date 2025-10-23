const mongoose = require('mongoose');

const visitorTrackingSchema = new mongoose.Schema({
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

  page: {
    type: String,
    required: true
  },
  pageTitle: {
    type: String,
    default: ''
  },

  country: String,
  city: String,

  deviceType: {
    type: String,
    enum: ['mobile', 'tablet', 'desktop'],
    default: 'desktop'
  },
  browser: String,
  os: String,

  sessionId: String,
  isNewVisitor: {
    type: Boolean,
    default: true
  },

  timeOnPage: {
    type: Number,
    default: 0
  },

  visitDate: {
    type: Date,
    default: Date.now
  },

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

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

visitorTrackingSchema.index({ visitDate: -1 });
visitorTrackingSchema.index({ year: 1, month: 1, day: 1 });
visitorTrackingSchema.index({ ipAddress: 1 });
visitorTrackingSchema.index({ page: 1 });
visitorTrackingSchema.index({ sessionId: 1 });

module.exports = mongoose.model('VisitorTracking', visitorTrackingSchema);
