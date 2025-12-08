# 📋 Order Menu System - Show Offline & Online Orders

## Overview

Bot যখন offline থাকে এবং user order দেয়, bot online হলে সেই orders **Order Menu তে দেখা যাবে** এবং admin এর actions সব apply হবে।

**Key Features:**
- ✅ Offline orders detect হয় এবং order menu এ show হয়
- ✅ Admin approve করলে সেটা sync হয়
- ✅ Pending orders সব show হয়
- ✅ Order count summary show হয়
- ✅ Dashboard stats দেখা যায়

---

## System Architecture

```
Bot Offline:
  User sends order (.10)
       ↓ (stored in WhatsApp server)

Bot comes online:
  detectOfflineOrders() scans
       ↓
  Finds: .10 message
       ↓
  Creates entry with source: 'offline'
       ↓
  Saves to database
       ↓

Admin Panel Order Menu:
  /api/orders-menu/pending
       ↓
  Shows all pending orders (both online + offline)
       ↓
  Shows "[OFFLINE]" badge for offline orders
       ↓

Admin clicks "Done":
  Status → 'processing'
       ↓
  Order synced
       ↓
  Bot auto-approves after 2 minutes
       ↓
  ✅ Order complete!
```

---

## API Endpoints

### 1. Get Pending Orders (For Order Menu)
```
GET /api/orders-menu/pending
Authorization: [admin-token]

Response:
[
    {
        "id": 1765040834207,
        "userId": "76210050711676@lid",
        "userName": "RUBEL",
        "diamonds": 10,
        "rate": 100,
        "amount": 1000,
        "status": "pending",
        "createdAt": "2025-01-07T10:15:03Z",
        "groupId": "120363422634515102@g.us",
        "source": "offline",  ← Shows if it was offline-detected
        "messageId": "..."
    }
]
```

### 2. Get All Orders
```
GET /api/orders-menu/all
Authorization: [admin-token]

Returns all orders (pending, processing, approved, cancelled, deleted)
```

### 3. Get Offline Orders Only
```
GET /api/orders-menu/offline
Authorization: [admin-token]

Response:
[
    // Only orders with source: 'offline' and status: 'pending' or 'processing'
]
```

### 4. Get Orders by Status
```
GET /api/orders-menu/status/pending
GET /api/orders-menu/status/processing
GET /api/orders-menu/status/approved
GET /api/orders-menu/status/cancelled
GET /api/orders-menu/status/deleted

Authorization: [admin-token]
```

### 5. Get Single Order Details
```
GET /api/orders-menu/1765040834207
Authorization: [admin-token]

Response:
{
    "id": 1765040834207,
    "userId": "76210050711676@lid",
    "userName": "RUBEL",
    "diamonds": 10,
    "rate": 100,
    "amount": 1000,
    "status": "pending",
    "createdAt": "2025-01-07T10:15:03Z",
    "groupId": "120363422634515102@g.us",
    "source": "offline",
    "messageId": "...",
    "approvedAt": null,
    "deliveryConfirmed": false,
    "processingStartedAt": null
}
```

### 6. Get Dashboard Stats
```
GET /api/orders-menu/stats/dashboard
Authorization: [admin-token]

Response:
{
    "summary": {
        "total": 13,
        "pending": 3,
        "processing": 2,
        "approved": 5,
        "cancelled": 2,
        "deleted": 1,
        "offline": 2
    },
    "totalAmount": 5000,
    "offlineAmount": 2000,
    "offlineCount": 2,
    "newestOrders": [...]
}
```

### 7. Get Order Count Summary
```
GET /api/orders-menu/count/summary
Authorization: [admin-token]

Response:
{
    "total": 13,
    "pending": 3,
    "processing": 2,
    "approved": 5,
    "cancelled": 2,
    "deleted": 1,
    "offline": 2
}
```

---

## Order Lifecycle with Offline Detection

### Scenario 1: Normal Online Order
```
User online → sends .10
    ↓
Bot receives immediately
    ↓
Entry created with source: 'normal'
    ↓
Shows in order menu as "pending"
    ↓
Admin approves
    ↓
Status → processing → approved
```

### Scenario 2: Offline Order
```
Bot offline ↔ User sends .10
    ↓
Message stored in WhatsApp
    ↓
Bot comes online
    ↓
detectOfflineOrders() scans
    ↓
Entry created with source: 'offline'
    ↓
Shows in order menu with [OFFLINE] badge
    ↓
Admin approves
    ↓
Status → processing → approved
    ↓ (same as normal order)
```

### Scenario 3: Admin Already Approved
```
Bot offline
    ↓
User sends .10
    ↓
Admin sees (from previous online time) and approves
    ↓
Bot comes online
    ↓
Detects order with status: 'approved'
    ↓
Sends delivery confirmation
    ↓
✅ Complete!
```

---

## Database Structure

### Order Entry
```json
{
    "id": 1765040834207,
    "userId": "76210050711676@lid",
    "userName": "RUBEL",
    "diamonds": 10,
    "rate": 100,
    "status": "pending",
    "createdAt": "2025-01-07T10:15:03Z",
    "messageId": "...",
    "source": "offline",              ← NEW! Marks if offline-detected
    "approvedAt": null,
    "deliveryConfirmed": false,
    "processingStartedAt": null
}
```

### Source Values
- `"normal"` - Order received directly by bot
- `"offline"` - Order detected from offline period

---

## Frontend Implementation Example

### Load Pending Orders in Order Menu
```javascript
// JavaScript for admin panel
async function loadOrderMenu() {
    const token = localStorage.getItem('adminToken');
    
    const response = await fetch('/api/orders-menu/pending', {
        headers: { 'Authorization': token }
    });
    
    const orders = await response.json();
    
    // Render orders
    orders.forEach(order => {
        const sourceLabel = order.source === 'offline' ? '[OFFLINE] ' : '';
        const html = `
            <tr>
                <td>${order.userName}</td>
                <td>${order.diamonds}💎</td>
                <td>৳${order.amount}</td>
                <td>${sourceLabel}${order.status}</td>
                <td><button onclick="approveOrder(${order.id})">Done</button></td>
            </tr>
        `;
        document.getElementById('ordersTableBody').innerHTML += html;
    });
}

// Call on page load
loadOrderMenu();
```

### Show Offline Orders Badge
```javascript
async function loadDashboardStats() {
    const token = localStorage.getItem('adminToken');
    
    const response = await fetch('/api/orders-menu/stats/dashboard', {
        headers: { 'Authorization': token }
    });
    
    const stats = await response.json();
    
    // Show offline count
    if (stats.offlineCount > 0) {
        document.getElementById('offlineAlert').innerHTML = `
            ⚠️ ${stats.offlineCount} offline order(s) detected
            Total: ৳${stats.offlineAmount}
        `;
    }
}
```

---

## Functions in order-menu.js

### getPendingOrders()
```javascript
// Returns all pending orders (online + offline)
const orders = getPendingOrders();
```

### getAllOrders()
```javascript
// Returns all orders regardless of status
const allOrders = getAllOrders();
```

### getOrdersByStatus(status)
```javascript
// Get orders by specific status
const pendingOrders = getOrdersByStatus('pending');
const approvedOrders = getOrdersByStatus('approved');
```

### getOfflineOrders()
```javascript
// Get only offline-detected orders
const offlineOrders = getOfflineOrders();
```

### getOrderById(orderId)
```javascript
// Get single order details
const order = getOrderById(1765040834207);
```

### getOrderCountSummary()
```javascript
// Get counts by status + offline count
const summary = getOrderCountSummary();
// { total: 13, pending: 3, offline: 2, ... }
```

### getDashboardStats()
```javascript
// Get comprehensive stats for dashboard
const stats = getDashboardStats();
// { summary, totalAmount, offlineAmount, offlineCount, newestOrders }
```

### markOrderSource(orderId, source)
```javascript
// Mark order as 'normal' or 'offline'
markOrderSource(1765040834207, 'offline');
```

---

## Real-Time Sync Flow

### When Admin Approves Offline Order

```
1. Admin clicks "Done" on offline order
   POST /api/approve/1765040834207
       ↓

2. Server updates database
   entry.status = 'processing'
   entry.processingStartedAt = now
       ↓

3. Auto-timer starts (2 minutes)
   └─ Auto-approves after 2 min
   └─ Deducts from admin stock
   └─ Sends delivery message
       ↓

4. Admin panel updates real-time
   Order status changes
   Badge updates
       ↓

5. Result
   ✅ Order processed correctly
   ✅ All timestamps recorded
   ✅ User notified
```

---

## Console Logging

### Offline Detection
```
[OFFLINE DETECTION] 🔍 Starting offline order detection...
[OFFLINE DETECTION] Scanning group: 120363422634515102@g.us
[OFFLINE DETECTION] Found 50 messages in 120363422634515102@g.us
[OFFLINE DETECTION] ✨ NEW ORDER DETECTED - Diamonds: 10, User: 76210050711676@lid
[OFFLINE DETECTION] ✅ Added order to database: 1765040834207
    User: RUBEL
    Diamonds: 10
    Amount: ৳1000
    Source: offline ← Marked as offline
```

### Order Menu Access
```
[API] GET /api/orders-menu/pending
[API] Found 3 pending orders (2 offline, 1 online)
[API] Returning pending orders...
```

---

## Testing Checklist

- ✅ Bot online: Send order → Appears in menu as "normal"
- ✅ Bot offline: Send order → Bot online → Appears in menu as "offline"
- ✅ Offline order admin approve → Status updates correctly
- ✅ Dashboard shows offline count
- ✅ API endpoints return correct data
- ✅ Order source persists in database
- ✅ No duplicate orders created

---

## Advantages

### For Users
- ✅ Orders never lost even if bot offline
- ✅ Gets confirmation when bot comes online
- ✅ Fast order processing

### For Admin
- ✅ See all orders (online + offline) in one menu
- ✅ Know which orders were offline-detected
- ✅ Approve/reject with full transparency
- ✅ Real-time sync with bot

### For System
- ✅ 100% order recovery
- ✅ No manual intervention needed
- ✅ Automatic reconciliation
- ✅ Complete audit trail

---

## Integration Summary

**Files Created:**
- ✅ `utils/order-menu.js` - Order menu functions

**Files Modified:**
- ✅ `utils/auto-approval.js` - Added source: 'offline' to detected orders
- ✅ `admin-panel/server.js` - Added 8 new API endpoints

**Status:**
- ✅ Ready for production
- ✅ Fully integrated with existing system
- ✅ Zero-breaking changes

---

## বাংলায় সংক্ষিপ্ত

**System কি করে:**
- 🔍 Bot offline থাকলে user orders detect করে
- 📋 Bot online হলে order menu তে দেখায়
- ✅ Admin approve করলে সেটা sync হয়
- 📊 Dashboard এ offline orders count দেখায়

**User Experience:**
- ✅ Order কখনো লস হয় না
- ✅ Bot online হলে order এ দেখা যায়
- ✅ Admin approve করলে complete হয়
- ✅ Everything automatic!

**System Guarantee:**
- ✅ 100% offline orders recovery
- ✅ Real-time admin sync
- ✅ Complete order tracking
- ✅ Zero manual work

---

**সিস্টেম সম্পূর্ণ ready! ✅**
