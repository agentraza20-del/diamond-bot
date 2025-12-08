param(
    [string]$VpsPassword = "5qZY8Zp8YPe92Y6PN7i2vfw"
)

$VpsIp = "84.54.23.85"
$VpsUser = "root"

Write-Host "🛑 Stopping bot on VPS..." -ForegroundColor Yellow
Write-Host "📍 Target: $VpsUser@$VpsIp" -ForegroundColor Cyan
Write-Host ""

# Commands to execute on VPS
$commands = @(
    "pkill -9 -f 'node /root/diamond-bot/index.js'",
    "echo '✅ Main bot killed'",
    "sleep 1",
    "pkill -9 -f 'node /root/diamond-bot/admin-panel'",
    "echo '✅ Admin panel killed'",
    "sleep 2",
    "echo ''",
    "echo '📊 Verification:'",
    "ps aux | grep 'node.*diamond' | grep -v grep || echo '✅ All bot processes stopped!'"
) -join "; "

try {
    # Using OpenSSH (Windows 10/11)
    Write-Host "🔐 Connecting via SSH..." -ForegroundColor Cyan
    
    $sshProcess = New-Object System.Diagnostics.ProcessStartInfo
    $sshProcess.FileName = "ssh"
    $sshProcess.Arguments = "-o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL $VpsUser@$VpsIp `"$commands`""
    $sshProcess.UseShellExecute = $false
    $sshProcess.RedirectStandardInput = $true
    $sshProcess.RedirectStandardOutput = $true
    $sshProcess.RedirectStandardError = $true
    
    $process = [System.Diagnostics.Process]::Start($sshProcess)
    
    # Send password
    $process.StandardInput.WriteLine($VpsPassword)
    $process.StandardInput.Close()
    
    # Get output
    $output = $process.StandardOutput.ReadToEnd()
    $error = $process.StandardError.ReadToEnd()
    
    $process.WaitForExit()
    
    Write-Host "📤 Response:" -ForegroundColor Green
    Write-Host $output
    
    if ($output -like "*All bot processes stopped*") {
        Write-Host ""
        Write-Host "✅ Bot successfully stopped on VPS!" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Use PuTTY" -ForegroundColor Yellow
    Write-Host "1. Download: https://www.putty.org/" -ForegroundColor Gray
    Write-Host "2. Host: $VpsIp, User: $VpsUser" -ForegroundColor Gray
    Write-Host "3. Run: pkill -9 -f 'node /root/diamond-bot/index.js'" -ForegroundColor Gray
}
