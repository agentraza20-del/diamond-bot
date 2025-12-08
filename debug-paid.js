const ledger = require('./utils/ledger');

const userId = '115930327715989@lid';
const groupId = '120363405821339800@g.us';

// Load all transactions
const transactions = ledger.loadTransactions();

console.log('=== ALL TRANSACTIONS ===\n');
transactions.forEach(t => {
    console.log(`ID: ${t.id}, Amount: ${t.amount}, Type: ${t.type}, UserId: ${t.userId}, GroupId: ${t.groupId}, Status: ${t.status}`);
});

console.log('\n=== FILTERING FOR PAID AMOUNT ===');
console.log(`Looking for userId: ${userId}, groupId: ${groupId}`);

const filtered = transactions.filter(t => {
    const match = t.userId === userId &&
        t.groupId === groupId &&
        t.status === 'approved' &&
        (t.type === 'auto' || t.type === 'auto-deduction');
    
    if (match) {
        console.log(`✅ MATCHED: ID=${t.id}, Amount=${t.amount}, Type=${t.type}`);
    }
    return match;
});

const sum = filtered.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
console.log(`\nTotal Paid (calculated): ${sum}`);
console.log(`Total Paid (from ledger): ${ledger.getPaidAmount(userId, groupId)}`);
