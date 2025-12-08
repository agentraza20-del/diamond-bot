// Simple script to check bot status
const http = require('http');

function checkBotStatus() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/bot-status',
            method: 'GET',
            timeout: 3000
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout - Bot API not responding'));
        });

        req.end();
    });
}

async function main() {
    console.log('🔍 Checking bot status...\n');
    
    try {
        const status = await checkBotStatus();
        console.log('✅ Bot API is responding:');
        console.log(`   Ready: ${status.ready ? '✅ YES' : '❌ NO'}`);
        console.log(`   Message: ${status.message}`);
        
        if (!status.ready) {
            console.log('\n⚠️  Bot is not ready.');
            console.log('   Check if you have:');
            console.log('   1. Started the bot with: node start-all.js');
            console.log('   2. Scanned the QR code in WhatsApp');
            console.log('   3. Waited for "Bot Ready" message\n');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('\n❌ Bot API is not responding!');
        console.log('   Make sure bot is running: node start-all.js\n');
    }
}

main();
