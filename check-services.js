#!/usr/bin/env node

// Check bot and services status

const http = require('http');

console.log('\n🔍 SERVICES STATUS CHECK\n');
console.log('='.repeat(60));

async function checkService(name, port, path = '/') {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}${path}`, { timeout: 3000 }, (res) => {
            resolve({ name, port, status: 'RUNNING ✅', statusCode: res.statusCode });
        });
        
        req.on('error', (err) => {
            resolve({ name, port, status: 'DOWN ❌', error: err.code });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({ name, port, status: 'TIMEOUT ⏱️', error: 'No response' });
        });
    });
}

(async () => {
    const results = await Promise.all([
        checkService('Admin Panel', 3000, '/api/stats'),
        checkService('Bot API', 3001, '/api/bot-status')
    ]);
    
    results.forEach(r => {
        console.log(`${r.name} (Port ${r.port}): ${r.status}`);
        if (r.error) console.log(`  Error: ${r.error}`);
    });
    
    console.log('='.repeat(60));
    console.log('\n📌 WHAT TO DO:');
    
    const allRunning = results.every(r => r.status.includes('✅'));
    
    if (allRunning) {
        console.log('   ✅ All services running!');
        console.log('\n   Next steps:');
        console.log('   1. Send a test order to the WhatsApp group');
        console.log('   2. Check admin panel Pending Orders');
        console.log('   3. If still not showing, check bot logs');
    } else {
        console.log('   ❌ Some services are not running!');
        console.log('\n   Fix: Run "node start-all.js" to start all services');
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
})();
