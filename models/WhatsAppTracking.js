const mongoose = require('mongoose');

const whatsappTrackingSchema = new mongoose.Schema({
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

  action: {
    type: String,
    enum: ['number_copied', 'whatsapp_opened', 'message_sent', 'file_sent'],
    required: true
  },

  adminId: String,
  adminName: String,

  messageContent: String,

  fileType: String,
  fileName: String,

  source: {
    type: String,
    enum: ['admin_dashboard', 'mobile_app', 'api'],
    default: 'admin_dashboard'
  },

  timestamp: {
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
  }
});

whatsappTrackingSchema.index({ timestamp: -1 });
whatsappTrackingSchema.index({ customerId: 1 });
whatsappTrackingSchema.index({ whatsappNumber: 1 });
whatsappTrackingSchema.index({ year: 1, month: 1, day: 1 });
whatsappTrackingSchema.index({ action: 1 });

module.exports = mongoose.model('WhatsAppTracking', whatsappTrackingSchema);
















