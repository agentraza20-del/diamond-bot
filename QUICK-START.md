# 🚀 Quick Start - Diamond Stock System

## ⚡ 30-Second Setup

### 1️⃣ Start Both Servers
```bash
# Terminal 1
node admin-panel/server.js

# Terminal 2
node index.js
```

### 2️⃣ Go to Admin Panel
- Open: `http://localhost:3000`
- Click on **Home** tab

### 3️⃣ Set Stock
1. Click **"স্টক সেট করুন"** button
2. Type stock amount: `10000`
3. Click **"সংরক্ষণ করুন"**
4. See toast: ✅ "স্টক সংরক্ষণ হয়েছে: 10,000 💎"

### 4️⃣ Done! 🎉
- Stock displays on home page
- Green card with diamond icon
- Ready for orders!

---

## 🧪 Test Orders

### Send Order
```
User in WhatsApp: /d 100
```

### Approve Order
1. Admin panel → Check pending orders
2. Click approve
3. Stock updates: 10,000 → 9,900
4. Message in group: "💎 রেমেইনিং স্টক: 9,900💎"

### Test Auto-OFF
1. Keep approving orders
2. Stock reaches 0
3. Admin panel shows "বন্ধ" (OFF)
4. Groups see: "❌ স্টক শেষ হয়ে গেছে"
5. New orders rejected

---

## 📊 Key Numbers

| Field | Value |
|-------|-------|
| Admin Panel Port | 3000 |
| Bot Port | 3001 |
| Default Stock | 10,000 |
| Max Order | 10,000 |
| Min Order | 1 |

---

## 🔴 If Stock Shows 0

Stock depleted! Options:

### Option 1: Set New Stock
1. Click "স্টক সেট করুন"
2. Enter: `5000` (or any amount)
3. System auto-turns ON
4. Orders accepted again

### Option 2: Manual ON
1. Click toggle button
2. Status changes from "বন্ধ" → "চালু"
3. Orders accepted

---

## ✅ What's Working

✅ Stock management on home page
✅ Set stock with Bengali button
✅ Auto-deduct on order approval
✅ Auto-OFF when stock = 0
✅ Real-time updates (Socket.IO)
✅ Bengali messages to users
✅ Groups notified when stock depleted
✅ Mobile responsive

---

## 🆘 Troubleshooting

### Stock Not Showing?
```bash
# Check if file exists
ls config/diamond-status.json

# Check content
cat config/diamond-status.json
```

### Orders Not Deducting?
```bash
# Check logs
tail bot-logs.txt

# Look for: [STOCK DEDUCTION] ✅
```

### Can't Set Stock?
1. Ensure both servers running
2. Check: `http://localhost:3000` loads
3. Check browser console for errors (F12)

---

## 📝 Complete Features

🟢 **Stock Management**
- Admin sets inventory
- Real-time display
- Bengali UI

🟢 **Order Processing**
- Auto-deduct on approval
- Insufficient stock check
- Error messages in Bengali

🟢 **Auto-OFF**
- When stock = 0
- All groups notified
- Status saved

🟢 **Monitoring**
- Stock displayed prominently
- Status badge (চালু/বন্ধ)
- Real-time updates

---

## 💬 Example Flow

```
Admin: Sets stock 10,000
       ↓
User: Orders 500 diamonds
       ↓
Admin: Approves
       ↓
System: Deducts 500 from stock
       ↓
Admin Panel: Shows 9,500 remaining
       ↓
Group: Receives "রেমেইনিং স্টক: 9,500💎"
       ↓
[Repeat until stock = 0]
       ↓
System: AUTO-OFF
       ↓
All Groups: "স্টক শেষ হয়ে গেছে"
```

---

## 🎯 Next Orders?

When stock depleted:
1. Admin sets new stock
2. System turns ON
3. Orders flow continues

---

**Ready? Start servers and set stock! 🚀**

```bash
node admin-panel/server.js &
node index.js &
```

Then open: http://localhost:3000 💎
