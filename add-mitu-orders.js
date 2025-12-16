#!/usr/bin/env node

/**
 * ১৬টা অর্ডার Mitu গ্রুপে add এবং approve করার জন্য
 */

const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, 'config', 'database.json');

// All orders from WhatsApp messages
const orders = [
    { playerId: "+8801319131552", diamonds: 500 },
    { playerId: "501063239", diamonds: 500 },
    { playerId: "501063239", diamonds: 1000 },
    { playerId: "+8801881365077", diamonds: 400 },
    { playerId: "+8801881365077", diamonds: 500 },
    { playerId: "+96898720156", diamonds: 200 },
    { playerId: "+96876285900", diamonds: 600 },
    { playerId: "466360066", diamonds: 900 },
    { playerId: "+60179487628", diamonds: 1500 },
    { playerId: "+8801607252995", diamonds: 200 },
    { playerId: "+96872846610", diamonds: 500 },
    { playerId: "+971542655234", diamonds: 1000 },
    { playerId: "262833971", diamonds: 1000 },
    { playerId: "+96876328260", diamonds: 9100 },
    { playerId: "209566077", diamonds: 1020 },
    { playerId: "+97431146477", diamonds: 670 }
];

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                                                        ║');
console.log(`║     📦 Mitu গ্রুপে ${orders.length}টা অর্ডার Add করছি      ║`);
console.log('║                                                        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Load database
function loadDatabase() {
    try {
        if (!fs.existsSync(DATABASE_FILE)) {
            console.error('❌ Database file not found!');
            process.exit(1);
        }
        return JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    } catch (err) {
        console.error('❌ Error loading database:', err);
        process.exit(1);
    }
}

// Save database
function saveDatabase(data) {
    try {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error('❌ Error saving database:', err);
        return false;
    }
}

// Main function
function addAllOrders() {
    const db = loadDatabase();
    
    // Find Mitu group
    let mituGroupId = null;
    for (const [groupId, groupData] of Object.entries(db.groups)) {
        if (groupData.groupName && groupData.groupName.toLowerCase().includes('mitu')) {
            mituGroupId = groupId;
            console.log(`✅ Mitu গ্রুপ পাওয়া গেছে: ${groupData.groupName}`);
            console.log(`   Group ID: ${groupId}`);
            console.log(`   Current Rate: ${groupData.rate}`);
            console.log(`   Existing Entries: ${groupData.entries ? groupData.entries.length : 0}\n`);
            break;
        }
    }
    
    if (!mituGroupId) {
        console.error('❌ Mitu গ্রুপ খুঁজে পাওয়া যায়নি!');
        process.exit(1);
    }
    
    const mituGroup = db.groups[mituGroupId];
    if (!mituGroup.entries) {
        mituGroup.entries = [];
    }
    
    const rate = mituGroup.rate || 2.13;
    let addedCount = 0;
    const timestamp = Date.now();
    
    console.log('📝 Orders যোগ করা হচ্ছে...\n');
    
    // Add all orders
    orders.forEach((order, index) => {
        const orderId = timestamp + index;
        const newOrder = {
            id: orderId,
            userId: "admin@manual",
            userName: "Admin Manual Entry",
            playerIdNumber: order.playerId,
            diamonds: order.diamonds,
            rate: rate,
            status: "approved",
            createdAt: new Date(timestamp + index).toISOString(),
            messageId: `manual_entry_${orderId}`,
            approvedAt: new Date(timestamp + index + 1000).toISOString(),
            approvedBy: "Admin (Manual Batch Approval)"
        };
        
        mituGroup.entries.push(newOrder);
        addedCount++;
        
        if ((index + 1) % 10 === 0) {
            console.log(`   ✓ ${index + 1}/${orders.length} orders added...`);
        }
    });
    
    console.log(`\n✅ সব ${addedCount}টা অর্ডার successfully add এবং approve করা হয়েছে!\n`);
    
    // Save database
    if (saveDatabase(db)) {
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║                                                        ║');
        console.log('║     ✅ সফলভাবে সম্পন্ন হয়েছে!                         ║');
        console.log('║                                                        ║');
        console.log(`║     📊 Total Orders: ${addedCount}                              ║`);
        console.log(`║     💎 Total Diamonds: ${orders.reduce((sum, o) => sum + o.diamonds, 0).toLocaleString()}                       ║`);
        console.log('║                                                        ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
    } else {
        console.error('❌ Database save করতে সমস্যা হয়েছে!');
        process.exit(1);
    }
}

// Run
addAllOrders();
