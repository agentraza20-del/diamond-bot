const { blockAdmin, isAdminBlocked, unblockAdmin, loadBlockedAdmins } = require('./utils/auto-admin-register');

console.log('\n✅ Testing Blocked Admin System\n');

// Test blocking an admin
const testAdminId = '100378335014967@lid';
console.log(`📝 Before blocking:
   Blocked count: ${loadBlockedAdmins().length}
   Is blocked: ${isAdminBlocked(testAdminId)}`);

console.log(`\n🚫 Blocking admin: ${testAdminId}`);
blockAdmin(testAdminId, 'Admin removed from group');

console.log(`\n📝 After blocking:
   Blocked count: ${loadBlockedAdmins().length}
   Is blocked: ${isAdminBlocked(testAdminId) ? '✅ YES (BLOCKED)' : '❌ NO'}`);

console.log(`\n🔓 Unblocking admin: ${testAdminId}`);
unblockAdmin(testAdminId);

console.log(`\n📝 After unblocking:
   Blocked count: ${loadBlockedAdmins().length}
   Is blocked: ${isAdminBlocked(testAdminId)}`);

console.log('\n✅ Test Complete!\n');
