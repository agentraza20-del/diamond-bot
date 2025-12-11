@echo off
REM Quick SSH Connect to VPS
REM This opens SSH connection to Contabo VPS

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     🔄 VPS RESTART - Connecting to 84.54.23.85...         ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Connecting to VPS...
echo.

REM Open SSH connection
ssh root@84.54.23.85

REM After SSH closes
echo.
echo ✅ Disconnected from VPS
echo.
pause
