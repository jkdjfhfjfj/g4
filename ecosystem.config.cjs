module.exports = {
  apps: [
    {
      name: "trading-bot",
      script: "/home/ubuntu/g4/start.sh",
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
