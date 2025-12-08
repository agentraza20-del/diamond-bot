const db = require('./config/database');

console.log('\n========================================');
console.log('📋 CHECKING ALL ADMINS IN DATABASE');
console.log('========================================\n');

const admins = db.getAdmins();

if (admins.length === 0) {
    console.log('❌ No admins found in database!\n');
} else {
    console.log(`✅ Found ${admins.length} admin(s):\n`);
    
    admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.name}`);
        console.log(`   📱 Phone: +${admin.phone}`);
        console.log(`   🆔 WhatsApp ID: ${admin.whatsappId}`);
        console.log(`   👤 Role: ${admin.role}`);
        console.log(`   📅 Added: ${admin.addedAt}\n`);
    });
}

console.log('========================================');
console.log('🔍 TEST ADMIN CHECK\n');

// Test admin check
const testIds = [
    admins[0]?.whatsappId,
    '8801234567890@c.us',
    '1234567890@c.us'
];

testIds.forEach(id => {
    if (id) {
        const isAdmin = db.isAdmin(id);
        console.log(`ID: ${id} => ${isAdmin ? '✅ ADMIN' : '❌ NOT ADMIN'}`);
    }
});

console.log('\n========================================\n');
