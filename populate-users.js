#!/usr/bin/env node
/**
 * Populate users.json from existing database entries
 * This ensures all users who have made orders appear in User Management
 */

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, 'config');
const DATABASE_FILE = path.join(CONFIG_DIR, 'database.json');
const USERS_FILE = path.join(CONFIG_DIR, 'users.json');
const PAYMENTS_FILE = path.join(CONFIG_DIR, 'payment-transactions.json');

console.log('🔄 Starting user population from database...\n');

try {
    // Load database
    const dbData = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    const users = {};

    // Extract users from database groups
    Object.values(dbData.groups || {}).forEach(group => {
        (group.entries || []).forEach(entry => {
            const userId = entry.userId;
            
            if (!users[userId]) {
                users[userId] = {
                    phone: userId,
                    name: entry.userName || 'Unknown',
                    whatsappName: entry.userName || 'Unknown',
                    balance: 0,
                    totalDeposits: 0,
                    totalOrders: 0,
                    status: 'active',
                    joinedDate: entry.createdAt || new Date().toISOString()
                };
            }

            // Count approved orders
            if (entry.status === 'approved') {
                users[userId].totalOrders += 1;
            }

            // Update name if we have a better one
            if (entry.userName && entry.userName !== userId) {
                users[userId].whatsappName = entry.userName;
                users[userId].name = entry.userName;
            }

            // Update joined date to earliest
            if (new Date(entry.createdAt) < new Date(users[userId].joinedDate)) {
                users[userId].joinedDate = entry.createdAt;
            }
        });
    });

    // Add payment data if available
    if (fs.existsSync(PAYMENTS_FILE)) {
        try {
            const paymentsData = JSON.parse(fs.readFileSync(PAYMENTS_FILE, 'utf8'));
            const transactions = Array.isArray(paymentsData) ? paymentsData : (paymentsData.payments || []);
            
            transactions.forEach(trans => {
                const userId = trans.userId;
                if (users[userId] && trans.status === 'approved') {
                    users[userId].totalDeposits += trans.amount || 0;
                    users[userId].balance += trans.amount || 0;
                }
            });
        } catch (e) {
            console.warn('⚠️  Could not process payment transactions:', e.message);
        }
    }

    // Save to users.json
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    const userCount = Object.keys(users).length;
    console.log(`✅ Successfully populated users.json`);
    console.log(`📊 Total users found: ${userCount}\n`);
    
    console.log('👥 Users created:');
    Object.entries(users).forEach(([userId, userData]) => {
        console.log(`   • ${userData.whatsappName} (${userId}) - Orders: ${userData.totalOrders}, Balance: ${userData.balance}`);
    });

} catch (error) {
    console.error('❌ Error populating users:', error.message);
    process.exit(1);
}
