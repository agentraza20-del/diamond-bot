#!/usr/bin/env node

/**
 * Remove duplicate admins from admins.json
 */

const fs = require('fs');
const path = require('path');

const adminsFile = path.join(__dirname, 'config', 'admins.json');

try {
    const data = JSON.parse(fs.readFileSync(adminsFile, 'utf8'));
    
    console.log(`📋 Found ${data.length} admins`);
    
    // Remove duplicates by phone
    const unique = [];
    const phones = new Set();
    
    data.forEach(admin => {
        if (!phones.has(admin.phone)) {
            unique.push(admin);
            phones.add(admin.phone);
        } else {
            console.log(`   ⚠️ Removing duplicate: ${admin.phone}`);
        }
    });
    
    // Write back
    fs.writeFileSync(adminsFile, JSON.stringify(unique, null, 2));
    
    console.log(`✅ Deduped to ${unique.length} admins`);
    console.log(`\nActive Admins:`);
    unique.forEach((a, i) => {
        console.log(`   ${i + 1}. ${a.phone} - ${a.name}`);
    });
    
} catch (err) {
    console.error('❌ Error:', err.message);
}
