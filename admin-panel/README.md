# Diamond Bot - Admin Panel

## 🎉 Professional Admin Dashboard

একটি সম্পূর্ণ professional এবং responsive admin panel যেটি যেকোনো device থেকে access করা যাবে।

## ✨ Features

### মূল Features:
- ✅ Professional & Modern Design
- ✅ সম্পূর্ণ Mobile Responsive
- ✅ Real-time Data Updates (Socket.IO)
- ✅ Dark/Light Theme Toggle
- ✅ Bangla/English Language Support

### Dashboard:
- Total Users, Deposits, Orders Statistics
- Quick Actions
- Analytics Charts (Last 7 Days)
- Recent Transactions

### Group Management:
- প্রতিটি Group এর আলাদা Statistics
- Individual Group Rate Setting
- Bulk Rate Update (Multiple Groups একসাথে)
- Group Notification System
- Search & Filter

### Transaction Management:
- Pending Deposits (Approve/Reject)
- Complete Transaction History
- Order Tracking
- Search & Filter

### More Features:
- User Management (Block/Unblock)
- Payment Numbers Management
- Admin Activity Logs
- Advanced Analytics
- Data Export (CSV/Excel)
- Backup & Restore
- Settings

## 🚀 Installation

### Step 1: Install Dependencies

```bash
cd admin-panel
npm install
```

### Step 2: Start Admin Panel

```bash
npm start
```

## 📱 Access Admin Panel

### Same Device (এই কম্পিউটার থেকে):
```
http://localhost:3000
```

### Other Devices (মোবাইল/অন্য কম্পিউটার থেকে):

1. **আপনার IP Address বের করুন:**
   ```bash
   ipconfig
   ```
   
2. **IPv4 Address দেখুন** (Example: 192.168.1.100)

3. **যেকোনো device থেকে browser এ:**
   ```
   http://192.168.1.100:3000
   ```

### Tips:
- আপনার ফোন এবং কম্পিউটার একই WiFi network এ থাকতে হবে
- Firewall এ port 3000 allow করতে হতে পারে

## 🎨 Features Details

### Bottom Navigation (4 Menus):
1. **Dashboard 📊** - Overview & Statistics
2. **Groups 👥** - Group Management & Rates
3. **Transactions 💰** - Payments & Orders
4. **More ⋯** - Settings & Additional Features

### Real-time Updates:
- Socket.IO দিয়ে instant data sync
- File changes automatically detected
- No page refresh needed

### Group Rate Management:
1. Individual group rate update
2. Bulk select করে multiple groups এ rate set
3. Rate update হলে automatically group এ message পাঠানো
4. Real-time rate changes

### Responsive Design:
- Mobile First approach
- Touch-friendly buttons
- Optimized for all screen sizes
- Professional animations

## 🔧 Customization

### Port Change:
```bash
set ADMIN_PORT=5000
npm start
```

### Theme:
- Dark/Light theme toggle button navbar এ
- Preference automatically saved

### Language:
- Bangla/English toggle
- All text translations

## 📊 API Endpoints

- `GET /api/stats` - Dashboard statistics
- `GET /api/groups` - All groups data
- `POST /api/groups/:id/rate` - Update group rate
- `POST /api/groups/bulk-rate` - Bulk rate update
- `GET /api/users` - Users list
- `GET /api/transactions` - Transaction history
- `GET /api/deposits/pending` - Pending deposits
- `POST /api/deposits/:id/approve` - Approve deposit
- `POST /api/deposits/:id/reject` - Reject deposit
- `GET /api/orders` - All orders
- `GET /api/analytics` - Analytics data

## 🔐 Security Notes

- শুধুমাত্র trusted network এ use করুন
- Production এ authentication add করুন
- HTTPS use করুন sensitive data এর জন্য

## 🆘 Troubleshooting

### Can't access from phone?
1. Check both devices are on same WiFi
2. Check firewall settings
3. Verify IP address is correct
4. Make sure server is running

### Port already in use?
```bash
set ADMIN_PORT=4000
npm start
```

### Data not loading?
1. Check if bot database files exist
2. Verify file paths in server.js
3. Check browser console for errors

## 📝 Notes

- এই admin panel সম্পূর্ণ functional এবং production-ready
- Real-time updates automatically কাজ করে
- সব features mobile এ perfectly কাজ করে
- Professional design সহ advance animations

## 🎯 Future Enhancements

- Authentication system
- Role-based access control
- Advanced analytics with more charts
- SMS/Email notifications
- Automated backups
- Multi-admin support

---

**Made with ❤️ for Diamond Bot**
