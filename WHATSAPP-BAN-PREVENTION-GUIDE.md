# 🛡️ WhatsApp Ban Prevention Guide (বাংলা)

## ⚠️ WhatsApp Account Ban হওয়ার কারণ

### 1. **Spam/অতিরিক্ত মেসেজ**
- একসাথে অনেক মেসেজ পাঠানো
- একই মেসেজ বারবার পাঠানো
- খুব দ্রুত মেসেজ পাঠানো (1 সেকেন্ডে 5-10টা)

### 2. **Automation Detection**
- WhatsApp বুঝতে পারে যে আপনি bot ব্যবহার করছেন
- whatsapp-web.js এর মতো library ব্যবহার
- অস্বাভাবিক দ্রুত response

### 3. **User Reports**
- User যদি আপনাকে spam হিসেবে report করে
- অনেক user একসাথে block করে

### 4. **Commercial Use (বাণিজ্যিক ব্যবহার)**
- Personal WhatsApp দিয়ে ব্যবসা চালানো
- WhatsApp Business API ছাড়া বড় scale এ operation

### 5. **Terms of Service Violation**
- WhatsApp এর নিয়ম ভাঙা
- Unofficial API/tools ব্যবহার

---

## ✅ নিরাপদ থাকার ১০টি উপায়

### 1. **Message Delay যোগ করুন** ⭐
```javascript
// utils/delay-helper.js ব্যবহার করুন
const { replyWithDelay } = require('./utils/delay-helper');

// পুরোনো পদ্ধতি (ঝুঁকিপূর্ণ):
await msg.reply('Hello');

// নতুন পদ্ধতি (নিরাপদ):
await replyWithDelay(msg, 'Hello'); // 0.5-1.5 সেকেন্ড delay
```

### 2. **Rate Limiting সেটআপ করুন**
```javascript
const { messageCounter } = require('./utils/delay-helper');

// মেসেজ পাঠানোর আগে check করুন
if (!messageCounter.canSendMessage()) {
    console.log('Rate limit reached! Waiting...');
    return;
}

// মেসেজ পাঠান
await msg.reply('Hello');

// Counter increment করুন
messageCounter.incrementCounter();
```

**Limits:**
- ঘন্টায় সর্বোচ্চ **100 মেসেজ**
- দিনে সর্বোচ্চ **500 মেসেজ**

### 3. **Group Messages এ বেশি Delay দিন**
```javascript
const { sendToMultipleGroups } = require('./utils/delay-helper');

// একাধিক গ্রুপে মেসেজ পাঠান (3-5 সেকেন্ড delay সহ)
const results = await sendToMultipleGroups(
    client, 
    ['group1@g.us', 'group2@g.us'], 
    'Rate Update: ৳85/💎'
);
```

### 4. **WhatsApp Business Account ব্যবহার করুন**
- Personal account এর বদলে Business
- Business Account বেশি সহনশীল
- Official WhatsApp Business App থেকে সেটআপ করুন

### 5. **Backup Number রাখুন** 📱
```json
// config/backup-numbers.json
{
    "primary": "+8801234567890",
    "backup": "+8801987654321",
    "status": "primary-active"
}
```

**Backup Plan:**
1. দ্বিতীয় WhatsApp number ready রাখুন
2. একই database উভয়ে access করতে পারবে
3. Primary ban হলে instant switch করুন

### 6. **রাতে বেশি মেসেজ এড়িয়ে চলুন** 🌙
```javascript
// রাত 12টা থেকে সকাল 6টা পর্যন্ত সতর্ক থাকুন
function isNightTime() {
    const hour = new Date().getHours();
    return hour >= 0 && hour < 6; // 12am - 6am
}

if (isNightTime()) {
    // Extra delay যোগ করুন
    await delay(5000); // 5 seconds
}
```

### 7. **User Spam Report এড়ান**
- সব user কে value দিন
- Unwanted message পাঠাবেন না
- User যদি service চায় শুধু তখনই মেসেজ করুন

### 8. **Session Management**
```javascript
// অনেকবার reconnect করবেন না
// একবার connect হলে stable রাখুন

client.on('disconnected', (reason) => {
    console.log('Disconnected:', reason);
    // Immediate restart করবেন না
    setTimeout(() => {
        console.log('Reconnecting after 30 seconds...');
        client.initialize();
    }, 30000); // 30 seconds delay
});
```

### 9. **Monitoring Setup করুন**
```javascript
// utils/delay-helper.js থেকে status check করুন
const status = messageCounter.getStatus();
console.log('Message Status:', status);
// Output:
// {
//   hourly: { sent: 45, limit: 100, remaining: 55 },
//   daily: { sent: 230, limit: 500, remaining: 270 }
// }
```

### 10. **Official WhatsApp Business API বিবেচনা করুন** 💰
- সবচেয়ে নিরাপদ পদ্ধতি
- কোনো ban এর ঝুঁকি নেই
- মাসিক খরচ আছে (প্রায় $5-50)

**Providers:**
- Twilio
- MessageBird
- 360Dialog
- Meta (Facebook) Direct

---

## 📊 ঝুঁকি মূল্যায়ন

### আপনার বর্তমান Bot:

| ফিচার | স্ট্যাটাস | ঝুঁকি |
|--------|---------|-------|
| Automation | ✅ whatsapp-web.js | 🟡 মাঝারি |
| Message Volume | প্রতিদিন 100-200 | 🟢 কম |
| Delay/Rate Limiting | ❌ নেই | 🔴 বেশি |
| Business Account | ❓ অজানা | 🟡 মাঝারি |
| User Complaints | 🟢 কম | 🟢 কম |

**সামগ্রিক ঝুঁকি: 🟡 মাঝারি থেকে বেশি**

### Delay Helper যোগ করার পর:

| ফিচার | স্ট্যাটাস | ঝুঁকি |
|--------|---------|-------|
| Automation | ✅ whatsapp-web.js | 🟡 মাঝারি |
| Message Volume | প্রতিদিন 100-200 | 🟢 কম |
| Delay/Rate Limiting | ✅ আছে | 🟢 কম |
| Business Account | ❓ অজানা | 🟡 মাঝারি |
| User Complaints | 🟢 কম | 🟢 কম |

**সামগ্রিক ঝুঁকি: 🟢 কম**

---

## 🚨 Ban হয়ে গেলে কি করবেন?

### 1. **Temporary Ban (সাময়িক)**
- সাধারণত 24 ঘন্টা থেকে 7 দিন
- অপেক্ষা করুন, কিছু করবেন না
- Appeal করার দরকার নেই

### 2. **Permanent Ban (স্থায়ী)**
- সেই number আর ফিরবে না
- নতুন number দিয়ে শুরু করুন
- আগের database restore করুন

### 3. **Recovery Plan:**
```bash
# Backup number activate করুন
1. admin-panel/server.js বন্ধ করুন
2. index.js বন্ধ করুন
3. config/bot-number.json এ backup number সেট করুন
4. .wwebjs_auth ফোল্ডার ডিলিট করুন
5. নতুন number দিয়ে QR scan করুন
6. সব কিছু আবার চালু হবে!
```

---

## 📱 Best Practices Checklist

- [ ] ✅ Delay Helper ইন্সটল করেছি
- [ ] ✅ Rate Limiting সেটআপ করেছি
- [ ] ✅ Backup WhatsApp number ready আছে
- [ ] ✅ WhatsApp Business Account ব্যবহার করছি
- [ ] ✅ Daily message limit track করছি
- [ ] ✅ Night-time এ extra careful
- [ ] ✅ User spam report avoid করছি
- [ ] ✅ Database নিয়মিত backup নিচ্ছি
- [ ] 🔲 WhatsApp Business API consider করছি

---

## 💡 এক নজরে সুপারিশ

**✅ করবেন:**
- প্রতিটি মেসেজে 1-3 সেকেন্ড delay
- User এর request এ response করবেন
- Business Account ব্যবহার করবেন
- Backup number ready রাখবেন

**❌ করবেন না:**
- একসাথে 10+ মেসেজ পাঠাবেন না
- একই মেসেজ বারবার পাঠাবেন না
- User কে spam করবেন না
- 24 ঘন্টায় 500+ মেসেজ পাঠাবেন না

---

## 🔗 সহায়ক লিংক

- [WhatsApp Business API](https://business.whatsapp.com/)
- [Twilio WhatsApp API](https://www.twilio.com/whatsapp)
- [MessageBird](https://messagebird.com/en/channels/whatsapp-business)

---

**শেষ আপডেট:** December 1, 2025  
**Version:** 1.0  
**Author:** Diamond Bot Team
