#!/usr/bin/env node

/**
 * ১৫টা অর্ডার Ripon গ্রুপে add এবং approve করার জন্য
 */

const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, 'config', 'database.json');

// All orders from WhatsApp messages
const orders = [
    { playerId: "106161453", diamonds: 400 },
    { playerId: "542632812", diamonds: 300 },
    { playerId: "+8801879082248", diamonds: 1000 },
    { playerId: "264292842", diamonds: 1000 },
    { playerId: "+8801345171306", diamonds: 1500 },
    { playerId: "418461753", diamonds: 200 },
    { playerId: "423396182", diamonds: 200 },
    { playerId: "399136095", diamonds: 500 },
    { playerId: "250325615", diamonds: 100 },
    { playerId: "+8801332919417", diamonds: 200 },
    { playerId: "+96879095214", diamonds: 1000 },
    { playerId: "+8801775661450", diamonds: 100 },
    { playerId: "+8801619384236", diamonds: 100 },
    { playerId: "553133594", diamonds: 100 },
    { playerId: "+96597108775", diamonds: 500 }
];

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                                                        ║');
console.log(`║     📦 Ripon গ্রুপে ${orders.length}টা অর্ডার Add করছি     ║`);
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
    
    // Find Ripon group
    let riponGroupId = null;
    for (const [groupId, groupData] of Object.entries(db.groups)) {
        if (groupData.groupName && groupData.groupName.toLowerCase().includes('ripon')) {
            riponGroupId = groupId;
            console.log(`✅ Ripon গ্রুপ পাওয়া গেছে: ${groupData.groupName}`);
            console.log(`   Group ID: ${groupId}`);
            console.log(`   Current Rate: ${groupData.rate}`);
            console.log(`   Existing Entries: ${groupData.entries ? groupData.entries.length : 0}\n`);
            break;
        }
    }
    
    if (!riponGroupId) {
        console.error('❌ Ripon গ্রুপ খুঁজে পাওয়া যায়নি!');
        process.exit(1);
    }
    
    const riponGroup = db.groups[riponGroupId];
    if (!riponGroup.entries) {
        riponGroup.entries = [];
    }
    
    const rate = riponGroup.rate || 2.13;
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
        
        riponGroup.entries.push(newOrder);
        addedCount++;
    });
    
    console.log(`✅ সব ${addedCount}টা অর্ডার successfully add এবং approve করা হয়েছে!\n`);
    
    // Save database
    if (saveDatabase(db)) {
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║                                                        ║');
        console.log('║     ✅ সফলভাবে সম্পন্ন হয়েছে!                         ║');
        console.log('║                                                        ║');
        console.log(`║     📊 Total Orders: ${addedCount}                              ║`);
        console.log(`║     💎 Total Diamonds: ${orders.reduce((sum, o) => sum + o.diamonds, 0).toLocaleString()}                        ║`);
        console.log('║                                                        ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
    } else {
        console.error('❌ Database save করতে সমস্যা হয়েছে!');
        process.exit(1);
    }
}

// Run
addAllOrders();
