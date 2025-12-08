# 🚀 Contabo VPS SSH Setup for Windows PowerShell
# Run this script to easily manage your VPS

[CmdletBinding()]
param()

# VPS Configuration
[string]$VPS_IP = "84.54.23.85"
[string]$VPS_USER = "root"
[string]$VPS_HOME = "/root/diamond-bot"

function Show-Menu {
    [CmdletBinding()]
    param()
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  💎 Diamond Bot - Contabo VPS Manager" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Connect to VPS (SSH)"
    Write-Host "2. Upload bot files to VPS"
    Write-Host "3. Run automated setup"
    Write-Host "4. Check services status"
    Write-Host "5. Restart services"
    Write-Host "6. View bot logs"
    Write-Host "7. View admin panel logs"
    Write-Host "8. Access admin panel URL"
    Write-Host "9. Backup database"
    Write-Host "0. Exit"
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
}

function Connect-VPS {
    [CmdletBinding()]
    param()
    Write-Host "🔗 Connecting to VPS..." -ForegroundColor Yellow
    Write-Host "IP: $VPS_IP" -ForegroundColor Cyan
    Write-Host "User: $VPS_USER" -ForegroundColor Cyan
    ssh "${VPS_USER}@${VPS_IP}"
}

function Publish-BotFiles {
    [CmdletBinding()]
    param()
    Write-Host "📤 Uploading bot files to VPS..." -ForegroundColor Yellow
    [string]$localPath = "$(Get-Location)"
    Write-Host "From: $localPath" -ForegroundColor Cyan
    Write-Host "To: ${VPS_USER}@${VPS_IP}:/root/diamond-bot" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Running SCP command..." -ForegroundColor Yellow
    scp -r "$localPath\*" "${VPS_USER}@${VPS_IP}:/root/diamond-bot/"
    Write-Host "✅ Upload complete!" -ForegroundColor Green
}

function Invoke-Setup {
    [CmdletBinding()]
    param()
    Write-Host "⚙️  Running automated setup on VPS..." -ForegroundColor Yellow
    ssh "${VPS_USER}@${VPS_IP}" @"
    bash -c 'cd /root && curl -O https://raw.githubusercontent.com/agentraza20-del/diamond-bot/main/contabo-vps-deploy.sh && chmod +x contabo-vps-deploy.sh && bash contabo-vps-deploy.sh'
"@
}

function Get-Status {
    [CmdletBinding()]
    param()
    Write-Host "📊 Checking services status..." -ForegroundColor Yellow
    ssh "${VPS_USER}@${VPS_IP}" "pm2 list"
}

function Restart-Services {
    [CmdletBinding()]
    param()
    Write-Host "🔄 Restarting all services..." -ForegroundColor Yellow
    ssh "${VPS_USER}@${VPS_IP}" "pm2 restart all"
    Write-Host "✅ Services restarted!" -ForegroundColor Green
}

function Get-BotLogs {
    [CmdletBinding()]
    param()
    Write-Host "📱 Bot Logs (Last 50 lines):" -ForegroundColor Yellow
    ssh "${VPS_USER}@${VPS_IP}" "pm2 logs diamond-bot --lines 50"
}

function Get-AdminLogs {
    [CmdletBinding()]
    param()
    Write-Host "🛠️  Admin Panel Logs (Last 50 lines):" -ForegroundColor Yellow
    ssh "${VPS_USER}@${VPS_IP}" "pm2 logs admin-panel --lines 50"
}

function Show-AdminURL {
    [CmdletBinding()]
    param()
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  🌐 Admin Panel Access URL" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "URL: http://84.54.23.85:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Default Login:" -ForegroundColor Yellow
    Write-Host "  Username: admin" -ForegroundColor White
    Write-Host "  Password: secure_password_123" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Change password in .env file for security!" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
}

function Invoke-DatabaseBackup {
    [CmdletBinding()]
    param()
    Write-Host "💾 Creating backup..." -ForegroundColor Yellow
    [string]$backupFile = "diamond-bot-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
    ssh "${VPS_USER}@${VPS_IP}" "tar -czf /root/$backupFile /root/diamond-bot/config/"
    Write-Host "✅ Backup created: $backupFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "Download backup:" -ForegroundColor Yellow
    Write-Host "scp ${VPS_USER}@${VPS_IP}:/root/$backupFile ." -ForegroundColor Cyan
}

# Main loop
do {
    Show-Menu
    [string]$choice = Read-Host "Select an option (0-9)"
    
    switch ($choice) {
        '1' { Connect-VPS }
        '2' { Publish-BotFiles }
        '3' { Invoke-Setup }
        '4' { Get-Status }
        '5' { Restart-Services }
        '6' { Get-BotLogs }
        '7' { Get-AdminLogs }
        '8' { Show-AdminURL }
        '9' { Invoke-DatabaseBackup }
        '0' { 
            Write-Host "👋 Goodbye!" -ForegroundColor Green
            exit 
        }
        default { Write-Host "❌ Invalid option. Please try again." -ForegroundColor Red }
    }
    
    if ($choice -ne '0') {
        Read-Host "Press Enter to continue..."
    }
} while ($choice -ne '0')
