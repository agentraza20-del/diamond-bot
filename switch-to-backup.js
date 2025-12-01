const fs = require('fs').promises;
const path = require('path');

async function switchToBackup() {
    try {
        console.log('🔄 Switching to backup WhatsApp number...\n');
        
        // Load backup config
        const configPath = path.join(__dirname, 'config', 'backup-numbers.json');
        let config;
        
        try {
            config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        } catch (error) {
            console.log('⚠️ backup-numbers.json not found. Creating default...\n');
            
            // Create default config
            config = {
                "primary": {
                    "phone": "+8801XXXXXXXXX",
                    "whatsappId": "8801XXXXXXXXX@c.us",
                    "status": "active",
                    "lastUsed": new Date().toISOString()
                },
                "backup": {
                    "phone": "+8801YYYYYYYYY",
                    "whatsappId": "8801YYYYYYYYY@c.us",
                    "status": "standby",
                    "lastUsed": null
                },
                "current": "primary"
            };
            
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
            console.log('✅ Created config/backup-numbers.json');
            console.log('⚠️ Please edit the file with your actual phone numbers!\n');
            return;
        }
        
        if (config.current === 'backup') {
            console.log('❌ Already using backup number!');
            console.log(`📱 Current: ${config.backup.phone}\n`);
            
            console.log('💡 To switch back to primary:');
            console.log('1. Edit config/backup-numbers.json');
            console.log('2. Set "current": "primary"');
            console.log('3. Delete .wwebjs_auth folder');
            console.log('4. Restart bot\n');
            return;
        }
        
        // Switch to backup
        const oldNumber = config.primary.phone;
        const newNumber = config.backup.phone;
        
        config.current = 'backup';
        config.primary.status = 'banned';
        config.backup.status = 'active';
        config.backup.lastUsed = new Date().toISOString();
        
        // Save config
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        console.log('✅ Successfully switched to backup number!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📱 Old number: ${oldNumber} (Banned/Inactive)`);
        console.log(`📱 New number: ${newNumber} (Active)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log('⚠️ IMPORTANT - Next Steps:\n');
        console.log('1️⃣  Stop the bot if running (Ctrl+C)');
        console.log('2️⃣  Delete .wwebjs_auth folder:');
        console.log('    rm -rf .wwebjs_auth  (Linux/Mac)');
        console.log('    rmdir /s .wwebjs_auth  (Windows)');
        console.log('3️⃣  Restart the bot:');
        console.log('    node index.js');
        console.log('4️⃣  Scan QR code with backup number: ' + newNumber);
        console.log('\n✅ All your data (users, groups, orders) will remain intact!\n');
        
    } catch (error) {
        console.error('❌ Error switching to backup:', error.message);
        console.error(error.stack);
    }
}

// Check if running as main script
if (require.main === module) {
    switchToBackup();
}

module.exports = { switchToBackup };
