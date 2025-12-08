/**
 * Admin Management Utility
 * Remove, block, unblock admins easily
 */

const db = require('./config/database');
const fs = require('fs');
const path = require('path');

const ADMINS_FILE = path.join(__dirname, './config/admins.json');

function removeAdmin(whatsappId) {
    try {
        const admins = db.getAdmins();
        const index = admins.findIndex(a => a.whatsappId === whatsappId);
        
        if (index === -1) {
            console.log(`❌ Admin not found: ${whatsappId}`);
            return false;
        }

        const admin = admins[index];
        console.log(`🗑️ Removing admin: ${admin.name} (${whatsappId})`);
        
        // Remove from active admins
        admins.splice(index, 1);
        fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
        
        console.log(`✅ Admin removed: ${admin.name}`);
        return true;
    } catch (err) {
        console.error(`❌ Error removing admin:`, err.message);
        return false;
    }
}

function listAdmins() {
    const admins = db.getAdmins();
    
    console.log('\n📋 Active Admins:');
    if (admins.length === 0) {
        console.log('   No active admins');
    } else {
        admins.forEach((admin, i) => {
            console.log(`   ${i+1}. ${admin.name || 'Unnamed'} | ${admin.whatsappId}`);
        });
    }
    
    console.log(`\nTotal: ${admins.length} active\n`);
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

if (command === 'remove' && arg) {
    removeAdmin(arg);
} else if (command === 'list') {
    listAdmins();
} else {
    console.log(`
Admin Management Commands:
  node admin-manage.js list                    - List all admins
  node admin-manage.js remove <whatsappId>     - Remove an admin

Examples:
  node admin-manage.js remove 100378335014967@lid
    `);
}
