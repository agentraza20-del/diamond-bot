# ⚡ Contabo VPS - Quick Start (5 Minutes)

## 🎯 Your VPS Details
```
IP: 84.54.23.85
User: root
Pass: (as chosen during order)
```

---

## 🚀 Quick Setup (Copy & Paste)

### Step 1: Connect to VPS
```powershell
ssh root@84.54.23.85
```

### Step 2: Automated Setup (One Command)
```bash
# Download and run setup script
curl -O https://raw.githubusercontent.com/agentraza20-del/diamond-bot/main/contabo-vps-deploy.sh
chmod +x contabo-vps-deploy.sh
bash contabo-vps-deploy.sh
```

**This will:**
- ✅ Update system
- ✅ Install Node.js & npm
- ✅ Install Git & PM2
- ✅ Clone bot repository
- ✅ Install dependencies
- ✅ Start bot & admin panel
- ✅ Setup auto-restart

---

## 📱 Scan WhatsApp QR Code

After setup, check QR code:
```bash
pm2 logs diamond-bot
```

Look for the QR code output and scan with WhatsApp.

---

## 🌐 Access Admin Panel

Open in browser:
```
http://84.54.23.85:3000
```

**Login:**
- Username: `admin`
- Password: `secure_password_123` (Change in `.env`)

---

## 💎 Set Initial Stock

1. Open Admin Panel
2. Go to **Home** tab
3. Click **"স্টক সেট করুন"** 
4. Enter: `10000`
5. Click **"সংরক্ষণ করুন"**
6. ✅ Done!

---

## 🔄 Daily Commands

```bash
# Check services status
pm2 list

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# View logs
pm2 logs

# Specific service logs
pm2 logs diamond-bot
pm2 logs admin-panel
```

---

## ✅ Verification

Check everything is running:
```bash
# Should show 2 services (diamond-bot, admin-panel)
pm2 list

# Should see bot logs
pm2 logs diamond-bot | head -20
```

---

## 🆘 Troubleshooting

### Can't connect to admin panel?
```bash
# Check if port 3000 is open
netstat -tulpn | grep 3000

# Restart admin panel
pm2 restart admin-panel
```

### Bot not responding?
```bash
# View error logs
pm2 logs diamond-bot

# Restart bot
pm2 restart diamond-bot
```

### Lost WhatsApp session?
```bash
# Remove session and rescan QR
rm -rf /root/diamond-bot/.wwebjs_auth
pm2 restart diamond-bot
```

---

## 📞 Manual Start (If Needed)

**If services don't start automatically:**

### SSH to VPS
```bash
ssh root@84.54.23.85
```

### Navigate to bot directory
```bash
cd /root/diamond-bot
```

### Start admin panel (Terminal 1)
```bash
pm2 start admin-panel/server.js --name "admin-panel"
```

### Start bot (Terminal 2)
```bash
pm2 start index.js --name "diamond-bot"
```

### Save PM2
```bash
pm2 save
pm2 startup
```

---

## 🎯 Test Order Flow

1. **User sends:** `/d 100` (order 100 diamonds)
2. **Admin sees:** Pending order in admin panel
3. **Admin approves:** Click approve button
4. **Stock deducts:** 10,000 → 9,900
5. **Group notified:** "রেমেইনিং স্টক: 9,900💎"

---

## 💾 Backup Data

```bash
# Backup everything
tar -czf backup-$(date +%Y%m%d).tar.gz /root/diamond-bot/config/

# List backups
ls -lh *.tar.gz

# Restore backup
tar -xzf backup-20250101.tar.gz -C /root/
```

---

## 🔐 Security Tips

1. **Change admin password** in `.env` file
2. **Change SSH password** immediately
3. **Keep backups** regularly
4. **Monitor logs** for errors
5. **Use firewall** (UFW)

---

## 📊 Performance Monitoring

```bash
# Monitor in real-time
pm2 monit

# Check disk usage
df -h

# Check memory usage
free -h

# Check running processes
ps aux | grep node
```

---

## 🚀 Ready to Go!

Your bot is now running 24/7 on Contabo VPS! 🎉

**Admin Panel:** http://84.54.23.85:3000
**Keep Running:** PM2 auto-restarts on crash
**Always Accessible:** VPS always online

---

## 📞 Need Help?

Check logs:
```bash
pm2 logs

# Or specific service
pm2 logs diamond-bot
```

View recent errors:
```bash
tail -f /root/diamond-bot/bot-logs.txt
tail -f /root/diamond-bot/admin-logs.txt
```

---

**Enjoy your bot! 💎🚀**
