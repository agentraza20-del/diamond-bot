# 📱 Admin Panel - দ্রুত গাইড

## 🚀 কিভাবে চালু করবেন?

### Method 1: Batch File (সবচেয়ে সহজ)
```
start-admin-panel.bat ডাবল ক্লিক করুন
```

### Method 2: Manual
```bash
cd admin-panel
npm start
```

## 🌐 কিভাবে দেখবেন?

### এই কম্পিউটার থেকে:
- Browser খুলুন
- যান: `http://localhost:3000`

### মোবাইল/অন্য Device থেকে:

1. **IP Address বের করুন:**
   - Command Prompt খুলুন
   - লিখুন: `ipconfig`
   - IPv4 Address দেখুন (যেমন: 192.168.1.100)

2. **মোবাইলে Browser খুলুন:**
   - যান: `http://192.168.1.100:3000`
   - (আপনার IP দিয়ে 192.168.1.100 replace করুন)

3. **Important:**
   - মোবাইল এবং কম্পিউটার একই WiFi এ থাকতে হবে
   - Server চালু অবস্থায় থাকতে হবে

## 📊 Features Overview

### 1. Dashboard (প্রথম Menu)
- **Total Statistics:** Users, Deposits, Orders
- **Quick Actions:** দ্রুত কাজের জন্য shortcuts
- **Charts:** Last 7 days এর data
- **Recent Transactions:** সাম্প্রতিক লেনদেন

### 2. Groups (দ্বিতীয় Menu)
#### Individual Rate Set:
1. Group card এ rate লিখুন
2. "Update" বাটনে ক্লিক করুন
3. Group এ automatically message যাবে

#### Bulk Rate Set:
1. যে groups এ rate set করবেন সেগুলোতে checkbox টিক দিন
2. উপরে "Bulk Rate Update" বাটনে ক্লিক করুন
3. নতুন rate লিখুন
4. "Update All Groups" এ ক্লিক করুন
5. সব selected groups এ message যাবে

#### Search Groups:
- উপরের search box এ group name লিখুন

### 3. Transactions (তৃতীয় Menu)
#### Pending Tab:
- নতুন deposit requests
- **Approve:** ✅ বাটনে ক্লিক করুন
- **Reject:** ❌ বাটনে ক্লিক করুন

#### Completed Tab:
- সব completed transactions
- Search করতে পারবেন

#### Orders Tab:
- সব diamond orders
- Status দেখতে পারবেন

### 4. More (চতুর্থ Menu)
- **User Management:** Users দেখা, block/unblock
- **Payment Numbers:** Payment methods manage
- **Admin Logs:** Activity history
- **Analytics:** Advanced charts
- **Settings:** Theme, language
- **Export Data:** Download reports
- **Backup:** Database backup

## 🎨 Interface Features

### Top Navbar:
- 🌙 **Theme Toggle:** Dark/Light mode switch
- 🔔 **Notifications:** Pending items count
- 🌐 **Language:** Bangla/English switch

### Bottom Navigation:
- 📊 Dashboard
- 👥 Groups  
- 💰 Transactions
- ⋯ More

## ⚡ Real-time Updates

### Automatic Updates:
- কোনো deposit approve হলে instantly দেখাবে
- Rate change হলে সাথে সাথে update হবে
- User data change হলে automatically refresh
- Page reload করার দরকার নেই

### Socket Connection:
- সবুজ toast notification = Connected
- হলুদ toast notification = Disconnected

## 🎯 Common Tasks

### Deposit Approve করা:
1. Transactions menu তে যান
2. Pending tab এ ক্লিক করুন
3. Approve বাটনে ক্লিক করুন
4. Confirm করুন
5. User এর balance automatically update হবে

### Group Rate Update:
1. Groups menu তে যান
2. Group খুঁজুন (search box ব্যবহার করুন)
3. Rate লিখুন
4. Update বাটনে ক্লিক করুন

### Multiple Groups এ Rate Set:
1. Groups menu তে যান
2. যে groups চান সেগুলো select করুন
3. "Bulk Rate Update" বাটনে ক্লিক করুন
4. Rate লিখে submit করুন

### User Block করা:
1. More menu তে যান
2. "User Management" এ ক্লিক করুন
3. User খুঁজুন
4. Block/Unblock বাটনে ক্লিক করুন

## 📱 Mobile Tips

### Responsive Design:
- সব features mobile এ perfectly কাজ করে
- Touch-friendly বড় বাটন
- Swipe করে navigate করতে পারবেন

### Best Practice:
- Landscape mode এ charts ভালো দেখায়
- Portrait mode এ tables scroll করতে পারবেন
- Pinch to zoom কাজ করে

## 🔧 Settings

### Theme Change:
- Top navbar এ 🌙 icon এ ক্লিক করুন
- Dark ↔️ Light toggle হবে
- Automatically save হয়

### Language Change:
- Top navbar এ 🌐 icon এ ক্লিক করুন
- Bangla ↔️ English toggle হবে

## ⚠️ Troubleshooting

### Problem: Mobile থেকে access হচ্ছে না
**Solution:**
1. দুটো device একই WiFi এ আছে কিনা check করুন
2. IP address সঠিক আছে কিনা verify করুন
3. Server চালু আছে কিনা দেখুন
4. Firewall বন্ধ করে try করুন

### Problem: Data load হচ্ছে না
**Solution:**
1. Browser refresh করুন (F5)
2. Server restart করুন
3. Browser console check করুন (F12)

### Problem: Port already in use
**Solution:**
```bash
set ADMIN_PORT=4000
npm start
```

## 📊 Data Export

### CSV Export:
1. যে tab এর data export করবেন সেখানে যান
2. Export বাটনে ক্লিক করুন
3. File automatically download হবে

## 🔐 Security Tips

1. **শুধুমাত্র trusted network এ use করুন**
2. Public WiFi তে avoid করুন
3. Strong admin credentials রাখুন
4. Regular backup নিন

## 💡 Pro Tips

1. **Dashboard থেকে Quick Actions ব্যবহার করুন** - দ্রুত কাজের জন্য
2. **Search ব্যবহার করুন** - বড় list এ খুঁজতে
3. **Charts দেখুন** - Trends বুঝতে
4. **Real-time updates সুবিধা নিন** - Manual refresh এর দরকার নেই
5. **Bulk operations ব্যবহার করুন** - সময় বাঁচাতে

## 🎨 Color Codes (Status)

- 🟢 Green = Success/Active
- 🔴 Red = Error/Blocked
- 🟡 Yellow = Warning/Pending
- 🔵 Blue = Info/Completed

## 📞 Support

যদি কোনো সমস্যা হয়:
1. README.md file পড়ুন
2. Browser console check করুন
3. Server logs দেখুন

---

## 🎉 Enjoy Your Professional Admin Panel!

সব features mobile এবং desktop এ perfectly কাজ করবে।
Real-time updates সহ complete management system!
