#!/bin/bash
# বট এবং অ্যাডমিন প্যানেল চালু করার স্ক্রিপ্ট

echo "=================================================="
echo "  💎 Diamond Bot - VPS Starter"
echo "=================================================="
echo ""

# Navigate to bot directory
cd /root/diamond-bot

echo "📦 Checking services..."
pm2 delete all 2>/dev/null || true

echo ""
echo "🚀 Starting Diamond Bot..."
pm2 start index.js --name diamond-bot

echo ""
echo "🚀 Starting Admin Panel..."
pm2 start admin-panel/server.js --name admin-panel

echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "⚙️  Setting up auto-restart on reboot..."
pm2 startup

echo ""
echo "=================================================="
echo "  ✅ Services Status:"
echo "=================================================="
pm2 list

echo ""
echo "=================================================="
echo "  🌐 Access Information:"
echo "=================================================="
echo ""
echo "Admin Panel:  http://84.54.23.85:3000"
echo "Username:     admin"
echo "Password:     secure_password_123"
echo ""
echo "Bot Logs:     pm2 logs diamond-bot"
echo "Admin Logs:   pm2 logs admin-panel"
echo ""
echo "=================================================="
