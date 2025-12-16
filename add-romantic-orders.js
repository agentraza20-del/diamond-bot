#!/usr/bin/env node

/**
 * ২৩টা অর্ডার Romantic গ্রুপে add এবং approve করার জন্য
 */

const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, 'config', 'database.json');

// All orders from WhatsApp messages
const orders = [
    { playerId: "+96897279569", diamonds: 250 },
    { playerId: "427378934", diamonds: 200 },
    { playerId: "+96897279569", diamonds: 200 },
    { playerId: "+9660573431103", diamonds: 100 },
    { playerId: "569864839", diamonds: 1500 },
    { playerId: "+966532068192", diamonds: 1350 },
    { playerId: "384344972", diamonds: 500 },
    { playerId: "+96897279569", diamonds: 200 },
    { playerId: "+8801620821031", diamonds: 100 },
    { playerId: "+8801620821031", diamonds: 500 },
    { playerId: "433985844", diamonds: 500 },
    { playerId: "461525930", diamonds: 10 },
    { playerId: "510180521", diamonds: 500 },
    { playerId: "437945552", diamonds: 200 },
    { playerId: "87440444", diamonds: 200 },
    { playerId: "87440444", diamonds: 300 },
    { playerId: "+8801890585375", diamonds: 100 },
    { playerId: "56903797", diamonds: 10000 },
    { playerId: "451905240", diamonds: 500 },
    { playerId: "56903797", diamonds: 10000 },
    { playerId: "+8801890585375", diamonds: 900 },
    { playerId: "56903797", diamonds: 10000 },
    { playerId: "487472942", diamonds: 2000 }
];

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                                                        ║');
console.log(`║     📦 Romantic গ্রুপে ${orders.length}টা অর্ডার Add করছি   ║`);
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
    
    // Find Romantic group
    let romanticGroupId = null;
    for (const [groupId, groupData] of Object.entries(db.groups)) {
        if (groupData.groupName && groupData.groupName.toLowerCase().includes('romantic')) {
            romanticGroupId = groupId;
            console.log(`✅ Romantic গ্রুপ পাওয়া গেছে: ${groupData.groupName}`);
            console.log(`   Group ID: ${groupId}`);
            console.log(`   Current Rate: ${groupData.rate}`);
            console.log(`   Existing Entries: ${groupData.entries ? groupData.entries.length : 0}\n`);
            break;
        }
    }
    
    if (!romanticGroupId) {
        console.error('❌ Romantic গ্রুপ খুঁজে পাওয়া যায়নি!');
        process.exit(1);
    }
    
    const romanticGroup = db.groups[romanticGroupId];
    if (!romanticGroup.entries) {
        romanticGroup.entries = [];
    }
    
    const rate = romanticGroup.rate || 2.13;
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
        
        romanticGroup.entries.push(newOrder);
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
