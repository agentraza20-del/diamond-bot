@echo off
color 0A
echo.
echo ========================================
echo   Diamond Bot - Admin Panel Launcher
echo ========================================
echo.

cd /d "%~dp0admin-panel"

echo [1/3] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js found
echo.

echo [2/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)
echo ✓ Dependencies ready
echo.

echo [3/3] Starting Admin Panel...
echo.
echo ========================================
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    set IP=!IP:~1!
    goto :found
)
:found

echo   Access Admin Panel:
echo.
echo   📱 This Device:
echo      http://localhost:3000
echo.
echo   📱 Other Devices (Mobile/Tablet):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    echo      http://%%a:3000
    goto :showip
)
:showip
echo.
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js

pause
