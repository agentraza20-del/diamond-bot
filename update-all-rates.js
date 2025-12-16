const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'config', 'database.json');
const newRate = 2.08;

try {
    console.log('📂 Reading database...');
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    let updatedCount = 0;
    
    // Update all group rates
    for (const groupId in data.groups) {
        if (data.groups[groupId]) {
            const oldRate = data.groups[groupId].rate;
            data.groups[groupId].rate = newRate;
            updatedCount++;
            console.log(`✅ ${data.groups[groupId].name || groupId}: ${oldRate} → ${newRate}`);
        }
    }
    
    // Save updated database
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`\n🎉 Success! Updated ${updatedCount} groups to rate ${newRate} tk`);
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
