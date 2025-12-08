#!/usr/bin/env node

// Diagnostic tool to check database.json for pending orders

const fs = require('fs');
const path = require('path');

console.log('\n🔍 DATABASE DIAGNOSTIC\n');
console.log('='.repeat(60));

const dbPath = path.join(__dirname, 'config', 'database.json');

// Check if file exists
if (!fs.existsSync(dbPath)) {
    console.log('❌ database.json not found at:', dbPath);
    process.exit(1);
}

// Read database
let database = {};
try {
    const data = fs.readFileSync(dbPath, 'utf8');
    database = JSON.parse(data);
    console.log('✅ database.json loaded successfully\n');
} catch (e) {
    console.log('❌ Error parsing database.json:', e.message);
    process.exit(1);
}

// Check structure
console.log('📊 DATABASE STRUCTURE:');
console.log(`   Groups: ${Object.keys(database.groups || {}).length}`);

let totalPending = 0;
let totalApproved = 0;
let totalEntries = 0;

// Analyze each group
Object.entries(database.groups || {}).forEach(([groupId, group]) => {
    console.log(`\n📍 Group: ${group.groupName} (${groupId})`);
    console.log(`   Rate: ৳${group.rate}`);
    
    const entries = group.entries || [];
    console.log(`   Total Entries: ${entries.length}`);
    
    totalEntries += entries.length;
    
    // Count by status
    const statuses = {};
    entries.forEach(entry => {
        statuses[entry.status] = (statuses[entry.status] || 0) + 1;
    });
    
    console.log(`   Status Breakdown:`);
    Object.entries(statuses).forEach(([status, count]) => {
        console.log(`     • ${status}: ${count}`);
        if (status === 'pending') totalPending += count;
        if (status === 'approved') totalApproved += count;
    });
    
    // Show pending entries details
    const pendingEntries = entries.filter(e => e.status === 'pending');
    if (pendingEntries.length > 0) {
        console.log(`\n   ⏳ PENDING DETAILS:`);
        pendingEntries.forEach((entry, idx) => {
            const amount = entry.diamonds * entry.rate;
            console.log(`      ${idx + 1}. ID: ${entry.id}`);
            console.log(`         User: ${entry.userName} (${entry.userId})`);
            console.log(`         Diamonds: ${entry.diamonds}💎 @ ৳${entry.rate}`);
            console.log(`         Amount: ৳${amount}`);
            console.log(`         Created: ${entry.createdAt}`);
        });
    }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📈 SUMMARY:');
console.log(`   Total Entries: ${totalEntries}`);
console.log(`   Pending Orders: ${totalPending}`);
console.log(`   Approved Orders: ${totalApproved}`);
console.log(`   Other Status: ${totalEntries - totalPending - totalApproved}`);

if (totalPending === 0) {
    console.log('\n⚠️  NO PENDING ORDERS FOUND IN DATABASE');
    console.log('   → User order either not received or already approved');
}

console.log('\n' + '='.repeat(60) + '\n');
