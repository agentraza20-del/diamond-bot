# 🛑 VPS BOT STOP - MANUAL INSTRUCTIONS

## সবচেয়ে সহজ উপায়: PuTTY ব্যবহার করুন

### Step 1: PuTTY Download করুন
- Website: https://www.putty.org/
- Download: putty.exe

### Step 2: PuTTY খুলুন এবং এই details দিন:

```
Host Name: 84.54.23.85
Port: 22
Username: root
Password: 5qZY8Zp8YPe92Y6PN7i2vfw
```

### Step 3: Connect করুন
- Click "Open"
- Password prompt দিলে paste করুন: 5qZY8Zp8YPe92Y6PN7i2vfw

### Step 4: Bot Kill করুন

একে একে এই commands run করুন:

```bash
# Main bot kill
pkill -9 -f 'node /root/diamond-bot/index.js'
```

```bash
# Admin panel kill
pkill -9 -f 'node /root/diamond-bot/admin-panel'
```

```bash
# Verify
sleep 2
ps aux | grep node
```

যদি কোনো output নেই = ✅ Bot stopped!

---

## Alternative: Contabo Panel (সবচেয়ে নিরাপদ)

1. https://my.contabo.com/ এ login করুন
2. Cloud → VPS
3. "Power" button → "Reboot"
4. ~2 minutes পর VPS আবার চালু হবে
5. Bot automatically বন্ধ হয়ে যাবে

---

## Quick Command Reference

```bash
# Check running processes
ps aux | grep node

# Kill by port 3003 (bot)
lsof -ti:3003 | xargs kill -9

# Check if killed
ps aux | grep diamond
```

---

**Password for VPS:** `5qZY8Zp8YPe92Y6PN7i2vfw`
**IP:** `84.54.23.85`
**User:** `root`

---

সম্পন্ন হলে জানাবেন! ✅
