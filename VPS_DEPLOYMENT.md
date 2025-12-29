# VPS Deployment Guide (Oracle Cloud / Any Linux VPS)

## Prerequisites
- Node.js 18+ installed
- npm installed
- PM2 installed globally (`npm install -g pm2`)

## Step 1: Clone and Setup

```bash
# Clone or upload your project to the VPS
cd /home/ubuntu  # or your preferred directory
git clone <your-repo-url> trading-bot
cd trading-bot

# Install dependencies
npm install
```

## Step 2: Create Environment File

Create a `.env` file with your credentials:

```bash
cat > .env << 'EOF'
TELEGRAM_API_ID=34108253
TELEGRAM_API_HASH=dacfc4bfece509097693f6d96d3420b8
GROQ_API_KEY=your_groq_api_key
METAAPI_TOKEN=your_metaapi_token
METAAPI_ACCOUNT_ID=your_metaapi_account_id
SESSION_SECRET=your_random_session_secret
EOF
```

## Step 3: Build the Application

```bash
# Build both frontend and backend
npm run build
```

This creates:
- `dist/public/` - Frontend static files
- `dist/index.cjs` - Backend bundle

## Step 4: Create Logs Directory

```bash
mkdir -p logs
```

## Step 5: Start with PM2

```bash
# Start the application
pm2 start ecosystem.config.cjs

# Save PM2 configuration for auto-restart on reboot
pm2 save

# Enable PM2 startup on boot
pm2 startup
```

## Step 6: Configure Firewall

For Oracle Cloud, you need to configure both iptables and the VCN security list:

```bash
# Open port 5000 on iptables
sudo iptables -I INPUT -p tcp --dport 5000 -j ACCEPT
sudo netfilter-persistent save

# Also add ingress rule in Oracle Cloud Console:
# Networking > Virtual Cloud Networks > Your VCN > Security Lists
# Add ingress rule: Source CIDR 0.0.0.0/0, Port 5000, TCP
```

## Step 7: Access Your Application

Open in browser:
```
http://YOUR_VPS_IP:5000
```

## Useful PM2 Commands

```bash
# View logs
pm2 logs trading-bot

# View status
pm2 status

# Restart application
pm2 restart trading-bot

# Stop application
pm2 stop trading-bot

# Delete application
pm2 delete trading-bot
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>
```

### Check if Application is Running
```bash
curl http://localhost:5000
```

### View Detailed Logs
```bash
# Application logs
cat logs/out.log

# Error logs
cat logs/error.log
```

### Rebuild After Changes
```bash
npm run build
pm2 restart trading-bot
```
