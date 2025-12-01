# 🚀 Contabo VPS Bot & Admin Panel Setup Guide

## 📋 Your VPS Details
- **IP Address:** 84.54.23.85
- **Username:** root
- **Server Type:** Cloud VPS 10 SSD
- **Location:** Hub Europe
- **Customer ID:** 14424274

---

## ⚙️ Step 1: Connect to VPS via SSH

### Windows (PowerShell)
```powershell
ssh root@84.54.23.85
# Enter your password when prompted
```

### Linux/Mac
```bash
ssh root@84.54.23.85
```

---

## 🔧 Step 2: Initial Server Setup

Once connected to VPS, run these commands:

### Update System
```bash
apt update && apt upgrade -y
```

### Install Node.js & npm
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
node --version
npm --version
```

### Install Git
```bash
apt install -y git
```

### Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### Install Screen (for persistent sessions)
```bash
apt install -y screen
```

---

## 📥 Step 3: Upload Bot Files to VPS

### Option A: Clone from Git (Recommended)
```bash
cd /root
git clone https://github.com/agentraza20-del/diamond-bot.git
cd diamond-bot
```

### Option B: Manual Upload with SCP
From your local machine:
```powershell
scp -r "c:\Users\MTB PLC\Desktop\diamond-bot - Copy" root@84.54.23.85:/root/diamond-bot
```

---

## 📦 Step 4: Install Dependencies

On the VPS:
```bash
cd /root/diamond-bot
npm install
```

---

## 🔐 Step 5: Configure Environment Variables

Create `.env` file on VPS:
```bash
cat > /root/diamond-bot/.env << 'EOF'
# WhatsApp Session
SESSION_NAME=diamond-bot-session

# Database
DB_PATH=./config

# Ports
ADMIN_PORT=3000
BOT_PORT=3001

# Admin Credentials (Change these!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here

# Groups (WhatsApp Group Chat IDs)
GROUP_ID_1=120363196773968929@g.us
GROUP_ID_2=120363196773968930@g.us

# Admin Phone Numbers
ADMIN_NUMBERS=+8801700000000,+8801800000000

# Server URL (Update this!)
SERVER_URL=http://84.54.23.85:3000
EOF
```

---

## 🚀 Step 6: Start Bot & Admin Panel

### Option 1: Using PM2 (Recommended - Persistent)

```bash
cd /root/diamond-bot

# Start bot
pm2 start index.js --name "diamond-bot"

# Start admin panel
pm2 start admin-panel/server.js --name "admin-panel"

# Save PM2 config
pm2 save

# Enable startup on reboot
pm2 startup
```

### Option 2: Using Screen (Manual but reliable)

Terminal 1 - Admin Panel:
```bash
screen -S admin-panel
cd /root/diamond-bot
node admin-panel/server.js
# Press Ctrl+A then D to detach
```

Terminal 2 - Bot:
```bash
screen -S diamond-bot
cd /root/diamond-bot
node index.js
# Press Ctrl+A then D to detach
```

---

## 🔑 Step 7: WhatsApp QR Code Setup

### Check QR Code Log
```bash
# View the QR code output
tail -f /root/diamond-bot/bot-logs.txt
```

### Alternative: Display QR in File
```bash
# Open bot logs to find QR code
cat /root/diamond-bot/current-logs.txt | grep -A 10 "QR"
```

Scan the QR code with your WhatsApp account to authenticate the bot.

---

## 🌐 Step 8: Access Admin Panel

Open in browser:
```
http://84.54.23.85:3000
```

Login with credentials from `.env` file.

---

## 📊 Step 9: Set Initial Stock

1. Go to Admin Panel: `http://84.54.23.85:3000`
2. Navigate to **Home** tab
3. Click **"স্টক সেট করুন"** (Set Stock)
4. Enter amount: `10000` (or your desired stock)
5. Click **"সংরক্ষণ করুন"** (Save)
6. ✅ Stock is now active!

---

## 🛡️ Step 10: Firewall Configuration

### Allow ports 3000 and 3001
```bash
ufw allow 3000
ufw allow 3001
ufw enable
```

---

## ✅ Verification Checklist

```bash
# Check if processes are running
pm2 list

# View bot logs
pm2 logs diamond-bot

# View admin panel logs
pm2 logs admin-panel

# Check system resources
free -h
df -h
```

---

## 🔄 Daily Operations

### Restart Services
```bash
pm2 restart all
```

### Stop All
```bash
pm2 stop all
```

### Restart Specific Service
```bash
pm2 restart diamond-bot
# or
pm2 restart admin-panel
```

### View Logs
```bash
pm2 logs
# or specific service
pm2 logs diamond-bot
```

---

## 🚨 Troubleshooting

### Bot Not Starting?
```bash
# Check errors
pm2 logs diamond-bot
tail -f /root/diamond-bot/bot-logs.txt
```

### Can't Access Admin Panel?
```bash
# Check if port 3000 is open
netstat -tulpn | grep 3000

# Check firewall
ufw status
```

### Port Already in Use?
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
```

### WhatsApp Session Lost?
Delete session folder and restart:
```bash
rm -rf /root/diamond-bot/.wwebjs_auth
pm2 restart diamond-bot
```

---

## 📱 Backup Commands

### Backup Database
```bash
tar -czf /root/backup-$(date +%Y%m%d).tar.gz /root/diamond-bot/config/
```

### Restore Database
```bash
tar -xzf /root/backup-*.tar.gz -C /root/
```

---

## 🔐 Security Notes

1. ✅ Change default admin password in `.env`
2. ✅ Use strong credentials for SSH
3. ✅ Enable firewall (UFW)
4. ✅ Keep ports 3000 & 3001 private (use VPN if needed)
5. ✅ Regular backups of config folder

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| SSH Connect | `ssh root@84.54.23.85` |
| Start All | `pm2 start ecosystem.config.js` |
| Status | `pm2 list` |
| Restart | `pm2 restart all` |
| Logs | `pm2 logs` |
| Admin Panel | `http://84.54.23.85:3000` |

---

## 🎯 Next Steps

1. ✅ Connect to VPS
2. ✅ Run setup commands
3. ✅ Start services
4. ✅ Scan WhatsApp QR
5. ✅ Set initial stock
6. ✅ Test orders
7. ✅ Monitor logs

---

**Your bot is now running on the cloud! 🚀💎**
