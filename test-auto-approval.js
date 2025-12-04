#!/usr/bin/env node

/**
 * Test script to verify order auto-approval system
 * Run with: node test-auto-approval.js
 */

const db = require('./config/database');
const path = require('path');
const fs = require('fs');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║   🤖 AUTO-APPROVAL SYSTEM - VERIFICATION TEST          ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        testsPassed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        testsFailed++;
    }
}

// Test 1: Check if database module has setEntryProcessing function
test('Database has setEntryProcessing function', () => {
    if (typeof db.setEntryProcessing !== 'function') {
        throw new Error('setEntryProcessing function not found');
    }
});

// Test 2: Check if auto-approval utility exists
test('Auto-approval utility exists', () => {
    const autoApprovalPath = path.join(__dirname, 'utils', 'auto-approval.js');
    if (!fs.existsSync(autoApprovalPath)) {
        throw new Error('auto-approval.js not found');
    }
});

// Test 3: Check if auto-approval utility exports required functions
test('Auto-approval utility exports all functions', () => {
    const autoApproval = require('./utils/auto-approval');
    const required = ['startAutoApprovalTimer', 'cancelAutoApprovalTimer', 
                     'restoreProcessingTimers', 'cancelAllTimers'];
    
    for (const fn of required) {
        if (typeof autoApproval[fn] !== 'function') {
            throw new Error(`${fn} function not exported`);
        }
    }
});

// Test 4: Check database initialization
test('Database initializes correctly', () => {
    db.initializeDB();
    db.initializePayments();
    db.initializeUsers();
    
    const database = db.loadDatabase();
    if (!database || !database.groups) {
        throw new Error('Database structure invalid');
    }
});

// Test 5: Check setEntryProcessing changes status correctly
test('setEntryProcessing changes status to "processing"', () => {
    const groupId = 'test-group@g.us';
    
    // Add a test entry
    db.addEntry(groupId, 'test-user@c.us', 100, 1.5, 'Test Group', 'msg-1', 'Test User', '1234');
    
    const groupData = db.getGroupData(groupId);
    const entryId = groupData.entries[0].id;
    
    // Set to processing
    const result = db.setEntryProcessing(groupId, entryId);
    if (!result) {
        throw new Error('setEntryProcessing returned false');
    }
    
    // Reload to verify
    const updatedGroupData = db.getGroupData(groupId);
    const updatedEntry = updatedGroupData.entries.find(e => e.id === entryId);
    
    if (!updatedEntry) {
        throw new Error('Entry not found after update');
    }
    
    if (updatedEntry.status !== 'processing') {
        throw new Error(`Expected status "processing", got "${updatedEntry.status}"`);
    }
    
    if (!updatedEntry.processingStartedAt) {
        throw new Error('processingStartedAt not set');
    }
    
    if (!updatedEntry.processingTimeout) {
        throw new Error('processingTimeout not set');
    }
});

// Test 6: Check timer functions exist and are callable
test('Timer functions are callable', () => {
    const autoApproval = require('./utils/auto-approval');
    
    // Test cancelAutoApprovalTimer
    const result = autoApproval.cancelAutoApprovalTimer('test-group@g.us', 999);
    if (typeof result !== 'boolean') {
        throw new Error('cancelAutoApprovalTimer should return boolean');
    }
    
    // Test cancelAllTimers
    autoApproval.cancelAllTimers();
    
    // Test processingTimers registry
    if (!autoApproval.processingTimers || typeof autoApproval.processingTimers !== 'object') {
        throw new Error('processingTimers registry not accessible');
    }
});

// Test 7: Check index.js has required imports
test('index.js imports auto-approval utilities', () => {
    const indexPath = path.join(__dirname, 'index.js');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    const requiredImports = [
        'auto-approval',
        'startAutoApprovalTimer',
        'cancelAutoApprovalTimer',
        'restoreProcessingTimers'
    ];
    
    for (const imp of requiredImports) {
        if (!content.includes(imp)) {
            throw new Error(`Required import "${imp}" not found in index.js`);
        }
    }
});

// Test 8: Check index.js calls restoreProcessingTimers on ready
test('index.js calls restoreProcessingTimers on bot ready', () => {
    const indexPath = path.join(__dirname, 'index.js');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    if (!content.includes('restoreProcessingTimers(client)')) {
        throw new Error('restoreProcessingTimers not called on bot ready');
    }
});

// Test 9: Check message_revoke handler handles admin message deletion
test('message_revoke handler detects admin approval deletion', () => {
    const indexPath = path.join(__dirname, 'index.js');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    const checks = [
        'Diamond Order Processing',
        'cancelAutoApprovalTimer',
        'Detected potential approval message deletion'
    ];
    
    for (const check of checks) {
        if (!content.includes(check)) {
            throw new Error(`Required check "${check}" not found in message_revoke handler`);
        }
    }
});

// Test 10: Check graceful shutdown cancels timers
test('Graceful shutdown cancels all timers', () => {
    const indexPath = path.join(__dirname, 'index.js');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    if (!content.includes('cancelAllTimers()')) {
        throw new Error('cancelAllTimers not called in shutdown handlers');
    }
});

// Test 11: Check ORDER-AUTO-APPROVAL-SYSTEM.md exists
test('Documentation files exist', () => {
    const docs = [
        'ORDER-AUTO-APPROVAL-SYSTEM.md',
        'AUTO-APPROVAL-QUICK-GUIDE.md'
    ];
    
    for (const doc of docs) {
        const docPath = path.join(__dirname, doc);
        if (!fs.existsSync(docPath)) {
            throw new Error(`${doc} not found`);
        }
    }
});

// Summary
console.log('\n╔════════════════════════════════════════════════════════╗');
console.log(`║                                                        ║`);
console.log(`║   Tests Passed: ${testsPassed}/${testsPassed + testsFailed}                                   ║`);
if (testsFailed === 0) {
    console.log(`║   Status: ✅ ALL TESTS PASSED                         ║`);
} else {
    console.log(`║   Status: ❌ ${testsFailed} TEST(S) FAILED                       ║`);
}
console.log(`║                                                        ║`);
console.log('╚════════════════════════════════════════════════════════╝\n');

if (testsFailed > 0) {
    process.exit(1);
} else {
    console.log('🚀 System is ready for deployment!\n');
    process.exit(0);
}
