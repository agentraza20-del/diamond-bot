/**
 * Admin Panel Health Check
 * Check if admin panel server is running
 */

const http = require('http');

console.log('🔍 Checking Admin Panel status...\n');

// Check port 3005 (Socket.IO API)
const checkPort = (port, name) => {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}/`, (res) => {
            console.log(`✅ ${name} is running on port ${port}`);
            resolve(true);
        });

        req.on('error', (err) => {
            console.log(`❌ ${name} is NOT running on port ${port}`);
            console.log(`   Error: ${err.message}`);
            resolve(false);
        });

        req.setTimeout(3000, () => {
            req.destroy();
            console.log(`❌ ${name} timeout on port ${port}`);
            resolve(false);
        });
    });
};

(async () => {
    const port3005 = await checkPort(3005, 'Admin Panel API (Socket.IO)');
    const port3000 = await checkPort(3000, 'Admin Panel Web UI');

    console.log('\n' + '='.repeat(50));
    
    if (port3005 && port3000) {
        console.log('✅ Admin Panel is fully operational!');
        console.log('\n📱 Access URLs:');
        console.log('   - Dashboard: http://localhost:3000/dashboard.html');
        console.log('   - API Server: http://localhost:3005');
    } else if (port3005) {
        console.log('⚠️  Admin Panel API is running but Web UI is not');
        console.log('   Please check if both servers are started');
    } else {
        console.log('❌ Admin Panel is NOT running');
        console.log('\n💡 To start admin panel, run:');
        console.log('   node start-all.js');
        console.log('\n   OR manually:');
        console.log('   cd admin-panel');
        console.log('   node server.js');
    }
    
    console.log('='.repeat(50) + '\n');
})();
