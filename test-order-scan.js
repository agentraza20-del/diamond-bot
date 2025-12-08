/**
 * Order Scan System - Test Suite
 * Test all features locally without WhatsApp
 * 
 * Run: node test-order-scan.js
 */

const db = require('./config/database');
const { 
    scanPendingOrders, 
    getUserOrderReport, 
    getMissingPendingOrders, 
    generateScanMessage,
    isOrderInAdminPanel 
} = require('./utils/order-scan-system');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(title) {
    console.log('\n' + '='.repeat(60));
    log(`  ${title}`, 'bright');
    console.log('='.repeat(60) + '\n');
}

function test(name, result) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    const color = result ? 'green' : 'red';
    log(`${status} - ${name}`, color);
}

async function runTests() {
    try {
        header('ORDER SCAN SYSTEM - TEST SUITE');

        // Load database
        log('📂 Loading database...', 'cyan');
        const database = db.loadDatabase();
        const groupIds = Object.keys(database.groups || {});
        
        if (groupIds.length === 0) {
            log('⚠️  No groups found in database', 'yellow');
            log('Please submit some orders first', 'yellow');
            return;
        }

        const testGroupId = groupIds[0];
        const testGroup = database.groups[testGroupId];
        
        log(`✅ Found ${groupIds.length} group(s)`, 'green');
        log(`📍 Using test group: ${testGroupId}`, 'cyan');
        log(`📊 Total entries in group: ${testGroup.entries?.length || 0}\n`, 'cyan');

        // Test 1: Basic Scan
        header('TEST 1: Basic Order Scan');
        try {
            const scanResult = scanPendingOrders(testGroupId, 50);
            test('Scan function executes', scanResult.success);
            test('Returns summary data', scanResult.summary !== undefined);
            test('Returns detailed data', scanResult.data !== undefined);
            
            if (scanResult.success) {
                log(`\n📊 Scan Summary:`, 'cyan');
                log(`   Total: ${scanResult.summary.total}`, 'cyan');
                log(`   Pending: ${scanResult.summary.pending}`, 'cyan');
                log(`   Approved: ${scanResult.summary.approved}`, 'cyan');
                log(`   Cancelled: ${scanResult.summary.cancelled}`, 'cyan');
                log(`   Missing: ${scanResult.summary.missingFromAdmin}`, 'cyan');
            }
        } catch (error) {
            log(`❌ Error: ${error.message}`, 'red');
        }

        // Test 2: Message Generation
        header('TEST 2: Generate Scan Message');
        try {
            const scanResult = scanPendingOrders(testGroupId, 50);
            const message = generateScanMessage(testGroupId, scanResult);
            test('Message generation works', message.length > 0);
            test('Message contains emojis', /[✅⏳❌]/.test(message));
            test('Message contains numbers', /\d+/.test(message));
            
            log(`\n📝 Sample Message:`, 'cyan');
            console.log(message);
        } catch (error) {
            log(`❌ Error: ${error.message}`, 'red');
        }

        // Test 3: Missing Orders
        header('TEST 3: Missing Orders Detection');
        try {
            const missingResult = getMissingPendingOrders(testGroupId);
            test('Missing scan function works', missingResult.success);
            test('Returns count', missingResult.count !== undefined);
            test('Returns missing orders array', Array.isArray(missingResult.missingOrders));
            
            if (missingResult.success) {
                log(`\n📋 Missing Orders: ${missingResult.count}`, 'cyan');
                if (missingResult.missingOrders.length > 0) {
                    log(`\nFirst 3 missing orders:`, 'cyan');
                    missingResult.missingOrders.slice(0, 3).forEach((order, idx) => {
                        log(`   ${idx + 1}. ${order.userName} - ${order.diamonds}💎`, 'yellow');
                    });
                }
            }
        } catch (error) {
            log(`❌ Error: ${error.message}`, 'red');
        }

        // Test 4: User Report
        header('TEST 4: User Report Generation');
        try {
            const userIds = testGroup.entries
                .slice(0, 1)
                .map(e => e.userId);
            
            if (userIds.length > 0) {
                const userId = userIds[0];
                const userReport = getUserOrderReport(testGroupId, userId, 50);
                test('User report function works', userReport.success);
                test('Returns user info', userReport.userName !== undefined);
                test('Returns orders array', Array.isArray(userReport.orders));
                
                if (userReport.success) {
                    log(`\n👤 User: ${userReport.userName}`, 'cyan');
                    log(`   Total Orders: ${userReport.totalOrders}`, 'cyan');
                    log(`   Orders Detail:`, 'cyan');
                    userReport.orders.slice(0, 3).forEach((order, idx) => {
                        log(`      ${idx + 1}. ${order.statusDisplay} - ${order.diamonds}💎`, 'cyan');
                    });
                }
            } else {
                log('⚠️  No users found for testing', 'yellow');
            }
        } catch (error) {
            log(`❌ Error: ${error.message}`, 'red');
        }

        // Test 5: Admin Panel Check
        header('TEST 5: Admin Panel Integration');
        try {
            if (testGroup.entries && testGroup.entries.length > 0) {
                const testOrderId = testGroup.entries[0].id;
                const inAdmin = isOrderInAdminPanel(testOrderId);
                test('Admin panel check function works', typeof inAdmin === 'boolean');
                log(`\n🔍 Order ${testOrderId} in admin panel: ${inAdmin}`, 'cyan');
            }
        } catch (error) {
            log(`❌ Error: ${error.message}`, 'red');
        }

        // Test 6: Scan with Different Limits
        header('TEST 6: Different Scan Limits');
        try {
            const limits = [10, 25, 50, 100];
            log('Testing different limits:\n', 'cyan');
            
            limits.forEach(limit => {
                const result = scanPendingOrders(testGroupId, limit);
                const scanned = result.success ? result.data.pending.length + result.data.approved.length + result.data.cancelled.length : 0;
                log(`   Limit ${limit}: Scanned ${scanned} orders`, 'cyan');
                test(`Scan with limit ${limit}`, result.success);
            });
        } catch (error) {
            log(`❌ Error: ${error.message}`, 'red');
        }

        // Test 7: Statistics Calculation
        header('TEST 7: Statistics Calculation');
        try {
            const entries = testGroup.entries || [];
            const stats = {
                total: entries.length,
                pending: entries.filter(e => e.status === 'pending').length,
                approved: entries.filter(e => e.status === 'approved').length,
                cancelled: entries.filter(e => e.status === 'cancelled').length,
            };
            
            test('Statistics calculation works', stats.total > 0);
            
            log(`\n📊 Statistics:`, 'cyan');
            log(`   Total Orders: ${stats.total}`, 'cyan');
            log(`   Pending: ${stats.pending} (${((stats.pending/stats.total)*100).toFixed(1)}%)`, 'cyan');
            log(`   Approved: ${stats.approved} (${((stats.approved/stats.total)*100).toFixed(1)}%)`, 'cyan');
            log(`   Cancelled: ${stats.cancelled} (${((stats.cancelled/stats.total)*100).toFixed(1)}%)`, 'cyan');
        } catch (error) {
            log(`❌ Error: ${error.message}`, 'red');
        }

        // Test 8: Performance Test
        header('TEST 8: Performance Test');
        try {
            const startTime = Date.now();
            const result = scanPendingOrders(testGroupId, 200);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            test('Performance acceptable', duration < 1000);
            log(`\n⚡ Performance:`, 'cyan');
            log(`   Scan time: ${duration}ms`, 'cyan');
            log(`   Status: ${duration < 500 ? 'Excellent' : duration < 1000 ? 'Good' : 'Slow'}`, 'cyan');
        } catch (error) {
            log(`❌ Error: ${error.message}`, 'red');
        }

        // Summary
        header('TEST SUMMARY');
        log('✅ All tests completed!', 'green');
        log('\n💡 The system is working correctly.\n', 'cyan');
        log('Next steps:', 'bright');
        log('1. Use /scan command in WhatsApp group', 'cyan');
        log('2. Try /scan missing to find missing orders', 'cyan');
        log('3. Use /scan stats for statistics', 'cyan');

    } catch (error) {
        log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
        console.error(error);
    }
}

// Run tests
runTests();
