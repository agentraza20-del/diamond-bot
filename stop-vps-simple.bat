@echo off
REM Stop VPS Bot - Simple Method
REM Requires: OpenSSH (Windows 10/11 built-in)

setlocal enabledelayedexpansion

echo.
echo ========================================
echo     VPS BOT STOP UTILITY
echo ========================================
echo.

SET VPS_IP=84.54.23.85
SET VPS_USER=root
SET VPS_PASS=5qZY8Zp8YPe92Y6PN7i2vfw

echo Connecting to VPS: %VPS_USER%@%VPS_IP%
echo.

REM Create a temporary file with commands
(
    echo pkill -9 -f 'node /root/diamond-bot/index.js'
    echo echo "✅ Main bot killed"
    echo sleep 1
    echo pkill -9 -f 'node /root/diamond-bot/admin-panel'
    echo echo "✅ Admin panel killed"
    echo sleep 2
    echo ps aux ^| grep node ^| grep diamond ^| grep -v grep
    echo echo ""
    echo echo "✅ Bot stopped on VPS!"
) > "%TEMP%\vps-commands.sh"

REM Execute via SSH
ssh -o StrictHostKeyChecking=no %VPS_USER%@%VPS_IP% < "%TEMP%\vps-commands.sh"

REM Cleanup
del "%TEMP%\vps-commands.sh" 2>nul

echo.
echo ========================================
echo Done!
echo ========================================
echo.
pause
