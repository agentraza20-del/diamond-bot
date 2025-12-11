# 🚀 VPS DEPLOYMENT GUIDE
# Contabo Cloud VPS 10 SSD
# IP: 84.54.23.85

## Step 1: Connect to VPS
```
ssh root@84.54.23.85
```
**Password:** `5qZY8Zp8YPe92Y6PN7i2vfw`

---

## Step 2: Deploy Diamond Bot
Copy and paste ALL these commands at once in the VPS terminal:

```bash
cd /root && \
rm -rf diamond-bot 2>/dev/null || true && \
git clone https://github.com/agentraza20-del/diamond-bot.git && \
cd diamond-bot && \
npm install && \
npm install -g pm2 && \
pm2 delete diamond-bot 2>/dev/null || true && \
pm2 delete admin-panel 2>/dev/null || true && \
pm2 start index.js --name diamond-bot --max-memory-restart 300M && \
pm2 start admin-panel/server.js --name admin-panel && \
pm2 save && \
pm2 startup && \
pm2 status
```

---

## Step 3: Verify Deployment
After the commands complete, you should see:
- ✅ Diamond Bot running on port 3003
- ✅ Admin Panel running on port 3005
- ✅ PM2 status showing both services as "online"

---

## Step 4: Access Services

**Admin Panel:**
```
http://84.54.23.85:3005
```

**Bot Logs:**
```bash
pm2 logs diamond-bot
```

**Service Status:**
```bash
pm2 status
```

---

## Additional Commands

**Restart services:**
```bash
pm2 restart all
```

**Stop services:**
```bash
pm2 stop all
```

**View detailed logs:**
```bash
pm2 logs diamond-bot --lines 100
```

**Check memory usage:**
```bash
pm2 monit
```

---

## Troubleshooting

**If deployment fails:**
```bash
cd /root/diamond-bot
npm install
pm2 logs diamond-bot
```

**If services won't start:**
```bash
pm2 kill
npm install -g pm2
pm2 start index.js --name diamond-bot
pm2 start admin-panel/server.js --name admin-panel
```

**Check if ports are open:**
```bash
netstat -tulpn | grep -E '3003|3005'
```

---

**⏱️ Total deployment time: 5-10 minutes**

**📞 Support:** Check logs with `pm2 logs diamond-bot`
