const fs = require('fs');
const path = require('path');

console.log('\n=== Checking Database Files ===\n');

const files = ['database.json', 'payments.json', 'users.json'];
const configDir = path.join(__dirname, 'config');

files.forEach(file => {
    const filePath = path.join(configDir, file);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        console.log(`✅ ${file} - Valid JSON, size: ${content.length} bytes`);
    } catch (err) {
        console.log(`❌ ${file} - ERROR: ${err.message}`);
    }
});

console.log('\n=== Checking database.js Module ===\n');

try {
    const db = require('./config/database');
    console.log('✅ database.js module loads successfully');
    
    console.log('\nTesting loadDatabase()...');
    const database = db.loadDatabase();
    console.log('✅ loadDatabase() works - groups:', Object.keys(database.groups).length);
    
    console.log('\nTesting loadPayments()...');
    const payments = db.loadPayments();
    console.log('✅ loadPayments() works - entries:', payments.length);
    
    console.log('\nTesting loadUsers()...');
    const users = db.loadUsers();
    console.log('✅ loadUsers() works - users:', Object.keys(users).length);
    
} catch (err) {
    console.log(`❌ Error with database module: ${err.message}`);
    console.log(err.stack);
}

console.log('\n=== All checks complete ===\n');
