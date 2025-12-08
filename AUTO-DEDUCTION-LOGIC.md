# 🎯 Auto-Deduction System - Complete Logic

## ✅ সব ৩টি Case কাজ করছে!

---

## 📋 কেস ১: Balance = 0 → Order → Due তে যাবে

### Scenario:
- নতুন user, Main Balance = ৳0
- User 1000💎 order দিল (Rate: 2.3)
- Total = 1000 × 2.3 = ৳2300

### Expected Result:
```
Main Balance: ৳0
Due Balance: ৳2300
Total Paid: ৳0
```

### How it works:
1. User order করে WhatsApp এ (ID + Diamonds)
2. Admin "Done" reply করে approve করে
3. `diamond-request.js` এ `approvePendingDiamond()` call হয়
4. Balance check করে: `currentBalance = 0`
5. Balance কম, তাই কোনো auto-deduction হয় না
6. Order database এ `approved` হয়
7. Due Balance = Total Order Amount - Total Paid = ৳2300 - ৳0 = ৳2300

### Files involved:
- `handlers/diamond-request.js` (Line 286-360)
- `config/database.json` (entries array)

---

## 📋 কেস ২: Deposit → Due থেকে Auto-deduct

### Scenario:
- User ৳3000 deposit করল
- আগের due = ৳2300

### Expected Result:
```
Main Balance: ৳700 (3000 - 2300)
Due Balance: ৳0
Total Paid: ৳2300
```

### How it works:
1. User deposit request পাঠায় (amount)
2. Admin "amount//rcv" reply করে approve করে
3. `deposit.js` এ `handleDepositApproval()` call হয়
4. Balance এ ৳3000 add হয়: `updateUserBalance(userId, 3000)`
5. **FIRST**: `applyAutoDeductionFromBalance()` call হয় (Line 105)
   - এটা due check করে: ৳2300
   - Balance থেকে ৳2300 কেটে নেয়
   - `type: 'auto'` transaction record করে
6. **THEN**: Manual deposit transaction record হয় (Line 108-114)
   - `type: 'manual'` transaction
7. Final balance = ৳700

### Files involved:
- `handlers/deposit.js` (Line 88-115)
- `utils/ledger.js` - `applyAutoDeductionFromBalance()` (Line 189-217)
- `config/payment-transactions.json`

### Key Code:
```javascript
// deposit.js - Line 105-107
const result = ledger.applyAutoDeductionFromBalance(quotedUserId, deposit.userName);
const autoDeductedAmount = result.deducted;
const finalBalance = result.newBalance;
```

---

## 📋 কেস ৩: Balance আছে → Order → Auto-deduct

### Scenario:
- Main Balance = ৳5000
- User 500💎 order দিল (500 × 2.3 = ৳1150)

### Expected Result:
```
Main Balance: ৳3850 (5000 - 1150)
Due Balance: ৳0
Total Paid: ৳1150
```

### How it works:
1. User order করে WhatsApp এ
2. Admin "Done" reply করে approve করে
3. `diamond-request.js` এ `approvePendingDiamond()` call হয়
4. Balance check: `currentBalance = 5000`
5. Order amount = ৳1150
6. Balance >= Order amount, তাই auto-deduct হয়:
   ```javascript
   // Line 307-323
   if (currentBalance >= orderAmount && orderAmount > 0) {
       autoDeductedAmount = orderAmount;
       finalBalance = db.updateUserBalance(entry.userId, -autoDeductedAmount);
       
       // Record auto-deduction
       savePaymentTransaction({
           userId: entry.userId,
           userName: entry.userName,
           groupId: groupId,
           amount: autoDeductedAmount,
           type: 'auto',
           status: 'approved',
           orderId: entry.id
       });
   }
   ```
7. Balance থেকে ৳1150 কাটে
8. `type: 'auto'` transaction record হয়
9. Final balance = ৳3850

### Files involved:
- `handlers/diamond-request.js` (Line 300-323)
- `config/payment-transactions.json`
- `config/users.json`

---

## 🔍 Transaction Types Explained

### Transaction Types:
1. **`type: 'manual'`** - Deposit transactions (শুধু deposit, due payment না)
2. **`type: 'auto'`** - Auto-deduction transactions (due payment করা হয়েছে)

### Total Paid Calculation:
```javascript
// utils/ledger.js - Line 121-133
function getPaidAmount(userId, groupId) {
  // শুধু 'auto' এবং 'auto-deduction' type count করে
  // Manual deposits count করে না
  return txns.reduce((sum, t) => {
    if (
      t.userId === userId &&
      t.groupId === groupId &&
      t.status === 'approved' &&
      (t.type === 'auto' || t.type === 'auto-deduction')
    ) {
      return sum + (Number(t.amount) || 0);
    }
    return sum;
  }, 0);
}
```

---

## 📊 Dashboard Display Logic

### Dashboard shows (handlers/dashboard.js):
```javascript
const balance = ledger.getUserBalance(userId);           // Main Balance
const due = ledger.computeGroupApprovedDue(userId, gId); // Total orders
const paid = ledger.getPaidAmount(userId, gId);          // Total auto-deducted
const remaining = Math.max(0, due - paid);               // Due Balance
```

### Formula:
- **Main Balance** = Current balance in `users.json`
- **Due Balance** = Total Orders - Total Paid
- **Total Paid** = Sum of all `type: 'auto'` transactions

---

## ✅ Test Results

### Test Script Output:
```
🔴 CASE 1: Balance = 0, Order → Due
   Main Balance: 0 (Expected: 0) ✅
   Due Balance: 2300 (Expected: 2300) ✅
   Total Paid: 0 (Expected: 0) ✅

🟡 CASE 2: Deposit ৳3000 → Auto-deduct from Due
   Main Balance: 700 (Expected: 700) ✅
   Due Balance: 0 (Expected: 0) ✅
   Total Paid: 2300 (Expected: 2300) ✅

🟢 CASE 3: Balance ৳5000 → Order → Auto-deduct
   Main Balance: 3850 (Expected: 3850) ✅
   Due Balance: 0 (Expected: 0) ✅
   Total Paid: 3450 (Expected: 3450) ✅

🎉 ALL CASES PASSED! ✅✅✅
```

---

## 🚀 How to Test

### Fresh Test:
```bash
# Stop bot
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Clear data
cd 'c:\Users\MTB PLC\Desktop\diamond-bot'
Remove-Item config/payment-transactions.json -Force
Remove-Item config/database.json -Force  
Remove-Item config/users.json -Force

# Run test
node test-all-cases.js
```

### Real WhatsApp Test:
1. Start bot: `node index.js`
2. **Test Case 1:** Order দিন (balance = 0) → `/d` check করুন
3. **Test Case 2:** Deposit করুন → `/d` check করুন
4. **Test Case 3:** আরেকটা order দিন → `/d` check করুন

---

## 📁 Key Files Modified

### Core Logic:
1. **`utils/ledger.js`** - Balance & transaction management
2. **`handlers/deposit.js`** - Deposit approval & auto-deduction
3. **`handlers/diamond-request.js`** - Order approval & auto-deduction
4. **`handlers/dashboard.js`** - Dashboard display

### Data Files:
1. **`config/users.json`** - User balances
2. **`config/payment-transactions.json`** - All transactions
3. **`config/database.json`** - Orders/entries

---

## 🎯 Summary

✅ **Case 1 Works:** Balance = 0 → Order goes to Due
✅ **Case 2 Works:** Deposit → Auto-deduct from Due → Balance preserved
✅ **Case 3 Works:** Balance exists → Order auto-deducts → Total Paid increases

**All 3 cases are fully functional!** 🚀
