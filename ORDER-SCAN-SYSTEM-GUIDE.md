# 🔍 Order Scan System - বিস্তারিত গাইড

## সিস্টেম বর্ণনা

এই Order Scan System আপনার বটকে **সব অর্ডার track করতে** এবং **missing অর্ডার খুঁজে পেতে** সাহায্য করে। এটি স্বয়ংক্রিয়ভাবে যেকোনো সংখ্যক অর্ডার স্ক্যান করতে পারে এবং রিয়েল-টাইম রিপোর্ট তৈরি করতে পারে।

---

## 🎯 মূল ফিচার

### 1. **Pending Orders Detection** ⏳
- সব pending অর্ডার খুঁজে বের করে
- User name, Player ID, Diamond amount দেখায়
- Order তৈরির সময় দেখায়

### 2. **Missing Orders Alert** ⚠️
- যেসব অর্ডার Admin Panel-এ নেই তা খুঁজে বের করে
- Priority marking করে (HIGH PRIORITY)
- Timeline দেখায় (কত সময় আগে order দেওয়া হয়েছে)

### 3. **Order Status Tracking** 📊
- Pending → কয়টা
- Approved → কয়টা
- Cancelled → কয়টা
- Total statistics

### 4. **User-wise Report** 👤
- নির্দিষ্ট user এর সব অর্ডার খুঁজে বের করে
- অর্ডার status দেখায়
- Admin Panel status দেখায়

---

## 📝 কমান্ড ব্যবহার (Admin Only)

### Basic Commands

#### 1. **General Scan** (সর্বশেষ 50 অর্ডার)
```
/scan
```
এটি দেখাবে:
- Total orders scanned
- Pending count
- Approved count
- Cancelled count
- Missing from admin count

**Output Example:**
```
📊 ORDER SCAN REPORT
━━━━━━━━━━━━━━
📈 Total Scanned: 50
⏳ Pending: 3
✅ Approved: 45
❌ Cancelled: 2
⚠️ Missing from Admin: 1

⏳ PENDING ORDERS (3):
• Manager - 100 💎 (28929291)
• User2 - 50 💎 (12345678)
• User3 - 25 💎 (87654321)

⚠️ MISSING FROM ADMIN PANEL (1):
• Manager - 100 💎
```

#### 2. **Custom Limit** (নির্দিষ্ট সংখ্যক অর্ডার স্ক্যান)
```
/scan 100
/scan 200
/scan 30
```
Max limit: 200 অর্ডার

#### 3. **Missing Orders Only** ⚠️
```
/scan missing
```
শুধুমাত্র missing অর্ডার খুঁজে বের করে।

**Output Example:**
```
⚠️ MISSING PENDING ORDERS (5):
━━━━━━━━━━━━━━━━━━

1. Manager
   💎 100 Diamond
   🆔 Player: 28929291
   ⏱️ 45 মিনিট আগে
   🔴 PRIORITY: HIGH

2. User2
   💎 50 Diamond
   🆔 Player: 12345678
   ⏱️ 2 ঘন্টা আগে
   🔴 PRIORITY: HIGH

... এবং আরও 3টি অর্ডার
```

#### 4. **Pending Only** (শুধু পেন্ডিং)
```
/scan pending
```
পেন্ডিং অর্ডার দেখায় সম্পূর্ণ তালিকা সহ।

#### 5. **Statistics** (পরিসংখ্যান)
```
/scan stats
```
সম্পূর্ণ statistics দেখায়:
- Total orders
- Unique users
- Total diamonds
- Total amount
- Today's activity

**Output Example:**
```
📊 ORDER STATISTICS
━━━━━━━━━━━━━━━━━

📈 Overall:
   📦 Total Orders: 500
   👥 Unique Users: 45
   💎 Total Diamonds: 12500💎
   💰 Total Amount: ৳28,750

🎯 Status Breakdown:
   ⏳ Pending: 12 (2.4%)
   ✅ Approved: 480 (96.0%)
   ❌ Cancelled: 8 (1.6%)
   📦 Delivered: 0 (0.0%)

📅 Today's Activity:
   Orders: 25
   Diamonds: 500💎
```

#### 6. **Detailed Report** (বিস্তারিত রিপোর্ট)
```
/scan report
```
সম্পূর্ণ বিস্তারিত রিপোর্ট তৈরি করে সব critical info সহ।

---

## 🗄️ ডেটা স্ট্রাকচার

### Order Object
```javascript
{
  "id": 1765040796314,
  "userId": "115930327715989@lid",
  "userName": "manager",
  "playerIdNumber": "28929291",
  "diamonds": 100,
  "rate": 1,
  "status": "pending|approved|cancelled",
  "createdAt": "2025-12-06T17:06:36.314Z",
  "messageId": "false_120363422634515102@g.us_AC121DFFD17C2460B901F4479877BD88_115930327715989@lid",
  "approvedAt": "2025-12-06T17:07:19.034Z",
  "approvedBy": "admin",
  "deliveryConfirmed": true
}
```

### Scan Result
```javascript
{
  "success": true,
  "message": "Scanned 50 orders",
  "summary": {
    "total": 50,
    "pending": 3,
    "approved": 45,
    "cancelled": 2,
    "missingFromAdmin": 1
  },
  "data": {
    "pending": [...],
    "approved": [...],
    "cancelled": [...],
    "missingInAdmin": [...]
  }
}
```

---

## 🔧 কীভাবে কাজ করে

### 1. **Order Collection**
- সব অর্ডার database.json-এ সংরক্ষিত থাকে
- প্রতিটি order একটি unique ID পায়
- Timestamp সংরক্ষিত থাকে

### 2. **Admin Panel Checking**
- Admin panel-এ approved orders থাকে
- সিস্টেম check করে কোন order admin panel-এ আছে কিনা
- Missing orders highlight করে

### 3. **Status Analysis**
- প্রতিটি order status track করে:
  - **pending**: নতুন অর্ডার, এখনও অনুমোদিত নয়
  - **approved**: Admin অনুমোদন করেছে
  - **cancelled**: User বাতিল করেছে
  - **delivered**: Customer পেয়েছে

### 4. **Real-time Report**
- তাৎক্ষণিক রিপোর্ট তৈরি করে
- Missing orders কে priority দেয়
- সুন্দর ফরম্যাটে পাঠায়

---

## ⚙️ কনফিগারেশন

### Maximum Scan Limit
`order-scan-system.js` তে:
```javascript
let scanLimit = Math.min(parseInt(arg), 200); // Max 200 orders
```

### এটি পরিবর্তন করতে:
```javascript
let scanLimit = Math.min(parseInt(arg), 500); // এখন 500 পর্যন্ত
```

---

## 🛡️ নিরাপত্তা

- **Admin Only**: শুধুমাত্র Admin এই কমান্ড ব্যবহার করতে পারে
- **Group Only**: শুধুমাত্র গ্রুপে কাজ করে
- **Rate Limited**: Message rate limiting সহ
- **Error Handling**: সব ত্রুটি gracefully handle করে

---

## 📍 ফাইল লোকেশন

```
diamond-bot/
├── utils/
│   └── order-scan-system.js          # Main scan system
├── handlers/
│   └── order-scan-commands.js        # Command handlers
├── config/
│   └── database.json                 # Order data
└── index.js                          # Bot main file (scan command added)
```

---

## 🐛 ট্রাবলশুটিং

### Problem: "No orders found"
- গ্রুপে এখনও কোনো অর্ডার submit হয়নি
- Solution: প্রথমে কয়েকটি অর্ডার submit করুন

### Problem: "Admin access denied"
- User admin নয়
- Solution: Admin হিসেবে register করুন

### Problem: "Group not found"
- Database corrupt হয়েছে
- Solution: Admin panel থেকে গ্রুপ restart করুন

### Problem: Missing orders শূন্য দেখাচ্ছে
- সব orders admin panel-এ আছে (ভালো!)
- বা admin panel সঠিকভাবে update হচ্ছে না

---

## 📊 ব্যবহারের উদাহরণ

### সকালে কুইক চেক
```
/scan 20     # সর্বশেষ 20 অর্ডার চেক
```

### দিনের মাঝে মিসিং অর্ডার চেক
```
/scan missing   # শুধু মিসিং খুঁজুন
```

### সন্ধ্যায় সম্পূর্ণ রিপোর্ট
```
/scan report    # বিস্তারিত রিপোর্ট
```

### সপ্তাহান্তে পরিসংখ্যান
```
/scan stats     # সম্পূর্ণ statistics দেখুন
```

---

## 🔮 ভবিষ্যত ফিচার

আগামীতে যোগ করার পরিকল্পনা:
- [ ] Scheduled automatic scanning
- [ ] Email reports
- [ ] Dashboard graph visualization
- [ ] User-wise pending tracking
- [ ] Auto-notification for missing orders

---

## 📞 সহায়তা

যদি কোনো সমস্যা হয়:
1. Bot logs দেখুন (`/scan missing` এ ত্রুটি দেখাবে)
2. Admin panel check করুন
3. Database.json verify করুন

---

**Made with ❤️ for efficient order management**
