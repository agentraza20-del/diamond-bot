# Payment Keywords Management Guide

## 📱 Feature Overview

This feature allows admins to manage payment keywords dynamically. When users send any keyword, the bot automatically sends the corresponding payment number without needing manual intervention.

**Example:**
- User sends: "bkash" / "বিকাশ" / "bk"
- Bot automatically replies with: Bkash payment details + payment number

## 🎯 How It Works

### 1. **Admin Side - Payment Keywords Panel**

#### Access the Payment Keywords Manager:
1. Go to Admin Panel (http://localhost:3005)
2. Navigate to **Settings** (গিয়ার আইকন) → **Payment Keywords** (💳 পেমেন্ট কীওয়ার্ড)

#### View Current Keywords:
- See all payment methods (Bkash, Nagad, Rocket, etc.)
- View keywords set for each method
- See response message template

#### Add New Payment Method:
1. Click "নতুন পেমেন্ট মেথড যোগ করুন" (Add New Payment Method)
2. Enter:
   - **পেমেন্ট মেথড নাম** (Payment Method Name): e.g., "Bkash"
   - **কীওয়ার্ড** (Keywords): comma-separated, e.g., "bkash, বিকাশ, bk"
   - **রেসপন্স মেসেজ** (Response Message): Message to send when keyword matches

#### Edit Keywords:
1. Click "Edit" on any payment method
2. Modify keywords (comma-separated)
3. Update response message
4. Click "সংরক্ষণ করুন" (Save)

#### Delete Method:
1. Click "Edit" on a method
2. Click "মুছে ফেলুন" (Delete)
3. Confirm deletion

### 2. **Payment-Keywords.json Structure**

File: `/config/payment-keywords.json`

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
    }
  },
  "lastUpdated": "2025-11-30T00:00:00.000Z"
}
```

### 3. **Bot Side - How Keywords Are Detected**

#### Flow:
1. User sends a message
2. Bot checks message against all keywords in payment-keywords.json
3. If keyword matches:
   - Finds corresponding payment method
   - Loads payment numbers from payment-number.json
   - Sends response message + payment numbers
4. If no keyword matches, continues with other commands

#### Example Messages That Trigger:
- "bkash" ✅
- "বিকাশ" ✅
- "দাও বিকাশ নম্বর" ✅ (contains keyword "বিকাশ")
- "nagad নম্বর" ✅
- "payment" ❌ (not a registered keyword)

### 4. **Payment Number Integration**

When a keyword matches, the bot:

1. **Loads payment numbers** from `/config/payment-number.json`
2. **Finds numbers matching the method name**
3. **Formats and sends them** with the response message

**Example Output:**
```
📱 *Bkash Payment*

📞 017xxxxxxxx (Personal)

✅ পেমেন্ট করার পর স্ক্রিনশট পাঠান।
```

### 5. **Response Message Template**

You can customize the response message for each payment method:

#### Simple Template:
```
📱 *Bkash Payment*

{paymentNumbers}

✅ পেমেন্ট করার পর স্ক্রিনশট পাঠান।
```

#### Without Placeholder:
The bot will automatically append payment numbers at the end

## 📋 Example Workflow

### Setup Example:
1. **Open Payment Keywords Modal**
2. **Add New Method:**
   - Name: "Bkash"
   - Keywords: "bkash, বিকাশ, bk, ব্যাংকিং"
   - Response: "📱 *Bkash Payment*\n\nসাবধানে পেমেন্ট করুন:\n\n"

3. **User sends:** "বিকাশ দাও"
4. **Bot replies:** 
   ```
   📱 *Bkash Payment*

   সাবধানে পেমেন্ট করুন:

   📞 017xxxxxxxx (Personal)

   ✅ পেমেন্ট করার পর স্ক্রিনশট পাঠান।
   ```

## 🔧 API Endpoints

### GET /api/payment-keywords
Retrieve current payment keywords configuration

**Response:**
```json
{
  "methods": {
    "Bkash": {
      "keywords": ["bkash", "বিকাশ"],
      "response": "📱 *Bkash Payment*\n\n",
      "enabled": true
    }
  },
  "lastUpdated": "2025-11-30T00:00:00.000Z"
}
```

### POST /api/payment-keywords/update
Update payment keywords

**Request Body:**
```json
{
  "methods": {
    "Bkash": {
      "keywords": ["bkash", "বিকাশ", "bk"],
      "response": "📱 *Updated Message*\n\n",
      "enabled": true
    }
  }
}
```

## ✅ Best Practices

1. **Use Multiple Keywords:**
   - English: "bkash", "payment"
   - Bengali: "বিকাশ", "পেমেন্ট"
   - Short forms: "bk", "pay"

2. **Keep Response Messages Clear:**
   - Use emojis for visual appeal
   - Include important instructions
   - Make it easy to understand

3. **Organize Payment Methods:**
   - One method per payment provider (Bkash, Nagad, Rocket)
   - Keep method names consistent (use proper capitalization)

4. **Enable/Disable as Needed:**
   - Temporarily disable a method by setting `"enabled": false`
   - This stops the bot from responding to those keywords

5. **Test New Keywords:**
   - After adding keywords, test with users
   - Make sure the keyword detection works as expected

## 🐛 Troubleshooting

### Keywords Not Working:
1. Check `/config/payment-keywords.json` exists
2. Verify keyword spelling matches
3. Keywords are case-insensitive
4. Check payment-number.json has corresponding numbers

### Wrong Payment Numbers Sent:
1. Ensure payment method name matches exactly in payment-number.json
2. Check capitalization (e.g., "Bkash" vs "bkash")

### Bot Not Responding to Keywords:
1. Restart the bot to reload the config
2. Check admin logs for errors
3. Verify JSON file formatting is correct

## 📊 Monitoring

### Admin Logs:
Check `/admin-panel/admin-logs.txt` for:
- When keywords are updated
- How many keywords are active
- Any errors during keyword matching

### Example Log Entry:
```
[2025-11-30T12:34:56.000Z] 💳 Payment keywords updated (9 total keywords)
[2025-11-30T12:35:10.000Z] [PAYMENT-INFO] Sent Bkash payment info to 1234567890 (keyword: bkash)
```

## 🚀 Advanced Usage

### Dynamic Response Messages:
You can use placeholders in response messages:
- `{paymentNumbers}` - Will be replaced with formatted payment numbers
- Add custom instructions before/after

### Example:
```
📱 *Bkash Payment পদ্ধতি*

⚠️ গুরুত্বপূর্ণ নির্দেশনা:

{paymentNumbers}

✅ পেমেন্ট সম্পন্ন হলে স্ক্রিনশট পাঠান
🚫 নকল পেমেন্ট সনাক্ত হলে অ্যাকাউন্ট ব্লক করা হবে
```

---

**Created:** November 30, 2025  
**Version:** 1.0.0  
**Status:** ✅ Active
