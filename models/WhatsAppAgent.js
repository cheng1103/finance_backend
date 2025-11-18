const mongoose = require('mongoose');

/**
 * WhatsApp Agent Model
 * 管理你的WhatsApp销售团队
 */
const whatsappAgentSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: true,
    trim: true
  },

  whatsappNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  email: {
    type: String,
    trim: true,
    lowercase: true
  },

  // Agent状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave', 'busy'],
    default: 'active'
  },

  // 专长和能力
  specialties: {
    // 擅长的贷款金额范围
    loanAmountRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 100000 }
    },

    // 擅长的贷款类型
    loanTypes: [{
      type: String,
      enum: ['personal', 'business', 'debt-consolidation', 'home-improvement', 'auto', 'education', 'medical', 'other']
    }],

    // 服务地区（州属）
    serviceStates: [{
      type: String
    }],

    // 语言能力
    languages: [{
      type: String,
      enum: ['Malay', 'English', 'Chinese', 'Tamil', 'Other']
    }]
  },

  // 工作量统计
  workload: {
    // 当前处理中的leads数量
    currentLeads: {
      type: Number,
      default: 0
    },

    // 最大同时处理lead数
    maxLeads: {
      type: Number,
      default: 20
    },

    // 今天已分配数量
    todayAssigned: {
      type: Number,
      default: 0
    },

    // 本月已分配数量
    monthAssigned: {
      type: Number,
      default: 0
    },

    // 总处理数量
    totalAssigned: {
      type: Number,
      default: 0
    }
  },

  // 绩效统计
  performance: {
    // 转化率
    conversionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    // 平均响应时间（分钟）
    avgResponseTime: {
      type: Number,
      default: 0
    },

    // 成功关闭的deals
    closedDeals: {
      type: Number,
      default: 0
    },

    // 总贷款金额
    totalLoanAmount: {
      type: Number,
      default: 0
    }
  },

  // 优先级权重（用于AI分配）
  priority: {
    type: Number,
    default: 1,
    min: 0,
    max: 10
  },

  // 工作时间
  workingHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    schedule: {
      monday: { start: String, end: String, active: Boolean },
      tuesday: { start: String, end: String, active: Boolean },
      wednesday: { start: String, end: String, active: Boolean },
      thursday: { start: String, end: String, active: Boolean },
      friday: { start: String, end: String, active: Boolean },
      saturday: { start: String, end: String, active: Boolean },
      sunday: { start: String, end: String, active: Boolean }
    }
  },

  // 备注
  notes: {
    type: String,
    default: ''
  },

  // 创建和更新时间
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  // 最后活跃时间
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间
whatsappAgentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 索引
whatsappAgentSchema.index({ status: 1 });
whatsappAgentSchema.index({ 'workload.currentLeads': 1 });
whatsappAgentSchema.index({ priority: -1 });

module.exports = mongoose.model('WhatsAppAgent', whatsappAgentSchema);
