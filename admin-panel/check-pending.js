// Test script to check pending orders calculation
const fs = require('fs');
const path = require('path');

const testDatabase = JSON.parse(fs.readFileSync('./test-database.json', 'utf8'));

console.log('\n📊 PENDING ORDERS TEST\n');
console.log('=' .repeat(60));

let totalPendingDiamonds = 0;
let totalPendingAmount = 0;

const groups = testDatabase.groups || {};

Object.entries(groups).forEach(([groupId, group]) => {
    console.log(`\n📍 Group: ${group.groupName}`);
    console.log(`   Rate: ৳${group.rate}`);
    
    const entries = group.entries || [];
    const pendingEntries = entries.filter(e => e.status === 'pending');
    
    if (pendingEntries.length === 0) {
        console.log('   ✅ No pending orders');
        return;
    }
    
    console.log(`   ⏳ Pending Orders: ${pendingEntries.length}`);
    
    pendingEntries.forEach(entry => {
        const amount = entry.diamonds * entry.rate;
        console.log(`      • ${entry.userName}: ${entry.diamonds} diamonds = ৳${amount}`);
        totalPendingDiamonds += entry.diamonds;
        totalPendingAmount += amount;
    });
});

console.log('\n' + '='.repeat(60));
console.log('\n📈 SUMMARY');
console.log(`   💎 Total Pending Diamonds: ${totalPendingDiamonds}`);
console.log(`   💰 Total Pending Amount: ৳${totalPendingAmount}`);
console.log('\n' + '='.repeat(60) + '\n');
