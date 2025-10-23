#!/usr/bin/env node

/**
 * Health Check Script
 * Verifies backend services are running correctly
 */

const http = require('http');
const https = require('https');
require('dotenv').config();

const PORT = process.env.PORT || 3001;
const HOST = process.env.HEALTH_CHECK_HOST || 'localhost';
const PROTOCOL = process.env.HEALTH_CHECK_PROTOCOL || 'http';

console.log('═══════════════════════════════════════');
console.log('🏥 Backend Health Check');
console.log('═══════════════════════════════════════\n');

// Health check configuration
const checks = [
  {
    name: 'API Health Endpoint',
    url: `${PROTOCOL}://${HOST}:${PORT}/health`,
    timeout: 5000,
    required: true
  },
  {
    name: 'API Root',
    url: `${PROTOCOL}://${HOST}:${PORT}/`,
    timeout: 5000,
    required: false
  }
];

let passedChecks = 0;
let failedChecks = 0;

/**
 * Perform HTTP/HTTPS request
 */
function makeRequest(url, timeout) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout }, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Run a single health check
 */
async function runCheck(check) {
  console.log(`🔍 Checking: ${check.name}`);
  console.log(`   URL: ${check.url}`);

  try {
    const startTime = Date.now();
    const response = await makeRequest(check.url, check.timeout);
    const duration = Date.now() - startTime;

    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log(`   ✅ Status: ${response.statusCode} (${duration}ms)`);

      // Try to parse JSON response
      try {
        const json = JSON.parse(response.body);
        if (json.status) {
          console.log(`   📊 Response: ${json.status}`);
        }
        if (json.message) {
          console.log(`   💬 Message: ${json.message}`);
        }
      } catch (e) {
        // Not JSON, ignore
      }

      passedChecks++;
      return true;
    } else {
      console.error(`   ❌ Status: ${response.statusCode} (${duration}ms)`);
      if (check.required) failedChecks++;
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    if (check.required) failedChecks++;
    return false;
  }
}

/**
 * Check PM2 status (if available)
 */
async function checkPM2Status() {
  console.log('\n🔄 Checking PM2 Status:');

  const { exec } = require('child_process');

  return new Promise((resolve) => {
    exec('pm2 jlist', (error, stdout, stderr) => {
      if (error) {
        console.log('   ⚠️  PM2 not available or not running');
        resolve(false);
        return;
      }

      try {
        const processes = JSON.parse(stdout);
        const financeAPI = processes.find(p => p.name === 'finance-api');

        if (financeAPI) {
          console.log(`   ✅ finance-api status: ${financeAPI.pm2_env.status}`);
          console.log(`   📊 Uptime: ${Math.floor(financeAPI.pm2_env.pm_uptime / 1000)}s`);
          console.log(`   💾 Memory: ${Math.floor(financeAPI.monit.memory / 1024 / 1024)}MB`);
          console.log(`   🔄 Restarts: ${financeAPI.pm2_env.restart_time}`);
          resolve(true);
        } else {
          console.log('   ⚠️  finance-api process not found in PM2');
          resolve(false);
        }
      } catch (e) {
        console.error(`   ❌ Error parsing PM2 output: ${e.message}`);
        resolve(false);
      }
    });
  });
}

/**
 * Main health check routine
 */
async function runHealthCheck() {
  console.log(`Target: ${PROTOCOL}://${HOST}:${PORT}\n`);

  // Run all checks
  for (const check of checks) {
    await runCheck(check);
    console.log('');
  }

  // Check PM2 if available
  await checkPM2Status();

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('📊 Health Check Summary');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Passed: ${passedChecks}`);
  console.log(`❌ Failed: ${failedChecks}`);

  if (failedChecks > 0) {
    console.error('\n❌ Health check FAILED!');
    console.error('Some critical services are not responding.\n');
    process.exit(1);
  } else {
    console.log('\n✅ Health check PASSED!');
    console.log('All services are operational.\n');
    process.exit(0);
  }
}

// Run the health check
runHealthCheck().catch(error => {
  console.error('\n❌ Health check encountered an error:');
  console.error(error);
  process.exit(1);
});
