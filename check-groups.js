const db = require('./config/database');
const data = db.loadDatabase();
const groups = Object.keys(data.groups || {});
console.log('Total groups:', groups.length);
console.log('');
groups.forEach((gId, i) => {
    const g = data.groups[gId];
    const orderCount = g.entries ? g.entries.length : 0;
    console.log(${i+1}.  (...) -  orders);
});
