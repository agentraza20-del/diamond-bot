#!/usr/bin/env node

/**
 * 🚀 WHATSAPP ORDERS BULK IMPORTER
 * আলফা বট থেকে সকল অর্ডার ইমপোর্ট করে গ্রুপ অনুযায়ী সংযুক্ত ও অনুমোদিত অবস্থায় যোগ করে
 */

const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, 'config', 'database.json');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                                                        ║');
console.log('║  🚀 WHATSAPP ORDERS BULK IMPORTER                     ║');
console.log('║     গ্রুপ অনুযায়ী অর্ডার ইমপোর্ট ও অনুমোদন           ║');
console.log('║                                                        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Parse WhatsApp order data from text
const rawOrders = `524508538
500
+601141207947
500
529684723
5000
581391685
50
406768183
1500
+601160579270
680
445962426
3000
303480513
1000
303480513
500
441070420
500
536784035
100
568231594
500
394919539
100
529684723
2000
373603424
2800
427145291
50
177666353
50
546480690
1200
+919526173680
200
44305735
3000
568435866
1500
518311799
2000
478979461
500
+9660505839951
1000
412129278
50
562808721
500
464695208
4000
384250355
600
54501608
100
+601111391425
520
513611448
700
422976065
200
477923322
১০০০
54501608
400
539623947
4500
259413352
5000
590296063
500
571353556
3000
478359515
500
390920828
600
259413352
800
+96898749518
230
+8801827321574
10
259413352
1360
36055646
100
320595297
5000
504566684
1000
531217324
1000
126365960
1500
+8801755750278
500
477923322
১০००
498627225
1000
+8801880481340
৫००
319863274
200
498627225
1000
498627225
1000
374499073
৫००
+601111391425
1350
498627225
1000
506816068
100
516553175
৫००
+96897500413
450
+60104243651
2000
36055646
100
488047682
300
505492217
100
56754000
600
506816068
50
590296063
1000
+8801827321574
200
505492217
400
566164858
1000
69713900
1000
505492217
100
319863274
500
406238686
1500
259413352
5000
319863274
1000
494210267
1000
428265016
1000
197596073
2000
539854520
1000
346211837
1000
186301650
3000
355069101
500
517880676
200
540850422
500
390041229
400
+601111391425
650
344031743
670
589386380
100
443252132
50
451477631
1000
502590572
100
546166815
1500`;

function parseOrders() {
    const lines = rawOrders.trim().split('\n').map(l => l.trim()).filter(l => l);
    const orders = [];
    
    for (let i = 0; i < lines.length; i += 2) {
        const customer = lines[i];
        const amount = lines[i + 1];
        
        if (customer && amount) {
            // Convert Bengali numerals to English
            const englishAmount = amount
                .replace(/০/g, '0')
                .replace(/১/g, '1')
                .replace(/২/g, '2')
                .replace(/३/g, '3')
                .replace(/४/g, '4')
                .replace(/५/g, '5')
                .replace(/৬/g, '6')
                .replace(/७/g, '7')
                .replace(/८/g, '8')
                .replace(/९/g, '9');
            
            orders.push({
                customer: customer.replace(/\+/g, ''),
                amount: parseInt(englishAmount) || parseInt(amount)
            });
        }
    }
    
    return orders;
}

// Load database
function loadDatabase() {
    try {
        if (!fs.existsSync(DATABASE_FILE)) {
            return { groups: {} };
        }
        return JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    } catch (err) {
        console.error('❌ Error loading database:', err);
        return { groups: {} };
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

// Generate unique order ID
function generateOrderId() {
    return `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
}

// Distribute orders across groups
function distributeOrdersToGroups(orders) {
    const db = loadDatabase();
    const groupIds = Object.keys(db.groups);
    
    if (groupIds.length === 0) {
        console.log('⚠️  No groups found in database!');
        console.log('Please create groups first using admin panel.');
        process.exit(1);
    }
    
    console.log(`\n📊 Found ${groupIds.length} groups:`);
    groupIds.forEach((gid, i) => {
        console.log(`   ${i + 1}. ${gid} (${db.groups[gid].users?.length || 0} users)`);
    });
    
    const distribution = {};
    groupIds.forEach(gid => {
        distribution[gid] = [];
    });
    
    // Distribute orders round-robin across groups
    orders.forEach((order, idx) => {
        const groupId = groupIds[idx % groupIds.length];
        distribution[groupId].push(order);
    });
    
    return distribution;
}

// Add orders to groups
function addOrdersToGroups(distribution) {
    const db = loadDatabase();
    let totalAdded = 0;
    
    console.log('\n\n📥 Adding orders to groups...\n');
    
    for (const groupId in distribution) {
        const orders = distribution[groupId];
        
        if (!db.groups[groupId]) {
            db.groups[groupId] = {
                users: [],
                orders: [],
                totalDeposited: 0,
                totalPaid: 0
            };
        }
        
        if (!db.groups[groupId].orders) {
            db.groups[groupId].orders = [];
        }
        
        let addedCount = 0;
        
        orders.forEach(order => {
            const newOrder = {
                id: generateOrderId(),
                customer: order.customer,
                amount: order.amount,
                status: 'approved', // 🚀 Auto-approved
                approved: true,
                approvedBy: 'IMPORT_SCRIPT',
                approvedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                paidAmount: 0,
                paid: false
            };
            
            db.groups[groupId].orders.push(newOrder);
            addedCount++;
            totalAdded++;
        });
        
        console.log(`   ✅ Group ${groupId}: Added ${addedCount} orders (Total: ${db.groups[groupId].orders.length})`);
    }
    
    console.log(`\n✨ Total orders imported: ${totalAdded}`);
    
    // Save to database
    if (saveDatabase(db)) {
        console.log('✅ Database saved successfully!\n');
        return totalAdded;
    } else {
        console.log('❌ Failed to save database!\n');
        return 0;
    }
}

// Generate summary report
function generateReport(orders, totalAdded) {
    const uniqueCustomers = new Set(orders.map(o => o.customer));
    const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   📊 IMPORT SUMMARY                    ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log(`📦 Total Orders:       ${orders.length}`);
    console.log(`👥 Unique Customers:   ${uniqueCustomers.size}`);
    console.log(`💰 Total Amount:       ${totalAmount.toLocaleString()}`);
    console.log(`✅ Successfully Added: ${totalAdded}`);
    console.log(`📅 Import Date:        ${new Date().toLocaleString()}`);
    console.log(`🔐 Status:             All orders AUTO-APPROVED\n`);
    
    const avgAmount = Math.round(totalAmount / orders.length);
    const maxAmount = Math.max(...orders.map(o => o.amount));
    const minAmount = Math.min(...orders.map(o => o.amount));
    
    console.log('📈 Statistics:');
    console.log(`   • Avg Amount: ${avgAmount.toLocaleString()}`);
    console.log(`   • Max Amount: ${maxAmount.toLocaleString()}`);
    console.log(`   • Min Amount: ${minAmount.toLocaleString()}\n`);
    
    // Distribution by amount ranges
    const ranges = {
        '50-500': orders.filter(o => o.amount >= 50 && o.amount <= 500).length,
        '501-1500': orders.filter(o => o.amount > 500 && o.amount <= 1500).length,
        '1501-5000': orders.filter(o => o.amount > 1500 && o.amount <= 5000).length,
        '5000+': orders.filter(o => o.amount > 5000).length
    };
    
    console.log('💵 Distribution by Amount:');
    for (const range in ranges) {
        const count = ranges[range];
        const percentage = ((count / orders.length) * 100).toFixed(1);
        console.log(`   • ${range}: ${count} (${percentage}%)`);
    }
    
    console.log('\n');
}

// Main execution
async function main() {
    console.log('🔄 Parsing WhatsApp orders...');
    const orders = parseOrders();
    
    console.log(`✅ Parsed ${orders.length} orders from WhatsApp export\n`);
    
    if (orders.length === 0) {
        console.log('❌ No orders found to import!');
        process.exit(1);
    }
    
    const distribution = distributeOrdersToGroups(orders);
    const totalAdded = addOrdersToGroups(distribution);
    
    generateReport(orders, totalAdded);
    
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                   ✨ IMPORT COMPLETE                   ║');
    console.log('║                                                        ║');
    console.log('║  📱 All orders are now in database and AUTO-APPROVED   ║');
    console.log('║  🚀 Ready for deployment to VPS!                       ║');
    console.log('║                                                        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 Next Steps:');
    console.log('   1. ✅ Run: npm start');
    console.log('   2. ✅ Check: http://84.54.23.85/');
    console.log('   3. ✅ View all orders in admin panel');
    console.log('\n');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
