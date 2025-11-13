const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
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

  loanApplications: [{
    name: String,
    email: String,
    phone: String,
    address: String,
    company: String,
    position: String,
    monthlyIncome: String,
    amount: Number,
    purpose: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null
    },
    assignedAt: {
      type: Date
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],

  quickApplications: [{
    name: String,
    email: String,
    phone: String,
    amount: Number,
    purpose: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null
    },
    assignedAt: {
      type: Date
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],

  detailedInquiries: [{
    name: String,
    email: String,
    phone: String,
    company: String,
    amount: Number,
    purpose: String,
    monthlyIncome: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null
    },
    assignedAt: {
      type: Date
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],

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

  whatsappStatus: {
    type: String,
    enum: ['new', 'contacted', 'in_progress', 'completed', 'rejected'],
    default: 'new'
  },

  followUpNotes: [{
    date: { type: Date, default: Date.now },
    note: String,
    action: String, // 'whatsapp_sent', 'called', 'email_sent', etc.
    addedBy: String
  }],

  whatsappInteractions: [{
    date: { type: Date, default: Date.now },
    type: String, // 'message_sent', 'message_received', 'file_sent', 'whatsapp_opened'
    message: String,
    initiatedBy: String
  }],

  metadata: {
    source: {
      type: String,
      default: 'website'
    },
    ipAddress: String,
    userAgent: String,
    referrer: String,
    submissionType: {
      type: String,
      enum: ['browser', 'automated', 'unknown'],
      default: 'unknown'
    }
  },

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

customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ whatsappNumber: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ whatsappStatus: 1 });

module.exports = mongoose.model('Customer', customerSchema);
