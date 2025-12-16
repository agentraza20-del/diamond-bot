const db = require('./config/database');

const groupId = '120363405821339800@g.us';
const database = db.loadDatabase();

console.log('=== GROUP CHECK ===');
console.log('Looking for:', groupId);
console.log('\nAll groups in database:');
Object.keys(database.groups || {}).forEach(gid => {
    console.log(`  ${gid} - ${database.groups[gid].entries?.length || 0} orders`);
});

console.log('\n=== SPECIFIC GROUP ===');
const groupData = db.getGroupData(groupId);
if (groupData && groupData.entries) {
    console.log(`✅ Found group: ${groupId}`);
    console.log(`   Total orders: ${groupData.entries.length}`);
    console.log(`   Rate: ${groupData.rate}`);
    
    // Show last 5 orders
    const recent = groupData.entries.slice(-5);
    console.log('\n   Last 5 orders:');
    recent.forEach(e => {
        console.log(`     - ID: ${e.id}, User: ${e.userId}, Diamonds: ${e.diamonds}, Status: ${e.status}`);
    });
} else {
    console.log(`❌ Group NOT found: ${groupId}`);
}
