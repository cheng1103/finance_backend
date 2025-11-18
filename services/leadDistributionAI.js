const WhatsAppAgent = require('../models/WhatsAppAgent');

/**
 * AI Lead Distribution Service
 * 智能分配leads给最合适的WhatsApp agent
 */

class LeadDistributionAI {
  /**
   * 主要分配函数 - 找到最合适的agent
   * @param {Object} customer - 客户信息
   * @param {Object} loanDetails - 贷款详情
   * @returns {Object} 选中的agent
   */
  async assignBestAgent(customer, loanDetails) {
    try {
      // 1. 获取所有active的agents
      const availableAgents = await WhatsAppAgent.find({
        status: 'active'
      });

      if (availableAgents.length === 0) {
        console.log('⚠️  没有可用的agents，使用默认分配');
        return null;
      }

      // 2. 为每个agent计算匹配分数
      const scoredAgents = availableAgents.map(agent => ({
        agent,
        score: this.calculateMatchScore(agent, customer, loanDetails)
      }));

      // 3. 按分数排序
      scoredAgents.sort((a, b) => b.score - a.score);

      // 4. 选择分数最高的agent
      const bestMatch = scoredAgents[0];

      console.log(`🎯 AI分配结果: ${bestMatch.agent.name} (分数: ${bestMatch.score.toFixed(2)})`);

      return bestMatch.agent;

    } catch (error) {
      console.error('❌ AI分配错误:', error);
      return null;
    }
  }

  /**
   * 计算agent与lead的匹配分数
   * @param {Object} agent - Agent对象
   * @param {Object} customer - 客户信息
   * @param {Object} loanDetails - 贷款详情
   * @returns {Number} 匹配分数 (0-100)
   */
  calculateMatchScore(agent, customer, loanDetails) {
    let score = 0;
    const weights = {
      workload: 30,        // 工作量权重
      loanAmount: 25,      // 贷款金额匹配权重
      performance: 20,     // 绩效权重
      specialty: 15,       // 专长匹配权重
      priority: 10         // 优先级权重
    };

    // 1. 工作量评分（工作量越少分数越高）
    const workloadScore = this.calculateWorkloadScore(agent);
    score += workloadScore * weights.workload / 100;

    // 2. 贷款金额匹配评分
    if (loanDetails && loanDetails.amount) {
      const amountScore = this.calculateAmountMatchScore(agent, loanDetails.amount);
      score += amountScore * weights.loanAmount / 100;
    }

    // 3. 绩效评分
    const performanceScore = this.calculatePerformanceScore(agent);
    score += performanceScore * weights.performance / 100;

    // 4. 专长匹配评分
    if (loanDetails && loanDetails.purpose) {
      const specialtyScore = this.calculateSpecialtyScore(agent, loanDetails.purpose);
      score += specialtyScore * weights.specialty / 100;
    }

    // 5. 优先级权重
    const priorityScore = (agent.priority / 10) * 100;
    score += priorityScore * weights.priority / 100;

    return score;
  }

  /**
   * 计算工作量评分
   * 工作量越少，分数越高
   */
  calculateWorkloadScore(agent) {
    const currentLoad = agent.workload.currentLeads;
    const maxLoad = agent.workload.maxLeads;

    if (maxLoad === 0) return 50;

    const loadPercentage = (currentLoad / maxLoad) * 100;

    // 反向评分：工作量0% = 100分，工作量100% = 0分
    return Math.max(0, 100 - loadPercentage);
  }

  /**
   * 计算贷款金额匹配评分
   */
  calculateAmountMatchScore(agent, loanAmount) {
    const { min, max } = agent.specialties.loanAmountRange;

    // 完美匹配范围内
    if (loanAmount >= min && loanAmount <= max) {
      return 100;
    }

    // 超出范围，但接近
    if (loanAmount < min) {
      const diff = min - loanAmount;
      return Math.max(0, 100 - (diff / min) * 100);
    }

    if (loanAmount > max) {
      const diff = loanAmount - max;
      return Math.max(0, 100 - (diff / max) * 50); // 超高金额惩罚较少
    }

    return 50;
  }

  /**
   * 计算绩效评分
   */
  calculatePerformanceScore(agent) {
    const { conversionRate, closedDeals } = agent.performance;

    // 转化率权重70%，成交数量权重30%
    const conversionScore = conversionRate * 0.7;
    const dealsScore = Math.min(closedDeals / 100 * 100, 100) * 0.3; // 100单以上都算满分

    return conversionScore + dealsScore;
  }

  /**
   * 计算专长匹配评分
   */
  calculateSpecialtyScore(agent, loanPurpose) {
    if (!agent.specialties.loanTypes || agent.specialties.loanTypes.length === 0) {
      return 50; // 无专长限制，给中等分
    }

    // 匹配专长
    if (agent.specialties.loanTypes.includes(loanPurpose)) {
      return 100;
    }

    return 30; // 不匹配但可以处理
  }

  /**
   * 检查工作时间
   * @param {Object} agent - Agent对象
   * @returns {Boolean} 是否在工作时间内
   */
  isWithinWorkingHours(agent) {
    if (!agent.workingHours.enabled) {
      return true; // 没有时间限制
    }

    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const todaySchedule = agent.workingHours.schedule[dayOfWeek];

    if (!todaySchedule || !todaySchedule.active) {
      return false;
    }

    return currentTime >= todaySchedule.start && currentTime <= todaySchedule.end;
  }

  /**
   * 轮流分配模式（最简单的分配方式）
   * @returns {Object} 下一个agent
   */
  async roundRobinAssign() {
    const agents = await WhatsAppAgent.find({
      status: 'active'
    }).sort({ 'workload.todayAssigned': 1 }); // 今天分配最少的优先

    // 过滤掉已满载的agents
    const availableAgents = agents.filter(agent =>
      agent.workload.currentLeads < agent.workload.maxLeads
    );

    return availableAgents[0] || null;
  }

  /**
   * 更新agent工作量统计
   * @param {String} agentId - Agent ID
   */
  async updateAgentWorkload(agentId) {
    const agent = await WhatsAppAgent.findById(agentId);
    if (!agent) return;

    agent.workload.currentLeads += 1;
    agent.workload.todayAssigned += 1;
    agent.workload.monthAssigned += 1;
    agent.workload.totalAssigned += 1;
    agent.lastActiveAt = new Date();

    await agent.save();

    console.log(`📊 更新 ${agent.name} 工作量: ${agent.workload.currentLeads}/${agent.workload.maxLeads}`);
  }

  /**
   * 完成一个lead后减少工作量
   * @param {String} agentId - Agent ID
   */
  async completeLead(agentId, isSuccess = false) {
    const agent = await WhatsAppAgent.findById(agentId);
    if (!agent) return;

    agent.workload.currentLeads = Math.max(0, agent.workload.currentLeads - 1);

    if (isSuccess) {
      agent.performance.closedDeals += 1;
    }

    // 重新计算转化率
    if (agent.workload.totalAssigned > 0) {
      agent.performance.conversionRate = (agent.performance.closedDeals / agent.workload.totalAssigned) * 100;
    }

    await agent.save();
  }

  /**
   * 获取分配报告
   */
  async getDistributionReport() {
    const agents = await WhatsAppAgent.find({ status: 'active' });

    const report = agents.map(agent => ({
      name: agent.name,
      whatsapp: agent.whatsappNumber,
      currentLeads: agent.workload.currentLeads,
      maxLeads: agent.workload.maxLeads,
      todayAssigned: agent.workload.todayAssigned,
      conversionRate: agent.performance.conversionRate.toFixed(1) + '%',
      status: agent.workload.currentLeads >= agent.workload.maxLeads ? '🔴 满载' : '🟢 可用'
    }));

    return report;
  }
}

module.exports = new LeadDistributionAI();
