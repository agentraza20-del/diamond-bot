# 🎛️ Feature Toggle Control System

**Complete On/Off Control for Order Protection Features**

---

## 📋 Overview

এখন আপনি admin panel থেকে directly এই features গুলো on/off করতে পারবেন:

1. **🚫 Duplicate Order Detection** - একই order দুইবার block করবে
2. **📡 Offline Order Detection** - অফলাইন order detect করবে

---

## 🚀 কীভাবে ব্যবহার করবেন

### Step 1: Settings খুলুন
Admin panel এ **Settings** বাটন ক্লিক করুন (⚙️ icon)

### Step 2: Order Protection সেকশন দেখুন
Settings modal এ নিচে গিয়ে **"Order Protection"** সেকশন খুঁজুন

### Step 3: Toggle On/Off করুন
- **Duplicate Detection**: 🚫 কে on/off করুন
- **Offline Detection**: 📡 কে on/off করুন

```
┌─────────────────────────────────────────────────┐
│ Order Protection                                │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🚫 Duplicate Order Detection          [✓]ON    │
│    Block same order within 5 minutes            │
│                                                 │
│ 📡 Offline Order Detection             [✓]ON   │
│    Detect & track offline orders                │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📁 Files যোগ করা হয়েছে/আপডেটেড

### 1. ✅ `config/feature-toggles.json` (নতুন)
- Feature toggles এর config file
- Default status: সব on আছে
- কোন feature যেভাবে last modified সেটা record করে

**Example:**
```json
{
  "duplicateDetection": {
    "enabled": true,
    "name": "Duplicate Order Detection",
    "description": "ডুপ্লিকেট অর্ডার ব্লক করবে...",
    "window": 5,
    "lastModified": "2025-12-07T10:30:00Z",
    "modifiedBy": "admin"
  }
}
```

### 2. ✅ `utils/feature-toggle-manager.js` (নতুন)
Core toggle management system

**Key Functions:**
- `loadToggles()` - Config file থেকে load করে
- `saveToggles()` - Config file এ save করে
- `isFeatureEnabled()` - Feature on আছে কিনা check করে
- `toggleFeature()` - Feature on/off toggle করে
- `getAllToggles()` - সব toggles দেখায়
- `getStatusReport()` - সম্পূর্ণ status report

### 3. ✅ `handlers/diamond-request.js` (আপডেটেড)
**Changes:**
```javascript
// Feature toggle manager import করা হয়েছে
const FeatureToggleManager = require('../utils/feature-toggle-manager');

// Duplicate detection এ check যোগ করা:
if (FeatureToggleManager.isDuplicateDetectionEnabled()) {
    // Duplicate check logic
}
```

**Result:** Duplicate detection এখন only run হবে যদি enabled থাকে

### 4. ✅ `utils/duplicate-detector.js` (আপডেটেড)
**Changes:**
```javascript
// Feature toggle manager import করা হয়েছে
const FeatureToggleManager = require('./feature-toggle-manager');

// Offline detection function এ check যোগ করা:
if (!FeatureToggleManager.isOfflineDetectionEnabled()) {
    return { missedOrders: [], offlineDetectionDisabled: true };
}
```

**Result:** Offline detection এখন only run হবে যদি enabled থাকে

### 5. ✅ `admin-panel/server.js` (আপডেটেড - 7টি নতুন API endpoints)

#### Endpoint 1: Get All Toggles
```
GET /api/feature-toggles
Response: { success, toggles, report }
```

#### Endpoint 2: Get Specific Toggle
```
GET /api/feature-toggle/:featureName
Example: /api/feature-toggle/duplicateDetection
Response: { success, feature }
```

#### Endpoint 3: Toggle Feature
```
POST /api/feature-toggle/:featureName
Body: { "enabled": true/false }
Headers: { "x-admin-name": "admin" }
Response: { success, message, feature }
```

#### Endpoint 4: Duplicate Detection Status
```
GET /api/feature-toggle/duplicate-detection/status
Response: { success, feature, enabled, details }
```

#### Endpoint 5: Offline Detection Status
```
GET /api/feature-toggle/offline-detection/status
Response: { success, feature, enabled, details }
```

### 6. ✅ `admin-panel/public/js/app.js` (আপডেটেড)
**Changes:**
- Settings modal এ toggle controls যোগ করা হয়েছে
- `loadFeatureToggles()` - Settings খোলার সময় toggle status load করে
- `toggleFeature()` - API কে call করে feature on/off করে
- `updateToggleIndicator()` - UI indicator update করে (✓ or ✕)

### 7. ✅ `admin-panel/public/css/style.css` (আপডেটেড)
**Added CSS:**
- `.toggle-indicator` - Toggle status indicator styling
- `input[type="checkbox"]` - Custom checkbox styling (modern toggle look)
- Hover effects এবং animations

---

## 🔌 API Usage Examples

### Example 1: Check Duplicate Detection Status
```bash
curl "http://localhost:3005/api/feature-toggle/duplicate-detection/status" \
  -H "Authorization: your-token"
```

**Response:**
```json
{
  "success": true,
  "feature": "duplicateDetection",
  "enabled": true,
  "details": {
    "name": "Duplicate Order Detection",
    "enabled": true,
    "description": "ডুপ্লিকেট অর্ডার ব্লক করবে...",
    "lastModified": "2025-12-07T10:30:00Z",
    "modifiedBy": "admin"
  }
}
```

### Example 2: Turn OFF Duplicate Detection
```bash
curl -X POST "http://localhost:3005/api/feature-toggle/duplicateDetection" \
  -H "Authorization: your-token" \
  -H "x-admin-name: admin" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

**Response:**
```json
{
  "success": true,
  "message": "Duplicate Order Detection disabled",
  "feature": {
    "enabled": false,
    "lastModified": "2025-12-07T10:35:00Z",
    "modifiedBy": "admin"
  }
}
```

### Example 3: Get All Toggles Status
```bash
curl "http://localhost:3005/api/feature-toggles" \
  -H "Authorization: your-token"
```

**Response:**
```json
{
  "success": true,
  "toggles": {
    "duplicateDetection": { "enabled": true, ... },
    "offlineDetection": { "enabled": true, ... },
    "orderTracking": { "enabled": true, ... }
  },
  "report": {
    "timestamp": "2025-12-07T10:30:00Z",
    "features": { ... }
  }
}
```

---

## 🎯 What Happens When You Toggle

### When Duplicate Detection is ON ✅
```
User sends order:
  → Check duplicate detection status
  → Status: ENABLED
  → Run duplicate check
  → If duplicate → BLOCK order
  → User sees message: "মাত্র 45 সেকেন্ড আগে পাঠিয়েছেন..."
```

### When Duplicate Detection is OFF ❌
```
User sends order:
  → Check duplicate detection status
  → Status: DISABLED
  → Skip duplicate check
  → Accept order (even if duplicate)
  → Order goes to database
```

### When Offline Detection is ON ✅
```
Every 2 minutes:
  → Check offline detection status
  → Status: ENABLED
  → Scan for pending orders > 2 minutes
  → If found → Mark as "possibly offline"
  → Admin can see in dashboard
  → Alert message generated
```

### When Offline Detection is OFF ❌
```
Every 2 minutes:
  → Check offline detection status
  → Status: DISABLED
  → Skip offline order detection
  → No alerts generated
  → Old pending orders ignored
```

---

## 📊 Configuration Files

### feature-toggles.json Location
```
diamond-bot/
  config/
    feature-toggles.json  ← এখানে
```

### Structure
```json
{
  "featureName": {
    "enabled": true/false,
    "name": "Display Name",
    "description": "What it does",
    "lastModified": "ISO timestamp",
    "modifiedBy": "admin name",
    "window": 5,
    "offlineThreshold": 2
  }
}
```

---

## 🔍 Monitoring & Logging

### Console Logs
When you toggle a feature, console logs show:
```
[FEATURE TOGGLE] duplicateDetection turned ON by admin
[FEATURE TOGGLE] offlineDetection turned OFF by admin
```

### Admin Panel Notifications
When you toggle, toast notification shows:
```
✅ 🚫 Duplicate Order Detection TURNED ON
❌ 📡 Offline Order Detection TURNED OFF
```

### Last Modified Tracking
প্রতিটি toggle change এর সাথে record হয়:
- কে toggle করেছে (admin name)
- কখন toggle করেছে (timestamp)

---

## ⚙️ Default Settings

**On Startup:**
- ✅ Duplicate Detection: **ON**
- ✅ Offline Detection: **ON**
- ✅ Order Tracking: **ON**

এগুলো সব ON দিয়ে start হয়। আপনি Settings থেকে যেকোনো সময় off করতে পারেন।

---

## 🔐 Security

### Who Can Toggle?
- Only logged-in admins can toggle features
- Requires valid auth token
- Admin name recorded for audit trail

### What's Protected?
- API endpoints require authentication
- Cannot toggle without valid session
- All changes logged with admin name

---

## 📝 Usage Scenarios

### Scenario 1: Disable Duplicate Detection Temporarily
**যখন করবেন:**
- System test করছেন
- Multiple orders দ্রুত approve করতে হচ্ছে
- Maintenance চলছে

**কীভাবে:**
1. Settings খুলুন
2. "Duplicate Order Detection" toggle OFF করুন
3. Done! এখন duplicate order accept হবে
4. Test শেষে আবার ON করুন

### Scenario 2: Disable Offline Detection
**যখন করবেন:**
- Server connection issues থাকলে
- Offline messages handle করতে চান না
- Manual processing করছেন

**কীভাবে:**
1. Settings খুলুন
2. "Offline Order Detection" toggle OFF করুন
3. অফলাইন detection থেমে যাবে

### Scenario 3: Monitor Both Status
**প্রতিদিনের কাজ:**
1. Admin panel খুলুন
2. Settings → Order Protection
3. Both toggles check করুন (ON থাকা উচিত)
4. যদি কোনো OFF থাকে তো ON করুন

---

## ✨ Key Features

✅ One-click toggle from admin panel
✅ Real-time on/off control
✅ Change history tracking
✅ No server restart needed
✅ Instant effect on new orders
✅ UI indicators (✓ = ON, ✕ = OFF)
✅ Toast notifications on toggle
✅ API endpoints for automation
✅ Config file backup
✅ Admin audit trail

---

## 🐛 Troubleshooting

### Q: Toggle button doesn't work?
**A:** 
- Refresh admin panel
- Check auth token (must be logged in)
- Check browser console for errors

### Q: Changes not taking effect?
**A:**
- New orders এ effect পাবেন (existing orders নয়)
- Settings modal reload করুন
- Page refresh করুন

### Q: Status not showing correctly?
**A:**
- Browser cache clear করুন
- localStorage clear করুন: `localStorage.clear()`
- Admin panel reload করুন

---

## 📞 Support

**যদি সমস্যা হয়:**
1. Check console logs: `F12 → Console`
2. Check server logs
3. Verify feature-toggles.json exists
4. Restart bot: `npm start`

---

## 🎉 You're All Set!

এখন আপনার সম্পূর্ণ control আছে:
- ✅ Duplicate detection on/off
- ✅ Offline detection on/off
- ✅ Real-time toggle
- ✅ Change history

Settings থেকে যেকোনো সময় on/off করতে পারেন! 🚀
