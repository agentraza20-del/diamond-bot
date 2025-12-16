#!/usr/bin/env node

/**
 * 95টা অর্ডার Goni গ্রুপে add এবং approve করার জন্য
 */

const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, 'config', 'database.json');

// All orders from WhatsApp messages
const orders = [
    { playerId: "524508538", diamonds: 500 },
    { playerId: "+601141207947", diamonds: 500 },
    { playerId: "529684723", diamonds: 5000 },
    { playerId: "581391685", diamonds: 50 },
    { playerId: "406768183", diamonds: 1500 },
    { playerId: "+601160579270", diamonds: 680 },
    { playerId: "445962426", diamonds: 3000 },
    { playerId: "303480513", diamonds: 1000 },
    { playerId: "303480513", diamonds: 500 },
    { playerId: "441070420", diamonds: 500 },
    { playerId: "536784035", diamonds: 100 },
    { playerId: "568231594", diamonds: 500 },
    { playerId: "394919539", diamonds: 100 },
    { playerId: "529684723", diamonds: 2000 },
    { playerId: "373603424", diamonds: 2800 },
    { playerId: "427145291", diamonds: 50 },
    { playerId: "177666353", diamonds: 50 },
    { playerId: "546480690", diamonds: 1200 },
    { playerId: "+919526173680", diamonds: 200 },
    { playerId: "44305735", diamonds: 3000 },
    { playerId: "568435866", diamonds: 1500 },
    { playerId: "518311799", diamonds: 2000 },
    { playerId: "478979461", diamonds: 500 },
    { playerId: "+9660505839951", diamonds: 1000 },
    { playerId: "412129278", diamonds: 50 },
    { playerId: "562808721", diamonds: 500 },
    { playerId: "464695208", diamonds: 4000 },
    { playerId: "384250355", diamonds: 600 },
    { playerId: "54501608", diamonds: 100 },
    { playerId: "+601111391425", diamonds: 520 },
    { playerId: "513611448", diamonds: 700 },
    { playerId: "422976065", diamonds: 200 },
    { playerId: "477923322", diamonds: 1000 },
    { playerId: "54501608", diamonds: 400 },
    { playerId: "539623947", diamonds: 4500 },
    { playerId: "259413352", diamonds: 5000 },
    { playerId: "590296063", diamonds: 500 },
    { playerId: "571353556", diamonds: 3000 },
    { playerId: "478359515", diamonds: 500 },
    { playerId: "390920828", diamonds: 600 },
    { playerId: "259413352", diamonds: 800 },
    { playerId: "+96898749518", diamonds: 230 },
    { playerId: "+8801827321574", diamonds: 10 },
    { playerId: "259413352", diamonds: 1360 },
    { playerId: "36055646", diamonds: 100 },
    { playerId: "320595297", diamonds: 5000 },
    { playerId: "504566684", diamonds: 1000 },
    { playerId: "531217324", diamonds: 1000 },
    { playerId: "126365960", diamonds: 1500 },
    { playerId: "+8801755750278", diamonds: 500 },
    { playerId: "477923322", diamonds: 1000 },
    { playerId: "498627225", diamonds: 1000 },
    { playerId: "+8801880481340", diamonds: 500 },
    { playerId: "319863274", diamonds: 200 },
    { playerId: "498627225", diamonds: 1000 },
    { playerId: "498627225", diamonds: 1000 },
    { playerId: "374499073", diamonds: 500 },
    { playerId: "+601111391425", diamonds: 1350 },
    { playerId: "498627225", diamonds: 1000 },
    { playerId: "506816068", diamonds: 100 },
    { playerId: "516553175", diamonds: 500 },
    { playerId: "+96897500413", diamonds: 450 },
    { playerId: "+60104243651", diamonds: 2000 },
    { playerId: "36055646", diamonds: 100 },
    { playerId: "488047682", diamonds: 300 },
    { playerId: "505492217", diamonds: 100 },
    { playerId: "56754000", diamonds: 600 },
    { playerId: "506816068", diamonds: 50 },
    { playerId: "590296063", diamonds: 1000 },
    { playerId: "+8801827321574", diamonds: 200 },
    { playerId: "505492217", diamonds: 400 },
    { playerId: "566164858", diamonds: 1000 },
    { playerId: "69713900", diamonds: 1000 },
    { playerId: "505492217", diamonds: 100 },
    { playerId: "319863274", diamonds: 500 },
    { playerId: "406238686", diamonds: 1500 },
    { playerId: "259413352", diamonds: 5000 },
    { playerId: "319863274", diamonds: 1000 },
    { playerId: "494210267", diamonds: 1000 },
    { playerId: "428265016", diamonds: 1000 },
    { playerId: "197596073", diamonds: 2000 },
    { playerId: "539854520", diamonds: 1000 },
    { playerId: "346211837", diamonds: 1000 },
    { playerId: "186301650", diamonds: 3000 },
    { playerId: "355069101", diamonds: 500 },
    { playerId: "517880676", diamonds: 200 },
    { playerId: "540850422", diamonds: 500 },
    { playerId: "390041229", diamonds: 400 },
    { playerId: "+601111391425", diamonds: 650 },
    { playerId: "344031743", diamonds: 670 },
    { playerId: "589386380", diamonds: 100 },
    { playerId: "443252132", diamonds: 50 },
    { playerId: "451477631", diamonds: 1000 },
    { playerId: "502590572", diamonds: 100 },
    { playerId: "546166815", diamonds: 1500 }
];

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                                                        ║');
console.log(`║     📦 Goni গ্রুপে ${orders.length}টা অর্ডার Add করছি        ║`);
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
    
    // Find Goni group
    let goniGroupId = null;
    for (const [groupId, groupData] of Object.entries(db.groups)) {
        if (groupData.groupName && groupData.groupName.toLowerCase().includes('goni')) {
            goniGroupId = groupId;
            console.log(`✅ Goni গ্রুপ পাওয়া গেছে: ${groupData.groupName}`);
            console.log(`   Group ID: ${groupId}`);
            console.log(`   Current Rate: ${groupData.rate}`);
            console.log(`   Existing Entries: ${groupData.entries ? groupData.entries.length : 0}\n`);
            break;
        }
    }
    
    if (!goniGroupId) {
        console.error('❌ Goni গ্রুপ খুঁজে পাওয়া যায়নি!');
        process.exit(1);
    }
    
    const goniGroup = db.groups[goniGroupId];
    if (!goniGroup.entries) {
        goniGroup.entries = [];
    }
    
    const rate = goniGroup.rate || 2.13;
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
        
        goniGroup.entries.push(newOrder);
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
        console.log(`║     📊 Total Orders: ${addedCount}                             ║`);
        console.log(`║     💎 Total Diamonds: ${orders.reduce((sum, o) => sum + o.diamonds, 0).toLocaleString()}                      ║`);
        console.log('║                                                        ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
    } else {
        console.error('❌ Database save করতে সমস্যা হয়েছে!');
        process.exit(1);
    }
}

// Run
addAllOrders();
