# PowerShell VPS Restart Script
# Opens interactive SSH and shows restart instructions

$VPS_IP = "84.54.23.85"
$VPS_USER = "root"
$VPS_PASSWORD = "5qZY8Zp8YPe92Y6PN7i2vfw"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        🔄 VPS SERVICE RESTART WIZARD                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📌 VPS Details:" -ForegroundColor Yellow
Write-Host "  IP: $VPS_IP" -ForegroundColor White
Write-Host "  User: $VPS_USER" -ForegroundColor White
Write-Host ""

Write-Host "🔐 Opening SSH connection..." -ForegroundColor Green
Write-Host ""

# Wait a moment then show instructions
Start-Sleep -Seconds 1

Write-Host "📋 INSTRUCTIONS:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "1. An SSH terminal will open" -ForegroundColor White
Write-Host "2. Enter password: $VPS_PASSWORD" -ForegroundColor Yellow
Write-Host "3. Copy & paste ONE of these commands:" -ForegroundColor White
Write-Host ""

Write-Host "   OPTION A (Simple Restart):" -ForegroundColor Cyan
Write-Host "   pm2 restart all" -ForegroundColor Green
Write-Host ""

Write-Host "   OPTION B (Full Restart):" -ForegroundColor Cyan
Write-Host "   pm2 kill && sleep 3 && cd /root/diamond-bot && pm2 start index.js --name diamond-bot && pm2 start admin-panel/server.js --name admin-panel && pm2 status" -ForegroundColor Green
Write-Host ""

Write-Host "4. Press Enter and wait for completion" -ForegroundColor White
Write-Host "5. Type: exit" -ForegroundColor White
Write-Host "6. Close the terminal" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Prompt user
Write-Host "Ready? Press Enter to connect..." -ForegroundColor Yellow
Read-Host | Out-Null

Write-Host ""
Write-Host "🔗 Connecting to $VPS_IP..." -ForegroundColor Green
Write-Host ""

# Open SSH connection
& ssh root@$VPS_IP

Write-Host ""
Write-Host "✅ SSH session closed" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Check service status anytime with: pm2 status" -ForegroundColor Yellow
Write-Host "💡 Tip: View logs with: pm2 logs diamond-bot" -ForegroundColor Yellow
Write-Host ""
