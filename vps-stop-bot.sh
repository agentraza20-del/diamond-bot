#!/bin/bash
# Diamond Bot - Persistent Stop Script
# এটি VPS এ রাখুন এবং cron দিয়ে run করুন

LOG_FILE="/root/diamond-bot/bot-stop.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Bot stop request received" >> $LOG_FILE

# Stop main bot
if pgrep -f "node /root/diamond-bot/index.js" > /dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Killing main bot (PID: $(pgrep -f 'node /root/diamond-bot/index.js'))" >> $LOG_FILE
    pkill -9 -f "node /root/diamond-bot/index.js"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Main bot stopped" >> $LOG_FILE
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️ Main bot not running" >> $LOG_FILE
fi

# Stop admin panel
if pgrep -f "node /root/diamond-bot/admin-panel/server.js" > /dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Killing admin panel (PID: $(pgrep -f 'node /root/diamond-bot/admin-panel/server.js'))" >> $LOG_FILE
    pkill -9 -f "node /root/diamond-bot/admin-panel/server.js"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Admin panel stopped" >> $LOG_FILE
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️ Admin panel not running" >> $LOG_FILE
fi

# Verify
sleep 2
REMAINING=$(pgrep -f "node.*diamond" | wc -l)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Remaining processes: $REMAINING" >> $LOG_FILE

if [ $REMAINING -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ All bot processes stopped successfully!" >> $LOG_FILE
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Warning: $REMAINING processes still running" >> $LOG_FILE
fi

echo "" >> $LOG_FILE
