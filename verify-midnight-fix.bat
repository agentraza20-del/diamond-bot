@echo off

REM 🚀 QUICK DEPLOYMENT SCRIPT - Midnight Scheduler Fix (Windows)
REM Run this locally to verify the fix is working

cls
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  🚀 VERIFYING MIDNIGHT SCHEDULER FIX 🚀              ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Step 1: Check if Node.js is installed
echo Step 1: Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js installed: %NODE_VERSION%
echo.

REM Step 2: Check if transfer script exists
echo Step 2: Checking transfer-to-yesterday.js...
if exist "transfer-to-yesterday.js" (
    echo ✅ transfer-to-yesterday.js found
) else (
    echo ❌ transfer-to-yesterday.js NOT found
    exit /b 1
)
echo.

REM Step 3: Check if admin-panel/server.js exists
echo Step 3: Checking admin-panel/server.js...
if exist "admin-panel\server.js" (
    echo ✅ admin-panel/server.js found
) else (
    echo ❌ admin-panel/server.js NOT found
    exit /b 1
)
echo.

REM Step 4: Check if database file exists
echo Step 4: Checking database file...
if exist "config\database.json" (
    echo ✅ config/database.json found
) else (
    echo ❌ config/database.json NOT found - this will be created on first run
)
echo.

REM Step 5: Run scheduler test
echo Step 5: Running scheduler time calculation test...
node test-midnight-scheduler.js
if %errorlevel% neq 0 (
    echo ❌ Test failed
    exit /b 1
)
echo.

REM Step 6: Verify scheduler code exists
echo Step 6: Verifying scheduler code in admin-panel/server.js...
findstr /R "getTimeUntilMidnight\|runMidnightTransfer\|scheduleMidnightTask" admin-panel\server.js >nul
if %errorlevel% equ 0 (
    echo ✅ Scheduler functions found in server.js
) else (
    echo ❌ Scheduler functions NOT found in server.js
    exit /b 1
)
echo.

echo ╔════════════════════════════════════════════════════════╗
echo ║      ✅ VERIFICATION COMPLETE ✅                     ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo 📝 Summary:
echo    ✅ transfer-to-yesterday.js - Ready
echo    ✅ Scheduler code added to admin-panel/server.js
echo    ✅ Time calculation working correctly
echo    ✅ Ready to deploy to VPS
echo.
echo 🚀 To deploy:
echo    1. Push changes to VPS
echo    2. SSH into VPS
echo    3. Run: deploy-midnight-fix.sh
echo    4. Monitor: pm2 logs admin-panel
echo.
