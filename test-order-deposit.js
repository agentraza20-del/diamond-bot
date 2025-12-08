const ledger = require('./utils/ledger');
const db = require('./config/database');

console.log('\n🧪 TESTING: ORDER → DEPOSIT → AUTO-DEDUCT\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const userId = '115930327715989@lid';
const groupId = '120363405821339800@g.us';
const userName = 'Test User';

// Reset for clean test
console.log('🧹 Resetting data for clean test...\n');
ledger.setUserBalance(userId, 0);
ledger.saveTransactions([]);

const database = db.loadDatabase();
if (database.groups[groupId]) {
    database.groups[groupId].entries = [];
}
db.saveDatabase(database);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// STEP 1: Create an order
console.log('📦 STEP 1: User places order (1000💎 @ ৳2.3)\n');
const entry = db.addEntry(groupId, userId, 1000, 2.3, 'Test Group', 'test-msg', userName);
db.approveEntry(groupId, entry.id);

console.log('  Order approved!\n');
console.log('  📊 Status:');
const step1Balance = ledger.getUserBalance(userId);
const step1Due = ledger.computeGroupApprovedDue(userId, groupId);
const step1Paid = ledger.getPaidAmount(userId, groupId);
const step1Remaining = Math.max(0, step1Due - step1Paid);

console.log(`    Balance: ৳${step1Balance.toFixed(2)}`);
console.log(`    Total Due: ৳${step1Due.toFixed(2)}`);
console.log(`    Total Paid: ৳${step1Paid.toFixed(2)}`);
console.log(`    Remaining Due: ৳${step1Remaining.toFixed(2)}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// STEP 2: Deposit money
console.log('💰 STEP 2: User deposits ৳3000\n');
ledger.updateUserBalance(userId, 3000);
console.log('  Added ৳3000 to balance\n');

console.log('  📊 Status before auto-deduction:');
const step2Balance = ledger.getUserBalance(userId);
console.log(`    Balance: ৳${step2Balance.toFixed(2)}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// STEP 3: Auto-deduction
console.log('⚡ STEP 3: Auto-deduction applies\n');
const result = ledger.applyAutoDeductionFromBalance(userId, userName);
console.log(`  Auto-deducted: ৳${result.deducted.toFixed(2)}\n`);

console.log('  📊 Final Status:');
const finalBalance = ledger.getUserBalance(userId);
const finalDue = ledger.computeGroupApprovedDue(userId, groupId);
const finalPaid = ledger.getPaidAmount(userId, groupId);
const finalRemaining = Math.max(0, finalDue - finalPaid);

console.log(`    Balance: ৳${finalBalance.toFixed(2)}`);
console.log(`    Total Due: ৳${finalDue.toFixed(2)}`);
console.log(`    Total Paid: ৳${finalPaid.toFixed(2)}`);
console.log(`    Remaining Due: ৳${finalRemaining.toFixed(2)}\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// VERIFICATION
console.log('✅ VERIFICATION:\n');
console.log(`  ✓ Order Due: ৳2,300`);
console.log(`  ✓ Deposit: ৳3,000`);
console.log(`  ✓ Auto-Deducted: ৳${result.deducted.toFixed(2)} ${result.deducted === 2300 ? '✓' : '✗'}`);
console.log(`  ✓ Final Balance: ৳${finalBalance.toFixed(2)} ${Math.abs(finalBalance - 700) < 0.01 ? '✓' : '✗'}`);
console.log(`  ✓ Remaining Due: ৳${finalRemaining.toFixed(2)} ${finalRemaining === 0 ? '✓' : '✗'}\n`);

if (result.deducted === 2300 && Math.abs(finalBalance - 700) < 0.01 && finalRemaining === 0) {
    console.log('🎉 SUCCESS! Auto-deduction working perfectly!\n');
} else {
    console.log('❌ FAILED! Something is wrong.\n');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
