const { spawn } = require('child_process');
const path = require('path');

console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   💎 Diamond Bot - Starting All Services...           ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`);

let adminProcess = null;

// Start WhatsApp Bot
console.log('🤖 Starting WhatsApp Bot...\n');
const botProcess = spawn('node', ['index.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
});

// Start Admin Panel
setTimeout(() => {
    console.log('\n🌐 Starting Admin Panel Server...\n');
    adminProcess = spawn('node', ['server.js'], {
        cwd: path.join(__dirname, 'admin-panel'),
        stdio: 'inherit',
        shell: true
    });

    // Handle admin process exit
    adminProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.log(`\n❌ Admin Panel exited with code ${code}`);
            console.log('⚠️  Bot will continue without admin panel features\n');
        }
    });

    adminProcess.on('error', (err) => {
        console.error(`\n❌ Failed to start Admin Panel: ${err.message}`);
        console.log('⚠️  Bot will continue without admin panel features\n');
    });

    console.log('\n✅ Admin Panel: http://localhost:3000');
    console.log('✅ Admin API: http://localhost:3005');
    console.log('✅ Dashboard: http://localhost:3000/dashboard.html\n');
}, 3000); // Increased delay to 3 seconds

// Handle bot process exit
botProcess.on('exit', (code) => {
    console.log(`\n❌ WhatsApp Bot exited with code ${code}`);
    if (adminProcess) {
        adminProcess.kill();
    }
    process.exit(code);
});

botProcess.on('error', (err) => {
    console.error(`\n❌ Failed to start WhatsApp Bot: ${err.message}`);
    if (adminProcess) {
        adminProcess.kill();
    }
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down all services...');
    if (botProcess) {
        botProcess.kill();
    }
    if (adminProcess) {
        adminProcess.kill();
    }
    console.log('✅ All services stopped');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Received SIGTERM, shutting down...');
    if (botProcess) {
        botProcess.kill();
    }
    if (adminProcess) {
        adminProcess.kill();
    }
    process.exit(0);
});

console.log(`
📱 Main Bot: Starting...
🌐 Admin Panel: Will start in 2 seconds...

Press Ctrl+C to stop all services.
`);
