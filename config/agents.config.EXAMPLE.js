/**
 * 📝 配置示例
 *
 * 复制这个文件为 agents.config.js，然后填入真实信息
 */

module.exports = {
  agents: [
    {
      // ========== Agent 1 - 例如：你自己 ==========
      whatsappNumber: '+60123456789',  // ← 你的WhatsApp（例如：+60123456789）
      name: 'Cheng',  // ← 你的名字
      email: 'cheng@eplatformcredit.com',
      maxLeadsPerDay: 10
    },

    {
      // ========== Agent 2 - 例如：你的同事 ==========
      whatsappNumber: '+60198765432',  // ← Agent 2的WhatsApp
      name: 'Sarah',  // ← Agent 2的名字
      email: 'sarah@eplatformcredit.com',
      maxLeadsPerDay: 10
    },

    {
      // ========== Agent 3 ==========
      whatsappNumber: '+60187654321',  // ← Agent 3的WhatsApp
      name: 'Kumar',  // ← Agent 3的名字
      email: 'kumar@eplatformcredit.com',
      maxLeadsPerDay: 10
    }
  ],

  // ========== 默认设置（一般不用改）==========
  defaultSettings: {
    status: 'active',
    specialties: {
      loanAmountRange: {
        min: 0,
        max: 100000
      },
      loanTypes: [
        'personal',
        'business',
        'debt-consolidation',
        'home-improvement',
        'auto',
        'education',
        'medical',
        'other'
      ],
      serviceStates: [
        'Johor',
        'Kedah',
        'Kelantan',
        'Melaka',
        'Negeri Sembilan',
        'Pahang',
        'Penang',
        'Perak',
        'Perlis',
        'Selangor',
        'Terengganu',
        'WP Kuala Lumpur',
        'WP Putrajaya'
      ],
      languages: ['Malay', 'English', 'Chinese']
    },
    priority: 10
  }
};
