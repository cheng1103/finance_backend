const express = require('express');
const router = express.Router();
const VisitorTracking = require('../models/VisitorTracking');
const LoanApplication = require('../models/LoanApplication');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');

/**
 * 获取访客统计数据
 */
router.get('/visitors', async (req, res) => {
  try {
    const now = new Date();

    // 今天（马来西亚时间）
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
    today.setHours(0, 0, 0, 0);

    // 昨天
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 本周
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - today.getDay());

    // 本月
    const thisMonth = new Date(today);
    thisMonth.setDate(1);

    // 并行查询所有数据
    const [
      visitorsToday,
      visitorsYesterday,
      visitorsThisWeek,
      visitorsThisMonth,
      visitorsTotal,
      hourlyData
    ] = await Promise.all([
      // 今天访客
      VisitorTracking.countDocuments({
        visitDate: { $gte: today }
      }),
      // 昨天访客
      VisitorTracking.countDocuments({
        visitDate: { $gte: yesterday, $lt: today }
      }),
      // 本周访客
      VisitorTracking.countDocuments({
        visitDate: { $gte: thisWeek }
      }),
      // 本月访客
      VisitorTracking.countDocuments({
        visitDate: { $gte: thisMonth }
      }),
      // 总访客
      VisitorTracking.countDocuments(),
      // 24小时分布
      VisitorTracking.aggregate([
        {
          $match: {
            visitDate: { $gte: today }
          }
        },
        {
          $group: {
            _id: { $hour: '$visitDate' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])
    ]);

    // 格式化24小时数据
    const hourlyFormatted = Array.from({ length: 24 }, (_, hour) => {
      const found = hourlyData.find(h => h._id === hour);
      return {
        hour,
        visitors: found ? found.count : 0,
        applications: 0 // 稍后填充
      };
    });

    res.json({
      success: true,
      visitors: {
        today: visitorsToday,
        yesterday: visitorsYesterday,
        thisWeek: visitorsThisWeek,
        thisMonth: visitorsThisMonth,
        total: visitorsTotal
      },
      hourlyData: hourlyFormatted
    });

  } catch (error) {
    console.error('Get visitors statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor statistics',
      details: error.message
    });
  }
});

/**
 * 获取申请统计数据
 */
router.get('/applications', async (req, res) => {
  try {
    const now = new Date();

    // 今天（马来西亚时间）
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
    today.setHours(0, 0, 0, 0);

    // 昨天
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 本周
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - today.getDay());

    // 本月
    const thisMonth = new Date(today);
    thisMonth.setDate(1);

    // 并行查询所有数据
    const [
      applicationsToday,
      applicationsYesterday,
      applicationsThisWeek,
      applicationsThisMonth,
      applicationsTotal,
      hourlyData
    ] = await Promise.all([
      // 今天申请
      LoanApplication.countDocuments({
        createdAt: { $gte: today }
      }),
      // 昨天申请
      LoanApplication.countDocuments({
        createdAt: { $gte: yesterday, $lt: today }
      }),
      // 本周申请
      LoanApplication.countDocuments({
        createdAt: { $gte: thisWeek }
      }),
      // 本月申请
      LoanApplication.countDocuments({
        createdAt: { $gte: thisMonth }
      }),
      // 总申请
      LoanApplication.countDocuments(),
      // 24小时分布
      LoanApplication.aggregate([
        {
          $match: {
            createdAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])
    ]);

    // 格式化24小时数据
    const hourlyFormatted = Array.from({ length: 24 }, (_, hour) => {
      const found = hourlyData.find(h => h._id === hour);
      return {
        hour,
        applications: found ? found.count : 0
      };
    });

    res.json({
      success: true,
      applications: {
        today: applicationsToday,
        yesterday: applicationsYesterday,
        thisWeek: applicationsThisWeek,
        thisMonth: applicationsThisMonth,
        total: applicationsTotal
      },
      hourlyData: hourlyFormatted
    });

  } catch (error) {
    console.error('Get applications statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application statistics',
      details: error.message
    });
  }
});

/**
 * 导出数据 (CSV/Excel)
 */
router.get('/export', async (req, res) => {
  try {
    const { format = 'csv', period = 'today' } = req.query;

    const now = new Date();
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
    today.setHours(0, 0, 0, 0);

    let startDate = today;
    let endDate = null; // null means "until now"

    if (period === 'week') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
    } else if (period === 'month') {
      // 本月（从本月1号到现在）
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (period === 'lastMonth') {
      // 上个月（完整的上个月）
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (period === 'last3Months') {
      // 最近3个月
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 3);
    } else if (period === 'all') {
      // 所有数据（从最开始）
      startDate = new Date(2020, 0, 1); // 从2020年开始
    }

    // 构建查询条件
    const visitorQuery = endDate
      ? { visitDate: { $gte: startDate, $lt: endDate } }
      : { visitDate: { $gte: startDate } };

    const applicationQuery = endDate
      ? { createdAt: { $gte: startDate, $lt: endDate } }
      : { createdAt: { $gte: startDate } };

    // 获取访客数据
    const visitors = await VisitorTracking.find(visitorQuery)
      .select('visitDate page pageTitle ipAddress deviceType browser country city')
      .sort({ visitDate: -1 })
      .lean();

    // 获取申请数据
    const applications = await LoanApplication.find(applicationQuery)
      .select('applicationNumber createdAt personalInfo.email personalInfo.phone loanDetails.amount status')
      .sort({ createdAt: -1 })
      .lean();

    // 准备导出数据
    const exportData = {
      summary: {
        period: period,
        totalVisitors: visitors.length,
        totalApplications: applications.length,
        conversionRate: visitors.length > 0 ? ((applications.length / visitors.length) * 100).toFixed(2) + '%' : '0%',
        exportDate: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kuala_Lumpur' })
      },
      visitors: visitors.map(v => ({
        日期: new Date(v.visitDate).toLocaleString('zh-CN', { timeZone: 'Asia/Kuala_Lumpur' }),
        页面: v.page,
        页面标题: v.pageTitle,
        设备类型: v.deviceType,
        浏览器: v.browser || 'Unknown',
        国家: v.country || 'Unknown',
        城市: v.city || 'Unknown'
      })),
      applications: applications.map(a => ({
        申请编号: a.applicationNumber,
        申请时间: new Date(a.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Kuala_Lumpur' }),
        邮箱: a.personalInfo?.email || '',
        电话: a.personalInfo?.phone || '',
        贷款金额: a.loanDetails?.amount || 0,
        状态: a.status
      }))
    };

    if (format === 'csv') {
      // 导出CSV
      const fields = Object.keys(exportData.visitors[0] || {});
      const parser = new Parser({ fields });
      const csv = parser.parse(exportData.visitors);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=statistics-${period}-${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\uFEFF' + csv); // UTF-8 BOM for Excel

    } else if (format === 'excel') {
      // 导出Excel
      const workbook = new ExcelJS.Workbook();

      // 摘要表
      const summarySheet = workbook.addWorksheet('摘要');
      summarySheet.columns = [
        { header: '项目', key: 'item', width: 20 },
        { header: '数值', key: 'value', width: 30 }
      ];
      summarySheet.addRows([
        { item: '统计周期', value: exportData.summary.period },
        { item: '总访客数', value: exportData.summary.totalVisitors },
        { item: '总申请数', value: exportData.summary.totalApplications },
        { item: '转化率', value: exportData.summary.conversionRate },
        { item: '导出时间', value: exportData.summary.exportDate }
      ]);

      // 访客表
      const visitorsSheet = workbook.addWorksheet('访客数据');
      visitorsSheet.columns = [
        { header: '日期', key: '日期', width: 20 },
        { header: '页面', key: '页面', width: 30 },
        { header: '页面标题', key: '页面标题', width: 30 },
        { header: '设备类型', key: '设备类型', width: 15 },
        { header: '浏览器', key: '浏览器', width: 15 },
        { header: '国家', key: '国家', width: 15 },
        { header: '城市', key: '城市', width: 15 }
      ];
      visitorsSheet.addRows(exportData.visitors);

      // 申请表
      const applicationsSheet = workbook.addWorksheet('申请数据');
      applicationsSheet.columns = [
        { header: '申请编号', key: '申请编号', width: 20 },
        { header: '申请时间', key: '申请时间', width: 20 },
        { header: '邮箱', key: '邮箱', width: 30 },
        { header: '电话', key: '电话', width: 15 },
        { header: '贷款金额', key: '贷款金额', width: 15 },
        { header: '状态', key: '状态', width: 15 }
      ];
      applicationsSheet.addRows(exportData.applications);

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=statistics-${period}-${new Date().toISOString().split('T')[0]}.xlsx`);

      // 写入响应
      await workbook.xlsx.write(res);
      res.end();

    } else {
      res.status(400).json({ success: false, error: 'Invalid format' });
    }

  } catch (error) {
    console.error('Export statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export statistics',
      details: error.message
    });
  }
});

/**
 * 获取月度报告（可以查看上个月、上上个月等）
 */
router.get('/monthly-report', async (req, res) => {
  try {
    const { year, month } = req.query;

    // 默认查询当前月
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

    // 计算月份的开始和结束时间
    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 1);

    // 上个月
    const lastMonthStart = new Date(targetYear, targetMonth - 2, 1);
    const lastMonthEnd = new Date(targetYear, targetMonth - 1, 1);

    // 并行查询当前月和上个月数据
    const [
      visitorsThisMonth,
      visitorsLastMonth,
      applicationsThisMonth,
      applicationsLastMonth,
      dailyData
    ] = await Promise.all([
      // 当前月访客
      VisitorTracking.countDocuments({
        visitDate: { $gte: monthStart, $lt: monthEnd }
      }),
      // 上个月访客
      VisitorTracking.countDocuments({
        visitDate: { $gte: lastMonthStart, $lt: lastMonthEnd }
      }),
      // 当前月申请
      LoanApplication.countDocuments({
        createdAt: { $gte: monthStart, $lt: monthEnd }
      }),
      // 上个月申请
      LoanApplication.countDocuments({
        createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd }
      }),
      // 每日分布
      VisitorTracking.aggregate([
        {
          $match: {
            visitDate: { $gte: monthStart, $lt: monthEnd }
          }
        },
        {
          $group: {
            _id: { $dayOfMonth: '$visitDate' },
            visitors: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])
    ]);

    res.json({
      success: true,
      period: {
        year: targetYear,
        month: targetMonth,
        monthName: monthStart.toLocaleDateString('zh-CN', { month: 'long', year: 'numeric' })
      },
      thisMonth: {
        visitors: visitorsThisMonth,
        applications: applicationsThisMonth,
        conversionRate: visitorsThisMonth > 0 ? ((applicationsThisMonth / visitorsThisMonth) * 100).toFixed(2) : 0
      },
      lastMonth: {
        visitors: visitorsLastMonth,
        applications: applicationsLastMonth,
        conversionRate: visitorsLastMonth > 0 ? ((applicationsLastMonth / visitorsLastMonth) * 100).toFixed(2) : 0
      },
      comparison: {
        visitorsChange: visitorsLastMonth > 0 ? (((visitorsThisMonth - visitorsLastMonth) / visitorsLastMonth) * 100).toFixed(2) : 0,
        applicationsChange: applicationsLastMonth > 0 ? (((applicationsThisMonth - applicationsLastMonth) / applicationsLastMonth) * 100).toFixed(2) : 0
      },
      dailyData: dailyData
    });

  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly report',
      details: error.message
    });
  }
});

/**
 * 获取详细的日报告
 */
router.get('/daily-report', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // 获取当天数据
    const [visitors, applications, pageViews] = await Promise.all([
      VisitorTracking.countDocuments({
        visitDate: { $gte: targetDate, $lt: nextDay }
      }),
      LoanApplication.countDocuments({
        createdAt: { $gte: targetDate, $lt: nextDay }
      }),
      VisitorTracking.aggregate([
        {
          $match: {
            visitDate: { $gte: targetDate, $lt: nextDay }
          }
        },
        {
          $group: {
            _id: '$page',
            views: { $sum: 1 }
          }
        },
        {
          $sort: { views: -1 }
        },
        {
          $limit: 10
        }
      ])
    ]);

    res.json({
      success: true,
      date: targetDate.toLocaleDateString('zh-CN'),
      visitors,
      applications,
      conversionRate: visitors > 0 ? ((applications / visitors) * 100).toFixed(2) : 0,
      topPages: pageViews
    });

  } catch (error) {
    console.error('Get daily report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily report',
      details: error.message
    });
  }
});

module.exports = router;
