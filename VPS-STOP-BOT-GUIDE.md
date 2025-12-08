# 🛑 VPS Bot Stop - Contabo Control Panel Method

## ✅ Fastest Way - Reboot VPS:

### Step 1: Login to Contabo Control Panel
- URL: https://my.contabo.com/
- Customer ID: 14424274
- Password: [Your password]

### Step 2: Find Your VPS
- Click "Cloud" → "VPS"
- Select: "Cloud VPS 10 SSD"
- IP: 84.54.23.85

### Step 3: Restart/Reboot
- Click "Power" button (top right)
- Select "Reboot" or "Power Off" then "Power On"
- ✅ Bot will be killed automatically!

**Time taken:** ~1-2 minutes to reboot

---

## 🖥️ Alternative - SSH Console (Manual):

### Step 1: Open VNC Console
- In VPS details page
- Click "VNC Console"
- Login with root credentials

### Step 2: Run Stop Commands
```bash
pkill -9 -f "node /root/diamond-bot/index.js"
pkill -9 -f "node /root/diamond-bot/admin-panel"
```

### Step 3: Verify
```bash
ps aux | grep node
```

---

## 📱 Quick Terminal Method (Windows):

### Option 1: Using PuTTY (SSH Client)
1. Download: https://www.putty.org/
2. Host: 84.54.23.85
3. Username: root
4. Paste commands above

### Option 2: PowerShell with sshpass
```powershell
# Install first
choco install sshpass -y

# Then run
sshpass -p "YOUR_PASSWORD" ssh root@84.54.23.85 "pkill -9 -f 'node /root/diamond-bot/index.js'; sleep 2; ps aux | grep node"
```

---

## ✅ Verify Bot is Stopped:

Run this command to check:
```bash
ps aux | grep "node.*diamond"
```

Expected output:
```
(no output = bot is stopped ✅)
```

---

**Recommended:** Use Contabo Control Panel Reboot for safest method! 🎯
