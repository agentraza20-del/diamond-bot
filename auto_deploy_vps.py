#!/usr/bin/env python3
"""
Automatic VPS Deployment Script
Deploys Diamond Bot to Contabo VPS
"""

import paramiko
import time
import sys

# VPS Connection Details
VPS_HOST = "84.54.23.85"
VPS_USER = "root"
VPS_PASSWORD = "5qZY8Zp8YPe92Y6PN7i2vfw"
VPS_PORT = 22

# Deployment commands
DEPLOY_COMMANDS = [
    "set -e",
    "cd /root",
    "echo '🗑️  Removing old deployment...'",
    "rm -rf diamond-bot 2>/dev/null || true",
    
    "echo '📥 Cloning latest code from GitHub...'",
    "git clone https://github.com/agentraza20-del/diamond-bot.git",
    "cd diamond-bot",
    
    "echo '📚 Installing dependencies...'",
    "npm install",
    
    "echo '📦 Installing PM2...'",
    "npm install -g pm2 || true",
    
    "echo '⏹️  Stopping old services...'",
    "pm2 delete diamond-bot 2>/dev/null || true",
    "pm2 delete admin-panel 2>/dev/null || true",
    
    "echo '🤖 Starting Diamond Bot...'",
    "pm2 start index.js --name diamond-bot",
    
    "echo '📊 Starting Admin Panel...'",
    "pm2 start admin-panel/server.js --name admin-panel",
    
    "echo '💾 Saving PM2 configuration...'",
    "pm2 save",
    "pm2 startup || true",
    
    "echo ''",
    "echo '╔════════════════════════════════════════════╗'",
    "echo '║     ✅ DEPLOYMENT COMPLETE!               ║'",
    "echo '╚════════════════════════════════════════════╝'",
    "echo ''",
    "echo '🤖 Bot running on port 3003'",
    "echo '📊 Admin Panel running on port 3005'",
    "echo '🌐 Access: http://84.54.23.85:3005'",
    "echo ''",
    "pm2 status",
]

def print_banner():
    print("\n╔════════════════════════════════════════════════════════════╗")
    print("║     🚀 DIAMOND BOT VPS AUTOMATIC DEPLOYMENT              ║")
    print("╚════════════════════════════════════════════════════════════╝\n")

def print_step(step, message):
    print(f"[{step:2d}] {message}")

def deploy_to_vps():
    """Main deployment function"""
    print_banner()
    
    try:
        print(f"🔐 Connecting to {VPS_HOST}...")
        
        # Create SSH client
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Connect with password authentication
        client.connect(
            hostname=VPS_HOST,
            port=VPS_PORT,
            username=VPS_USER,
            password=VPS_PASSWORD,
            timeout=10
        )
        
        print("✅ Connected to VPS!\n")
        
        # Prepare command
        full_command = " && ".join(DEPLOY_COMMANDS)
        
        print("📝 Executing deployment commands...\n")
        
        # Execute
        stdin, stdout, stderr = client.exec_command(full_command, timeout=300)
        
        # Stream output
        output_lines = []
        for line in stdout:
            line = line.rstrip('\n')
            print(line)
            output_lines.append(line)
        
        # Check for errors
        error_output = stderr.read().decode()
        if error_output:
            print("\n⚠️  Warnings/Errors:")
            print(error_output)
        
        # Get exit code
        exit_code = stdout.channel.recv_exit_status()
        
        client.close()
        
        print("\n" + "="*60)
        if exit_code == 0:
            print("✅ DEPLOYMENT SUCCESSFUL!")
        else:
            print(f"⚠️  Deployment completed with exit code: {exit_code}")
        print("="*60)
        
        print("\n📋 Next Steps:")
        print("  1. Check logs: pm2 logs diamond-bot")
        print("  2. Admin Panel: http://84.54.23.85:3005")
        print("  3. View status: pm2 status")
        
        return exit_code == 0
        
    except Exception as e:
        print(f"\n❌ Deployment Failed:")
        print(f"   Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = deploy_to_vps()
    sys.exit(0 if success else 1)
