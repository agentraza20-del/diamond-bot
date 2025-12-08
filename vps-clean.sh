#!/bin/bash

echo "=== VPS Cleaning Started ==="

# Kill all node and npm processes
echo "Stopping all Node processes..."
pkill -f node 2>/dev/null || true
pkill -f npm 2>/dev/null || true
pkill -f pm2 2>/dev/null || true
sleep 3

# Navigate to diamond-bot directory
cd /root/diamond-bot 2>/dev/null || cd ~ || true

# Remove node_modules
echo "Removing node_modules..."
rm -rf node_modules 2>/dev/null || true

# Remove .pm2 directory
echo "Removing PM2 data..."
rm -rf ~/.pm2 2>/dev/null || true

# Clean npm cache
echo "Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true

# Remove log files
echo "Removing log files..."
rm -f *.log 2>/dev/null || true
rm -f /root/*.log 2>/dev/null || true

# List remaining directories
echo ""
echo "=== VPS Directory Status ==="
ls -lah /root/ | grep -E '^d'

echo ""
echo "=== VPS Cleaning Completed ==="
