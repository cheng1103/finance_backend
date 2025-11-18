/**
 * ⚠️ 只需要改这里的3个WhatsApp号码！
 * 其他都不用改
 */

module.exports = {
  agents: [
    {
      // ========== Agent 1 ==========
      whatsappNumber: '+60123456789',  // ← 只改这里！填你的WhatsApp号码
      name: 'Agent 1',  // ← 可选：改成你的名字
      // 以下不用改 ↓
      email: 'agent1@eplatformcredit.com',
      maxLeadsPerDay: 10
    },

    {
      // ========== Agent 2 ==========
      whatsappNumber: '+60198765432',  // ← 只改这里！填Agent 2的WhatsApp
      name: 'Agent 2',  // ← 可选：改成Agent 2的名字
      // 以下不用改 ↓
      email: 'agent2@eplatformcredit.com',
      maxLeadsPerDay: 10
    },

    {
      // ========== Agent 3 ==========
      whatsappNumber: '+60187654321',  // ← 只改这里！填Agent 3的WhatsApp
      name: 'Agent 3',  // ← 可选：改成Agent 3的名字
      // 以下不用改 ↓
      email: 'agent3@eplatformcredit.com',
      maxLeadsPerDay: 10
    }
  ],

  // ========== 默认设置（不用改）==========
  defaultSettings: {
    status: 'active',
    specialties: {
      loanAmountRange: {
        min: 0,
        max: 100000  // 所有金额都接受
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
      // 西马所有州属
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
    priority: 10  // 所有人优先级相同，确保轮流分配
  }
};
