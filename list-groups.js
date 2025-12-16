const db = require('./config/database');
const data = db.loadDatabase();
const groups = Object.keys(data.groups || {});
console.log('Total groups:', groups.length);
console.log('');
groups.forEach((gId, i) => {
    const g = data.groups[gId];
    const orderCount = g.entries ? g.entries.length : 0;
    const groupName = g.name || 'Unknown';
    const shortId = gId.substring(0,18);
    console.log((i+1) + '. ' + groupName + ' (' + shortId + '...) - ' + orderCount + ' orders');
});
