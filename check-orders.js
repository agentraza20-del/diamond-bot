const fs = require('fs');
const db = JSON.parse(fs.readFileSync('config/database.json', 'utf8'));

Object.entries(db.groups || {}).forEach(([gid, g]) => {
    console.log('\n📊 Group:', g.name);
    const entries = g.entries || [];
    console.log(`   Total Entries: ${entries.length}`);
    
    // Show first 5 entries
    entries.slice(0, 5).forEach(e => {
        const createdDate = new Date(e.createdAt).toLocaleDateString();
        console.log(`   - ${e.id}: ${e.userName} (${e.diamonds}💎) Status: ${e.status} | Created: ${createdDate}`);
    });
});
