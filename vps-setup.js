const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();

const config = {
  host: '84.54.23.85',
  port: 22,
  username: 'root',
  password: '5qZY8Zp8YPe92Y6PN7i2vfw'
};

const commands = [
  'apt-get update -y',
  'apt-get install -y curl wget git nodejs npm',
  'cd /root && git clone https://github.com/ajminac2026-blip/diamond-bot.git',
  'cd /root/diamond-bot && npm install',
  'cd /root/diamond-bot && nohup node start-all.js > vps-logs.txt 2>&1 &',
  'sleep 5 && ps aux | grep node'
];

let cmdIndex = 0;

function executeCommand(cmd) {
  console.log(`\n▶ Running: ${cmd}`);
  
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(`✗ Error: ${err.message}`);
      return;
    }
    
    let output = '';
    stream.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    stream.on('close', (code) => {
      console.log(`✓ Command completed (exit code: ${code})`);
      cmdIndex++;
      
      if (cmdIndex < commands.length) {
        setTimeout(() => executeCommand(commands[cmdIndex]), 3000);
      } else {
        console.log('\n✅ VPS Setup Complete!');
        console.log('📍 Your Diamond Bot is now running on:');
        console.log('   🌐 Admin Panel: http://84.54.23.85:3000');
        console.log('   🤖 Bot API: http://84.54.23.85:3003');
        conn.end();
        process.exit(0);
      }
    });
  });
}

conn.on('ready', () => {
  console.log('✅ Connected to VPS!');
  executeCommand(commands[0]);
});

conn.on('error', (err) => {
  console.error('❌ Connection Error:', err.message);
  process.exit(1);
});

console.log('🚀 Connecting to VPS at 84.54.23.85...');
conn.connect(config);
