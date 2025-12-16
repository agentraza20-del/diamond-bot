#!/usr/bin/env node

/**
 * ৪৬টা অর্ডার Akikul গ্রুপে add এবং approve করার জন্য
 */

const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, 'config', 'database.json');

// All orders from WhatsApp messages
const orders = [
    { playerId: "+971566106073", diamonds: 500 },
    { playerId: "513152093", diamonds: 1400 },
    { playerId: "377860525", diamonds: 1000 },
    { playerId: "400873678", diamonds: 200 },
    { playerId: "479726571", diamonds: 500 },
    { playerId: "546585564", diamonds: 600 },
    { playerId: "450710250", diamonds: 2000 },
    { playerId: "400353465", diamonds: 300 },
    { playerId: "446402249", diamonds: 200 },
    { playerId: "550272327", diamonds: 1000 },
    { playerId: "436859809", diamonds: 1000 },
    { playerId: "194018944", diamonds: 500 },
    { playerId: "488047682", diamonds: 300 },
    { playerId: "464695208", diamonds: 500 },
    { playerId: "+8801752249331", diamonds: 250 },
    { playerId: "564051542", diamonds: 500 },
    { playerId: "378234335", diamonds: 500 },
    { playerId: "522989696", diamonds: 1000 },
    { playerId: "508945032", diamonds: 600 },
    { playerId: "509324117", diamonds: 600 },
    { playerId: "464482874", diamonds: 500 },
    { playerId: "344234421", diamonds: 500 },
    { playerId: "499842305", diamonds: 500 },
    { playerId: "+60177968878", diamonds: 1100 },
    { playerId: "468312111", diamonds: 220 },
    { playerId: "283449637", diamonds: 400 },
    { playerId: "468312111", diamonds: 1000 },
    { playerId: "+601139257391", diamonds: 1000 },
    { playerId: "4797122", diamonds: 500 },
    { playerId: "+966571529530", diamonds: 200 },
    { playerId: "545544082", diamonds: 2000 },
    { playerId: "+8801708994723", diamonds: 2000 },
    { playerId: "545544082", diamonds: 1000 },
    { playerId: "456380561", diamonds: 2000 },
    { playerId: "462572166", diamonds: 1500 },
    { playerId: "447006836", diamonds: 210 },
    { playerId: "+8801967206579", diamonds: 200 },
    { playerId: "+966533073478", diamonds: 700 },
    { playerId: "+966577169283", diamonds: 600 },
    { playerId: "+96890296630", diamonds: 500 },
    { playerId: "366172942", diamonds: 100 },
    { playerId: "+8801622813235", diamonds: 900 },
    { playerId: "+971566106073", diamonds: 500 },
    { playerId: "+8801344281665", diamonds: 300 },
    { playerId: "378234335", diamonds: 500 },
    { playerId: "564051542", diamonds: 1020 }
];

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                                                        ║');
console.log(`║     📦 Akikul গ্রুপে ${orders.length}টা অর্ডার Add করছি    ║`);
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
    
    // Find Akikul group
    let akikulGroupId = null;
    for (const [groupId, groupData] of Object.entries(db.groups)) {
        if (groupData.groupName && groupData.groupName.toLowerCase().includes('akikul')) {
            akikulGroupId = groupId;
            console.log(`✅ Akikul গ্রুপ পাওয়া গেছে: ${groupData.groupName}`);
            console.log(`   Group ID: ${groupId}`);
            console.log(`   Current Rate: ${groupData.rate}`);
            console.log(`   Existing Entries: ${groupData.entries ? groupData.entries.length : 0}\n`);
            break;
        }
    }
    
    if (!akikulGroupId) {
        console.error('❌ Akikul গ্রুপ খুঁজে পাওয়া যায়নি!');
        process.exit(1);
    }
    
    const akikulGroup = db.groups[akikulGroupId];
    if (!akikulGroup.entries) {
        akikulGroup.entries = [];
    }
    
    const rate = akikulGroup.rate || 2.13;
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
        
        akikulGroup.entries.push(newOrder);
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
