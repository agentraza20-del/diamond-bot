const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const ledger = require('../utils/ledger');

function waFormatCurrency(amount) {
    return `৳${parseFloat(amount).toFixed(2)}`;
}


// Store pending deposits temporarily
const pendingDeposits = {};

async function handleDepositRequest(msg, userId, userName, amount) {
    try {
        // Validate deposit amount
        if (amount <= 0) {
            await msg.reply('❌ Invalid amount. Please send a positive number.');
            return { success: false, message: 'Invalid amount' };
        }

        if (amount > 100000) {
            await msg.reply('❌ Amount too large. Maximum deposit is ৳100,000.');
            return { success: false, message: 'Amount too large' };
        }

        // Create pending deposit record
        const depositId = `${userId}_${Date.now()}`;
        pendingDeposits[depositId] = {
            userId,
            userName,
            amount,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        const confirmationMsg = `⏳ *Deposit Pending Verification*\n\n` +
            `👤 User: ${userName}\n` +
            `💰 Amount: ${waFormatCurrency(amount)}\n\n` +
            `📸 Please take a screenshot of payment proof\n` +
            `and send it to admin for verification.\n\n` +
            `🔐 Deposit ID: ${depositId}`;

        await msg.reply(confirmationMsg);

        console.log(`[DEPOSIT REQUEST] ${userName}: ${waFormatCurrency(amount)} (ID: ${depositId})`);

        return {
            success: true,
            depositId,
            userId,
            amount,
            userName,
            message: `Deposit request created. Waiting for admin verification.`
        };
    } catch (error) {
        console.error('Error handling deposit request:', error);
        await msg.reply('❌ Error processing deposit request. Please try again.');
        return { success: false, message: error.message };
    }
}

async function handleDepositApproval(msg, amount, quotedUserId, userName, isAdminUser) {
    try {
        if (!isAdminUser) {
            await msg.reply('❌ Only admins can approve deposits.');
            return { success: false, message: 'Not admin' };
        }

        // Find and validate pending deposit
        let depositId = null;
        for (const [id, deposit] of Object.entries(pendingDeposits)) {
            if (deposit.userId === quotedUserId && deposit.amount === amount && deposit.status === 'pending') {
                depositId = id;
                break;
            }
        }

        if (!depositId) {
            await msg.reply(`❌ No pending deposit found for ${waFormatCurrency(amount)}`);
            return { success: false, message: 'Deposit not found' };
        }

        const deposit = pendingDeposits[depositId];

        // Add balance to user
        const balanceBefore = ledger.getUserBalance(quotedUserId);
        ledger.updateUserBalance(quotedUserId, amount);
        const balanceAfter = ledger.getUserBalance(quotedUserId);

        // Get group ID from message context
        const groupId = msg.from;

        // Apply auto-deduction FIRST (this creates auto-deduction transactions)
        const result = ledger.applyAutoDeductionFromBalance(quotedUserId, deposit.userName);
        const autoDeductedAmount = result.deducted;
        const finalBalance = result.newBalance;

        // Then record manual deposit transaction AFTER auto-deduction
        ledger.addTransaction({
            userId: quotedUserId,
            userName: deposit.userName,
            groupId: groupId,
            amount: amount,
            type: 'manual',
            status: 'approved'
        });

        // Mark deposit as completed
        pendingDeposits[depositId].status = 'completed';
        pendingDeposits[depositId].completedAt = new Date().toISOString();

        let adminMsg = `✅ *Deposit Approved*\n\n` +
            `👤 User: ${deposit.userName}\n` +
            `💰 Amount: ${waFormatCurrency(amount)}\n` +
            `✓ Status: Verified & Processed\n\n` +
            `━━━━━━━━━━━━━━━━━\n` +
            `💼 *Balance Updated*\n` +
            `━━━━━━━━━━━━━━━━━\n` +
            `Previous: ${waFormatCurrency(balanceBefore)}\n` +
            `Deposited: ${waFormatCurrency(amount)}\n` +
            `New Balance: ${waFormatCurrency(finalBalance)}`;
            
        if (autoDeductedAmount > 0) {
            adminMsg += `\n\n⚡ *Auto-Deduction Applied*\n` +
                `━━━━━━━━━━━━━━━━━\n` +
                `Due Amount: ${waFormatCurrency(autoDeductedAmount)}\n` +
                `Status: ✅ Automatically Deducted\n` +
                `Final Balance: ${waFormatCurrency(finalBalance)}`;
        }

        let userMsg = `✅ *Deposit Approved*\n\n` +
            `Your deposit of ${waFormatCurrency(amount)} has been verified!\n\n` +
            `💼 *Your New Balance*\n` +
            `${waFormatCurrency(finalBalance)}\n\n`;
            
        if (autoDeductedAmount > 0) {
            userMsg += `⚡ *Auto-Deduction Applied*\n` +
                `━━━━━━━━━━━━━━━━━\n` +
                `Your pending due of ${waFormatCurrency(autoDeductedAmount)} has been automatically paid!\n` +
                `Remaining Balance: ${waFormatCurrency(finalBalance)}\n\n`;
        }
        
        userMsg += `📊 Check your dashboard: /d`;

        return {
            success: true,
            depositId,
            amount,
            balanceBefore,
            balanceAfter: finalBalance,
            autoDeductedAmount,
            adminMessage: adminMsg,
            userMessage: userMsg,
            message: 'Deposit approved successfully'
        };
    } catch (error) {
        console.error('Error approving deposit:', error);
        return { success: false, message: error.message };
    }
}

async function handleBalanceQuery(msg, userId, userName) {
    try {
        const balance = db.getUserBalance(userId);

        const balanceMsg = `*💰 YOUR BALANCE*\n\n` +
            `👤 Name: ${userName}\n` +
            `💵 Current Balance: ${waFormatCurrency(balance)}\n\n` +
            `━━━━━━━━━━━━━━━━━\n` +
            `💡 How balance works:\n` +
            `━━━━━━━━━━━━━━━━━\n` +
            `• Automatically pays your dues first\n` +
            `• Extra balance is kept for next purchases\n` +
            `• Check dashboard with /d\n\n` +
            `📝 To deposit:\n` +
            `Send any amount (e.g., 500)`;

        await msg.reply(balanceMsg);
        return true;
    } catch (error) {
        console.error('Error showing balance:', error);
        await msg.reply('❌ Error loading balance.');
        return false;
    }
}

async function showPendingDeposits(msg) {
    try {
        const pending = Object.values(pendingDeposits).filter(d => d.status === 'pending');

        if (pending.length === 0) {
            await msg.reply('✅ No pending deposits to verify!');
            return true;
        }

        let message = `*⏳ PENDING DEPOSITS VERIFICATION*\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;

        pending.forEach((deposit, idx) => {
            message += `${idx + 1}. ${deposit.userName}\n`;
            message += `   Amount: ${waFormatCurrency(deposit.amount)}\n`;
            message += `   ID: ${deposit.userId.slice(0, 10)}...\n\n`;
        });

        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `Total Pending: ${pending.length}\n`;
        message += `Total Amount: ${waFormatCurrency(pending.reduce((sum, d) => sum + d.amount, 0))}\n\n`;
        message += `✅ Reply with "amount//rcv" to approve\n`;
        message += `(e.g., 500//rcv to approve ৳500 deposit)`;

        await msg.reply(message);
        return true;
    } catch (error) {
        console.error('Error showing pending deposits:', error);
        await msg.reply('❌ Error loading pending deposits.');
        return false;
    }
}

async function getDepositStats() {
    try {
        const completed = Object.values(pendingDeposits).filter(d => d.status === 'completed');
        
        let totalDeposited = 0;
        let totalUsers = new Set();

        completed.forEach(deposit => {
            totalDeposited += deposit.amount;
            totalUsers.add(deposit.userId);
        });

        return {
            totalDeposited,
            userCount: totalUsers.size,
            totalDeposits: completed.length,
            pendingCount: Object.values(pendingDeposits).filter(d => d.status === 'pending').length
        };
    } catch (error) {
        console.error('Error getting deposit stats:', error);
        return null;
    }
}

async function showDepositStats(msg) {
    try {
        const stats = await getDepositStats();
        
        if (!stats || stats.totalDeposits === 0) {
            await msg.reply('📊 No deposits yet.');
            return;
        }

        let message = `*💰 DEPOSIT STATISTICS*\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `Total Deposited: ${waFormatCurrency(stats.totalDeposited)}\n`;
        message += `Verified Deposits: ${stats.totalDeposits}\n`;
        message += `Unique Users: ${stats.userCount}\n`;
        message += `Pending: ${stats.pendingCount}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━`;

        await msg.reply(message);
        return true;
    } catch (error) {
        console.error('Error showing deposit stats:', error);
        await msg.reply('❌ Error loading statistics.');
        return false;
    }
}

module.exports = {
    handleDepositRequest,
    handleDepositApproval,
    handleBalanceQuery,
    showPendingDeposits,
    getDepositStats,
    showDepositStats,
    pendingDeposits,
    waFormatCurrency
};
