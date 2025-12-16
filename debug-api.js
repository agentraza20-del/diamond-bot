// Debug script to check what admin panel API returns
const http = require('http');

console.log('🔍 Fetching orders from Admin Panel API...\n');

const options = {
    hostname: 'localhost',
    port: 3005,
    path: '/api/orders',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const orders = JSON.parse(data);
            console.log(`📊 Total orders from API: ${orders.length}\n`);
            
            if (orders.length > 0) {
                const firstOrder = orders[0];
                console.log('📦 First Order Details:');
                console.log('   Order ID:', firstOrder.id);
                console.log('   User Name:', firstOrder.userName);
                console.log('   User ID:', firstOrder.userId);
                console.log('   Player ID:', firstOrder.playerId);
                console.log('   Player ID Number:', firstOrder.playerIdNumber);
                console.log('   Phone:', firstOrder.phone);
                console.log('   Diamonds:', firstOrder.diamonds);
                console.log('   Status:', firstOrder.status);
                console.log('\n✅ All fields in API response:');
                Object.keys(firstOrder).forEach(key => {
                    console.log(`   ${key}: ${firstOrder[key]}`);
                });
            }
        } catch (error) {
            console.error('❌ Error parsing response:', error.message);
            console.log('Raw response:', data.substring(0, 500));
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    console.log('💡 Make sure admin panel is running: node admin-panel/server.js');
});

req.end();
