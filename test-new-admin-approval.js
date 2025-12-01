/**
 * Comprehensive test for new admin approval system
 */

const db = require('./config/database');
const { autoRegisterAdmin, isAdminBlocked, blockAdmin, loadBlockedAdmins } = require('./utils/auto-admin-register');
const { isAdminByAnyVariant } = require('./utils/admin-matcher');

console.log('\n========================================');
console.log('🔐 NEW ADMIN APPROVAL SYSTEM TEST');
console.log('========================================\n');

// Test 1: Add new admin
console.log('📝 TEST 1: Add New Admin');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const newAdminId = '8801888777666@lid';
console.log(`Adding new admin: ${newAdminId}`);
autoRegisterAdmin(newAdminId, 'Test Admin');

console.log(`Is registered: ${db.isAdmin(newAdminId) ? '✅ YES' : '❌ NO'}`);
console.log(`Is blocked: ${isAdminBlocked(newAdminId) ? '❌ BLOCKED' : '✅ NOT BLOCKED'}`);
console.log(`Can approve: ${isAdminByAnyVariant(newAdminId) ? '✅ YES' : '❌ NO'}\n`);

// Test 2: Block the admin
console.log('📝 TEST 2: Block the Admin');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
blockAdmin(newAdminId, 'Admin removed');
console.log(`Is blocked now: ${isAdminBlocked(newAdminId) ? '✅ YES (BLOCKED)' : '❌ NO'}`);
console.log(`Can approve now: ${isAdminByAnyVariant(newAdminId) ? '✅ YES (ERROR!)' : '❌ NO (CORRECT!)'}\n`);

// Test 3: Try to re-register blocked admin
console.log('📝 TEST 3: Try to Re-register Blocked Admin');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const result = autoRegisterAdmin(newAdminId, 'Test Admin Again');
console.log(`Re-register result: ${result === null ? '❌ REJECTED (CORRECT!)' : '✅ ALLOWED (ERROR!)'}`);
console.log(`Can approve now: ${isAdminByAnyVariant(newAdminId) ? '✅ YES (ERROR!)' : '❌ NO (CORRECT!)'}\n`);

// Test 4: Different ID format for same admin
console.log('📝 TEST 4: Different Format for Same Admin');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const altFormat = '8801888777666@c.us';
console.log(`Original format: ${newAdminId}`);
console.log(`Alt format: ${altFormat}`);
console.log(`Is alt blocked: ${isAdminBlocked(altFormat) ? '✅ YES (CORRECT!)' : '❌ NO (ERROR!)'}`);
console.log(`Can approve with alt: ${isAdminByAnyVariant(altFormat) ? '✅ YES (ERROR!)' : '❌ NO (CORRECT!)'}\n`);

// Summary
console.log('📊 SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Total blocked admins: ${loadBlockedAdmins().length}`);
console.log(`Active admins: ${db.getAdmins().length}`);
console.log(`\n✅ All tests completed!\n`);
