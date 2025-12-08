const db = require('./config/database');
const { isAdminByAnyVariant, findAdminByAnyId, getAdminInfo } = require('./utils/admin-matcher');

console.log('\n✅ Testing Admin Approval System\n');

// Test different ID formats
const testIds = [
    '76210050711676@c.us',  // Admin 1
    '8801611938365@c.us',   // Admin 2
    '100378335014967@lid',  // Admin 3
    '100378335014967@c.us', // Admin 3 alternate format
    '120363405821339800@g.us' // Group ID (should not be admin)
];

console.log('Current Admins in Database:');
const admins = db.getAdmins();
admins.forEach((admin, i) => {
    console.log(`  ${i+1}. ${admin.name} | Phone: ${admin.phone} | WhatsAppId: ${admin.whatsappId}`);
});

console.log('\n📋 Testing ID Matching:');
testIds.forEach(id => {
    const isAdmin = isAdminByAnyVariant(id);
    const adminInfo = findAdminByAnyId(id);
    
    console.log(`\n  ID: ${id}`);
    console.log(`    Is Admin: ${isAdmin ? '✅ YES' : '❌ NO'}`);
    if (adminInfo) {
        console.log(`    Admin Name: ${adminInfo.name}`);
        console.log(`    Phone: ${adminInfo.phone}`);
    }
});

console.log('\n✅ Test Complete!\n');
