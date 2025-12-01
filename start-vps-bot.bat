@echo off
REM Diamond Bot - VPS Start Script
REM Usage: Double-click or run from command prompt

title Diamond Bot - VPS Start

echo.
echo ================================================
echo    Diamond Bot & Admin Panel - VPS Starter
echo ================================================
echo.
echo Connecting to VPS: 84.54.23.85
echo.

REM You can either:
REM 1. Replace with expect script (Linux style)
REM 2. Use password-less SSH (recommended)
REM 3. Use PuTTY with saved session

REM For now, show manual commands
echo Run these commands in your SSH terminal:
echo.
echo ssh root@84.54.23.85
echo.
echo Then paste this:
echo.
echo cd /root/diamond-bot
echo pm2 start index.js --name diamond-bot
echo pm2 start admin-panel/server.js --name admin-panel
echo pm2 save
echo pm2 list
echo.
echo ================================================
echo After these commands:
echo.
echo 1. Admin Panel: http://84.54.23.85:3000
echo 2. Login: admin / secure_password_123
echo 3. Set initial stock
echo 4. Check WhatsApp QR in logs
echo.
echo ================================================
echo.
pause
