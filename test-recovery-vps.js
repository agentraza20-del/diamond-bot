/**
 * Test Missing Order Recovery on VPS
 * Simulates: Admin sends "Done" to a missing order
 * Expected: Order recovered in PROCESSING status in admin panel
 */

const fetch = require('node-fetch');

async function testRecovery() {
    const testOrder = {
        entryId: Date.now(),
        userId: '1234567890@c.us',
        userName: 'Test User',
        playerIdNumber: '987654321',
        userIdFromMsg: '987654321',
        groupId: '120363405821339800@g.us',
        groupName: 'Test Group',
        diamonds: 500,
        amount: 1150,
        rate: 2.3,
        status: 'processing',
        processingStartedAt: new Date().toISOString(),
        timestamp: Date.now(),
        recoveredAt: new Date().toISOString(),
        recoveryReason: 'TEST: Admin approval - missing order',
        recoveredBy: 'Test Admin',
        approvedBy: 'Test Admin'
    };
    
    console.log(`Testing recovery for Order ${testOrder.entryId} (${testOrder.diamonds}💎)...`);
    
    const response = await fetch('http://127.0.0.1:3005/api/order-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            eventType: 'missing-order-recovery',
            data: testOrder
        })
    });
    
    console.log(`Status: ${response.status}`);
    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));
}

testRecovery().catch(console.error);
