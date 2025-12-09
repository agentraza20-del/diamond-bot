#!/usr/bin/env node

/**
 * 🧪 TEST DATA GENERATOR
 * Database-এ test orders add করে date rollover system test করার জন্য
 */

const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, 'config', 'database.json');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                                                        ║');
console.log('║     🧪 TEST DATA GENERATOR - Add Sample Orders        ║');
console.log('║                                                        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Load database
function loadDatabase() {
    try {
        if (!fs.existsSync(DATABASE_FILE)) {
            return { groups: {} };
        }
        return JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    } catch (err) {
        console.error('Error loading database:', err);
        return { groups: {} };
    }
}

// Save database
function saveDatabase(data) {
    try {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        console.log('✅ Database saved successfully\n');
        return true;
    } catch (err) {
        console.error('Error saving database:', err);
        return false;
    }
}

// Add test order
function addTestOrder() {
    const db = loadDatabase();
    
    // Check if we have any group
    const groupIds = Object.keys(db.groups);
    
    if (groupIds.length === 0) {
        console.log('❌ No groups found in database');
        console.log('📝 Please send "Start" command to bot first to create a group\n');
        return;
    }

    const testGroupId = groupIds[0];
    const group = db.groups[testGroupId];
    
    console.log(`✅ Found group: ${group.name} (${testGroupId})\n`);
    
    // Initialize orders array if not exists
    if (!group.orders) {
        group.orders = [];
    }

    // Create test orders
    const now = new Date();
    const testOrders = [
        {
            id: `order-${Date.now()}-1`,
            diamonds: 500,
            createdAt: now.toISOString(),
            status: 'pending',
            userId: 'test-user-1',
            userName: 'Test User 1'
        },
        {
            id: `order-${Date.now()}-2`,
            diamonds: 300,
            createdAt: now.toISOString(),
            status: 'approved',
            userId: 'test-user-2',
            userName: 'Test User 2'
        },
        {
            id: `order-${Date.now()}-3`,
            diamonds: 1000,
            createdAt: now.toISOString(),
            status: 'processing',
            userId: 'test-user-3',
            userName: 'Test User 3'
        }
    ];

    // Add orders to group
    group.orders.push(...testOrders);

    console.log(`📦 Adding ${testOrders.length} test orders:\n`);
    
    testOrders.forEach((order, index) => {
        console.log(`   Order ${index + 1}:`);
        console.log(`   ├─ ID: ${order.id}`);
        console.log(`   ├─ Diamonds: ${order.diamonds}`);
        console.log(`   ├─ Status: ${order.status}`);
        console.log(`   ├─ User: ${order.userName}`);
        console.log(`   └─ Created: ${new Date(order.createdAt).toLocaleString()}\n`);
    });

    // Save database
    if (saveDatabase(db)) {
        console.log('🎯 TEST ORDERS ADDED SUCCESSFULLY!\n');
        console.log('📌 NEXT STEPS:\n');
        console.log('1. Open admin panel: http://localhost:3000');
        console.log('2. Go to Orders tab - you should see the test orders');
        console.log('3. Check "Today" filter - all 3 orders should be there');
        console.log('4. Check "Yesterday" filter - orders from yesterday should be there');
        console.log('\n⏰ MIDNIGHT TEST:\n');
        console.log('When system date changes to tomorrow (Dec 11):');
        console.log('├─ System detects date change (every 60 seconds)');
        console.log('├─ Automatically refreshes order displays');
        console.log('├─ Orders move from "Today" to "Yesterday"');
        console.log('└─ You\'ll see notification: "Midnight! Today\'s orders moved to Yesterday"\n');
    }
}

// Main
try {
    addTestOrder();
} catch (error) {
    console.error('❌ Error:', error.message);
}

console.log('═══════════════════════════════════════════════════════\n');
