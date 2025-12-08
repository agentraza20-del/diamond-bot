const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// Store processing timers to track and cancel them if needed
const processingTimers = {};

// Format currency for display
function waFormatCurrency(amount) {
    return `৳${parseFloat(amount).toFixed(2)}`;
}

// Save payment transaction
function savePaymentTransaction(transaction) {
    try {
        const transPath = path.join(__dirname, '../config/payment-transactions.json');
        let transactions = [];
        
        if (fs.existsSync(transPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(transPath, 'utf8'));
                transactions = Array.isArray(data) ? data : (data.payments || []);
            } catch (e) {
                console.error('[PAYMENT TRANS] Error reading file:', e.message);
                transactions = [];
            }
        }
        
        transactions = transactions.filter(t => 
            t && t.userId && t.status && 
            (t.type === 'auto' || t.type === 'manual' || t.type === 'auto-deduction' || t.type === 'payment')
        );
        
        if (!transaction.id) {
            const maxId = transactions.reduce((max, t) => Math.max(max, t.id || 0), 0);
            transaction.id = maxId + 1;
        }
        
        transactions.push(transaction);
        fs.writeFileSync(transPath, JSON.stringify(transactions, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('[PAYMENT TRANS] Error saving transaction:', error.message);
        return false;
    }
}

// Get diamond status
function getDiamondStatus() {
    try {
        const statusPath = path.join(__dirname, '../config/diamond-status.json');
        if (fs.existsSync(statusPath)) {
            const data = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
            return data;
        }
        return { systemStatus: 'on', globalMessage: '' };
    } catch (error) {
        console.error('[AUTO-APPROVAL] Error reading status:', error);
        return { systemStatus: 'on', globalMessage: '' };
    }
}

// Deduct from admin diamond stock
function deductAdminDiamondStock(diamondCount) {
    try {
        const statusPath = path.join(__dirname, '../config/diamond-status.json');
        if (!fs.existsSync(statusPath)) {
            return { success: false, error: 'Status file not found' };
        }
        
        const data = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
        const currentStock = data.adminDiamondStock || 0;
        
        if (currentStock < diamondCount) {
            console.log(`[STOCK DEDUCTION] ❌ Insufficient stock! Current: ${currentStock}, Requested: ${diamondCount}`);
            return { 
                success: false, 
                error: `অ্যাডমিনের কাছে যথেষ্ট ডায়মন্ড নেই। স্টক: ${currentStock}💎`
            };
        }
        
        const newStock = currentStock - diamondCount;
        data.adminDiamondStock = newStock;
        data.lastStockDeduction = new Date().toISOString();
        
        fs.writeFileSync(statusPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[STOCK DEDUCTION] ✅ Stock updated: ${currentStock} → ${newStock}`);
        
        return { 
            success: true, 
            newStock: newStock,
            deducted: diamondCount
        };
    } catch (error) {
        console.error('[STOCK DEDUCTION] Error:', error);
        return { success: false, error: error.message };
    }
}

// Start auto-approval timer for an order
function startAutoApprovalTimer(groupId, orderId, entry, client) {
    try {
        const timerKey = `${groupId}_${orderId}`;
        
        console.log(`[AUTO-APPROVAL TIMER] ⏱️ Started for Order ${orderId} - Will approve in 2 minutes`);
        
        const timer = setTimeout(async () => {
            try {
                console.log(`[AUTO-APPROVAL] ⏳ 2 minutes elapsed for Order ${orderId}, auto-approving...`);
                
                // Get fresh entry from database
                const groupData = db.getGroupData(groupId);
                if (!groupData || !groupData.entries) {
                    console.log(`[AUTO-APPROVAL] Group data not found`);
                    delete processingTimers[timerKey];
                    return;
                }
                
                const currentEntry = groupData.entries.find(e => e.id === orderId);
                if (!currentEntry) {
                    console.log(`[AUTO-APPROVAL] Order not found`);
                    delete processingTimers[timerKey];
                    return;
                }
                
                // ❌ SECURITY: Don't approve if order was deleted or cancelled
                if (currentEntry.status === 'deleted' || currentEntry.status === 'cancelled') {
                    console.log(`[AUTO-APPROVAL] ⏹️ Order was ${currentEntry.status}, skipping auto-approval`);
                    delete processingTimers[timerKey];
                    return;
                }
                
                // Only auto-approve if still in processing state
                if (currentEntry.status !== 'processing') {
                    console.log(`[AUTO-APPROVAL] Order status is ${currentEntry.status}, not auto-approving`);
                    delete processingTimers[timerKey];
                    return;
                }
                
                // Deduct from admin diamond stock
                const stockResult = deductAdminDiamondStock(currentEntry.diamonds);
                if (!stockResult.success) {
                    console.log(`[AUTO-APPROVAL] ❌ Stock deduction failed:`, stockResult.error);
                    
                    // Revert to pending
                    currentEntry.status = 'pending';
                    currentEntry.stockError = stockResult.error;
                    db.saveDatabase(db.loadDatabase());
                    
                    delete processingTimers[timerKey];
                    return;
                }
                
                // Auto-deduct if balance >= order amount
                const orderAmount = currentEntry.diamonds * currentEntry.rate;
                const currentBalance = db.getUserBalance(currentEntry.userId);
                
                let autoDeductedAmount = 0;
                let finalBalance = currentBalance;
                let autoDeductMessage = '';
                
                if (currentBalance >= orderAmount && orderAmount > 0) {
                    autoDeductedAmount = orderAmount;
                    finalBalance = db.updateUserBalance(currentEntry.userId, -autoDeductedAmount);
                    
                    savePaymentTransaction({
                        userId: currentEntry.userId,
                        userName: currentEntry.userName,
                        groupId: groupId,
                        amount: autoDeductedAmount,
                        type: 'auto',
                        status: 'approved',
                        createdAt: new Date().toISOString(),
                        orderId: orderId
                    });
                    
                    console.log(`[AUTO-DEDUCT] ${currentEntry.userName}: ${waFormatCurrency(autoDeductedAmount)} deducted from balance`);
                    
                    autoDeductMessage = `\n\n⚡ *Auto-Deduction Applied*\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `Before: ${waFormatCurrency(currentBalance)}\n` +
                        `Deducted: ${waFormatCurrency(autoDeductedAmount)}\n` +
                        `After: ${waFormatCurrency(finalBalance)}`;
                } else if (currentBalance > 0 && currentBalance < orderAmount) {
                    autoDeductedAmount = currentBalance;
                    finalBalance = db.updateUserBalance(currentEntry.userId, -autoDeductedAmount);
                    
                    savePaymentTransaction({
                        userId: currentEntry.userId,
                        userName: currentEntry.userName,
                        groupId: groupId,
                        amount: autoDeductedAmount,
                        type: 'auto',
                        status: 'approved',
                        createdAt: new Date().toISOString(),
                        orderId: orderId
                    });
                    
                    console.log(`[AUTO-DEDUCT PARTIAL] ${currentEntry.userName}: ${waFormatCurrency(autoDeductedAmount)} partial deduction`);
                    
                    autoDeductMessage = `\n\n⚠️ *Partial Auto-Deduction Applied*\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `Balance: ${waFormatCurrency(currentBalance)}\n` +
                        `Deducted: ${waFormatCurrency(autoDeductedAmount)}\n` +
                        `Remaining Due: ${waFormatCurrency(orderAmount - autoDeductedAmount)}`;
                }
                
                // Change status to 'approved'
                db.approveEntry(groupId, orderId, 'System (Auto-Approval)');
                
                // Check if auto-approve message is disabled
                let shouldSendAutoApprovalMsg = true;
                try {
                    const fs = require('fs').promises;
                    const path = require('path');
                    const statusData = await fs.readFile(path.join(__dirname, '../config/diamond-status.json'), 'utf8');
                    const status = JSON.parse(statusData);
                    if (status.disableAutoApprovalMessage) {
                        shouldSendAutoApprovalMsg = false;
                        console.log('[AUTO-APPROVAL] Auto-approval message is DISABLED - not sending message');
                    }
                } catch (e) {
                    console.log('[AUTO-APPROVAL] Could not read settings, sending message by default');
                }
                
                // Send notification message (only if enabled)
                if (shouldSendAutoApprovalMsg) {
                    const notificationMsg = `✅ *Diamond Order AUTO-APPROVED*\n\n` +
                        `👤 User: ${currentEntry.userName}\n` +
                        `💎 Diamonds: ${currentEntry.diamonds}💎\n` +
                        `💰 Amount: ${waFormatCurrency(orderAmount)}\n` +
                        `Order ID: ${orderId}` +
                        autoDeductMessage;
                    
                    try {
                        if (client) {
                            await client.sendMessage(groupId, notificationMsg);
                            console.log(`[AUTO-APPROVAL] ✅ Approval message sent to group`);
                        }
                    } catch (sendErr) {
                        console.error(`[AUTO-APPROVAL] Failed to send approval message:`, sendErr.message);
                    }
                } else {
                    console.log('[AUTO-APPROVAL] Order auto-approved silently (no message sent)');
                }
                
                // 🔄 Broadcast order approval to admin panel in real-time
                if (global.broadcastOrderApproved) {
                    global.broadcastOrderApproved(
                        orderId,
                        `✅ Order auto-approved: ${currentEntry.diamonds}💎 from ${currentEntry.userName}`
                    );
                }
                
                // Notify admin panel
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);
                    
                    await fetch('http://localhost:3000/api/order-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'order-auto-approved',
                            groupId: groupId,
                            orderId: orderId,
                            entry: currentEntry,
                            autoDeductedAmount: autoDeductedAmount,
                            message: `🤖 Order ${orderId}: ${currentEntry.diamonds}💎 auto-approved`
                        }),
                        signal: controller.signal
                    }).catch(e => console.log('[AUTO-APPROVAL] Admin panel notification sent'));
                    
                    clearTimeout(timeoutId);
                } catch (notifyErr) {
                    console.error('[AUTO-APPROVAL] Failed to notify admin panel:', notifyErr.message);
                }
                
                console.log(`[AUTO-APPROVAL] ✅ Order ${orderId} auto-approved successfully`);
                delete processingTimers[timerKey];
                
            } catch (error) {
                console.error('[AUTO-APPROVAL ERROR]', error.message);
                delete processingTimers[timerKey];
            }
        }, 2 * 60 * 1000); // 2 minutes
        
        // Store timer reference for potential cancellation
        processingTimers[timerKey] = timer;
        
        return timer;
    } catch (error) {
        console.error('[AUTO-APPROVAL TIMER] Error starting timer:', error.message);
        return null;
    }
}

// Cancel auto-approval timer (called when admin deletes the "done" message)
function cancelAutoApprovalTimer(groupId, orderId) {
    try {
        const timerKey = `${groupId}_${orderId}`;
        
        if (processingTimers[timerKey]) {
            clearTimeout(processingTimers[timerKey]);
            console.log(`[AUTO-APPROVAL] ⏸️ Timer cancelled for Order ${orderId}`);
            delete processingTimers[timerKey];
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('[AUTO-APPROVAL CANCEL] Error:', error.message);
        return false;
    }
}

// Cancel all timers (useful for graceful shutdown)
function cancelAllTimers() {
    try {
        for (const [key, timer] of Object.entries(processingTimers)) {
            clearTimeout(timer);
            console.log(`[AUTO-APPROVAL] Cancelled timer: ${key}`);
        }
        Object.keys(processingTimers).forEach(key => delete processingTimers[key]);
        console.log(`[AUTO-APPROVAL] All timers cancelled`);
    } catch (error) {
        console.error('[AUTO-APPROVAL] Error cancelling timers:', error.message);
    }
}

// Check for stuck processing orders on startup (in case bot crashed)
function restoreProcessingTimers(client) {
    try {
        const database = db.loadDatabase();
        let restoredCount = 0;
        
        for (const [groupId, groupData] of Object.entries(database.groups || {})) {
            if (!groupData.entries) continue;
            
            for (const entry of groupData.entries) {
                if (entry.status === 'processing' && entry.processingStartedAt) {
                    const startTime = new Date(entry.processingStartedAt).getTime();
                    const now = Date.now();
                    const elapsedMs = now - startTime;
                    const totalTimeMs = 2 * 60 * 1000;
                    
                    if (elapsedMs < totalTimeMs) {
                        // Timer hasn't expired yet, restore it
                        const remainingMs = totalTimeMs - elapsedMs;
                        console.log(`[AUTO-APPROVAL RESTORE] Restoring timer for Order ${entry.id} with ${(remainingMs / 1000).toFixed(0)}s remaining`);
                        
                        const timer = setTimeout(async () => {
                            startAutoApprovalTimer(groupId, entry.id, entry, client);
                        }, remainingMs);
                        
                        const timerKey = `${groupId}_${entry.id}`;
                        processingTimers[timerKey] = timer;
                        restoredCount++;
                    } else {
                        // Timer has expired, auto-approve immediately
                        console.log(`[AUTO-APPROVAL RESTORE] Auto-approving expired Order ${entry.id}`);
                        startAutoApprovalTimer(groupId, entry.id, entry, client);
                    }
                }
            }
        }
        
        if (restoredCount > 0) {
            console.log(`[AUTO-APPROVAL] ✅ Restored ${restoredCount} processing timers`);
        }
    } catch (error) {
        console.error('[AUTO-APPROVAL RESTORE] Error:', error.message);
    }
}

module.exports = {
    startAutoApprovalTimer,
    cancelAutoApprovalTimer,
    cancelAllTimers,
    restoreProcessingTimers,
    processingTimers
};
