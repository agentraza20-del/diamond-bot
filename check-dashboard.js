const ledger = require('./utils/ledger');

const userId = '115930327715989@lid';
const groupId = '120363405821339800@g.us';

console.log('\n📊 DASHBOARD CHECK\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const balance = ledger.getUserBalance(userId);
const due = ledger.computeGroupApprovedDue(userId, groupId);
const paid = ledger.getPaidAmount(userId, groupId);
const remaining = Math.max(0, due - paid);
const lastAuto = ledger.getLastAutoDeduction(userId, groupId);

console.log(`Main Balance: ৳${balance.toFixed(2)}`);
console.log(`Total Due: ৳${due.toFixed(2)}`);
console.log(`Total Paid: ৳${paid.toFixed(2)}`);
console.log(`Due Balance (Remaining): ৳${remaining.toFixed(2)}`);
console.log(`Last Auto-Deduct: ৳${lastAuto.amount.toFixed(2)}`);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Expected:
console.log('Expected Results:');
console.log('Main Balance: ৳0.00 (correct - all went to due)');
console.log('Total Due: ৳2300.00 (1000💎 × 2.3)');
console.log('Total Paid: ৳2000.00 (auto-deducted from deposit)');
console.log('Due Balance: ৳300.00 (2300 - 2000)');
console.log('Last Auto-Deduct: ৳2000.00');

console.log('\n✅ Verification:');
console.log(`Balance = 0: ${balance === 0 ? '✅' : '❌'}`);
console.log(`Due = 2300: ${due === 2300 ? '✅' : '❌'}`);
console.log(`Paid = 2000: ${paid === 2000 ? '✅' : '❌'}`);
console.log(`Remaining = 300: ${remaining === 300 ? '✅' : '❌'}`);
console.log(`Last Auto = 2000: ${lastAuto.amount === 2000 ? '✅' : '❌'}`);

const allCorrect = balance === 0 && due === 2300 && paid === 2000 && remaining === 300 && lastAuto.amount === 2000;
console.log(`\n${allCorrect ? '🎉 ALL CORRECT!' : '❌ SOMETHING WRONG'}\n`);
