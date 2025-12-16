const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'config', 'database.json');
console.log('Reading database file from:', dbPath);

try {
    const content = fs.readFileSync(dbPath, 'utf8');
    const data = JSON.parse(content);
    
    const groupKeys = Object.keys(data.groups || {});
    console.log('Groups found in file:', groupKeys.length);
    
    if (groupKeys.length > 0) {
        console.log('First 5 groups:');
        groupKeys.slice(0, 5).forEach((key, idx) => {
            const group = data.groups[key];
            console.log(`  ${idx + 1}. ${key} - ${group.name || 'No name'} - ${group.entries?.length || 0} entries`);
        });
    }
    
    console.log('\nFile size:', content.length, 'bytes');
} catch (error) {
    console.error('Error reading database:', error.message);
}
