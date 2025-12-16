#!/usr/bin/env node

/**
 * ৪০টা অর্ডার Kawser গ্রুপে add এবং approve করার জন্য
 */

const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, 'config', 'database.json');

// All orders from WhatsApp messages
const orders = [
    { playerId: "+96890669611", diamonds: 100 },
    { playerId: "+9660508441876", diamonds: 600 },
    { playerId: "+966564221573", diamonds: 1500 },
    { playerId: "501215273", diamonds: 1480 },
    { playerId: "+96879258685", diamonds: 450 },
    { playerId: "473368187", diamonds: 600 },
    { playerId: "+8801888655093", diamonds: 350 },
    { playerId: "386548695", diamonds: 100 },
    { playerId: "+8801313564590", diamonds: 300 },
    { playerId: "515144110", diamonds: 500 },
    { playerId: "+8801719786495", diamonds: 600 },
    { playerId: "506006126", diamonds: 3000 },
    { playerId: "+918976653524", diamonds: 1180 },
    { playerId: "364367506", diamonds: 1500 },
    { playerId: "465262026", diamonds: 1000 },
    { playerId: "566053343", diamonds: 500 },
    { playerId: "434424082", diamonds: 500 },
    { playerId: "0502996841", diamonds: 700 },
    { playerId: "535124275", diamonds: 100 },
    { playerId: "505385709", diamonds: 100 },
    { playerId: "41327398", diamonds: 450 },
    { playerId: "432298906", diamonds: 110 },
    { playerId: "+96891917586", diamonds: 1000 },
    { playerId: "+8801729509442", diamonds: 500 },
    { playerId: "+8801331229380", diamonds: 200 },
    { playerId: "+96890669611", diamonds: 100 },
    { playerId: "452583332", diamonds: 500 },
    { playerId: "+971555241356", diamonds: 500 },
    { playerId: "39915395", diamonds: 100 },
    { playerId: "491931133", diamonds: 900 },
    { playerId: "+8801931820045", diamonds: 200 },
    { playerId: "474960136", diamonds: 200 },
    { playerId: "381009706", diamonds: 200 },
    { playerId: "297980382", diamonds: 1100 },
    { playerId: "+8801870144027", diamonds: 500 },
    { playerId: "468147058", diamonds: 100 },
    { playerId: "590717046", diamonds: 1500 },
    { playerId: "+8801831851692", diamonds: 200 },
    { playerId: "506346604", diamonds: 500 },
    { playerId: "+8801621197811", diamonds: 500 },
    { playerId: "560991117", diamonds: 200 },
    { playerId: "451123485", diamonds: 2000 }
];

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                                                        ║');
console.log(`║     📦 Kawser গ্রুপে ${orders.length}টা অর্ডার Add করছি      ║`);
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
    
    // Find Kawser group
    let kawserGroupId = null;
    for (const [groupId, groupData] of Object.entries(db.groups)) {
        if (groupData.groupName && groupData.groupName.toLowerCase().includes('kawser')) {
            kawserGroupId = groupId;
            console.log(`✅ Kawser গ্রুপ পাওয়া গেছে: ${groupData.groupName}`);
            console.log(`   Group ID: ${groupId}`);
            console.log(`   Current Rate: ${groupData.rate}`);
            console.log(`   Existing Entries: ${groupData.entries ? groupData.entries.length : 0}\n`);
            break;
        }
    }
    
    if (!kawserGroupId) {
        console.error('❌ Kawser গ্রুপ খুঁজে পাওয়া যায়নি!');
        process.exit(1);
    }
    
    const kawserGroup = db.groups[kawserGroupId];
    if (!kawserGroup.entries) {
        kawserGroup.entries = [];
    }
    
    const rate = kawserGroup.rate || 2.13;
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
        
        kawserGroup.entries.push(newOrder);
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
