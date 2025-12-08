const ledger = require('./utils/ledger');
const db = require('./config/database');
const fs = require('fs');
const path = require('path');

console.log('\n🧪 TESTING ALL 3 CASES\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const userId = '115930327715989@lid';
const groupId = '120363405821339800@g.us';
const userName = 'Test User';

// Helper function to show dashboard
function showDashboard(label) {
    const balance = ledger.getUserBalance(userId);
    const due = ledger.computeGroupApprovedDue(userId, groupId);
    const paid = ledger.getPaidAmount(userId, groupId);
    const remaining = Math.max(0, due - paid);
    const lastAuto = ledger.getLastAutoDeduction(userId, groupId);
    
    console.log(`\n📊 ${label}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Main Balance: ৳${balance.toFixed(2)}`);
    console.log(`Due Balance: ৳${remaining.toFixed(2)}`);
    console.log(`Total Paid: ৳${paid.toFixed(2)}`);
    console.log(`Last Auto-Deduct: ৳${lastAuto.amount.toFixed(2)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// CASE 1: Balance = 0, Order করলে Due তে যাবে
console.log('🔴 CASE 1: Balance = 0, Order → Due\n');

// Initial state
ledger.setUserBalance(userId, 0);
showDashboard('Initial State');

// Create order: 1000💎 @ 2.3 = ৳2300
const database = db.loadDatabase();
database.groups[groupId] = {
    groupId: groupId,
    entries: [{
        id: Date.now(),
        userId: userId,
        userName: userName,
        diamonds: 1000,
        rate: 2.3,
        status: 'approved',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString()
    }],
    rate: 2.3,
    groupName: 'Test Group'
};
db.saveDatabase(database);

showDashboard('After Order (Balance = 0)');

// Verify Case 1
const case1Balance = ledger.getUserBalance(userId);
const case1Due = ledger.computeGroupApprovedDue(userId, groupId);
const case1Paid = ledger.getPaidAmount(userId, groupId);
const case1Remaining = Math.max(0, case1Due - case1Paid);

console.log('✅ CASE 1 Verification:');
console.log(`   Main Balance: ${case1Balance} (Expected: 0) ${case1Balance === 0 ? '✅' : '❌'}`);
console.log(`   Due Balance: ${case1Remaining} (Expected: 2300) ${case1Remaining === 2300 ? '✅' : '❌'}`);
console.log(`   Total Paid: ${case1Paid} (Expected: 0) ${case1Paid === 0 ? '✅' : '❌'}\n`);

// CASE 2: Deposit করলে Due থেকে কাটবে
console.log('\n🟡 CASE 2: Deposit ৳3000 → Auto-deduct from Due\n');

// Deposit ৳3000
ledger.updateUserBalance(userId, 3000);
console.log('💰 Deposited: ৳3000');

// Add manual deposit transaction
ledger.addTransaction({
    userId: userId,
    userName: userName,
    groupId: groupId,
    amount: 3000,
    type: 'manual',
    status: 'approved'
});

showDashboard('After Deposit (Before Auto-Deduct)');

// Apply auto-deduction
const result = ledger.applyAutoDeductionFromBalance(userId, userName);
console.log(`⚡ Auto-Deducted: ৳${result.deducted}`);

showDashboard('After Auto-Deduction');

// Verify Case 2
const case2Balance = ledger.getUserBalance(userId);
const case2Due = ledger.computeGroupApprovedDue(userId, groupId);
const case2Paid = ledger.getPaidAmount(userId, groupId);
const case2Remaining = Math.max(0, case2Due - case2Paid);

console.log('✅ CASE 2 Verification:');
console.log(`   Main Balance: ${case2Balance} (Expected: 700) ${case2Balance === 700 ? '✅' : '❌'}`);
console.log(`   Due Balance: ${case2Remaining} (Expected: 0) ${case2Remaining === 0 ? '✅' : '❌'}`);
console.log(`   Total Paid: ${case2Paid} (Expected: 2300) ${case2Paid === 2300 ? '✅' : '❌'}\n`);

// CASE 3: Balance আছে, Order approve এ কাটবে
console.log('\n🟢 CASE 3: Balance আছে (৳5000) → Order → Auto-deduct\n');

// Set balance to ৳5000
ledger.setUserBalance(userId, 5000);
showDashboard('Initial State (Balance = ৳5000)');

// Create new order: 500💎 @ 2.3 = ৳1150
const dbData = db.loadDatabase();
dbData.groups[groupId].entries.push({
    id: Date.now() + 1,
    userId: userId,
    userName: userName,
    diamonds: 500,
    rate: 2.3,
    status: 'approved',
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString()
});
db.saveDatabase(dbData);

// Simulate order approval with auto-deduction (like diamond-request.js does)
const orderAmount = 500 * 2.3; // ৳1150
const currentBalance = ledger.getUserBalance(userId);

if (currentBalance >= orderAmount) {
    // Auto-deduct from balance
    ledger.updateUserBalance(userId, -orderAmount);
    
    // Record auto-deduction transaction
    ledger.addTransaction({
        userId: userId,
        userName: userName,
        groupId: groupId,
        amount: orderAmount,
        type: 'auto',
        status: 'approved',
        meta: { reason: 'auto-deduction on order approval' }
    });
    
    console.log(`⚡ Auto-Deducted on Order Approval: ৳${orderAmount}`);
}

showDashboard('After Order Approval with Auto-Deduct');

// Verify Case 3
const case3Balance = ledger.getUserBalance(userId);
const case3Due = ledger.computeGroupApprovedDue(userId, groupId);
const case3Paid = ledger.getPaidAmount(userId, groupId);
const case3Remaining = Math.max(0, case3Due - case3Paid);

console.log('✅ CASE 3 Verification:');
console.log(`   Main Balance: ${case3Balance} (Expected: 3850) ${case3Balance === 3850 ? '✅' : '❌'}`);
console.log(`   Due Balance: ${case3Remaining} (Expected: 0) ${case3Remaining === 0 ? '✅' : '❌'}`);
console.log(`   Total Paid: ${case3Paid} (Expected: 3450) ${case3Paid === 3450 ? '✅' : '❌'}\n`);

// Final Summary
console.log('\n📋 FINAL SUMMARY\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const allPassed = 
    case1Balance === 0 && case1Remaining === 2300 && case1Paid === 0 &&
    case2Balance === 700 && case2Remaining === 0 && case2Paid === 2300 &&
    case3Balance === 3850 && case3Remaining === 0 && case3Paid === 3450;

if (allPassed) {
    console.log('🎉 ALL CASES PASSED! ✅✅✅');
} else {
    console.log('❌ SOME CASES FAILED!');
    console.log('\nFailed Cases:');
    if (!(case1Balance === 0 && case1Remaining === 2300 && case1Paid === 0)) {
        console.log('  ❌ Case 1 Failed');
    }
    if (!(case2Balance === 700 && case2Remaining === 0 && case2Paid === 2300)) {
        console.log('  ❌ Case 2 Failed');
    }
    if (!(case3Balance === 3850 && case3Remaining === 0 && case3Paid === 3450)) {
        console.log('  ❌ Case 3 Failed');
    }
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
