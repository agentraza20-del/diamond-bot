# ⚡ Quick Start: Feature Toggle Control

## 🎯 আপনার যা চেয়েছিলেন - DONE! ✅

> "Duplicate order পাঠালে → Bot block করবে।
> Offline order আসলে → 2 মিনিটে detect করবে।
> এই দুইটা feature on/off করার system তুরি করেন।"

---

## 🚀 এখন কীভাবে ব্যবহার করবেন - মাত্র 2 টি ধাপ

### Step 1️⃣: Settings খুলুন
Admin panel এ **⚙️ Settings** বাটনে ক্লিক করুন

```
[Diamond Bot Admin] → ⚙️ Settings
```

### Step 2️⃣: Order Protection টগল করুন
Settings modal এ দেখুন:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Order Protection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫 Duplicate Order Detection      [✓] ON
   Block same order within 5 min

📡 Offline Order Detection         [✓] ON
   Detect & track offline orders

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**যেকোনো একটা toggle করলে:**
- ✅ সাথে সাথে green indicator দেখাবে (✓)
- ❌ off করলে red indicator (✕) দেখাবে
- 📢 Toast notification: "Feature ON/OFF"

---

## 🎛️ কী হবে?

### যখন Duplicate Detection ON আছে ✅
```
User: "100" (100 হীরা)
↓
Bot: Check করবে → একই amount আগে ছিল?
↓
যদি 5 মিনিটের মধ্যে ছিল:
  ❌ BLOCK → "মাত্র 45 সেকেন্ড আগে পাঠিয়েছেন"
↓
যদি নতুন order ছিল:
  ✅ ACCEPT → Order approved
```

### যখন Duplicate Detection OFF আছে ❌
```
User: "100" (100 হীরা)
↓
Bot: Skip করবে → Check করবে না
↓
সব order: ✅ ACCEPT (duplicate হলেও)
```

---

## 📡 Offline Detection

### ON ✅ থাকলে
```
2 মিনিট পর:
  → Pending order check
  → 2 মিনিটের চেয়ে পুরাতন?
  → YES → "অফলাইন হতে পারে" mark করবে
  → Admin alert দেবে
```

### OFF ❌ থাকলে
```
2 মিনিট পর:
  → Skip করবে
  → কোনো alert নেই
  → পুরাতন pending order ignore হবে
```

---

## 📱 Where is it?

```
Admin Panel
  ↓
⚙️ Settings
  ↓
Order Protection (new section)
  ├─ 🚫 Duplicate Detection [Toggle]
  └─ 📡 Offline Detection [Toggle]
```

---

## ✨ Features

| Feature | What It Does | Status |
|---------|-------------|--------|
| Duplicate Detection | Block same order 2x | ✅ Works |
| Offline Detection | Find stuck orders | ✅ Works |
| Toggle Control | On/Off from admin | ✅ Works |
| Real-time | No restart needed | ✅ Works |
| History | Tracks changes | ✅ Works |
| Notifications | Toast alerts | ✅ Works |

---

## 📊 Configuration File

**Location:** `config/feature-toggles.json`

**Content:**
```json
{
  "duplicateDetection": {
    "enabled": true,
    "name": "Duplicate Order Detection",
    "description": "ডুপ্লিকেট অর্ডার ব্লক করবে",
    "window": 5,
    "lastModified": "2025-12-07T10:30:00Z",
    "modifiedBy": "admin"
  },
  "offlineDetection": {
    "enabled": true,
    "name": "Offline Order Detection",
    "description": "অফলাইন অর্ডার detect করবে",
    "offlineThreshold": 2,
    "lastModified": "2025-12-07T10:30:00Z",
    "modifiedBy": "admin"
  }
}
```

---

## 🔧 API Endpoints (যদি automation করতে চান)

```bash
# Get all toggles
GET /api/feature-toggles

# Get specific toggle
GET /api/feature-toggle/duplicateDetection

# Toggle feature
POST /api/feature-toggle/duplicateDetection
{
  "enabled": true/false
}

# Check duplicate detection only
GET /api/feature-toggle/duplicate-detection/status

# Check offline detection only
GET /api/feature-toggle/offline-detection/status
```

---

## ✅ Default State

সব feature **default ON** থাকে:
- ✅ Duplicate Detection: ON
- ✅ Offline Detection: ON
- ✅ Order Tracking: ON

---

## 🎯 Use Cases

### Use Case 1: Testing
```
চান: Duplicate order test করতে
করবেন: OFF করুন → Test করুন → ON করুন
```

### Use Case 2: Maintenance
```
চান: Manual order processing করতে
করবেন: Offline Detection OFF করুন
```

### Use Case 3: Daily Check
```
প্রতিদিন সকালে:
  → Settings খুলুন
  → Order Protection check করুন
  → সব ON আছে কিনা verify করুন
```

---

## 🎨 UI Indicators

| Symbol | Meaning | Color |
|--------|---------|-------|
| ✓ | Feature ON | Green (#43e97b) |
| ✕ | Feature OFF | Red (#f5576c) |
| [Checkbox] | Toggle control | Blue (#4facfe) |

---

## 📝 Logs

যখন toggle করেন, console এ দেখা যাবে:

```
[FEATURE TOGGLE] duplicateDetection turned ON by admin
[FEATURE TOGGLE] offlineDetection turned OFF by admin
```

---

## 🎉 সবকিছু Ready!

✅ Admin panel থেকে on/off করতে পারবেন
✅ একটা click এ toggle হবে
✅ সাথে সাথে effect পাবেন
✅ Change history save হবে
✅ কোনো restart প্রয়োজন নেই

---

## 📞 Troubleshooting

### Toggle button কাজ করছে না?
- Admin panel refresh করুন
- Logged in আছেন কিনা check করুন
- F12 → Console error দেখুন

### Changes দেখাচ্ছে না?
- New orders এ দেখবেন (existing nয়)
- Page reload করুন
- Browser cache clear করুন

### Feature না থাকছে?
- Page refresh করুন
- feature-toggles.json আছে কিনা check করুন
- Bot restart করুন

---

## 🚀 All Done!

এখন আপনার সম্পূর্ণ control আছে duplicate এবং offline detection নিয়ে!

**Settings → Order Protection** এ যেকোনো সময় toggle করতে পারেন। 

খুবই সহজ! 😊
