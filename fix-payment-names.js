// Fix payment names - Update userName field with actual WhatsApp names
const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');

const paymentsPath = path.join(__dirname, 'config', 'payments.json');

async function fixPaymentNames() {
    console.log('🔧 Starting payment names fix...\n');

    // Load payments
    const payments = JSON.parse(fs.readFileSync(paymentsPath, 'utf8'));
    console.log(`📋 Found ${payments.length} payment records\n`);

    // Initialize WhatsApp client
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: 'bot' }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    console.log('🚀 Initializing WhatsApp client...');

    client.on('qr', (qr) => {
        console.log('⚠️  WhatsApp already authenticated, no QR needed');
    });

    client.on('ready', async () => {
        console.log('✅ WhatsApp client ready!\n');
        console.log('🔄 Fetching actual names for all payments...\n');

        let updated = 0;
        let failed = 0;

        for (const payment of payments) {
            // Skip if userName doesn't look like a userId (already has actual name)
            if (!payment.userName.includes('@')) {
                console.log(`✓ Payment ${payment.id}: Already has name "${payment.userName}"`);
                continue;
            }

            try {
                // Fetch contact info
                const contact = await client.getContactById(payment.userId);
                const actualName = contact.pushname || contact.name || payment.userId;

                if (actualName !== payment.userId) {
                    console.log(`📝 Payment ${payment.id}: "${payment.userName}" → "${actualName}"`);
                    payment.userName = actualName;
                    updated++;
                } else {
                    console.log(`⚠️  Payment ${payment.id}: No name found, keeping userId`);
                    failed++;
                }
            } catch (error) {
                console.log(`❌ Payment ${payment.id}: Failed to fetch contact - ${error.message}`);
                failed++;
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Save updated payments
        fs.writeFileSync(paymentsPath, JSON.stringify(payments, null, 2));

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Migration Complete!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✓ Updated: ${updated}`);
        console.log(`⚠ Failed: ${failed}`);
        console.log(`📁 File: ${paymentsPath}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        await client.destroy();
        process.exit(0);
    });

    client.on('auth_failure', (msg) => {
        console.error('❌ Authentication failed:', msg);
        process.exit(1);
    });

    client.on('disconnected', (reason) => {
        console.log('⚠️  Client disconnected:', reason);
    });

    await client.initialize();
}

fixPaymentNames().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
