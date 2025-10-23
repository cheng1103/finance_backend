// PM2 配置文件 - 用于AWS EC2部署
module.exports = {
  apps: [
    {
      name: 'finance-api',
      script: './server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // 生产环境变量将从 .env.production 读取
      },
      // 日志配置
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // 自动重启配置
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_memory_restart: '500M',

      // 错误重启
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
