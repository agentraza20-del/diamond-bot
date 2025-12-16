#!/bin/bash

# 🚀 QUICK DEPLOYMENT SCRIPT - Midnight Scheduler Fix
# Run this on your VPS to deploy the fix

echo "╔════════════════════════════════════════════════════════╗"
echo "║    🚀 DEPLOYING MIDNIGHT SCHEDULER FIX 🚀             ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Backup database
echo "Step 1️⃣ : Backing up database..."
cp config/database.json config/database.json.backup
echo "✅ Backup created: config/database.json.backup"
echo ""

# Step 2: Check timezone
echo "Step 2️⃣ : Checking VPS timezone..."
TIMEZONE=$(timedatectl | grep "Time zone" | awk '{print $3}')
echo "Current timezone: $TIMEZONE"

if [ "$TIMEZONE" != "Asia/Dhaka" ]; then
    echo "⚠️  WARNING: Timezone is not Asia/Dhaka!"
    echo "Setting timezone to Asia/Dhaka..."
    sudo timedatectl set-timezone Asia/Dhaka
    echo "✅ Timezone set to Asia/Dhaka"
else
    echo "✅ Timezone is correct (Asia/Dhaka)"
fi
echo ""

# Step 3: Pull latest code
echo "Step 3️⃣ : Pulling latest changes..."
git pull origin main
echo "✅ Code updated"
echo ""

# Step 4: Restart admin panel
echo "Step 4️⃣ : Restarting admin panel..."
pm2 restart admin-panel
echo "✅ Admin panel restarted"
echo ""

# Step 5: Wait for startup
echo "Step 5️⃣ : Waiting for admin panel to fully start..."
sleep 3
echo "✅ Admin panel started"
echo ""

# Step 6: Check logs
echo "Step 6️⃣ : Checking scheduler initialization..."
pm2 logs admin-panel --lines 50 | grep -i "midnight\|scheduler" || echo "Waiting for scheduler messages..."
echo ""

# Step 7: Run test
echo "Step 7️⃣ : Running scheduler test..."
node test-midnight-scheduler.js
echo ""

echo "╔════════════════════════════════════════════════════════╗"
echo "║         ✅ DEPLOYMENT COMPLETE ✅                    ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Next steps:"
echo "   1. Watch for midnight transfer:"
echo "      pm2 logs admin-panel --lines 0 --follow"
echo ""
echo "   2. Test manually if you want:"
echo "      node transfer-to-yesterday.js"
echo ""
echo "   3. Check admin panel:"
echo "      http://your-vps-ip:3005"
echo ""
