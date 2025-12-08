# 🔧 Payment Keywords - Technical Implementation

## 📁 Files Modified/Created

### 1. Configuration File
**File:** `/config/payment-keywords.json`
```json
{
  "methods": {
    "Bkash": {
      "keywords": ["bkash", "বিকাশ", "bk"],
      "response": "📱 *Bkash Payment*\n\n",
      "enabled": true
    },
    "Nagad": {
      "keywords": ["nagad", "নগদ", "ng"],
      "response": "📱 *Nagad Payment*\n\n",
      "enabled": true
    },
    "Rocket": {
      "keywords": ["rocket", "রকেট", "rk"],
      "response": "📱 *Rocket Payment*\n\n",
      "enabled": true
    }
  },
  "lastUpdated": "2025-11-30T00:00:00.000Z"
}
```

**Purpose:** Stores all payment keywords and their configurations

---

## 🎯 Admin Panel Implementation

### 2. API Endpoints
**File:** `/admin-panel/server.js`

#### GET /api/payment-keywords
- Retrieves all payment keywords configuration
- Returns JSON with methods and their keywords
- No authentication required (can be protected)

#### POST /api/payment-keywords/update
- Updates payment keywords configuration
- Validates that each method has keywords and response
- Logs changes to admin-logs.txt
- Emits real-time update via Socket.IO

### 3. Frontend UI Modal
**File:** `/admin-panel/public/js/app.js`

#### Functions Implemented:

```javascript
async function showPaymentKeywordsModal()
// Main modal to view all payment keywords
// Shows:
// - All payment methods with their keywords
// - Count of keywords per method
// - Edit button for each method
// - Form to add new payment method

async function editPaymentKeyword(methodName)
// Modal to edit specific payment method
// Allows:
// - Modify keywords (comma-separated)
// - Update response message
// - Delete method

async function savePaymentKeyword(methodName)
// Saves changes to a payment keyword method
// Validates data before saving
// Shows success/error toast

async function addPaymentKeywordMethod()
// Adds new payment method
// Validates:
// - Method name not duplicate
// - Keywords not empty
// - Response message provided

async function deletePaymentKeywordMethod(methodName)
// Deletes a payment method with confirmation
// Requires double confirmation
```

---

## 🤖 Bot Implementation

### 4. Keyword Detection Logic
**File:** `/index.js` (Lines 153-220)

#### Algorithm:
```javascript
// 1. Get message body and convert to lowercase
const messageBody = msg.body.trim().toLowerCase();

// 2. Load payment-keywords.json
const paymentKeywordsConfig = JSON.parse(paymentKeywordsData);

// 3. Check each method's keywords
for (const [methodName, methodConfig] of Object.entries(paymentKeywordsConfig.methods)) {
  // 4. Check if any keyword matches
  const keyword = methodConfig.keywords.find(kw => 
    messageBody.includes(kw.toLowerCase())
  );
  
  // 5. If matched, load payment numbers
  if (keyword) {
    matchedMethod = methodName;
    // Find payment numbers with matching method name
    // Format and send to user
  }
}
```

#### Key Features:
- Case-insensitive keyword matching
- Partial matching (keyword doesn't need to be exact message)
- Respects method `enabled` flag
- Handles both bank and mobile payment methods
- Includes footer instructions automatically

#### Example Matching:
```
Message: "দাও বিকাশ নম্বর"
Keywords: ["bkash", "বিকাশ", "bk"]

✓ Matches "বিকাশ" in message
✓ Sends Bkash payment info
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN PANEL                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Payment Keywords Modal                               │  │
│  │ ├─ View all methods & keywords                       │  │
│  │ ├─ Add new method                                    │  │
│  │ ├─ Edit existing method                              │  │
│  │ └─ Delete method                                     │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│                  POST /api/payment-keywords/update           │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │ API Handler                                          │  │
│  │ ├─ Validate data                                    │  │
│  │ ├─ Update JSON file                                 │  │
│  │ └─ Emit Socket.IO event                             │  │
│  └────────────────────┬─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ Write
                        ▼
        /config/payment-keywords.json
                        │
                        │ Read
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                       BOT                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Message Handler                                      │  │
│  │ ├─ Get message from user                            │  │
│  │ ├─ Load payment-keywords.json                        │  │
│  │ ├─ Check keywords against message                    │  │
│  │ ├─ If match: Load payment-number.json               │  │
│  │ ├─ Format payment info                              │  │
│  │ └─ Send response to user                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ Send WhatsApp
                        ▼
                    USER gets
                 Payment Number
```

---

## 🎨 UI Components

### Modal Sections:

#### 1. View Section
```
┌─────────────────────────────────────────┐
│ Payment Keywords Management             │
├─────────────────────────────────────────┤
│ [Info Box]                              │
│                                         │
│ [Bkash Card]                            │
│ - Keywords: bkash, বিকাশ, bk           │
│ [Edit Button]                           │
│                                         │
│ [Nagad Card]                            │
│ - Keywords: nagad, নগদ, ng             │
│ [Edit Button]                           │
│                                         │
│ [Rocket Card]                           │
│ - Keywords: rocket, রকেট, rk           │
│ [Edit Button]                           │
└─────────────────────────────────────────┘
```

#### 2. Edit Modal
```
┌─────────────────────────────────────────┐
│ Edit: Bkash                             │
├─────────────────────────────────────────┤
│ কীওয়ার্ড:                                │
│ [text input: bkash, বিকাশ, bk]         │
│                                         │
│ রেসপন্স মেসেজ:                          │
│ [textarea: 📱 *Bkash Payment*...]       │
│                                         │
│ [Save Button]  [Delete Button]          │
│ [Cancel Button]                         │
└─────────────────────────────────────────┘
```

#### 3. Add New Method Modal
```
┌─────────────────────────────────────────┐
│ নতুন পেমেন্ট মেথড যোগ করুন              │
├─────────────────────────────────────────┤
│ পেমেন্ট মেথড নাম:                      │
│ [text input: e.g., "Bank"]              │
│                                         │
│ কীওয়ার্ড (কমা দিয়ে আলাদা):            │
│ [text input: bank, ব্যাংক]              │
│                                         │
│ রেসপন্স মেসেজ:                          │
│ [textarea: 🏦 *Bank Transfer*...]       │
│                                         │
│ [Add Method Button]                     │
└─────────────────────────────────────────┘
```

---

## 🔐 Validation Rules

### Payment Keyword Validation:
```javascript
✓ Method name: 1-50 characters, no duplicates
✓ Keywords: At least 1, comma-separated, trimmed
✓ Response: Not empty, supports markdown
✓ Enabled: Boolean (true/false)
```

### Error Handling:
```javascript
if (!methodConfig.keywords || methodConfig.keywords.length === 0)
  → Error: "Method must have at least one keyword"

if (!methodConfig.response.trim())
  → Error: "Method must have a response message"

if (methods[methodName]) // On add
  → Error: "Method already exists"
```

---

## 📊 Logging

### Admin Logs Entry:
```
[2025-11-30T12:34:56.000Z] 💳 Payment keywords updated (9 total keywords)
[2025-11-30T12:35:10.000Z] [PAYMENT-INFO] Sent Bkash payment info to 1234567890 (keyword: বিকাশ)
```

### Console Logs (Bot):
```
[PAYMENT-INFO] Sent Bkash payment info to 1234567890 (keyword: bkash)
[PAYMENT-KEYWORDS LOAD ERROR] Error loading config
[PAYMENT-INFO ERROR] Error fetching payment numbers
```

---

## 🚀 Performance Considerations

### Optimization:
1. **File I/O:** JSON files read on each message (cached in production)
2. **Keyword Matching:** O(m*n) where m=methods, n=keywords per method
3. **String Comparison:** Case-insensitive, lowercase conversion
4. **Partial Matching:** Uses `.includes()` for flexible matching

### Future Improvements:
- Cache payment-keywords.json in memory with TTL
- Use regex for more complex keyword matching
- Add keyword priority/weight system
- Implement fuzzy matching for typos

---

## 🔗 Integration Points

### With Existing Systems:

#### 1. Payment Numbers
- Reads from `/config/payment-number.json`
- Filters by method name match
- Formats based on payment type (bank vs mobile)

#### 2. Admin Logs
- Records keyword updates
- Logs payment info requests
- Tracks errors

#### 3. Socket.IO
- Emits `paymentKeywordsUpdated` event
- Real-time updates to connected admin panels

#### 4. WhatsApp Bot
- Intercepts incoming messages
- Checks before other command handlers
- Sends formatted WhatsApp response

---

## 📝 File Structure

```
diamond-bot/
├── config/
│   ├── payment-keywords.json (New)
│   ├── payment-number.json (Existing)
│   └── ...
├── admin-panel/
│   ├── server.js (Modified - added endpoints)
│   └── public/
│       └── js/
│           └── app.js (Modified - added functions)
├── index.js (Modified - enhanced keyword matching)
└── docs/
    ├── PAYMENT-KEYWORDS-GUIDE.md (New)
    └── PAYMENT-KEYWORDS-QUICK-GUIDE.md (New)
```

---

## ✅ Testing Checklist

- [x] Payment-keywords.json initializes correctly
- [x] GET /api/payment-keywords returns data
- [x] POST /api/payment-keywords/update saves changes
- [x] Admin UI modal displays keywords
- [x] Can add new payment method
- [x] Can edit existing keywords
- [x] Can delete payment method
- [x] Bot detects keywords correctly
- [x] Bot sends correct payment numbers
- [x] Case-insensitive matching works
- [x] Partial message matching works
- [x] Response messages format correctly
- [x] Admin logs record changes

---

**Version:** 1.0.0  
**Date:** November 30, 2025  
**Status:** ✅ Production Ready
