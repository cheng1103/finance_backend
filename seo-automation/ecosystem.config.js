/**
 * PM2 Ecosystem Configuration
 * For production deployment on EC2
 */

module.exports = {
  apps: [
    {
      name: 'seo-automation',
      script: './index.js',
      instances: 1,
      exec_mode: 'fork',

      // Environment
      env: {
        NODE_ENV: 'production',
      },

      // Restart policy
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Restart delays
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: false,

      // Advanced
      listen_timeout: 3000,
      shutdown_with_message: false,
    },
  ],
};
