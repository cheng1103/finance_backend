const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema({
  // 申请人信息（可以是注册用户或匿名申请）
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // 允许匿名申请
  },
  
  // 基本个人信息
  personalInfo: {
    firstName: {
      type: String,
      required: [true, '请提供名字'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, '请提供姓氏'],
      trim: true
    },
    email: {
      type: String,
      required: [true, '请提供邮箱地址'],
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, '请提供有效的邮箱地址']
    },
    phone: {
      type: String,
      required: [true, '请提供电话号码'],
      trim: true
    }
  },

  // 贷款详情
  loanDetails: {
    amount: {
      type: Number,
      required: [true, '请提供贷款金额'],
      min: [1000, '贷款金额不能少于RM 1,000'],
      max: [100000, '贷款金额不能超过RM 100,000']
    },
    purpose: {
      type: String,
      required: [true, '请选择贷款用途'],
      enum: {
        values: ['debt-consolidation', 'home-improvement', 'auto-purchase', 'education', 'medical', 'business', 'other'],
        message: '请选择有效的贷款用途'
      }
    },
    term: {
      type: Number,
      required: [true, '请选择贷款期限'],
      enum: {
        values: [12, 24, 36, 48, 60, 72, 84, 96, 108],
        message: '请选择有效的贷款期限'
      }
    },
    interestRate: {
      type: Number,
      default: 4.88,
      min: 0,
      max: 50
    }
  },

  // 财务信息
  financialInfo: {
    annualIncome: {
      type: Number,
      required: [true, '请提供年收入'],
      min: [0, '年收入不能为负数']
    },
    employmentStatus: {
      type: String,
      required: [true, '请选择就业状态'],
      enum: {
        values: ['full-time', 'part-time', 'self-employed', 'unemployed', 'retired', 'student'],
        message: '请选择有效的就业状态'
      }
    },
    creditScore: {
      type: String,
      required: [true, '请选择信用评分范围'],
      enum: {
        values: ['excellent', 'good', 'fair', 'poor', 'very-poor', 'unknown'],
        message: '请选择有效的信用评分范围'
      }
    }
  },

  // 申请状态
  status: {
    type: String,
    enum: ['pending', 'under-review', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },

  // 审批信息
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

  // 拒绝信息
  rejection: {
    reason: String,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: Date
  },

  // 申请追踪
  applicationNumber: {
    type: String,
    unique: true,
    required: true
  },

  // 备注和内部注释
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

  // 通信记录
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

  // 文档上传
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // IP地址和用户代理（用于安全审计）
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

// 虚拟字段：申请人全名
loanApplicationSchema.virtual('applicantName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// 生成申请编号的中间件
loanApplicationSchema.pre('save', function(next) {
  if (!this.applicationNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.applicationNumber = `LA${timestamp.slice(-8)}${random}`;
  }
  next();
});

// 计算月供的方法
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

// 计算总支付金额的方法
loanApplicationSchema.methods.calculateTotalPayment = function() {
  const monthlyPayment = this.calculateMonthlyPayment();
  return Math.round(monthlyPayment * this.loanDetails.term * 100) / 100;
};

// 计算总利息的方法
loanApplicationSchema.methods.calculateTotalInterest = function() {
  const totalPayment = this.calculateTotalPayment();
  return Math.round((totalPayment - this.loanDetails.amount) * 100) / 100;
};

// 索引优化
loanApplicationSchema.index({ 'personalInfo.email': 1 });
loanApplicationSchema.index({ status: 1 });
loanApplicationSchema.index({ createdAt: -1 });
loanApplicationSchema.index({ user: 1 });

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);

