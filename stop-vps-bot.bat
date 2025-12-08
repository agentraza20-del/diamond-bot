@echo off
REM Stop VPS Bot using plink (PuTTY SSH)
REM Download plink from: https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html

setlocal enabledelayedexpansion

SET VPS_IP=84.54.23.85
SET VPS_USER=root
SET VPS_PASS=5qZY8Zp8YPe92Y6PN7i2vfw

echo 🛑 Stopping bot on VPS...
echo 📍 Target: %VPS_USER%@%VPS_IP%
echo.

REM Check if plink exists
if not exist "C:\Program Files\PuTTY\plink.exe" (
    echo ❌ PuTTY plink.exe not found!
    echo Please download from: https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html
    pause
    exit /b 1
)

REM Execute commands on VPS
"C:\Program Files\PuTTY\plink.exe" -pw %VPS_PASS% -batch %VPS_USER%@%VPS_IP% ^
    "echo '📍 Connected to VPS'; " ^
    "pkill -9 -f 'node /root/diamond-bot/index.js'; " ^
    "echo '✅ Main bot killed'; " ^
    "sleep 1; " ^
    "pkill -9 -f 'node /root/diamond-bot/admin-panel'; " ^
    "echo '✅ Admin panel killed'; " ^
    "sleep 2; " ^
    "echo ''; " ^
    "echo '📊 Verification:'; " ^
    "ps aux | grep 'node.*diamond' | grep -v grep || echo '✅ No bot processes found'"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Bot stopped successfully on VPS!
) else (
    echo.
    echo ⚠️ Error occurred. Check VPS manually.
)

pause
