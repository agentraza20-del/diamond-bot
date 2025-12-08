#!/usr/bin/env python3
"""
VPS Bot Stop Utility
Contabo VPS এ diamond-bot stop করার জন্য
"""

import subprocess
import sys
import os

# VPS Details
VPS_IP = "84.54.23.85"
VPS_USER = "root"
VPS_PORT = "22"

def stop_bot():
    """Stop bot on VPS"""
    
    print("🛑 Stopping Diamond Bot on VPS...")
    print(f"📍 Target: {VPS_USER}@{VPS_IP}")
    print()
    
    # Command to execute on VPS
    commands = [
        "echo '🔍 Checking running processes...'",
        "ps aux | grep 'node.*diamond' | grep -v grep",
        "echo ''",
        "echo '🛑 Stopping processes...'",
        "pkill -9 -f 'node /root/diamond-bot/index.js'",
        "pkill -9 -f 'node /root/diamond-bot/admin-panel/server.js'",
        "sleep 2",
        "echo '✅ Bot stopped!'",
        "echo ''",
        "echo '📊 Verifying...'",
        "ps aux | grep 'node.*diamond' | grep -v grep || echo '✅ No processes found'"
    ]
    
    ssh_cmd = " && ".join(commands)
    
    try:
        # Try to connect and execute
        print("📡 Connecting to VPS via SSH...")
        result = subprocess.run(
            [f"ssh", f"{VPS_USER}@{VPS_IP}", ssh_cmd],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        print("📤 Response:")
        print(result.stdout)
        
        if result.returncode != 0:
            print("⚠️ stderr:", result.stderr)
        
        return result.returncode == 0 or "✅" in result.stdout
        
    except FileNotFoundError:
        print("❌ SSH not found. Please install OpenSSH for Windows:")
        print("   https://docs.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firsttime")
        return False
    except subprocess.TimeoutExpired:
        print("❌ Connection timeout")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def alternative_method():
    """Show alternative methods"""
    print("\n" + "="*50)
    print("🔧 Alternative Methods:")
    print("="*50)
    print()
    print("Method 1: Manual SSH (PuTTY/Windows)")
    print("-" * 50)
    print("1. Download PuTTY: https://www.putty.org/")
    print("2. Host: 84.54.23.85")
    print("3. User: root")
    print("4. Port: 22")
    print("5. Run command:")
    print("   pkill -9 -f 'node /root/diamond-bot/index.js'")
    print()
    print("Method 2: Contabo Control Panel")
    print("-" * 50)
    print("1. Go to: https://my.contabo.com/")
    print("2. Select VPS")
    print("3. Click 'Power' → 'Reboot'")
    print()

if __name__ == "__main__":
    success = stop_bot()
    
    if not success:
        print()
        alternative_method()
    else:
        print()
        print("✅ Bot successfully stopped on VPS!")
