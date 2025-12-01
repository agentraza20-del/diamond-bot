#!/bin/bash
# Stop Diamond Bot on VPS

echo "🛑 Stopping Diamond Bot..."

# Kill main bot
pkill -f "node /root/diamond-bot/index.js"
echo "✅ Main bot stopped (PID 34256)"

# Kill admin panel
pkill -f "node /root/diamond-bot/admin-panel/server.js"
echo "✅ Admin panel stopped (PID 33350)"

# Wait a moment
sleep 2

# Verify
echo ""
echo "📊 Checking remaining processes:"
ps aux | grep node | grep -v grep || echo "✅ No node processes found!"

echo ""
echo "✅ Bot stopped successfully on VPS!"
