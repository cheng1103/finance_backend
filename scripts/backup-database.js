#!/usr/bin/env node

/**
 * MongoDB Database Backup Script
 *
 * This script creates backups of your MongoDB Atlas database.
 * For MongoDB Atlas, you should primarily use Atlas's built-in backup features.
 * This script is for additional manual backups or data exports.
 *
 * Usage: node scripts/backup-database.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Import models
require('../models/User');
require('../models/AdminUser');
require('../models/LoanApplication');
require('../models/Customer');

const BACKUP_DIR = path.join(__dirname, '../backups');
const COLLECTIONS_TO_BACKUP = [
  'users',
  'adminusers',
  'loanapplications',
  'customers',
  'visitortrackings',
  'whatsapptrackings'
];

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  logger.info('Created backup directory', { path: BACKUP_DIR });
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connected for backup');
  } catch (error) {
    logger.error('MongoDB connection error', error);
    process.exit(1);
  }
};

const backupCollection = async (collectionName) => {
  try {
    const collection = mongoose.connection.db.collection(collectionName);
    const data = await collection.find({}).toArray();

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `${collectionName}_${timestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    logger.info(`Backed up collection: ${collectionName}`, {
      collection: collectionName,
      documents: data.length,
      file: filename,
      size: `${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`
    });

    return {
      collection: collectionName,
      documents: data.length,
      file: filename
    };
  } catch (error) {
    logger.error(`Error backing up collection: ${collectionName}`, error);
    throw error;
  }
};

const createManifest = (backupResults) => {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const manifest = {
    backupDate: new Date().toISOString(),
    timestamp,
    database: process.env.MONGODB_URI.split('@')[1]?.split('/')[1] || 'unknown',
    collections: backupResults,
    totalDocuments: backupResults.reduce((sum, result) => sum + result.documents, 0)
  };

  const manifestPath = path.join(BACKUP_DIR, `manifest_${timestamp}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  logger.info('Created backup manifest', { file: `manifest_${timestamp}.json` });
  return manifestPath;
};

const cleanOldBackups = () => {
  const retentionDays = 7; // Keep backups for 7 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const files = fs.readdirSync(BACKUP_DIR);
  let deletedCount = 0;

  files.forEach(file => {
    const filepath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filepath);

    if (stats.mtime < cutoffDate) {
      fs.unlinkSync(filepath);
      deletedCount++;
      logger.info(`Deleted old backup: ${file}`);
    }
  });

  if (deletedCount > 0) {
    logger.info(`Cleaned up ${deletedCount} old backup files`);
  }
};

const main = async () => {
  try {
    logger.info('=== Starting Database Backup ===');
    logger.info(`Backup directory: ${BACKUP_DIR}`);

    await connectDB();

    const backupResults = [];

    for (const collectionName of COLLECTIONS_TO_BACKUP) {
      try {
        const result = await backupCollection(collectionName);
        backupResults.push(result);
      } catch (error) {
        logger.error(`Failed to backup ${collectionName}`, error);
        // Continue with other collections
      }
    }

    // Create manifest file
    const manifestPath = createManifest(backupResults);

    // Clean up old backups
    cleanOldBackups();

    logger.info('=== Backup Completed Successfully ===', {
      collections: backupResults.length,
      totalDocuments: backupResults.reduce((sum, r) => sum + r.documents, 0),
      manifestPath
    });

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    logger.error('Backup failed', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run backup
main();
