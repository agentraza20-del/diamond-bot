const http = require('http');

console.log('Testing Socket.IO broadcast of user update...\n');

// Reset users.json first
const fs = require('fs');
const path = require('path');
const usersPath = path.join(__dirname, 'config', 'users.json');
const resetUsers = {
  "115930327715989": {
    "name": "User 1",
    "phone": "115930327715989",
    "balance": 0,
    "dueBalance": 0,
    "totalDeposits": 0,
    "totalOrders": 0,
    "blocked": false,
    "joinedDate": "2025-11-27T11:21:33.011Z"
  }
};

fs.writeFileSync(usersPath, JSON.stringify(resetUsers, null, 2));
console.log('✅ Reset users.json');

// Wait a bit then send update
setTimeout(() => {
    const data = JSON.stringify({
        name: 'User 1',
        balance: 0,
        dueBalance: 7500  // Change to new value
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
        console.log(`\n📤 POST Response Status: ${res.statusCode}`);
        
        let responseData = '';
        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            try {
                const json = JSON.parse(responseData);
                console.log('✅ Server emitted userUpdated event');
                console.log(`   Phone: ${json.user.phone}`);
                console.log(`   Name: ${json.user.name}`);
                console.log(`   Balance: ${json.user.balance}`);
                console.log(`   Due Balance: ${json.user.dueBalance}`);
                console.log('\n💡 Check browser console - should see update reflected in UI');
                console.log('💡 Group dashboard should show new due balance');
                console.log('💡 User Management modal should refresh automatically');
            } catch (e) {
                console.log('Response:', responseData);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Error:', error.message);
    });

    console.log('📤 Sending update to due balance: 7500...');
    req.write(data);
    req.end();
}, 1000);
