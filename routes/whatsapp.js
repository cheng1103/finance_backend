const express = require('express');
const router = express.Router();
const WhatsAppTracking = require('../models/WhatsAppTracking');

// 追踪 WhatsApp 重定向
router.post('/track-whatsapp', async (req, res) => {
  try {
    const { phone, timestamp, source = 'admin_dashboard', operatorId } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        status: 'error',
        message: '缺少必需的电话号码参数'
      });
    }
    
    // 获取客户端信息
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    const referrer = req.get('Referer') || 'Direct';
    
    // 简单的设备类型检测
    const deviceType = userAgent.toLowerCase().includes('mobile') ? 'mobile' : 
                      userAgent.toLowerCase().includes('tablet') ? 'tablet' : 'desktop';
    
    // 创建追踪记录
    const trackingRecord = new WhatsAppTracking({
      customerPhone: phone,
      trackingType: 'redirect',
      source: source,
      operatorId: operatorId || null,
      details: {
        userAgent,
        ipAddress,
        referrer
      },
      sessionInfo: {
        deviceType,
        browser: extractBrowser(userAgent),
        os: extractOS(userAgent)
      },
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      status: 'success'
    });
    
    await trackingRecord.save();
    
    res.status(200).json({
      status: 'success',
      message: 'WhatsApp 重定向追踪成功',
      data: {
        trackingId: trackingRecord._id,
        customerPhone: phone,
        timestamp: trackingRecord.timestamp
      }
    });
    
  } catch (error) {
    console.error('WhatsApp 追踪错误:', error);
    res.status(500).json({
      status: 'error',
      message: '追踪记录保存失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取 WhatsApp 统计数据
router.get('/whatsapp-stats', async (req, res) => {
  try {
    const todayStats = await WhatsAppTracking.getTodayStats();
    const monthlyStats = await WhatsAppTracking.getMonthlyStats();
    
    res.status(200).json({
      status: 'success',
      data: {
        whatsappRedirectsToday: todayStats.redirects,
        whatsappRedirectsThisMonth: monthlyStats.redirects,
        whatsappClicksToday: todayStats.clicks,
        whatsappClicksThisMonth: monthlyStats.clicks,
        totalInteractionsToday: todayStats.total,
        totalInteractionsThisMonth: monthlyStats.total
      }
    });
    
  } catch (error) {
    console.error('获取 WhatsApp 统计数据错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取统计数据失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取 WhatsApp 追踪历史
router.get('/whatsapp-history', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      phone, 
      trackingType, 
      source,
      startDate,
      endDate 
    } = req.query;
    
    // 构建查询条件
    const query = { status: 'success' };
    
    if (phone) {
      query.customerPhone = { $regex: phone, $options: 'i' };
    }
    
    if (trackingType) {
      query.trackingType = trackingType;
    }
    
    if (source) {
      query.source = source;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [records, total] = await Promise.all([
      WhatsAppTracking.find(query)
        .populate('operatorId', 'firstName lastName email')
        .populate('loanApplication', 'applicationNumber status')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      WhatsAppTracking.countDocuments(query)
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        records,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total,
          hasNext: skip + records.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
    
  } catch (error) {
    console.error('获取 WhatsApp 历史记录错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取历史记录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取热门客户
router.get('/top-customers', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const topCustomers = await WhatsAppTracking.getTopCustomers(parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      data: topCustomers
    });
    
  } catch (error) {
    console.error('获取热门客户错误:', error);
    res.status(500).json({
      status: 'error',
      message: '获取热门客户失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 辅助函数：提取浏览器信息
function extractBrowser(userAgent) {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
}

// 辅助函数：提取操作系统信息
function extractOS(userAgent) {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}

module.exports = router;













