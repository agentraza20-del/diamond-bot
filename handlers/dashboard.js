const db = require('../config/database');
const ledger = require('../utils/ledger');

function waFormatCurrency(amount) {
    return `৳${parseFloat(amount).toFixed(2)}`;
}

async function showWhatsAppDashboard(msg, userId, userName, groupId) {
    try {
        // Ensure we have valid groupId, use a default if not
        if (!groupId) {
            groupId = msg.from;
        }
        
        // Use msg.from.contact.pushname if available, otherwise use userName
        const displayName = msg.from?.contact?.pushname || userName || userId;
        
        // Get user data from ledger
        const balance = ledger.getUserBalance(userId);
        const totalDue = ledger.computeGroupApprovedDue(userId, groupId);
        const totalPaid = ledger.getPaidAmount(userId, groupId);
        const remainingDue = Math.max(0, totalDue - totalPaid);
        
        // Get last auto-deduction info
        const lastAutoDeduct = ledger.getLastAutoDeduction(userId, groupId);
        
        // Debug log
        console.log(`[DASHBOARD] User: ${userId}`);
        console.log(`[DASHBOARD] Balance: ৳${balance.toFixed(2)}`);
        console.log(`[DASHBOARD] Total Due: ৳${totalDue.toFixed(2)}`);
        console.log(`[DASHBOARD] Total Paid: ৳${totalPaid.toFixed(2)}`);
        console.log(`[DASHBOARD] Remaining Due: ৳${remainingDue.toFixed(2)}`);
        console.log(`[DASHBOARD] Last Auto-Deduct: ৳${lastAutoDeduct.amount.toFixed(2)}`);
        
        // Get group entries
        const groupData = db.getGroupData(groupId) || { entries: [], rate: 2.3 };
        const userEntries = groupData.entries ? groupData.entries.filter(e => e.userId === userId && e.status === 'approved') : [];
        
        // Get current rate
        const currentRate = groupData.rate || 2.3;
        
        // Build dashboard message
        let dashboard = `*💎 DIAMOND DASHBOARD*\n\n`;
        dashboard += `━━━━━━━━━━━━━━━━━\n`;
        dashboard += `👤 User: ${displayName}\n`;
        dashboard += `━━━━━━━━━━━━━━━━━\n\n`;
        
        // Calculate available balance
        const availableBalance = Math.max(0, balance - remainingDue);
        
        dashboard += `💰 *Your Balance*\n`;
        dashboard += `${waFormatCurrency(availableBalance)}\n\n`;
        
        dashboard += `━━━━━━━━━━━━━━━━━\n`;
        dashboard += `📊 *Payment Summary*\n`;
        dashboard += `━━━━━━━━━━━━━━━━━\n`;
        dashboard += `💵 Deposited: ${waFormatCurrency(balance)}\n`;
        dashboard += `📉 Due Balance: ${waFormatCurrency(remainingDue)}\n`;
        dashboard += `✅ Available: ${waFormatCurrency(availableBalance)}\n`;
        dashboard += `🧾 Total Paid: ${waFormatCurrency(totalPaid)}\n`;
        if (lastAutoDeduct.amount > 0) {
            dashboard += `⚡ Last Auto-Deduct: ${waFormatCurrency(lastAutoDeduct.amount)}\n`;
        }
        dashboard += `\n`;
        
        dashboard += `━━━━━━━━━━━━━━━━━\n`;
        dashboard += `📋 *ORDER SUMMARY*\n`;
        dashboard += `━━━━━━━━━━━━━━━━━\n`;
        
        if (userEntries.length === 0) {
            dashboard += `No orders yet\n\n`;
        } else {
            userEntries.forEach((entry, idx) => {
                const entryTotal = entry.diamonds * entry.rate;
                dashboard += `${idx + 1}. ${entry.diamonds}💎 @ ${waFormatCurrency(entry.rate)}/💎 = ${waFormatCurrency(entryTotal)}\n`;
            });
            dashboard += '\n';
        }
        
        dashboard += `━━━━━━━━━━━━━━━━━\n`;
        dashboard += `📈 *Current Rate*\n`;
        dashboard += `${waFormatCurrency(currentRate)} per 💎\n`;
        dashboard += `━━━━━━━━━━━━━━━━━\n`;
        
        await msg.reply(dashboard);
        return true;
    } catch (error) {
        console.error('Error showing dashboard:', error);
        await msg.reply('❌ Error loading dashboard. Please try again.');
        return false;
    }
}

module.exports = {
    showWhatsAppDashboard,
    waFormatCurrency
};
