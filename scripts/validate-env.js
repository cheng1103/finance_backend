#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * Validates all required environment variables before deployment
 */

require('dotenv').config();

const REQUIRED_VARS = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'FRONTEND_URL',
  'ADMIN_URL',
  'CORS_ORIGIN'
];

const OPTIONAL_VARS = [
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD_HASH'
];

const SECURITY_CHECKS = {
  JWT_SECRET: {
    minLength: 32,
    description: 'JWT secret should be at least 32 characters'
  },
  MONGODB_URI: {
    pattern: /^mongodb(\+srv)?:\/\/.+/,
    description: 'MongoDB URI must start with mongodb:// or mongodb+srv://'
  }
};

let hasErrors = false;
let hasWarnings = false;

console.log('═══════════════════════════════════════');
console.log('🔍 Environment Variables Validation');
console.log('═══════════════════════════════════════\n');

// Check required variables
console.log('📋 Checking Required Variables:');
REQUIRED_VARS.forEach(varName => {
  const value = process.env[varName];

  if (!value) {
    console.error(`❌ ${varName}: MISSING (REQUIRED)`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}: SET`);

    // Additional security checks
    if (SECURITY_CHECKS[varName]) {
      const check = SECURITY_CHECKS[varName];

      if (check.minLength && value.length < check.minLength) {
        console.error(`   ⚠️  ${check.description}`);
        hasWarnings = true;
      }

      if (check.pattern && !check.pattern.test(value)) {
        console.error(`   ⚠️  ${check.description}`);
        hasWarnings = true;
      }
    }
  }
});

// Check optional variables
console.log('\n📋 Checking Optional Variables:');
OPTIONAL_VARS.forEach(varName => {
  const value = process.env[varName];

  if (!value) {
    console.warn(`⚠️  ${varName}: NOT SET (optional)`);
  } else {
    console.log(`✅ ${varName}: SET`);
  }
});

// Environment-specific checks
console.log('\n🌍 Environment-Specific Checks:');

const nodeEnv = process.env.NODE_ENV;
console.log(`Environment: ${nodeEnv}`);

if (nodeEnv === 'production') {
  // Production-specific checks
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.includes('your-')) {
    console.error('❌ JWT_SECRET appears to be a placeholder value in production!');
    hasErrors = true;
  }

  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('username:password')) {
    console.error('❌ MONGODB_URI appears to contain placeholder credentials!');
    hasErrors = true;
  }

  if (!process.env.ADMIN_PASSWORD_HASH) {
    console.error('❌ ADMIN_PASSWORD_HASH is required in production!');
    hasErrors = true;
  }
}

// Check CORS configuration
console.log('\n🔒 CORS Configuration:');
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [];
console.log(`Allowed origins: ${corsOrigins.length}`);
corsOrigins.forEach(origin => {
  console.log(`  • ${origin.trim()}`);
});

if (corsOrigins.length === 0) {
  console.warn('⚠️  No CORS origins configured!');
  hasWarnings = true;
}

// Test MongoDB connection format
console.log('\n🗄️  Database Configuration:');
if (process.env.MONGODB_URI) {
  try {
    const uri = new URL(process.env.MONGODB_URI.replace('mongodb+srv://', 'https://'));
    console.log(`✅ Database host: ${uri.hostname}`);

    if (uri.username === 'username' || uri.password === 'password') {
      console.error('❌ Database credentials appear to be placeholders!');
      hasErrors = true;
    }
  } catch (error) {
    console.error(`❌ Invalid MongoDB URI format: ${error.message}`);
    hasErrors = true;
  }
}

// Summary
console.log('\n═══════════════════════════════════════');
console.log('📊 Validation Summary');
console.log('═══════════════════════════════════════');

if (hasErrors) {
  console.error('❌ Validation FAILED - Critical errors found!');
  console.error('Please fix the errors above before deployment.\n');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('⚠️  Validation PASSED with warnings');
  console.warn('Please review the warnings above.\n');
  process.exit(0);
} else {
  console.log('✅ Validation PASSED - All checks successful!');
  console.log('Environment is ready for deployment.\n');
  process.exit(0);
}
