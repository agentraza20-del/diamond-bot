#!/bin/bash

# VPS Restart Script
# Restarts Diamond Bot and Admin Panel on Contabo VPS

VPS_HOST="84.54.23.85"
VPS_USER="root"
VPS_PASSWORD="5qZY8Zp8YPe92Y6PN7i2vfw"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        🔄 RESTARTING VPS SERVICES...                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Export password for sshpass
export SSHPASS="$VPS_PASSWORD"

# Check if sshpass is available
if command -v sshpass &> /dev/null; then
    echo "✅ Using sshpass for authentication"
    echo ""
    
    # Execute restart command
    sshpass -e ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" << 'EOF'
echo "🔄 Stopping services..."
pm2 stop all 2>/dev/null

echo "⏳ Waiting 2 seconds..."
sleep 2

echo "🚀 Starting services..."
pm2 start all

echo "⏳ Waiting 3 seconds for services to stabilize..."
sleep 3

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        ✅ RESTART COMPLETE!                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "📋 Service Status:"
pm2 status

echo ""
echo "📝 Log output:"
pm2 logs --lines 5 --nostream

echo ""
echo "🌐 Admin Panel: http://84.54.23.85:3005"
echo "🤖 Bot running on port 3003"
echo ""
EOF
    
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo ""
        echo "✅ Restart successful!"
    else
        echo ""
        echo "⚠️  Restart encountered some issues. Check logs with:"
        echo "   pm2 logs diamond-bot"
    fi
    
else
    echo "⚠️  sshpass not installed"
    echo ""
    echo "📋 To restart manually, run this command:"
    echo ""
    echo "   ssh root@84.54.23.85"
    echo ""
    echo "   Then in VPS terminal:"
    echo ""
    echo "   pm2 restart all && pm2 status"
    echo ""
fi

echo ""
