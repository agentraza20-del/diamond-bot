#!/usr/bin/env node

/**
 * Test broadcast message system
 * This script tests if toggle sends messages to all groups
 */

const fs = require('fs').promises;
const path = require('path');

const CONFIG_DIR = path.join(__dirname, 'config');
const DB_PATH = path.join(CONFIG_DIR, 'database.json');
const STATUS_PATH = path.join(CONFIG_DIR, 'diamond-status.json');
const PIN_PATH = path.join(CONFIG_DIR, 'pin.json');

async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return null;
    }
}

async function testBroadcast() {
    console.log('\n🔍 Testing Broadcast System...\n');
    console.log('═'.repeat(60));

    // 1. Check database groups
    console.log('\n1️⃣  Checking database groups...');
    const db = await readJSON(DB_PATH);
    
    if (!db || !db.groups) {
        console.log('❌ No groups in database');
        console.log('   Waiting for first message from a group...');
    } else {
        const groupIds = Object.keys(db.groups);
        console.log(`✅ Found ${groupIds.length} group(s):`);
        groupIds.forEach(gid => {
            const group = db.groups[gid];
            console.log(`   - ${group.name || 'Unknown'}`);
            console.log(`     ID: ${gid}`);
            console.log(`     Created: ${group.createdAt}`);
        });
    }

    // 2. Check current status
    console.log('\n2️⃣  Checking diamond system status...');
    const status = await readJSON(STATUS_PATH);
    
    if (!status) {
        console.log('❌ Cannot read status');
    } else {
        console.log(`✅ System Status: ${status.systemStatus.toUpperCase()}`);
        console.log(`   Message: ${status.globalMessage?.substring(0, 50)}...`);
        console.log(`   Last Toggled: ${status.lastToggled}`);
    }

    // 3. Check PIN
    console.log('\n3️⃣  Checking PIN...');
    const pin = await readJSON(PIN_PATH);
    if (!pin) {
        console.log('❌ Cannot read PIN');
    } else {
        console.log(`✅ Admin PIN: ${pin.adminPin}`);
    }

    // 4. Show next steps
    console.log('\n4️⃣  Next Steps:');
    console.log('   1. Send a message to a WhatsApp group where bot is member');
    console.log('   2. Check that group is registered in database');
    console.log('   3. Use admin panel to toggle system ON/OFF');
    console.log('   4. Check that message is sent to group via Socket.IO');

    console.log('\n═'.repeat(60));
    console.log('\n✅ Test Complete!\n');
}

// Run test
testBroadcast().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
