/**
 * Test script to verify deletion flow without using PowerShell
 */

const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3005,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function test() {
    console.log('\n🧪 Testing Deletion Flow...\n');

    // Test 1: Check order status (should be processing)
    console.log('1️⃣ Fetching order status...');
    try {
        const orderRes = await makeRequest('/api/orders/1764831401903');
        console.log('   Order Status:', orderRes.data.order?.status);
        console.log('   Order ID:', orderRes.data.order?.id);
    } catch (e) {
        console.error('   ❌ Error:', e.message);
    }

    console.log('\n2️⃣ To test deletion:');
    console.log('   1. Go to admin panel: http://localhost:3005');
    console.log('   2. Find order 1764831401903 in the PROCESSING list');
    console.log('   3. Click the trash icon to delete it');
    console.log('   4. The status should change to DELETED (🗑️) within 1 second');
    console.log('   5. The timer should disappear');
    console.log('   6. Auto-approval should NOT happen after 2 minutes');

    console.log('\n3️⃣ Checking every 2 seconds for status changes...\n');
    
    let checkCount = 0;
    const maxChecks = 30; // Check for 60 seconds
    
    const checkInterval = setInterval(async () => {
        checkCount++;
        try {
            const res = await makeRequest('/api/orders/1764831401903');
            const status = res.data.order?.status;
            console.log(`   [${checkCount}] Order status: ${status}`);
            
            if (status === 'deleted') {
                console.log('\n✅ SUCCESS: Order status changed to DELETED!');
                clearInterval(checkInterval);
                process.exit(0);
            }
            
            if (checkCount >= maxChecks) {
                console.log('\n❌ Timeout: Order status did not change to DELETED within 60 seconds');
                clearInterval(checkInterval);
                process.exit(1);
            }
        } catch (e) {
            console.error(`   [${checkCount}] Error checking status:`, e.message);
        }
    }, 2000);
}

test();
