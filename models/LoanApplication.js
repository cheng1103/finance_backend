const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  personalInfo: {
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true
    }
  },

  loanDetails: {
    amount: {
      type: Number,
    },
    purpose: {
      type: String,
      enum: {
        values: ['debt-consolidation', 'home-improvement', 'auto-purchase', 'education', 'medical', 'business', 'other'],
      }
    },
    term: {
      type: Number,
      enum: {
        values: [12, 24, 36, 48, 60, 72, 84, 96, 108],
      }
    },
    interestRate: {
      type: Number,
      default: 4.88,
      min: 0,
      max: 50
    }
  },

  financialInfo: {
    annualIncome: {
      type: Number,
    },
    employmentStatus: {
      type: String,
      enum: {
        values: ['full-time', 'part-time', 'self-employed', 'unemployed', 'retired', 'student'],
      }
    },
    creditScore: {
      type: String,
      enum: {
        values: ['excellent', 'good', 'fair', 'poor', 'very-poor', 'unknown'],
      }
    }
  },

  status: {
    type: String,
    enum: ['pending', 'under-review', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },

  approval: {
    approvedAmount: Number,
    approvedRate: Number,
    approvedTerm: Number,
    monthlyPayment: Number,
    totalPayment: Number,
    totalInterest: Number,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    notes: String
  },

  rejection: {
    reason: String,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: Date
  },

  applicationNumber: {
    type: String,
    unique: true,
    required: true
  },

  internalNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  communications: [{
    type: {
      type: String,
      enum: ['email', 'phone', 'sms', 'system'],
      required: true
    },
    subject: String,
    message: String,
    sentAt: {
      type: Date,
      default: Date.now
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  documents: [{
    name: String,
    type: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  metadata: {
    ipAddress: String,
    userAgent: String,
    referrer: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

loanApplicationSchema.virtual('applicantName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

loanApplicationSchema.pre('save', function(next) {
  if (!this.applicationNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.applicationNumber = `LA${timestamp.slice(-8)}${random}`;
  }
  next();
});

loanApplicationSchema.methods.calculateMonthlyPayment = function() {
  const principal = this.loanDetails.amount;
  const monthlyRate = this.loanDetails.interestRate / 100 / 12;
  const numberOfPayments = this.loanDetails.term;

  if (monthlyRate === 0) {
    return principal / numberOfPayments;
  }

  const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
                        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  return Math.round(monthlyPayment * 100) / 100;
};

loanApplicationSchema.methods.calculateTotalPayment = function() {
  const monthlyPayment = this.calculateMonthlyPayment();
  return Math.round(monthlyPayment * this.loanDetails.term * 100) / 100;
};

loanApplicationSchema.methods.calculateTotalInterest = function() {
  const totalPayment = this.calculateTotalPayment();
  return Math.round((totalPayment - this.loanDetails.amount) * 100) / 100;
};

loanApplicationSchema.index({ 'personalInfo.email': 1 });
loanApplicationSchema.index({ status: 1 });
loanApplicationSchema.index({ createdAt: -1 });
loanApplicationSchema.index({ user: 1 });

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);

