#!/bin/bash

# Diamond Bot Startup Script
# This ensures the bot keeps running even if SSH session ends

LOG_FILE="/root/diamond-bot/bot-startup.log"
PID_FILE="/root/diamond-bot/bot.pid"

echo "$(date): Starting Diamond Bot..." >> "$LOG_FILE"

# Kill any existing processes
pkill -f 'node.*index' 2>/dev/null || true
sleep 2

# Navigate to directory
cd /root/diamond-bot || exit 1

# Start bot with proper nohup and disown
nohup node index.js > "$LOG_FILE" 2>&1 &
BOT_PID=$!

# Save PID for later reference
echo $BOT_PID > "$PID_FILE"

# Disown the process so it doesn't get killed when SSH closes
disown -a

echo "$(date): Bot started with PID $BOT_PID" >> "$LOG_FILE"
echo "✅ Bot is running in background (PID: $BOT_PID)"

# Keep script alive for a bit to show QR code
sleep 15

# Show current status
echo ""
echo "=== BOT STATUS ==="
if ps -p $BOT_PID > /dev/null 2>&1; then
    echo "✅ Bot process is running"
    echo ""
    echo "=== RECENT LOG (last 20 lines) ==="
    tail -20 "$LOG_FILE"
else
    echo "❌ Bot process failed to start"
    echo "Check log: tail -50 $LOG_FILE"
fi
