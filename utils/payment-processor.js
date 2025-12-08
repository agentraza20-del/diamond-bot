const db = require('../config/database');
const ledger = require('./ledger');
const fs = require('fs');
const path = require('path');

const PAYMENT_TRANSACTIONS_FILE = path.join(__dirname, '../config/payment-transactions.json');

function loadPaymentTransactions() {
    try {
        return JSON.parse(fs.readFileSync(PAYMENT_TRANSACTIONS_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function savePaymentTransactions(transactions) {
    fs.writeFileSync(PAYMENT_TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
}

function addPaymentTransaction(userId, userName, groupId, amount) {
    const transactions = loadPaymentTransactions();
    const id = transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1;
    
    const transaction = {
        id,
        userId,
        userName,
        groupId,
        amount,
        type: 'manual',
        status: 'approved',
        createdAt: new Date().toISOString()
    };
    
    transactions.push(transaction);
    savePaymentTransactions(transactions);
    return transaction;
}

function waFormatCurrency(amount) {
    return `৳${parseFloat(amount).toFixed(2)}`;
}

async function processPaymentReceipt(userId, userName, groupId, amount) {
    try {
        // Get current balance
        const balanceBefore = ledger.getUserBalance(userId);
        
        // Add deposit to balance FIRST
        ledger.updateUserBalance(userId, amount);
        
        // Apply auto-deduction from balance (this will create 'auto' transactions)
        const result = ledger.applyAutoDeductionFromBalance(userId, userName);
        const autoDeductedAmount = result.deducted;
        const finalBalance = result.newBalance;
        
        // Record manual deposit transaction AFTER auto-deduction
        ledger.addTransaction({
            userId: userId,
            userName: userName,
            groupId: groupId,
            amount: amount,
            type: 'manual',
            status: 'approved'
        });
        
        const adminMessage = `✅ *Payment Processed*\n\n` +
            `User: ${userName}\n` +
            `Amount Received: ${waFormatCurrency(amount)}\n` +
            `Auto-Deducted for Due: ${waFormatCurrency(autoDeductedAmount)}\n` +
            `Remaining Balance: ${waFormatCurrency(finalBalance)}\n\n` +
            `Previous Balance: ${waFormatCurrency(balanceBefore)}\n` +
            `New Balance: ${waFormatCurrency(finalBalance)}`;
        
        const userMessage = `✅ *Payment Received*\n\n` +
            `Amount: ${waFormatCurrency(amount)}\n` +
            `Auto-Deducted for Dues: ${waFormatCurrency(autoDeductedAmount)}\n` +
            `Remaining Balance: ${waFormatCurrency(finalBalance)}\n\n` +
            `📊 Check your dashboard: /d`;
        
        return {
            success: true,
            adminMessage,
            userMessage,
            finalBalance: finalBalance,
            autoDeducted: autoDeductedAmount
        };
    } catch (error) {
        console.error('Error processing payment:', error);
        return {
            success: false,
            adminMessage: '❌ Error processing payment',
            userMessage: '❌ Error processing payment. Please try again.',
            error: error.message
        };
    }
}

module.exports = {
    processPaymentReceipt,
    waFormatCurrency,
    addPaymentTransaction,
    loadPaymentTransactions
};
