const qrcode = require('qrcode-terminal');
const fs = require('fs');

try {
    const code = fs.readFileSync('/root/diamond-bot/qr-code.txt', 'utf8');
    console.log('\n\n📱 SCAN THIS QR CODE WITH WHATSAPP:\n');
    qrcode.generate(code, { small: true });
    console.log('\n✅ QR Code displayed successfully!');
    console.log('Scan this with WhatsApp > Linked Devices > Link a Device\n');
} catch (err) {
    console.error('Error reading QR code:', err.message);
}
