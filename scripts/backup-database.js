const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 配置
const BACKUP_DIR = path.join(__dirname, '../backups');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_db';
const RETENTION_DAYS = 30;

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function performBackup() {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupName = `backup-${timestamp}`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  console.log(`开始备份数据库到: ${backupPath}`);

  const command = `mongodump --uri=${MONGODB_URI} --out=${backupPath}`;

  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) {
        console.error('备份失败:', error);
        reject(error);
        return;
      }
      console.log('备份成功！');
      resolve();
    });
  });
}

async function exportCSV() {
  console.log('导出CSV数据...');
  const mongoose = require('mongoose');
  const { Parser } = require('json2csv');

  try {
    await mongoose.connect(MONGODB_URI);

    const VisitorTracking = require('../models/VisitorTracking');
    const LoanApplication = require('../models/LoanApplication');

    const visitors = await VisitorTracking.find().lean();
    if (visitors.length > 0) {
      const parser = new Parser();
      const csv = parser.parse(visitors);
      fs.writeFileSync(path.join(BACKUP_DIR, `visitors-${new Date().toISOString().split('T')[0]}.csv`), csv);
      console.log(`访客数据已导出: ${visitors.length} 条记录`);
    }

    const applications = await LoanApplication.find().lean();
    if (applications.length > 0) {
      const parser = new Parser();
      const csv = parser.parse(applications);
      fs.writeFileSync(path.join(BACKUP_DIR, `applications-${new Date().toISOString().split('T')[0]}.csv`), csv);
      console.log(`申请数据已导出: ${applications.length} 条记录`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('CSV导出失败:', error);
  }
}

async function main() {
  console.log('数据库备份系统 v1.0');
  console.log('备份时间:', new Date().toLocaleString('zh-CN'));
  
  try {
    await performBackup();
    await exportCSV();
    console.log('备份完成！');
    process.exit(0);
  } catch (error) {
    console.error('备份失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { performBackup, exportCSV };
