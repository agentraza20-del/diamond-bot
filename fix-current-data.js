const ledger = require('./utils/ledger');
const db = require('./config/database');

console.log('\n🔧 FIXING CURRENT DATA\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const userId = '115930327715989@lid';
const groupId = '120363405821339800@g.us';
const userName = 'manager';

console.log('📊 Current State:');
console.log(`  User: ${userName}`);
console.log(`  Balance: ৳${ledger.getUserBalance(userId).toFixed(2)}`);

const due = ledger.computeGroupApprovedDue(userId, groupId);
const paid = ledger.getPaidAmount(userId, groupId);
const remaining = Math.max(0, due - paid);

console.log(`  Total Due: ৳${due.toFixed(2)}`);
console.log(`  Total Paid: ৳${paid.toFixed(2)}`);
console.log(`  Remaining Due: ৳${remaining.toFixed(2)}\n`);

console.log('🔄 Applying manual auto-deduction fix...\n');

// The user deposited 3000, which was added to balance
// But auto-deduction didn't apply
// Current balance = 170 (should be 700 if 2300 was deducted from 3000)
// Current paid = 0 (should be 2300)

// So we need to:
// 1. Check if manual payment of 3000 exists in payment-transactions.json
// 2. Apply auto-deduction to pay the due of 2300
// 3. Final balance should be: current_balance + (3000 - already_counted) - 2300

const transactions = ledger.loadTransactions();
console.log('💳 Current Transactions:');
transactions.forEach(t => {
    console.log(`  - ${t.type}: ৳${t.amount} (${t.status}) at ${t.createdAt}`);
});
console.log();

// Check if the 3000 deposit is already in balance
const currentBalance = ledger.getUserBalance(userId);
console.log(`Current balance in users.json: ৳${currentBalance.toFixed(2)}\n`);

// The deposit of 3000 seems to have partially been applied
// Let's recalculate: User had 0, deposited 3000
// Should have: 3000 - 2300 (due) = 700
// Currently has: 170

// This suggests the balance calculation is wrong
// Let's fix it properly:

console.log('🛠️  Fixing balance and applying auto-deduction...\n');

// Reset balance to what it should be after deposit
const expectedBalanceAfterDeposit = 3000;
ledger.setUserBalance(userId, expectedBalanceAfterDeposit);
console.log(`✓ Set balance to ৳${expectedBalanceAfterDeposit} (after deposit)\n`);

// Now apply auto-deduction
const result = ledger.applyAutoDeductionFromBalance(userId, userName);
console.log(`✓ Auto-deduction applied: ৳${result.deducted.toFixed(2)}\n`);

// Check final state
const finalBalance = ledger.getUserBalance(userId);
const finalDue = ledger.computeGroupApprovedDue(userId, groupId);
const finalPaid = ledger.getPaidAmount(userId, groupId);
const finalRemaining = Math.max(0, finalDue - finalPaid);

console.log('✅ FIXED STATE:');
console.log(`  Main Balance: ৳${finalBalance.toFixed(2)}`);
console.log(`  Total Due: ৳${finalDue.toFixed(2)}`);
console.log(`  Total Paid: ৳${finalPaid.toFixed(2)}`);
console.log(`  Remaining Due: ৳${finalRemaining.toFixed(2)}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (Math.abs(finalBalance - 700) < 0.1 && finalRemaining === 0) {
    console.log('🎉 SUCCESS! Data has been fixed correctly.\n');
} else {
    console.log('⚠️  Warning: Final values don\'t match expected.\n');
    console.log(`Expected: Balance=৳700, Due=৳0`);
    console.log(`Got: Balance=৳${finalBalance.toFixed(2)}, Due=৳${finalRemaining.toFixed(2)}\n`);
}
