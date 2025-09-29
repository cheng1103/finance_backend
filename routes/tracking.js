const express = require('express');
const router = express.Router();
const VisitorTracking = require('../models/VisitorTracking');

// POST /api/tracking/visit - 记录访问
router.post('/visit', async (req, res) => {
  try {
    const {
      page,
      pageTitle,
      sessionId,
      isNewVisitor,
      timeOnPage,
      deviceType,
      browser,
      os,
      country,
      city
    } = req.body;

    const visitorTracking = new VisitorTracking({
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer') || '',
      page,
      pageTitle,
      sessionId,
      isNewVisitor: isNewVisitor !== undefined ? isNewVisitor : true,
      timeOnPage: timeOnPage || 0,
      deviceType: deviceType || 'desktop',
      browser,
      os,
      country,
      city
    });

    await visitorTracking.save();

    res.json({
      success: true,
      message: 'Visit tracked successfully',
      trackingId: visitorTracking._id
    });

  } catch (error) {
    console.error('Visit tracking error:', error);
    res.status(500).json({
      error: 'Failed to track visit',
      details: error.message
    });
  }
});

// PUT /api/tracking/visit/:id - 更新访问时长
router.put('/visit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { timeOnPage } = req.body;

    const tracking = await VisitorTracking.findById(id);
    if (!tracking) {
      return res.status(404).json({ error: 'Tracking record not found' });
    }

    tracking.timeOnPage = timeOnPage;
    await tracking.save();

    res.json({
      success: true,
      message: 'Time on page updated'
    });

  } catch (error) {
    console.error('Update time on page error:', error);
    res.status(500).json({
      error: 'Failed to update time on page',
      details: error.message
    });
  }
});

// GET /api/tracking/stats - 获取访问统计
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const thisYear = new Date();
    thisYear.setMonth(0, 1);
    thisYear.setHours(0, 0, 0, 0);

    // 今日访问
    const visitsToday = await VisitorTracking.countDocuments({
      visitDate: { $gte: today }
    });

    // 本月访问
    const visitsThisMonth = await VisitorTracking.countDocuments({
      visitDate: { $gte: thisMonth }
    });

    // 总访问量
    const totalVisits = await VisitorTracking.countDocuments();

    // 新访客统计
    const newVisitorsToday = await VisitorTracking.countDocuments({
      visitDate: { $gte: today },
      isNewVisitor: true
    });

    // 页面访问统计
    const pageStats = await VisitorTracking.aggregate([
      {
        $match: {
          visitDate: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$page',
          count: { $sum: 1 },
          avgTimeOnPage: { $avg: '$timeOnPage' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // 设备类型统计
    const deviceStats = await VisitorTracking.aggregate([
      {
        $match: {
          visitDate: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$deviceType',
          count: { $sum: 1 }
        }
      }
    ]);

    // 过去7天访问趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyTrend = await VisitorTracking.aggregate([
      {
        $match: {
          visitDate: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: '$year',
            month: '$month',
            day: '$day'
          },
          visits: { $sum: 1 },
          newVisitors: {
            $sum: {
              $cond: ['$isNewVisitor', 1, 0]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          visitsToday,
          visitsThisMonth,
          totalVisits,
          newVisitorsToday
        },
        pageStats,
        deviceStats,
        weeklyTrend
      }
    });

  } catch (error) {
    console.error('Get tracking stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch tracking statistics',
      details: error.message
    });
  }
});

// GET /api/tracking/popular-pages - 获取热门页面
router.get('/popular-pages', async (req, res) => {
  try {
    const { period = 'today' } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateFilter = { visitDate: { $gte: today } };
        break;
      case 'week':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { visitDate: { $gte: weekAgo } };
        break;
      case 'month':
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { visitDate: { $gte: monthAgo } };
        break;
      default:
        dateFilter = {};
    }

    const popularPages = await VisitorTracking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            page: '$page',
            pageTitle: '$pageTitle'
          },
          visits: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$ipAddress' },
          avgTimeOnPage: { $avg: '$timeOnPage' }
        }
      },
      {
        $project: {
          page: '$_id.page',
          pageTitle: '$_id.pageTitle',
          visits: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
          avgTimeOnPage: { $round: ['$avgTimeOnPage', 1] },
          _id: 0
        }
      },
      { $sort: { visits: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: popularPages
    });

  } catch (error) {
    console.error('Get popular pages error:', error);
    res.status(500).json({
      error: 'Failed to fetch popular pages',
      details: error.message
    });
  }
});

module.exports = router;