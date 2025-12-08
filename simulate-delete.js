/**
 * Simulate deleting an order from admin panel only
 * (keeps it in bot memory for testing missing order detection)
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'config', 'database.json');
const orderId = process.argv[2];

if (!orderId) {
    console.error('❌ Please provide an order ID');
    console.log('Usage: node simulate-delete.js <ORDER_ID>');
    process.exit(1);
}

// Read database
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let found = false;

// Find and mark order as deleted
for (const groupId in db.groups) {
    const group = db.groups[groupId];
    const order = group.entries.find(e => e.id === parseInt(orderId));
    
    if (order) {
        found = true;
        order.status = 'deleted';
        order.simulatedDelete = true;
        order.deletedAt = new Date().toISOString();
        
        console.log('✅ Order marked as deleted:');
        console.log(`   Order ID: ${order.id}`);
        console.log(`   Diamonds: ${order.diamonds}💎`);
        console.log(`   User: ${order.userName || order.userId}`);
        console.log(`   Status: ${order.status}`);
        console.log(`\n📝 Note: Order still exists in bot memory`);
        console.log(`   but marked as deleted for testing`);
        
        // Save database
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        
        console.log('\n🧪 Test Steps:');
        console.log('1. Send a new order from WhatsApp');
        console.log('2. Bot will check last 10 orders');
        console.log('3. Bot will find this deleted order in memory');
        console.log('4. Bot will check admin panel - order has status "deleted"');
        console.log('5. Bot should detect it as missing and recover');
        
        break;
    }
}

if (!found) {
    console.error(`❌ Order ${orderId} not found`);
    process.exit(1);
}
