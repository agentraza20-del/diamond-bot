module.exports = {
  apps: [
    {
      name: 'diamond-bot',
      script: 'index.js',
      cwd: '/root/diamond-bot',
      instances: 1,
      exec_mode: 'fork',
      error_file: '/root/diamond-bot/logs/bot-error.log',
      out_file: '/root/diamond-bot/logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      },
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'admin-panel',
      script: 'server.js',
      cwd: '/root/diamond-bot/admin-panel',
      instances: 1,
      exec_mode: 'fork',
      error_file: '/root/diamond-bot/logs/admin-error.log',
      out_file: '/root/diamond-bot/logs/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      },
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
