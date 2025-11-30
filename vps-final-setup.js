const { Client } = require('ssh2');

const conn = new Client();

conn.connect({
  host: '84.54.23.85',
  port: 22,
  username: 'root',
  password: '5qZY8Zp8YPe92Y6PN7i2vfw'
});

conn.on('ready', () => {
  console.log('✅ Connected to VPS!');
  
  const setupCmd = `
    apt-get remove -y npm 2>/dev/null || true;
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - 2>/dev/null || true;
    apt-get install -y nodejs 2>/dev/null || true;
    if [ ! -d "/root/diamond-bot" ]; then
      cd /root;
      git clone https://github.com/ajminac2026-blip/diamond-bot.git;
    fi;
    cd /root/diamond-bot;
    npm install;
    nohup node start-all.js > vps-logs.txt 2>&1 &
    sleep 3;
    ps aux | grep 'node.*start-all' | grep -v grep
  `;
  
  conn.exec(setupCmd, (err, stream) => {
    if (err) {
      console.error('Error executing command:', err);
      conn.end();
      return;
    }
    
    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    
    stream.on('close', (code) => {
      console.log('\n✅ VPS Setup Complete!');
      console.log('🌐 Admin Panel: http://84.54.23.85:3000');
      console.log('🤖 Bot API: http://84.54.23.85:3003');
      console.log('📋 Logs: /root/diamond-bot/vps-logs.txt');
      conn.end();
      process.exit(0);
    });
  });
});

conn.on('error', (err) => {
  console.error('❌ Connection Error:', err.message);
  process.exit(1);
});

console.log('🚀 Connecting to VPS at 84.54.23.85...');
