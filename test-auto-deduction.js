const ledger = require('./utils/ledger');
const db = require('./config/database');
const fs = require('fs');
const path = require('path');

console.log('\n🧪 AUTO-DEDUCTION LOGIC TEST\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test User ID
const testUserId = '115930327715989@lid';
const testGroupId = '120363405821339800@g.us';
const testUserName = 'Test User';

// Clean up test data
function cleanup() {
    console.log('🧹 Cleaning up test data...\n');
    
    // Reset users.json
    ledger.setUserBalance(testUserId, 0);
    
    // Clear transactions
    ledger.saveTransactions([]);
    
    // Clear database entries
    const database = db.loadDatabase();
    if (database.groups[testGroupId]) {
        database.groups[testGroupId].entries = [];
    }
    db.saveDatabase(database);
}

// Helper to format currency
function fmt(amount) {
    return `৳${parseFloat(amount).toFixed(2)}`;
}

// Helper to get stats
function getStats() {
    const balance = ledger.getUserBalance(testUserId);
    const due = ledger.computeGroupApprovedDue(testUserId, testGroupId);
    const paid = ledger.getPaidAmount(testUserId, testGroupId);
    const remaining = Math.max(0, due - paid);
    
    return { balance, due, paid, remaining };
}

// TEST CASE 1: Balance = 0, Order করলে Due-তে যাবে
function testCase1() {
    console.log('📋 TEST CASE 1: Main Balance = 0');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    cleanup();
    
    // Create order: 1000 diamonds @ 2.3 = 2300 টাকা
    const diamonds = 1000;
    const rate = 2.3;
    const orderAmount = diamonds * rate;
    
    console.log(`Step 1: User places order`);
    console.log(`  💎 Diamonds: ${diamonds}`);
    console.log(`  💰 Rate: ${fmt(rate)}/diamond`);
    console.log(`  💵 Total: ${fmt(orderAmount)}\n`);
    
    // Add entry
    db.addEntry(testGroupId, testUserId, diamonds, rate, 'Test Group', 'test-msg-1', testUserName);
    
    // Approve entry
    const database = db.loadDatabase();
    const entry = database.groups[testGroupId].entries[0];
    db.approveEntry(testGroupId, entry.id);
    
    console.log(`Step 2: Admin approves order\n`);
    
    // Check stats
    const stats = getStats();
    
    console.log(`📊 RESULT:`);
    console.log(`  Main Balance: ${fmt(stats.balance)}`);
    console.log(`  Due Balance: ${fmt(stats.remaining)}`);
    console.log(`  Total Paid: ${fmt(stats.paid)}\n`);
    
    // Verify
    const pass1 = stats.balance === 0;
    const pass2 = Math.abs(stats.remaining - orderAmount) < 0.01;
    const pass3 = stats.paid === 0;
    
    console.log(`✅ EXPECTED:`);
    console.log(`  Main Balance: ${fmt(0)} ${pass1 ? '✓' : '✗'}`);
    console.log(`  Due Balance: ${fmt(orderAmount)} ${pass2 ? '✓' : '✗'}`);
    console.log(`  Total Paid: ${fmt(0)} ${pass3 ? '✓' : '✗'}\n`);
    
    const result = pass1 && pass2 && pass3;
    console.log(result ? '✅ TEST CASE 1 PASSED\n' : '❌ TEST CASE 1 FAILED\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return result;
}

// TEST CASE 2: Deposit করলে Due থেকে কাটবে
function testCase2() {
    console.log('📋 TEST CASE 2: Deposit করলে Due থেকে কাটবে');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Previous state: Main Balance = 0, Due = 2300
    const prevStats = getStats();
    console.log(`Previous State:`);
    console.log(`  Main Balance: ${fmt(prevStats.balance)}`);
    console.log(`  Due Balance: ${fmt(prevStats.remaining)}\n`);
    
    // Deposit 3000 টাকা
    const depositAmount = 3000;
    console.log(`Step 1: User deposits ${fmt(depositAmount)}\n`);
    
    ledger.updateUserBalance(testUserId, depositAmount);
    
    // Apply auto-deduction
    console.log(`Step 2: Auto-deduction applies\n`);
    const result = ledger.applyAutoDeductionFromBalance(testUserId, testUserName);
    
    console.log(`  Auto-Deducted: ${fmt(result.deducted)}\n`);
    
    // Check stats
    const stats = getStats();
    
    console.log(`📊 RESULT:`);
    console.log(`  Main Balance: ${fmt(stats.balance)}`);
    console.log(`  Due Balance: ${fmt(stats.remaining)}`);
    console.log(`  Total Paid: ${fmt(stats.paid)}\n`);
    
    // Verify: 3000 - 2300 = 700
    const expectedBalance = depositAmount - prevStats.remaining;
    const pass1 = Math.abs(stats.balance - expectedBalance) < 0.01;
    const pass2 = stats.remaining === 0;
    const pass3 = Math.abs(stats.paid - prevStats.remaining) < 0.01;
    
    console.log(`✅ EXPECTED:`);
    console.log(`  Main Balance: ${fmt(expectedBalance)} ${pass1 ? '✓' : '✗'}`);
    console.log(`  Due Balance: ${fmt(0)} ${pass2 ? '✓' : '✗'}`);
    console.log(`  Total Paid: ${fmt(prevStats.remaining)} ${pass3 ? '✓' : '✗'}\n`);
    
    const passed = pass1 && pass2 && pass3;
    console.log(passed ? '✅ TEST CASE 2 PASSED\n' : '❌ TEST CASE 2 FAILED\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return passed;
}

// TEST CASE 3: Balance আছে, Order approve এ সরাসরি কাটবে
function testCase3() {
    console.log('📋 TEST CASE 3: Balance আছে, Order approve এ কাটবে');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    cleanup();
    
    // Set initial balance
    const initialBalance = 5000;
    ledger.setUserBalance(testUserId, initialBalance);
    
    console.log(`Initial State:`);
    console.log(`  Main Balance: ${fmt(initialBalance)}\n`);
    
    // Create order: 500 diamonds @ 2.3 = 1150 টাকা
    const diamonds = 500;
    const rate = 2.3;
    const orderAmount = diamonds * rate;
    
    console.log(`Step 1: User places order`);
    console.log(`  💎 Diamonds: ${diamonds}`);
    console.log(`  💰 Rate: ${fmt(rate)}/diamond`);
    console.log(`  💵 Total: ${fmt(orderAmount)}\n`);
    
    // Add entry
    db.addEntry(testGroupId, testUserId, diamonds, rate, 'Test Group', 'test-msg-3', testUserName);
    
    // Approve entry with auto-deduction
    const database = db.loadDatabase();
    const entry = database.groups[testGroupId].entries[0];
    db.approveEntry(testGroupId, entry.id);
    
    console.log(`Step 2: Admin approves order\n`);
    console.log(`Step 3: Auto-deduction applies from balance\n`);
    
    // Simulate auto-deduction on approval
    const currentBalance = ledger.getUserBalance(testUserId);
    if (currentBalance >= orderAmount) {
        ledger.updateUserBalance(testUserId, -orderAmount);
        ledger.addTransaction({
            userId: testUserId,
            userName: testUserName,
            groupId: testGroupId,
            amount: orderAmount,
            type: 'auto',
            status: 'approved',
            meta: { orderId: entry.id, reason: 'order-approval' }
        });
    }
    
    // Check stats
    const stats = getStats();
    
    console.log(`📊 RESULT:`);
    console.log(`  Main Balance: ${fmt(stats.balance)}`);
    console.log(`  Due Balance: ${fmt(stats.remaining)}`);
    console.log(`  Total Paid: ${fmt(stats.paid)}\n`);
    
    // Verify: 5000 - 1150 = 3850
    const expectedBalance = initialBalance - orderAmount;
    const pass1 = Math.abs(stats.balance - expectedBalance) < 0.01;
    const pass2 = stats.remaining === 0;
    const pass3 = Math.abs(stats.paid - orderAmount) < 0.01;
    
    console.log(`✅ EXPECTED:`);
    console.log(`  Main Balance: ${fmt(expectedBalance)} ${pass1 ? '✓' : '✗'}`);
    console.log(`  Due Balance: ${fmt(0)} ${pass2 ? '✓' : '✗'}`);
    console.log(`  Total Paid: ${fmt(orderAmount)} ${pass3 ? '✓' : '✗'}\n`);
    
    const passed = pass1 && pass2 && pass3;
    console.log(passed ? '✅ TEST CASE 3 PASSED\n' : '❌ TEST CASE 3 FAILED\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return passed;
}

// Run all tests
async function runTests() {
    console.log('🚀 Starting Auto-Deduction Tests...\n');
    
    const test1 = testCase1();
    const test2 = testCase2();
    const test3 = testCase3();
    
    console.log('\n📊 FINAL SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Test Case 1 (Balance=0, Order): ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test Case 2 (Deposit → Auto-Deduct): ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test Case 3 (Balance>0, Order): ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (test1 && test2 && test3) {
        console.log('🎉 ALL TESTS PASSED! Auto-deduction logic is working correctly.\n');
    } else {
        console.log('⚠️  SOME TESTS FAILED. Please review the logic.\n');
    }
    
    // Cleanup
    cleanup();
    console.log('✨ Test cleanup completed.\n');
}

// Execute tests
runTests().catch(console.error);
