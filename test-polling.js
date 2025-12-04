/**
 * Test Script: Orders Real-Time Polling
 * 
 * এটি চেক করবে যে:
 * 1. Orders page-এ polling শুরু হয়
 * 2. প্রতি 3 সেকেন্ডে orders update হয়
 * 3. Page reload হয় না
 */

const fs = require('fs');
const path = require('path');

// Test order add করার জন্য
const dbPath = path.join(__dirname, 'config/database.json');

function addTestOrder() {
    try {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        
        // সব groups-এ একটি test order add করি
        const groupId = Object.keys(data.groups)[0];
        
        if (!groupId) {
            console.log('❌ No groups found in database');
            return false;
        }
        
        const testOrder = {
            id: Date.now(),
            userId: "test@lid",
            userName: "TESTER",
            playerIdNumber: "999" + Math.floor(Math.random() * 1000),
            diamonds: 50,
            rate: 2.3,
            status: "pending",
            createdAt: new Date().toISOString(),
            messageId: "test_" + Date.now()
        };
        
        data.groups[groupId].entries.push(testOrder);
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        
        console.log('✅ Test order added:', testOrder.playerIdNumber);
        console.log('⏳ Check Orders page - it should show this order in 3 seconds');
        console.log('⏳ The order should appear WITHOUT page reload or scroll movement');
        
        return true;
    } catch (error) {
        console.error('❌ Error adding test order:', error.message);
        return false;
    }
}

console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║     Orders Real-Time Polling Test                    ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

console.log('📝 Test Steps:');
console.log('1. Go to http://localhost:3005');
console.log('2. Click "Order" tab in bottom menu');
console.log('3. Run this script to add a test order');
console.log('4. Watch the Orders table - it should update in 3 seconds\n');

console.log('🔍 What to look for:');
console.log('✓ New order appears in table');
console.log('✓ Page does NOT reload (scroll position preserved)');
console.log('✓ Existing orders stay in same position');
console.log('✓ No page jump or animation glitch\n');

if (addTestOrder()) {
    console.log('\n📊 Polling should work every 3 seconds automatically\n');
} else {
    console.log('\n❌ Failed to add test order\n');
}
