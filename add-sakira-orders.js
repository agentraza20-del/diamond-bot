#!/usr/bin/env node

/**
 * ৮টা অর্ডার Sakira গ্রুপে add এবং approve করার জন্য
 */

const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, 'config', 'database.json');

// All orders from WhatsApp messages
const orders = [
    { playerId: "345381343", diamonds: 300 },
    { playerId: "407252687", diamonds: 650 },
    { playerId: "+8801985259497", diamonds: 5000 },
    { playerId: "466387024", diamonds: 500 },
    { playerId: "+8801985259497", diamonds: 4000 },
    { playerId: "556011764", diamonds: 100 },
    { playerId: "556011764", diamonds: 500 },
    { playerId: "495785889", diamonds: 1000 }
];

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                                                        ║');
console.log(`║     📦 Sakira গ্রুপে ${orders.length}টা অর্ডার Add করছি     ║`);
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
    
    // Find Sakira group
    let sakiraGroupId = null;
    for (const [groupId, groupData] of Object.entries(db.groups)) {
        if (groupData.groupName && groupData.groupName.toLowerCase().includes('sakira')) {
            sakiraGroupId = groupId;
            console.log(`✅ Sakira গ্রুপ পাওয়া গেছে: ${groupData.groupName}`);
            console.log(`   Group ID: ${groupId}`);
            console.log(`   Current Rate: ${groupData.rate}`);
            console.log(`   Existing Entries: ${groupData.entries ? groupData.entries.length : 0}\n`);
            break;
        }
    }
    
    if (!sakiraGroupId) {
        console.error('❌ Sakira গ্রুপ খুঁজে পাওয়া যায়নি!');
        process.exit(1);
    }
    
    const sakiraGroup = db.groups[sakiraGroupId];
    if (!sakiraGroup.entries) {
        sakiraGroup.entries = [];
    }
    
    const rate = sakiraGroup.rate || 2.13;
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
        
        sakiraGroup.entries.push(newOrder);
        addedCount++;
    });
    
    console.log(`✅ সব ${addedCount}টা অর্ডার successfully add এবং approve করা হয়েছে!\n`);
    
    // Save database
    if (saveDatabase(db)) {
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║                                                        ║');
        console.log('║     ✅ সফলভাবে সম্পন্ন হয়েছে!                         ║');
        console.log('║                                                        ║');
        console.log(`║     📊 Total Orders: ${addedCount}                               ║`);
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
