module.exports = {
  apps: [
    {
      name: "trading-bot",
      script: "dist/index.cjs",
      env: {
        NODE_ENV: "production",
        PORT: "5000",
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
