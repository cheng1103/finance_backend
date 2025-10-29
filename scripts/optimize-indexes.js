/**
 * Database Index Optimization Script
 *
 * This script creates optimized indexes for better query performance.
 * Run this once after deployment to production.
 *
 * Usage: node scripts/optimize-indexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Import models to ensure schema is loaded
require('../models/User');
require('../models/AdminUser');
require('../models/LoanApplication');
require('../models/Customer');
require('../models/VisitorTracking');
require('../models/WhatsAppTracking');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connected for index optimization');
  } catch (error) {
    logger.error('MongoDB connection error', error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;

    logger.info('Starting index creation...');

    // Users collection indexes
    logger.info('Creating indexes for users collection...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true, name: 'email_unique' });
    await db.collection('users').createIndex({ phone: 1 }, { name: 'phone_lookup' });
    await db.collection('users').createIndex({ createdAt: -1 }, { name: 'created_desc' });
    await db.collection('users').createIndex({ isActive: 1, role: 1 }, { name: 'active_role' });
    logger.info('✓ Users indexes created');

    // AdminUsers collection indexes
    logger.info('Creating indexes for adminusers collection...');
    await db.collection('adminusers').createIndex({ email: 1 }, { unique: true, name: 'email_unique' });
    await db.collection('adminusers').createIndex({ username: 1 }, { unique: true, name: 'username_unique' });
    await db.collection('adminusers').createIndex({ isActive: 1, role: 1 }, { name: 'active_role' });
    await db.collection('adminusers').createIndex({ lastLogin: -1 }, { name: 'last_login_desc' });
    logger.info('✓ AdminUsers indexes created');

    // LoanApplications collection indexes
    logger.info('Creating indexes for loanapplications collection...');
    await db.collection('loanapplications').createIndex({ applicationNumber: 1 }, { unique: true, name: 'app_number_unique' });
    await db.collection('loanapplications').createIndex({ 'personalInfo.email': 1 }, { name: 'email_lookup' });
    await db.collection('loanapplications').createIndex({ 'personalInfo.phone': 1 }, { name: 'phone_lookup' });
    await db.collection('loanapplications').createIndex({ status: 1, createdAt: -1 }, { name: 'status_created_desc' });
    await db.collection('loanapplications').createIndex({ createdAt: -1 }, { name: 'created_desc' });
    await db.collection('loanapplications').createIndex({ user: 1, createdAt: -1 }, { name: 'user_created_desc' });
    await db.collection('loanapplications').createIndex({ 'loanDetails.amount': 1, status: 1 }, { name: 'amount_status' });
    logger.info('✓ LoanApplications indexes created');

    // Customers collection indexes
    logger.info('Creating indexes for customers collection...');
    await db.collection('customers').createIndex({ email: 1 }, { unique: true, sparse: true, name: 'email_unique_sparse' });
    await db.collection('customers').createIndex({ phone: 1 }, { name: 'phone_lookup' });
    await db.collection('customers').createIndex({ whatsappNumber: 1 }, { name: 'whatsapp_lookup' });
    await db.collection('customers').createIndex({ whatsappStatus: 1, lastContact: -1 }, { name: 'status_contact' });
    await db.collection('customers').createIndex({ createdAt: -1 }, { name: 'created_desc' });
    await db.collection('customers').createIndex({ 'metadata.source': 1 }, { name: 'source_lookup' });
    logger.info('✓ Customers indexes created');

    // VisitorTracking collection indexes
    logger.info('Creating indexes for visitortrackings collection...');
    await db.collection('visitortrackings').createIndex({ timestamp: -1 }, { name: 'timestamp_desc' });
    await db.collection('visitortrackings').createIndex({ ipAddress: 1, timestamp: -1 }, { name: 'ip_timestamp' });
    await db.collection('visitortrackings').createIndex({ page: 1, timestamp: -1 }, { name: 'page_timestamp' });
    // TTL index to auto-delete old tracking data after 90 days
    await db.collection('visitortrackings').createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000, name: 'ttl_90days' });
    logger.info('✓ VisitorTracking indexes created');

    // WhatsAppTracking collection indexes
    logger.info('Creating indexes for whatsapptrackings collection...');
    await db.collection('whatsapptrackings').createIndex({ phoneNumber: 1, timestamp: -1 }, { name: 'phone_timestamp' });
    await db.collection('whatsapptrackings').createIndex({ messageId: 1 }, { unique: true, sparse: true, name: 'message_id_unique' });
    await db.collection('whatsapptrackings').createIndex({ status: 1, timestamp: -1 }, { name: 'status_timestamp' });
    await db.collection('whatsapptrackings').createIndex({ timestamp: -1 }, { name: 'timestamp_desc' });
    logger.info('✓ WhatsAppTracking indexes created');

    logger.info('All indexes created successfully!');

    // List all indexes for verification
    logger.info('\n=== Verification: Listing all indexes ===\n');
    const collections = ['users', 'adminusers', 'loanapplications', 'customers', 'visitortrackings', 'whatsapptrackings'];

    for (const collectionName of collections) {
      const indexes = await db.collection(collectionName).indexes();
      logger.info(`${collectionName} indexes:`, { count: indexes.length, indexes: indexes.map(i => i.name) });
    }

  } catch (error) {
    logger.error('Error creating indexes', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await createIndexes();

    logger.info('\n✅ Index optimization completed successfully!');
    logger.info('Your database queries will now be significantly faster.');

    process.exit(0);
  } catch (error) {
    logger.error('Index optimization failed', error);
    process.exit(1);
  }
};

main();
