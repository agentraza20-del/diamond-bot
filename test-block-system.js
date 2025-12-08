#!/usr/bin/env node

/**
 * Test blocking system
 * Simulates admins trying to approve orders when blocked
 */

const { isUserBlocked, blockUser, unblockUser } = require('./utils/user-block-manager');
const { isAdminBlocked, blockAdmin } = require('./utils/auto-admin-register');

const testNumbers = [
    '8801721016186',
    '8801339842889',
    '8801611938365'
];

console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🧪 Testing Block System                             ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`);

console.log('\n📝 TEST 1: Check if users are blocked\n');

testNumbers.forEach(number => {
    const blocked = isUserBlocked(number);
    console.log(`   ${number}: ${blocked ? '✅ BLOCKED' : '❌ NOT BLOCKED'}`);
});

console.log('\n📝 TEST 2: Block all three numbers\n');

testNumbers.forEach(number => {
    blockUser(null, number, 'Test: Account removed');
    console.log(`   ✅ Blocked: ${number}`);
});

console.log('\n📝 TEST 3: Verify they are now blocked\n');

testNumbers.forEach(number => {
    const blocked = isUserBlocked(number);
    console.log(`   ${number}: ${blocked ? '✅ BLOCKED (CORRECT!)' : '❌ NOT BLOCKED (ERROR!)'}`);
});

console.log('\n📝 TEST 4: Check admin blocking\n');

testNumbers.forEach(number => {
    const phone = number;
    const whatsappId = number + '@c.us';
    blockAdmin(whatsappId, 'Test: Admin removed');
    console.log(`   ✅ Blocked admin: ${number}`);
});

console.log('\n✅ All tests complete! When these admins say "done", they should get:');
console.log('   ❌ This admin account has been removed and cannot approve orders.\n');
