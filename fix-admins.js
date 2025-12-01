const fs = require('fs').promises;
const path = require('path');

async function fixAdmins() {
    try {
        console.log('\n🔧 REPAIRING ADMIN DATA...\n');
        
        const adminsPath = path.join(__dirname, 'config', 'admins.json');
        const data = JSON.parse(await fs.readFile(adminsPath, 'utf8'));
        
        console.log('📋 Current admins:');
        data.forEach((admin, i) => {
            console.log(`${i+1}. ${admin.name} - ${admin.whatsappId}`);
        });
        
        // Fix each admin
        const fixed = data.map(admin => {
            let newId = admin.whatsappId;
            
            // If corrupted (ends with @lid or similar), fix it
            if (!admin.whatsappId.endsWith('@c.us')) {
                // Remove the corrupted part and add correct format
                const phoneMatch = admin.whatsappId.match(/^(\d+)/);
                if (phoneMatch) {
                    newId = phoneMatch[1] + '@c.us';
                    console.log(`\n✅ Fixed: ${admin.whatsappId} => ${newId}`);
                } else {
                    // Try using phone field
                    if (admin.phone) {
                        newId = admin.phone + '@c.us';
                        console.log(`\n✅ Fixed using phone: ${admin.phone} => ${newId}`);
                    }
                }
            }
            
            return {
                ...admin,
                whatsappId: newId
            };
        });
        
        // Save fixed data
        await fs.writeFile(adminsPath, JSON.stringify(fixed, null, 2));
        console.log('\n✅ Admins repaired and saved!\n');
        
        console.log('📋 Updated admins:');
        fixed.forEach((admin, i) => {
            console.log(`${i+1}. ${admin.name} - ${admin.whatsappId}`);
        });
        console.log('\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixAdmins();
