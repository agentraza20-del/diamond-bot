const db = require('./config/database');

console.log('\n=== Testing Stats Calculation ===\n');

const database = db.loadDatabase();
const payments = db.loadPayments();
const users = db.loadUsers();

console.log('Database groups:', JSON.stringify(database.groups, null, 2));
console.log('\nPayments:', JSON.stringify(payments, null, 2));
console.log('\nUsers:', JSON.stringify(users, null, 2));

let totalDiamonds = 0;
let totalDue = 0;
let totalPaid = 0;
let totalBudget = 0;
let totalEntries = 0;
let pendingEntries = 0;

Object.values(database.groups).forEach(group => {
    group.entries?.forEach(entry => {
        totalEntries++;
        if (entry.status === 'pending') {
            pendingEntries++;
        }
        totalDiamonds += entry.diamonds;
        
        // Only count APPROVED entries in totalDue
        if (entry.status === 'approved') {
            const value = entry.diamonds * entry.rate;
            console.log(`Entry: ${entry.diamonds}💎 × ${entry.rate} = ${value}`);
            totalDue += value;
        }
    });
});

payments.forEach(payment => {
    if (payment.status === 'approved') {
        console.log(`Payment: ${payment.amount}`);
        totalPaid += payment.amount;
    }
});

Object.values(users).forEach(user => {
    totalBudget += user.balance || 0;
});

console.log('\n=== Results ===');
console.log(`Total Diamonds: ${totalDiamonds}`);
console.log(`Total Due: ${totalDue.toFixed(2)}`);
console.log(`Total Paid: ${totalPaid.toFixed(2)}`);
console.log(`Due Balance: ${(totalDue - totalPaid).toFixed(2)}`);
console.log(`Total Budget: ${totalBudget.toFixed(2)}`);
console.log(`Total Entries: ${totalEntries}`);
console.log(`Pending Entries: ${pendingEntries}`);
