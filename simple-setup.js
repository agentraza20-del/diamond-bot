const { Client } = require('ssh2');

const conn = new Client();
conn.connect({
  host: '84.54.23.85',
  port: 22,
  username: 'root',
  password: '5qZY8Zp8YPe92Y6PN7i2vfw'
});

conn.on('ready', () => {
  console.log('Connected! Running setup...');
  
  const cmd = \
  apt-get remove -y npm; 
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -; 
  apt-get install -y nodejs; 
  cd /root/diamond-bot || (cd /root && git clone https://github.com/ajminac2026-blip/diamond-bot.git && cd diamond-bot); 
  npm install; 
  nohup node start-all.js > vps-logs.txt 2>&1 & 
  sleep 3; 
  ps aux | grep node | grep -v grep
  \;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    stream.on('close', () => {
      console.log('\n✅ VPS Setup Started!');
      console.log('Admin Panel: http://84.54.23.85:3000');
      console.log('Bot API: http://84.54.23.85:3003');
      conn.end();
      process.exit(0);
    });
  });
});

conn.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});
