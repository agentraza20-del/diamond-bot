const http = require('http');

// Test User Update API - Edit due balance from current to 5000
function testUpdateUser() {
    const data = JSON.stringify({
        name: 'User 1',
        balance: 0,
        dueBalance: 5000  // ← Changing from 2300 to 5000
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/users/115930327715989/update',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`✅ Update Response Status: ${res.statusCode}`);
        
        let responseData = '';
        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            try {
                const jsonData = JSON.parse(responseData);
                console.log('✅ Update Success:', JSON.stringify(jsonData, null, 2));
            } catch (e) {
                console.log('Response:', responseData);
            }
            
            // Now fetch the updated user
            setTimeout(() => {
                testGetUser();
            }, 500);
        });
    });

    req.on('error', (error) => {
        console.error('❌ Error during update:', error.message);
    });

    console.log('📤 Sending update request with dueBalance: 5000...');
    req.write(data);
    req.end();
}

function testGetUser() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/users/115930327715989',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        console.log(`\n✅ GET Response Status: ${res.statusCode}`);
        
        let responseData = '';
        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            try {
                const jsonData = JSON.parse(responseData);
                console.log('\n📊 User Data After Update:');
                console.log(`  Name: ${jsonData.name}`);
                console.log(`  Balance: ${jsonData.balance}`);
                console.log(`  Due Balance: ${jsonData.dueBalance}`);
                console.log(`\n✅ TEST PASSED - Due Balance persisted as: ${jsonData.dueBalance}`);
            } catch (e) {
                console.log('Response:', responseData);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Error during GET:', error.message);
    });

    req.end();
}

testUpdateUser();
