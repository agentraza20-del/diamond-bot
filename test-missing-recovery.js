/**
 * Test Missing Order Recovery
 * This script simulates the missing order detection and recovery
 */

const fetch = require('node-fetch');

async function testMissingOrderRecovery() {
    console.log('🧪 Testing Missing Order Recovery System\n');
    
    const testOrderId = 1765127462888; // The 30💎 order
    const groupId = '120363422634515102@g.us';
    const userId = '76210050711676@lid';
    
    console.log('Step 1: Checking if order exists in Admin Panel...');
    
    try {
        const checkResponse = await fetch('http://localhost:3005/api/check-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                orderId: testOrderId,
                groupId: groupId,
                userId: userId,
                diamonds: 30
            })
        });
        
        const checkResult = await checkResponse.json();
        console.log('Check result:', checkResult);
        
        if (checkResult.missing && !checkResult.exists) {
            console.log('\n✅ Order is MISSING from Admin Panel!');
            console.log('Step 2: Triggering recovery...\n');
            
            // Trigger recovery
            const recoveryResponse = await fetch('http://localhost:3005/api/order-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'missing-order-recovery',
                    data: {
                        entryId: testOrderId,
                        userId: userId,
                        userName: 'RUBEL',
                        userIdFromMsg: '6999988',
                        groupId: groupId,
                        groupName: 'Test bot',
                        diamonds: 30,
                        amount: 69,
                        rate: 2.3,
                        status: 'pending',
                        recoveredAt: new Date().toISOString(),
                        originalTimestamp: Date.now(),
                        originalStatus: 'pending'
                    }
                })
            });
            
            if (recoveryResponse.ok) {
                console.log('✅ Recovery triggered successfully!');
                console.log('Check Admin Panel - order should be back!');
            } else {
                console.log('❌ Recovery failed:', await recoveryResponse.text());
            }
        } else if (checkResult.exists) {
            console.log('\n⚠️ Order already exists in Admin Panel');
            console.log('Status:', checkResult.order?.status);
            console.log('\nTo test recovery:');
            console.log('1. Go to Admin Panel');
            console.log('2. Permanent delete Order ID:', testOrderId);
            console.log('3. Run this script again');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\nMake sure Admin Panel is running on port 3005');
    }
}

testMissingOrderRecovery();
