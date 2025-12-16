// Quick check if Player ID is stored in database
const db = require('./config/database');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Player ID storage in database...\n');

try {
    const databasePath = path.join(__dirname, 'config', 'database.json');
    const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
    
    let totalOrders = 0;
    let ordersWithPlayerID = 0;
    let ordersWithoutPlayerID = 0;
    
    Object.entries(database.groups || {}).forEach(([groupId, groupData]) => {
        const entries = groupData.entries || [];
        
        entries.forEach(entry => {
            totalOrders++;
            
            console.log(`\n📦 Order ID: ${entry.id}`);
            console.log(`   User: ${entry.userName || entry.userId}`);
            console.log(`   WhatsApp ID: ${entry.userId}`);
            console.log(`   playerIdNumber: ${entry.playerIdNumber || 'NOT SET ❌'}`);
            console.log(`   Diamonds: ${entry.diamonds}💎`);
            console.log(`   Status: ${entry.status}`);
            console.log(`   Created: ${entry.createdAt}`);
            
            if (entry.playerIdNumber) {
                ordersWithPlayerID++;
                console.log(`   ✅ Has playerIdNumber`);
            } else {
                ordersWithoutPlayerID++;
                console.log(`   ❌ Missing playerIdNumber`);
            }
        });
    });
    
    console.log('\n' + '='.repeat(50));
    console.log(`📊 SUMMARY:`);
    console.log(`   Total Orders: ${totalOrders}`);
    console.log(`   ✅ With Player ID: ${ordersWithPlayerID}`);
    console.log(`   ❌ Without Player ID: ${ordersWithoutPlayerID}`);
    console.log(`   Coverage: ${totalOrders > 0 ? ((ordersWithPlayerID / totalOrders) * 100).toFixed(1) : 0}%`);
    console.log('='.repeat(50) + '\n');
    
} catch (error) {
    console.error('❌ Error reading database:', error.message);
}
