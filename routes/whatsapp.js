const express = require('express');
const router = express.Router();
const WhatsAppTracking = require('../models/WhatsAppTracking');

router.post('/track-whatsapp', async (req, res) => {
  try {
    const { phone, timestamp, source = 'admin_dashboard', operatorId } = req.body;

    if (!phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number is required.'
      });
    }

    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = req.ip || req.connection?.remoteAddress || 'Unknown';
    const referrer = req.get('Referer') || 'Direct';
    const lowerUserAgent = userAgent.toLowerCase();

    const deviceType = lowerUserAgent.includes('mobile')
      ? 'mobile'
      : lowerUserAgent.includes('tablet')
        ? 'tablet'
        : 'desktop';

    const trackingRecord = new WhatsAppTracking({
      customerPhone: phone,
      trackingType: 'redirect',
      source,
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
      message: 'WhatsApp redirect recorded successfully.',
      data: {
        trackingId: trackingRecord._id,
        customerPhone: phone,
        timestamp: trackingRecord.timestamp
      }
    });
  } catch (error) {
    console.error('[WhatsApp] Track redirect error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to record WhatsApp redirect.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

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
    console.error('[WhatsApp] Stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch WhatsApp statistics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

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

    const numericPage = parseInt(page, 10);
    const numericLimit = parseInt(limit, 10);
    const skip = (numericPage - 1) * numericLimit;

    const [records, total] = await Promise.all([
      WhatsAppTracking.find(query)
        .populate('operatorId', 'firstName lastName email')
        .populate('loanApplication', 'applicationNumber status')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(numericLimit),
      WhatsAppTracking.countDocuments(query)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        records,
        pagination: {
          currentPage: numericPage,
          totalPages: Math.ceil(total / numericLimit),
          totalRecords: total,
          hasNext: skip + records.length < total,
          hasPrev: numericPage > 1
        }
      }
    });
  } catch (error) {
    console.error('[WhatsApp] History error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch WhatsApp history.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/top-customers', async (req, res) => {
  try {
    const numericLimit = parseInt(req.query.limit, 10) || 10;
    const topCustomers = await WhatsAppTracking.getTopCustomers(numericLimit);

    res.status(200).json({
      status: 'success',
      data: topCustomers
    });
  } catch (error) {
    console.error('[WhatsApp] Top customers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Unable to fetch WhatsApp customer insights.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

function extractBrowser(userAgent) {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
}

function extractOS(userAgent) {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}

module.exports = router;
