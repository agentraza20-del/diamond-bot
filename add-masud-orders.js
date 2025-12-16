#!/usr/bin/env node

/**
 * ৪০টা অর্ডার MD Masud গ্রুপে add এবং approve করার জন্য
 */

const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, 'config', 'database.json');

// All orders from WhatsApp messages
const orders = [
    { playerId: "217641798", diamonds: 1000 },
    { playerId: "474495892", diamonds: 500 },
    { playerId: "114631442", diamonds: 200 },
    { playerId: "481620361", diamonds: 5000 },
    { playerId: "380184312", diamonds: 600 },
    { playerId: "+97455061337", diamonds: 2000 },
    { playerId: "508093777", diamonds: 2000 },
    { playerId: "+96596739734", diamonds: 2500 },
    { playerId: "+9620788176467", diamonds: 500 },
    { playerId: "+96878326767", diamonds: 300 },
    { playerId: "526109222", diamonds: 4900 },
    { playerId: "389049938", diamonds: 200 },
    { playerId: "591965166", diamonds: 1500 },
    { playerId: "367479971", diamonds: 1600 },
    { playerId: "397831349", diamonds: 100 },
    { playerId: "546037720", diamonds: 1000 },
    { playerId: "425231145", diamonds: 3000 },
    { playerId: "364660830", diamonds: 600 },
    { playerId: "503376032", diamonds: 1000 },
    { playerId: "495704338", diamonds: 100 },
    { playerId: "342204677", diamonds: 100 },
    { playerId: "+8801306317269", diamonds: 100 },
    { playerId: "384880895", diamonds: 500 },
    { playerId: "397831349", diamonds: 100 },
    { playerId: "+966501140816", diamonds: 910 },
    { playerId: "491955799", diamonds: 100 },
    { playerId: "379071145", diamonds: 200 },
    { playerId: "593199209", diamonds: 500 },
    { playerId: "485592173", diamonds: 100 },
    { playerId: "425601923", diamonds: 400 },
    { playerId: "525909019", diamonds: 500 },
    { playerId: "425231145", diamonds: 4500 },
    { playerId: "492164395", diamonds: 1270 },
    { playerId: "367479971", diamonds: 900 },
    { playerId: "391690737", diamonds: 450 },
    { playerId: "484884413", diamonds: 500 },
    { playerId: "522100913", diamonds: 500 },
    { playerId: "+9660561262694", diamonds: 500 },
    { playerId: "+9647869964904", diamonds: 500 },
    { playerId: "+9607445735", diamonds: 1170 }
];

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                                                        ║');
console.log(`║     📦 MD Masud গ্রুপে ${orders.length}টা অর্ডার Add করছি ║`);
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
    
    // Find MD Masud group
    let masudGroupId = null;
    for (const [groupId, groupData] of Object.entries(db.groups)) {
        if (groupData.groupName && (
            groupData.groupName.toLowerCase().includes('masud') ||
            groupData.groupName.toLowerCase().includes('md masud')
        )) {
            masudGroupId = groupId;
            console.log(`✅ MD Masud গ্রুপ পাওয়া গেছে: ${groupData.groupName}`);
            console.log(`   Group ID: ${groupId}`);
            console.log(`   Current Rate: ${groupData.rate}`);
            console.log(`   Existing Entries: ${groupData.entries ? groupData.entries.length : 0}\n`);
            break;
        }
    }
    
    if (!masudGroupId) {
        console.error('❌ MD Masud গ্রুপ খুঁজে পাওয়া যায়নি!');
        process.exit(1);
    }
    
    const masudGroup = db.groups[masudGroupId];
    if (!masudGroup.entries) {
        masudGroup.entries = [];
    }
    
    const rate = masudGroup.rate || 2.13;
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
        
        masudGroup.entries.push(newOrder);
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
