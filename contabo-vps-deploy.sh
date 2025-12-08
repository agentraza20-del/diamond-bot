#!/bin/bash
# 🚀 Contabo VPS Automated Deployment Script
# Usage: bash contabo-vps-deploy.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Diamond Bot - Contabo VPS Setup${NC}"
echo "========================================"

# Step 1: System Update
echo -e "${YELLOW}[1/8] Updating system...${NC}"
apt update && apt upgrade -y

# Step 2: Install Node.js
echo -e "${YELLOW}[2/8] Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Step 3: Install Git
echo -e "${YELLOW}[3/8] Installing Git...${NC}"
apt install -y git

# Step 4: Install PM2
echo -e "${YELLOW}[4/8] Installing PM2...${NC}"
npm install -g pm2

# Step 5: Clone Repository
echo -e "${YELLOW}[5/8] Cloning bot repository...${NC}"
cd /root
if [ ! -d "diamond-bot" ]; then
    git clone https://github.com/agentraza20-del/diamond-bot.git
else
    cd diamond-bot
    git pull
    cd ..
fi

# Step 6: Install Dependencies
echo -e "${YELLOW}[6/8] Installing dependencies...${NC}"
cd /root/diamond-bot
npm install

# Step 7: Create .env file
echo -e "${YELLOW}[7/8] Creating .env file...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
SESSION_NAME=diamond-bot-session
DB_PATH=./config
ADMIN_PORT=3000
BOT_PORT=3001
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password_123
SERVER_URL=http://84.54.23.85:3000
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
fi

# Step 8: Setup PM2 & Start Services
echo -e "${YELLOW}[8/8] Starting services with PM2...${NC}"
pm2 start index.js --name "diamond-bot"
pm2 start admin-panel/server.js --name "admin-panel"
pm2 save

# Enable startup on reboot
pm2 startup -u root --hp /root

# Open firewall ports
echo -e "${YELLOW}Opening firewall ports...${NC}"
ufw allow 3000 || echo "UFW not enabled"
ufw allow 3001 || echo "UFW not enabled"

echo -e "${GREEN}✅ Setup complete!${NC}"
echo "========================================"
echo "📊 Services Status:"
pm2 list
echo ""
echo "🌐 Access Admin Panel:"
echo "   http://84.54.23.85:3000"
echo ""
echo "📱 WhatsApp QR Code:"
echo "   Check logs: pm2 logs diamond-bot"
echo ""
echo "💡 Tips:"
echo "   - Restart services: pm2 restart all"
echo "   - View logs: pm2 logs"
echo "   - Monitor: pm2 monit"
echo "========================================"
