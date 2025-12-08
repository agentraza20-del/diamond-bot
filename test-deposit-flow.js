const ledger = require('./utils/ledger');
const db = require('./config/database');

console.log('\n🧪 TESTING DEPOSIT FLOW\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const userId = '115930327715989@lid';
const groupId = '120363405821339800@g.us';
const userName = 'Test User';

// Current state
console.log('📊 BEFORE DEPOSIT:');
const beforeBalance = ledger.getUserBalance(userId);
const beforeDue = ledger.computeGroupApprovedDue(userId, groupId);
const beforePaid = ledger.getPaidAmount(userId, groupId);
const beforeRemaining = Math.max(0, beforeDue - beforePaid);

console.log(`  Balance: ৳${beforeBalance.toFixed(2)}`);
console.log(`  Total Due: ৳${beforeDue.toFixed(2)}`);
console.log(`  Total Paid: ৳${beforePaid.toFixed(2)}`);
console.log(`  Remaining Due: ৳${beforeRemaining.toFixed(2)}\n`);

// Simulate deposit
const depositAmount = 3000;
console.log(`💰 DEPOSITING: ৳${depositAmount.toFixed(2)}\n`);

// Step 1: Add to balance
ledger.updateUserBalance(userId, depositAmount);
console.log(`✓ Added ৳${depositAmount} to balance\n`);

// Step 2: Apply auto-deduction
const result = ledger.applyAutoDeductionFromBalance(userId, userName);
console.log(`✓ Auto-deduction applied: ৳${result.deducted.toFixed(2)}\n`);

// After state
console.log('📊 AFTER DEPOSIT:');
const afterBalance = ledger.getUserBalance(userId);
const afterDue = ledger.computeGroupApprovedDue(userId, groupId);
const afterPaid = ledger.getPaidAmount(userId, groupId);
const afterRemaining = Math.max(0, afterDue - afterPaid);

console.log(`  Balance: ৳${afterBalance.toFixed(2)}`);
console.log(`  Total Due: ৳${afterDue.toFixed(2)}`);
console.log(`  Total Paid: ৳${afterPaid.toFixed(2)}`);
console.log(`  Remaining Due: ৳${afterRemaining.toFixed(2)}\n`);

// Verify
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('✅ VERIFICATION:');

const expectedBalance = depositAmount - result.deducted;
const balanceCorrect = Math.abs(afterBalance - expectedBalance) < 0.01;
const dueCorrect = afterRemaining === 0 || afterRemaining < beforeRemaining;

console.log(`  Expected Balance: ৳${expectedBalance.toFixed(2)} | Got: ৳${afterBalance.toFixed(2)} ${balanceCorrect ? '✓' : '✗'}`);
console.log(`  Due Reduced: ${beforeRemaining > afterRemaining ? '✓' : '✗'}`);
console.log(`  Auto-Deduction: ৳${result.deducted.toFixed(2)} ${result.deducted > 0 ? '✓' : '✗'}\n`);

if (balanceCorrect && result.deducted > 0) {
    console.log('🎉 DEPOSIT FLOW WORKING CORRECTLY!\n');
} else {
    console.log('⚠️  ISSUE DETECTED!\n');
}

// Show transaction history
console.log('📝 TRANSACTION HISTORY:');
const txns = ledger.loadTransactions();
txns.forEach((t, idx) => {
    console.log(`  ${idx + 1}. ${t.type}: ৳${t.amount.toFixed(2)} (${t.status})`);
});
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
