const ledger = require('./utils/ledger');

const userId = '115930327715989@lid';
const groupId = '120363405821339800@g.us';

console.log('=== VERIFICATION ===\n');

// Get balance
const balance = ledger.getUserBalance(userId);
console.log('Balance:', balance);

// Get due calculations
const totalDue = ledger.computeGroupApprovedDue(userId, groupId);
const paidAmount = ledger.getPaidAmount(userId, groupId);
const remainingDue = ledger.computeRemainingDue(userId, groupId);

console.log('Total Due:', totalDue);
console.log('Total Paid:', paidAmount);
console.log('Remaining Due:', remainingDue);

console.log('\n=== EXPECTED VALUES ===');
console.log('Balance: 0 (all was deducted)');
console.log('Total Due: 4600 (2 orders × 1000💎 × 2.3)');
console.log('Total Paid: 4000 (2000 + 300 + 1700 auto-deductions)');
console.log('Remaining Due: 600 (4600 - 4000)');

console.log('\n=== STATUS ===');
if (balance === 0 && totalDue === 4600 && paidAmount === 4000 && remainingDue === 600) {
    console.log('✅ ALL CORRECT!');
} else {
    console.log('❌ MISMATCH DETECTED');
}
