#!/bin/bash

# Diamond Bot Status Checker
# Check if bot is running and show latest status

echo "=================================================="
echo "   🤖 DIAMOND BOT - STATUS CHECK"
echo "=================================================="
echo ""

BOT_LOG="/root/diamond-bot/bot-startup.log"
PID_FILE="/root/diamond-bot/bot.pid"

# Check if log file exists
if [ -f "$BOT_LOG" ]; then
    echo "✅ Bot Log File Found"
    echo ""
    
    # Check if process is running
    if ps aux | grep -q '[n]ode.*index'; then
        echo "✅ Bot Process: RUNNING"
        BOT_PID=$(pgrep -f 'node.*index' | head -1)
        echo "   PID: $BOT_PID"
    else
        echo "❌ Bot Process: NOT RUNNING"
    fi
    
    echo ""
    echo "--- Last 30 lines of log: ---"
    tail -30 "$BOT_LOG"
    
    echo ""
    echo "--- Bot Status Indicators ---"
    
    if grep -q "✅ Bot process is running" "$BOT_LOG"; then
        echo "✅ Bot started successfully"
    fi
    
    if grep -q "WhatsApp Bot Ready" "$BOT_LOG"; then
        echo "✅ WhatsApp connection ready"
    fi
    
    if grep -q "successfully Authenticated" "$BOT_LOG"; then
        echo "✅ WhatsApp authenticated"
    fi
    
    if grep -q "SCAN THIS QR CODE" "$BOT_LOG"; then
        echo "✅ QR code generated"
    fi
    
    if grep -q "listening for messages" "$BOT_LOG"; then
        echo "✅ Bot listening for messages"
    fi
    
else
    echo "❌ Bot Log File Not Found"
    echo "   Try running: bash /root/diamond-bot/start-bot.sh"
fi

echo ""
echo "=================================================="
echo "Bot is running in background at: /root/diamond-bot"
echo "Log file: $BOT_LOG"
echo "=================================================="
