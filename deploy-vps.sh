#!/bin/bash

# VPS Deployment Script for Diamond Bot
# Author: Deployment Automation
# Target: Contabo VPS 84.54.23.85

VPS_HOST="84.54.23.85"
VPS_USER="root"
VPS_PASSWORD="5qZY8Zp8YPe92Y6PN7i2vfw"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🚀 DIAMOND BOT VPS DEPLOYMENT STARTING...             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Export password for sshpass (if available)
export SSHPASS="$VPS_PASSWORD"

# Try sshpass first (most reliable for automated login)
if command -v sshpass &> /dev/null; then
    echo "✅ Using sshpass for authentication"
    echo ""
    echo "📥 Cloning latest code..."
    
    sshpass -e ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST" << 'EOF'
set -e
cd /root
echo "🗑️  Cleaning up..."
rm -rf diamond-bot 2>/dev/null || true

echo "📥 Cloning repository..."
git clone https://github.com/agentraza20-del/diamond-bot.git
cd diamond-bot

echo "📚 Installing dependencies..."
npm install

echo "🔍 Installing PM2..."
npm install -g pm2 2>/dev/null || true

echo "⏹️  Stopping old services..."
pm2 delete diamond-bot 2>/dev/null || true
pm2 delete admin-panel 2>/dev/null || true

echo "🤖 Starting Diamond Bot..."
pm2 start index.js --name diamond-bot --max-memory-restart 300M

echo "📊 Starting Admin Panel..."
pm2 start admin-panel/server.js --name admin-panel

echo "💾 Saving configuration..."
pm2 save
pm2 startup 2>/dev/null || true

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          ✅ DEPLOYMENT COMPLETE!                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🤖 Bot running on port 3003"
echo "📊 Admin Panel running on port 3005"
echo "🌐 Access: http://84.54.23.85:3005"
echo ""
pm2 status
EOF
    
else
    echo "⚠️  sshpass not found - using manual SSH"
    echo ""
    echo "Run this command in Git Bash or PowerShell:"
    echo ""
    echo "ssh root@84.54.23.85"
    echo ""
    echo "Then run these commands in VPS terminal:"
    echo ""
    cat << 'CMDS'
cd /root
rm -rf diamond-bot 2>/dev/null || true
git clone https://github.com/agentraza20-del/diamond-bot.git
cd diamond-bot
npm install
npm install -g pm2
pm2 delete diamond-bot 2>/dev/null || true
pm2 delete admin-panel 2>/dev/null || true
pm2 start index.js --name diamond-bot
pm2 start admin-panel/server.js --name admin-panel
pm2 save
pm2 startup
pm2 status
CMDS
fi

echo ""
