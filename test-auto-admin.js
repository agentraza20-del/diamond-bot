/**
 * Test Auto-Admin Registration
 */

const { autoRegisterAdmin } = require('./utils/auto-admin-register');
const db = require('./config/database');

console.log('\n✅ Testing Auto-Admin Registration System\n');

// Simulate adding a completely new admin number
const testAdminNumber = '8801999777666';
const testAdminId = testAdminNumber + '@lid';

console.log(`📝 Before registration:`);
console.log(`   Total admins: ${db.getAdmins().length}`);

console.log(`\n➕ Registering new admin: ${testAdminId}`);
const result = autoRegisterAdmin(testAdminId, 'Test Admin New');

console.log(`\n📝 After registration:`);
console.log(`   Total admins: ${db.getAdmins().length}`);
console.log(`   Registered admin:`, result);

// Try to register the same one again
console.log(`\n🔄 Trying to register same admin again:`);
const result2 = autoRegisterAdmin(testAdminId, 'Test Admin New');
console.log(`   Should return existing: `, result2);

console.log(`\n✅ Test Complete!\n`);
