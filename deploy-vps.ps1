# VPS Deployment Script for Contabo
# Author: Diamond Bot Deployment
# Date: 2025-12-11

$ErrorActionPreference = "Continue"

$vpsIP = "84.54.23.85"
$vpsUser = "root"
$vpsPassword = "5qZY8Zp8YPe92Y6PN7i2vfw"

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🚀 DIAMOND BOT VPS DEPLOYMENT            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📌 Target VPS: $vpsIP" -ForegroundColor Yellow
Write-Host "👤 User: $vpsUser" -ForegroundColor Yellow
Write-Host ""

# Check if sshpass is installed (for WSL/Git Bash)
Write-Host "🔍 Checking for SSH tools..." -ForegroundColor Green

# Try PuTTY's plink if available
$plink = Get-Command plink -ErrorAction SilentlyContinue
if ($plink) {
    Write-Host "✅ Found: plink (PuTTY)" -ForegroundColor Green
    
    # Create commands file for plink
    $cmdFile = "$env:TEMP\vps_commands.txt"
    
    $commands = @"
cd /root

# Remove old deployment if exists
rm -rf diamond-bot 2>/dev/null || true

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs git curl wget

# Install PM2 globally
npm install -g pm2

# Clone repository
git clone https://github.com/agentraza20-del/diamond-bot.git
cd diamond-bot

# Install dependencies
npm install

# Create necessary directories
mkdir -p config logs

# Start services with PM2
pm2 start index.js --name "diamond-bot"
pm2 start admin-panel/server.js --name "admin-panel"

# Save PM2 configuration
pm2 save
pm2 startup

# Show status
pm2 status

echo "✅ ===== DEPLOYMENT COMPLETE ====="
echo "🤖 Bot running on port 3003"
echo "📊 Admin Panel on port 3005"
echo "🌐 Access: http://84.54.23.85:3005"
"@
    
    $commands | Out-File -FilePath $cmdFile -Encoding UTF8
    
    Write-Host "📝 Running deployment commands..." -ForegroundColor Green
    Write-Host ""
    
    # Note: plink requires password interactively or stored in pageant
    Write-Host "⚠️  Using plink - may need interactive password entry" -ForegroundColor Yellow
    Write-Host ""
    
} else {
    Write-Host "⚠️  plink not found" -ForegroundColor Yellow
}

# Alternative: Use native SSH if available (Windows 10+)
$ssh = Get-Command ssh -ErrorAction SilentlyContinue
if ($ssh) {
    Write-Host "✅ Found: OpenSSH Client" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 To deploy manually, run this command in PowerShell:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "ssh root@84.54.23.85" -ForegroundColor White
    Write-Host ""
    Write-Host "Then paste these commands:" -ForegroundColor Cyan
    Write-Host ""
    
    $deployCommands = @"
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs git curl wget
npm install -g pm2
cd /root && rm -rf diamond-bot; git clone https://github.com/agentraza20-del/diamond-bot.git
cd diamond-bot
npm install
mkdir -p config logs
pm2 start index.js --name "diamond-bot"
pm2 start admin-panel/server.js --name "admin-panel"
pm2 save
pm2 startup
pm2 status
"@
    
    Write-Host $deployCommands -ForegroundColor Green
    Write-Host ""
    
    # Offer to copy to clipboard
    Write-Host "📋 Copy commands? (Y/N): " -NoNewline
    $response = Read-Host
    if ($response -eq 'Y' -or $response -eq 'y') {
        $deployCommands | Set-Clipboard
        Write-Host "✅ Commands copied to clipboard!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 Now run: ssh root@84.54.23.85" -ForegroundColor Cyan
        Write-Host "   Then paste the commands (Ctrl+Shift+V in VPS terminal)" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ✅ DEPLOYMENT GUIDE READY                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 After deployment:" -ForegroundColor Yellow
Write-Host "   • Bot logs: pm2 logs diamond-bot" -ForegroundColor White
Write-Host "   • Admin Panel: http://84.54.23.85:3005" -ForegroundColor White
Write-Host "   • Check status: pm2 status" -ForegroundColor White
Write-Host ""
