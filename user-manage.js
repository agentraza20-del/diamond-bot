#!/usr/bin/env node

/**
 * 🚫 User Block Manager
 * Easily block/unblock users from the command line
 * Usage: node user-manage.js <command> [args]
 */

const { blockUser, blockMultipleUsers, unblockUser, deleteAllBlockedUsers, getAllBlockedUsers, getBlockedUserCount } = require('./utils/user-block-manager');

const command = process.argv[2];
const arg = process.argv[3];

console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🚫 User Block Manager                               ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`);

if (command === 'block' && arg) {
    // Block a single user
    blockUser(null, arg, 'This admin account has been removed and cannot approve orders');
    console.log(`✅ User blocked: ${arg}`);

} else if (command === 'blockmulti') {
    // Block multiple users
    const numbers = process.argv.slice(3);
    if (numbers.length === 0) {
        console.log('❌ Please provide phone numbers to block');
        process.exit(1);
    }
    
    console.log(`\n📱 Blocking ${numbers.length} users...\n`);
    const blocked = blockMultipleUsers(numbers, 'This admin account has been removed and cannot approve orders');
    
    blocked.forEach((user, i) => {
        console.log(`   ${i + 1}. ✅ ${user.phone} (${new Date(user.blockedAt).toLocaleString()})`);
    });
    
    console.log(`\n✅ Total blocked: ${blocked.length} users\n`);

} else if (command === 'unblock' && arg) {
    // Unblock a user
    const result = unblockUser(arg);
    if (result) {
        console.log(`✅ User unblocked: ${arg}`);
    } else {
        console.log(`❌ User not found: ${arg}`);
    }

} else if (command === 'list') {
    // List all blocked users
    const blocked = getAllBlockedUsers();
    
    if (blocked.length === 0) {
        console.log('\n✅ No blocked users\n');
    } else {
        console.log(`\n🚫 Total Blocked Users: ${blocked.length}\n`);
        blocked.forEach((user, i) => {
            console.log(`   ${i + 1}. Phone: ${user.phone || user.whatsappId}`);
            console.log(`      Reason: ${user.reason}`);
            console.log(`      Blocked: ${new Date(user.blockedAt).toLocaleString()}\n`);
        });
    }

} else if (command === 'deleteall') {
    // Delete all blocked users
    const count = getBlockedUserCount();
    if (count === 0) {
        console.log('✅ No blocked users to delete\n');
    } else {
        deleteAllBlockedUsers();
        console.log(`✅ Deleted ${count} blocked users\n`);
    }

} else {
    console.log(`
Usage:
  node user-manage.js block <phone>              - Block a single user
  node user-manage.js blockmulti <p1> <p2> ...   - Block multiple users
  node user-manage.js unblock <phone>            - Unblock a user
  node user-manage.js list                       - List all blocked users
  node user-manage.js deleteall                  - Delete all blocked users

Examples:
  node user-manage.js block 8801721016186
  node user-manage.js blockmulti 8801721016186 8801339842889 8801611938365
  node user-manage.js list
  node user-manage.js deleteall
  node user-manage.js unblock 8801721016186
`);
}
