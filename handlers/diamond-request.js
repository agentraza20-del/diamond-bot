const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// Convert Bengali numbers to English
function convertBengaliToEnglish(text) {
    if (!text) return text;
    
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    let result = text.toString();
    for (let i = 0; i < 10; i++) {
        result = result.replace(new RegExp(bengaliDigits[i], 'g'), englishDigits[i]);
    }
    return result;
}

function waFormatCurrency(amount) {
    return `৳${parseFloat(amount).toFixed(2)}`;
}

// Get diamond status
function getDiamondStatus() {
    try {
        const statusPath = path.join(__dirname, '../config/diamond-status.json');
        if (fs.existsSync(statusPath)) {
            const data = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
            return data;
        }
        return { systemStatus: 'on', globalMessage: '', groupSettings: {}, adminDiamondStock: 0 };
    } catch (error) {
        console.error('[DIAMOND STATUS] Error reading status:', error);
        return { systemStatus: 'on', globalMessage: '', groupSettings: {}, adminDiamondStock: 0 };
    }
}

// Update diamond stock after order approval
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
                error: `অ্যাডমিনের কাছে যথেষ্ট ডায়মন্ড নেই। স্টক: ${currentStock}💎`,
                currentStock: currentStock,
                requested: diamondCount
            };
        }
        
        const newStock = currentStock - diamondCount;
        data.adminDiamondStock = newStock;
        data.lastStockDeduction = new Date().toISOString();
        
        // Save updated stock
        fs.writeFileSync(statusPath, JSON.stringify(data, null, 2), 'utf8');
        
        console.log(`[STOCK DEDUCTION] ✅ Stock updated: ${currentStock} → ${newStock} (Deducted: ${diamondCount}💎)`);
        
        // If stock is now 0, auto-OFF the system
        if (newStock === 0) {
            console.log(`[STOCK DEDUCTION] ⚠️ Stock depleted! Auto-OFF system...`);
            data.systemStatus = 'off';
            data.globalMessage = 'স্টক শেষ হয়ে গেছে। শীঘ্রই ফিরে আসবে। ধন্যবাদ!';
            data.autoOffAt = new Date().toISOString();
            fs.writeFileSync(statusPath, JSON.stringify(data, null, 2), 'utf8');
            
            // Notify admin panel to broadcast OFF message
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                fetch('http://127.0.0.1:3005/api/diamond-status/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ systemStatus: 'off' }),
                    signal: controller.signal
                }).catch(err => console.error('[AUTO-OFF] Failed to notify admin panel:', err.message));
                
                clearTimeout(timeoutId);
            } catch (err) {
                console.error('[AUTO-OFF] Error triggering OFF:', err.message);
            }
            
            return { 
                success: true, 
                newStock: newStock,
                stockDepleted: true,
                message: 'Stock depleted - system auto-OFF'
            };
        }
        
        return { 
            success: true, 
            newStock: newStock,
            stockDepleted: false,
            deducted: diamondCount
        };
    } catch (error) {
        console.error('[STOCK DEDUCTION] Error deducting stock:', error);
        return { success: false, error: error.message };
    }
}

// Get message for group
function getGroupMessage(groupId) {
    const status = getDiamondStatus();
    if (status.groupSettings && status.groupSettings[groupId]?.message) {
        return status.groupSettings[groupId].message;
    }
    return status.globalMessage;
}

// Safe function to write payment transactions with validation
function savePaymentTransaction(transaction) {
    try {
        // Validate transaction has required fields
        if (!transaction.userId || !transaction.groupId || !transaction.amount) {
            console.error('[PAYMENT TRANS] Invalid transaction - missing required fields:', transaction);
            return false;
        }
        
        // Ensure type is set
        if (!transaction.type) {
            transaction.type = 'payment'; // Default type
        }
        
        const transPath = path.join(__dirname, '../config/payment-transactions.json');
        let transactions = [];
        
        // Load existing transactions
        if (fs.existsSync(transPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(transPath, 'utf8'));
                transactions = Array.isArray(data) ? data : (data.payments || []);
            } catch (e) {
                console.error('[PAYMENT TRANS] Error reading file, starting fresh:', e.message);
                transactions = [];
            }
        }
        
        // Filter out any invalid entries before adding new one
        transactions = transactions.filter(t => 
            t && t.userId && t.status && 
            (t.type === 'auto' || t.type === 'manual' || t.type === 'auto-deduction' || t.type === 'payment')
        );
        
        // Generate ID if not present
        if (!transaction.id) {
            const maxId = transactions.reduce((max, t) => Math.max(max, t.id || 0), 0);
            transaction.id = maxId + 1;
        }
        
        // Add new transaction
        transactions.push(transaction);
        
        // Write back to file
        fs.writeFileSync(transPath, JSON.stringify(transactions, null, 2), 'utf8');
        console.log('[PAYMENT TRANS] ✅ Transaction saved:', { 
            userId: transaction.userId,
            amount: transaction.amount,
            type: transaction.type 
        });
        return true;
    } catch (e) {
        console.error('[PAYMENT TRANS] Error saving transaction:', e.message);
        return false;
    }
}

// Store pending diamond requests (ID + diamonds, waiting for admin approval)
const pendingDiamondRequests = {};

// Store pending user IDs for two-message flow (ID sent, waiting for diamonds)
const pendingUserIds = {};

// 🔍 COMPLETE Missing Order Detection & Recovery System
// Step 1: Check WhatsApp messages (last 10) → If not in Database, add to pending
// Step 2: Check Database orders → If not in Admin Panel, recover
async function checkAndRecoverMissingOrders(chat, groupId, userId, userName, groupName) {
    try {
        // ✅ Check if "start" timestamp is set - only check orders after this time
        const startTimestamp = db.getStartTimestamp(groupId);
        if (startTimestamp) {
            const startTime = new Date(startTimestamp).getTime();
            console.log(`[MISSING ORDER] ✅ Start timestamp found: ${new Date(startTime).toLocaleString()}`);
            console.log(`[MISSING ORDER] 📌 Will only check orders AFTER this time`);
        }
        
        console.log(`[MISSING ORDER] 🔍 Step 1: Fetching last 10 WhatsApp messages for user ${userId}`);
        
        // STEP 1: Get last 10 messages from WhatsApp
        const messages = await chat.fetchMessages({ limit: 10 });
        const whatsappOrders = [];
        
        // Parse WhatsApp messages to find diamond orders
        for (const waMsg of messages) {
            // Only this user's messages
            if (waMsg.author !== userId && waMsg.from !== userId) continue;
            
            const body = waMsg.body?.trim() || '';
            if (!body) continue;

            // Parse order (multi-line or single-line)
            const lines = body.split('\n').map(l => l.trim()).filter(l => l);
            let diamonds = null;
            let playerId = null;

            if (lines.length >= 2) {
                playerId = lines[0];
                const diamondsStr = convertBengaliToEnglish(lines[1]);
                diamonds = parseInt(diamondsStr);
            } else {
                const diamondsStr = convertBengaliToEnglish(body);
                diamonds = parseInt(diamondsStr);
            }

            // Valid diamond order (1-100000)
            if (!isNaN(diamonds) && diamonds > 0 && diamonds <= 100000) {
                const orderTime = waMsg.timestamp * 1000;
                
                // ✅ Skip orders before "start" timestamp
                if (startTimestamp) {
                    const startTime = new Date(startTimestamp).getTime();
                    if (orderTime < startTime) {
                        console.log(`[MISSING ORDER] ⏭️ Skipping order from ${new Date(orderTime).toLocaleString()} (before start time)`);
                        continue;
                    }
                }
                
                whatsappOrders.push({
                    messageId: waMsg.id._serialized,  // ✅ FIXED: Use _serialized to match database
                    diamonds: diamonds,
                    playerId: playerId,
                    timestamp: orderTime,
                    body: body
                });
            }
        }

        console.log(`[MISSING ORDER] 📱 Found ${whatsappOrders.length} diamond orders in WhatsApp chat`);

        // STEP 2: Check which WhatsApp orders are NOT in Database
        for (const waOrder of whatsappOrders) {
            // Re-fetch database for each order to get latest state
            const freshGroupData = db.getGroupData(groupId);
            const databaseOrders = freshGroupData?.entries || [];
            
            // Check if this WhatsApp order exists in Database (by messageId ONLY)
            const existsInDb = databaseOrders.find(e => e.messageId === waOrder.messageId);

            if (!existsInDb) {
                // NOT in Database → Add as recovered/missing order
                console.log(`[MISSING ORDER] 🆕 WhatsApp order NOT in Database!`);
                console.log(`[MISSING ORDER]    Diamonds: ${waOrder.diamonds}💎`);
                console.log(`[MISSING ORDER]    Timestamp: ${new Date(waOrder.timestamp).toLocaleString()}`);
                console.log(`[MISSING ORDER]    Adding to Database & sending to Admin Panel...`);

                const rate = freshGroupData.rate || 2.3;
                const newOrderId = waOrder.timestamp; // Use WA timestamp as ID

                // Create proper entry using db.addEntry() with correct parameters
                const newEntry = db.addEntry(
                    groupId,           // groupId
                    userId,            // userId
                    waOrder.diamonds,  // diamonds
                    rate,              // rate
                    groupName,         // groupName
                    waOrder.messageId, // messageId
                    userName,          // userName
                    waOrder.playerId   // userIdFromMsg
                );
                
                // Mark as recovered from WhatsApp
                newEntry.recoveredFromWhatsApp = true;
                
                console.log(`[MISSING ORDER] ✅ Added to Database as Order ${newEntry.id}`);

                // Send to Admin Panel
                try {
                    await fetch('http://127.0.0.1:3005/api/order-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventType: 'missing-order-recovery',
                            data: newEntry
                        }),
                        signal: AbortSignal.timeout(3000)
                    });
                    console.log(`[MISSING ORDER] ✅ Sent to Admin Panel`);
                } catch (error) {
                    console.error(`[MISSING ORDER] ❌ Failed to send to Admin Panel:`, error.message);
                }
            }
        }

        // STEP 3: Check Database orders vs Admin Panel
        console.log(`[MISSING ORDER] 🗄️ Step 3: Checking Database vs Admin Panel`);
        
        // Get fresh database state for Step 3
        const finalGroupData = db.getGroupData(groupId);
        const allOrders = finalGroupData?.entries || [];
        
        const userDbOrders = allOrders
            .filter(e => e.userId === userId)
            .sort((a, b) => b.id - a.id)
            .slice(1, 11); // Skip current order, check previous 10

        console.log(`[MISSING ORDER] 📋 Checking ${userDbOrders.length} Database orders in Admin Panel`);

        // Check Admin Panel for each Database order
        for (const dbOrder of userDbOrders) {
            console.log(`[MISSING ORDER] 🔎 Checking Order ${dbOrder.id} (${dbOrder.diamonds}💎, status: ${dbOrder.status})`);
            
            try {
                const response = await fetch('http://127.0.0.1:3005/api/check-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        orderId: dbOrder.id,
                        groupId: groupId,
                        userId: dbOrder.userId,
                        diamonds: dbOrder.diamonds
                    }),
                    signal: AbortSignal.timeout(2000)
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const result = await response.json();
                
                if (result.missing && !result.exists) {
                    // ❌ Order in Database but NOT in Admin Panel → MISSING!
                    console.log(`[MISSING ORDER] 🚨 MISSING ORDER DETECTED!`);
                    console.log(`[MISSING ORDER]    Order ID: ${dbOrder.id}`);
                    console.log(`[MISSING ORDER]    Diamonds: ${dbOrder.diamonds}💎`);
                    console.log(`[MISSING ORDER]    Status in DB: ${dbOrder.status}`);
                    console.log(`[MISSING ORDER]    Recovering to Admin Panel...`);
                    
                    // Re-send to Admin Panel with pending_missing status
                    await fetch('http://127.0.0.1:3005/api/order-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventType: 'missing-order-recovery',
                            data: {
                                entryId: dbOrder.id,
                                userId: dbOrder.userId,
                                userName: dbOrder.userName || userId,
                                userIdFromMsg: dbOrder.userIdFromMsg || '',
                                groupId: groupId,
                                groupName: dbOrder.groupName || groupName,
                                diamonds: dbOrder.diamonds,
                                amount: dbOrder.amount || (dbOrder.diamonds * 2.3),
                                rate: dbOrder.rate || 2.3,
                                status: 'pending',
                                recoveredAt: new Date().toISOString(),
                                originalTimestamp: dbOrder.timestamp,
                                originalStatus: dbOrder.status,
                                messageId: dbOrder.messageId
                            }
                        }),
                        signal: AbortSignal.timeout(3000)
                    });

                    console.log(`[MISSING ORDER] ✅ Order ${dbOrder.id} recovered to Admin Panel`);
                } else if (result.exists) {
                    console.log(`[MISSING ORDER] ✓ Order ${dbOrder.id} exists in Admin Panel (Status: ${result.order?.status || 'unknown'})`);
                }
            } catch (error) {
                console.error(`[MISSING ORDER] ❌ Error checking order ${dbOrder.id}:`, error.message);
            }
        }

        console.log(`[MISSING ORDER] ✅ Missing order check completed`);
    } catch (error) {
        console.error(`[MISSING ORDER] ❌ Error in missing order system:`, error);
    }
}

async function handleMultiLineDiamondRequest(msg, userId, userName, groupId, fullMessage, groupName) {
    try {
        // Check if diamond system is ON
        const diamondStatus = getDiamondStatus();
        if (diamondStatus.systemStatus === 'off') {
            const message = getGroupMessage(groupId);
            await msg.reply(`❌ *Diamond Requests Currently OFF*\n\n${message || 'Diamond requests are not available right now. Please contact admin.'}`);
            return false;
        }

        // Parse multi-line format: Line 1 = ID/Phone, Line 2 = Diamonds
        const lines = fullMessage.trim().split('\n').map(l => l.trim()).filter(l => l);
        
        if (lines.length < 2) {
            // If not multi-line, treat as single number (old format)
            // Convert Bengali numbers to English if needed
            const diamondsStrEnglish = convertBengaliToEnglish(fullMessage.trim());
            const diamonds = parseInt(diamondsStrEnglish);
            if (!isNaN(diamonds)) {
                return await handleDiamondRequest(msg, userId, userName, groupId, diamonds, groupName);
            }
            return false;
        }

        const userIdFromMsg = lines[0];
        const diamondsStr = lines[1];
        // Convert Bengali numbers to English if needed
        const diamondsStrEnglish = convertBengaliToEnglish(diamondsStr);
        const diamonds = parseInt(diamondsStrEnglish);

        // Validate
        if (isNaN(diamonds) || diamonds <= 0) {
            await msg.reply('❌ Invalid diamond amount. Format: ID\\nDiamonds');
            return false;
        }

        // Check if number is suspiciously large (likely a phone number - silently ignore)
        if (diamonds > 1000000) {
            return false;
        }

        if (diamonds > 100000) {
            await msg.reply('❌ Diamond amount too large. Maximum is 100,000 diamonds.');
            return false;
        }

        // Check admin stock availability BEFORE creating order
        const currentStock = diamondStatus.adminDiamondStock || 0;
        if (currentStock < diamonds) {
            await msg.reply(
                `❌ *অ্যাডমিনের কাছে যথেষ্ট ডায়মন্ড নেই*\n\n` +
                `আপনি চেয়েছেন: ${diamonds}💎\n` +
                `স্টকে আছে: ${currentStock}💎\n\n` +
                `আপনি সর্বোচ্চ ${currentStock}💎 অর্ডার দিতে পারবেন।`
            );
            console.log(`[INSUFFICIENT STOCK] User requested ${diamonds}💎 but only ${currentStock}💎 available`);
            return false;
        }

        // Create pending request (silent, no response yet)
        const requestId = `${userId}_${Date.now()}`;
        
        // Get group rate for currency calculation
        const groupData = db.getGroupData(groupId);
        const rate = groupData.rate || 2.3;
        
        pendingDiamondRequests[requestId] = {
            userId,
            userIdFromMsg,
            userName,
            groupId,
            diamonds,
            status: 'pending_approval',
            createdAt: new Date().toISOString(),
            msgObj: msg
        };

        // ALSO save to database so it can be found by approval handler
        const entry = db.addEntry(groupId, userId, diamonds, rate, groupName, msg.id._serialized, userName, userIdFromMsg);
        
        console.log(`[PENDING DIAMOND] Entry saved to DB:`, {
            id: entry.id,
            userId: entry.userId,
            status: entry.status,
            diamonds: entry.diamonds,
            groupId: groupId,
            groupName: groupName,
            messageId: entry.messageId
        });

        // 🔍 NEW Missing Order System: Check WhatsApp → Database → Admin Panel
        setImmediate(async () => {
            try {
                const chat = await msg.getChat();
                await checkAndRecoverMissingOrders(chat, groupId, userId, userName, groupName);
            } catch (err) {
                console.error('[MISSING ORDER] ❌ Background check failed:', err);
            }
        });

        // Notify admin panel in real-time - with retry and timeout handling
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            const response = await fetch('http://127.0.0.1:3005/api/order-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'new-order',
                    data: {
                        entryId: entry.id,
                        userId: userId,
                        userName: userName,
                        groupId: groupId,
                        diamonds: diamonds,
                        amount: diamonds * rate,
                        status: 'pending'
                    }
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                console.log('[NOTIFY ADMIN] ✅ New order notified to admin panel on port 3005');
            } else {
                console.log('[NOTIFY ADMIN] ⚠️ Admin panel returned status:', response.status);
            }
        } catch (notifyErr) {
            console.warn('[NOTIFY ADMIN] ℹ️ Failed to reach admin panel HTTP:', notifyErr.message);
            // This is expected when admin panel is disconnected - order is in database, will be pulled on reconnect
        }

        // No response to user - wait for admin approval
        console.log(`[PENDING DIAMOND] ${userName} (${userIdFromMsg}): ${diamonds}💎 - Waiting for admin approval`);
        console.log(`[PENDING DIAMOND] Stored with userId: ${userId}, groupId: ${groupId}`);
        console.log(`[PENDING DIAMOND] DB Entry ID: ${entry.id}`);

        return true;
    } catch (error) {
        console.error('Error handling multi-line diamond request:', error);
        await msg.reply('❌ Error processing request. Format: ID\\nDiamonds');
        return false;
    }
}

async function handleDiamondRequest(msg, userId, userName, groupId, diamonds, groupName) {
    try {
        // ✅ Import duplicate detector and feature toggles
        const { isDuplicateOrder, markOrderSentToAdmin } = require('../utils/duplicate-detector');
        const FeatureToggleManager = require('../utils/feature-toggle-manager');

        // Check if diamond system is ON
        const diamondStatus = getDiamondStatus();
        if (diamondStatus.systemStatus === 'off') {
            const message = getGroupMessage(groupId);
            await msg.reply(`❌ *Diamond Requests Currently OFF*\n\n${message || 'Diamond requests are not available right now. Please contact admin.'}`);
            return false;
        }

        // Validate diamond amount
        if (diamonds <= 0) {
            await msg.reply('❌ Invalid diamond amount. Please send a positive number.');
            return false;
        }

        // Check if number is suspiciously large (likely a phone number - silently ignore)
        if (diamonds > 1000000) {
            return false;
        }

        if (diamonds > 100000) {
            await msg.reply('❌ Diamond amount too large. Maximum is 100,000 diamonds.');
            return false;
        }

        // 🔍 CHECK FOR DUPLICATE ORDER (if enabled)
        if (FeatureToggleManager.isDuplicateDetectionEnabled()) {
            const duplicateCheck = isDuplicateOrder(groupId, userId, diamonds, msg.id._serialized);
            if (duplicateCheck.isDuplicate) {
                console.log(`[DUPLICATE ORDER] ${duplicateCheck.reason} - ${duplicateCheck.message}`);
                await msg.reply(duplicateCheck.message);
                return false;
            }
        }

        // Check admin stock availability BEFORE creating order
        const currentStock = diamondStatus.adminDiamondStock || 0;
        if (currentStock < diamonds) {
            await msg.reply(
                `❌ *অ্যাডমিনের কাছে যথেষ্ট ডায়মন্ড নেই*\n\n` +
                `আপনি চেয়েছেন: ${diamonds}💎\n` +
                `স্টকে আছে: ${currentStock}💎\n\n` +
                `আপনি সর্বোচ্চ ${currentStock}💎 অর্ডার দিতে পারবেন।`
            );
            console.log(`[INSUFFICIENT STOCK] User requested ${diamonds}💎 but only ${currentStock}💎 available`);
            return false;
        }

        // Check for duplicate pending order
        const groupData = db.getGroupData(groupId);
        const rate = groupData.rate || 2.3;

        const contact = await msg.getContact();
        const userDisplayName = contact.pushname || userName || userId;

        // Add entry to database
        const entry = db.addEntry(groupId, userId, diamonds, rate, groupName, msg.id._serialized, userDisplayName);
        
        // ✅ Mark order as sent to admin panel for tracking
        markOrderSentToAdmin(groupId, entry.id);
        
        const totalValue = diamonds * rate;

        // Send confirmation to user
        const confirmationMsg = `✅ *Diamond Order Received*\n\n` +
            `👤 User: ${userDisplayName}\n` +
            `💎 Diamonds: ${diamonds}💎\n` +
            `💰 Amount Due: ${waFormatCurrency(totalValue)}\n` +
            `📊 Rate: ${waFormatCurrency(rate)}/💎\n\n` +
            `⏳ Waiting for admin approval...\n` +
            `Order ID: ${entry.id}`;

        await msg.reply(confirmationMsg);

        // 🔍 NEW Missing Order System: Check WhatsApp → Database → Admin Panel
        setImmediate(async () => {
            try {
                const chat = await msg.getChat();
                await checkAndRecoverMissingOrders(chat, groupId, userId, userName, groupName);
            } catch (err) {
                console.error('[MISSING ORDER] ❌ Background check failed:', err);
            }
        });

        // Notify admin panel in real-time - with retry and timeout handling
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            const response = await fetch('http://127.0.0.1:3005/api/order-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'new-order',
                    data: {
                        entryId: entry.id,
                        userId: userId,
                        userName: userDisplayName,
                        groupId: groupId,
                        diamonds: diamonds,
                        amount: totalValue,
                        status: 'pending'
                    }
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                console.log('[NOTIFY ADMIN] ✅ New order notified to admin panel on port 3005');
            } else {
                console.log('[NOTIFY ADMIN] ⚠️ Admin panel returned status:', response.status);
            }
        } catch (notifyErr) {
            console.warn('[NOTIFY ADMIN] ℹ️ Failed to reach admin panel HTTP:', notifyErr.message);
            // This is expected when admin panel is disconnected - order is in database, will be pulled on reconnect
        }

        // Log for admin
        console.log(`[DIAMOND ORDER] ${userDisplayName}: ${diamonds}💎 (${waFormatCurrency(totalValue)})`);

        return true;
    } catch (error) {
        console.error('Error handling diamond request:', error);
        await msg.reply('❌ Error processing your request. Please try again.');
        return false;
    }
}

async function approvePendingDiamond(requestId, groupId) {
    try {
        // Check if it's from database or in-memory
        if (requestId.startsWith('db_')) {
            // It's a database entry - set to PROCESSING instead of approved immediately
            const entryId = parseInt(requestId.replace('db_', ''));
            db.setEntryProcessing(groupId, entryId);  // Changed from approveEntry to setEntryProcessing
            
            // Get the entry to return info
            const groupData = db.getGroupData(groupId);
            const groupName = groupData.name || 'Unknown Group';
            const entry = groupData.entries.find(e => e.id === entryId);
            if (entry) {
                // Check and deduct from admin diamond stock
                const stockResult = deductAdminDiamondStock(entry.diamonds);
                if (!stockResult.success) {
                    return {
                        success: false,
                        error: stockResult.error,
                        currentStock: stockResult.currentStock,
                        requested: stockResult.requested
                    };
                }
                
                // Auto-deduct if balance >= order amount
                const orderAmount = entry.diamonds * entry.rate;
                const currentBalance = db.getUserBalance(entry.userId);
                
                let autoDeductedAmount = 0;
                let finalBalance = currentBalance;
                let autoDeductMessage = '';
                
                if (currentBalance >= orderAmount && orderAmount > 0) {
                    // Auto-deduct from balance
                    autoDeductedAmount = orderAmount;
                    finalBalance = db.updateUserBalance(entry.userId, -autoDeductedAmount);
                    
                    // Record auto-deduction using safe function
                    savePaymentTransaction({
                        userId: entry.userId,
                        userName: entry.userName,
                        groupId: groupId,
                        amount: autoDeductedAmount,
                        type: 'auto',
                        status: 'approved',
                        createdAt: new Date().toISOString(),
                        orderId: entry.id
                    });
                    
                    // Log to admin panel
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 3000);
                        
                        await fetch('http://127.0.0.1:3005/api/auto-deductions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                groupId: groupId,
                                groupName: groupName,
                                amount: autoDeductedAmount,
                                timestamp: new Date().toISOString()
                            }),
                            signal: controller.signal
                        }).catch(err => console.error('[AUTO-DEDUCT LOG] Failed:', err.message));
                        
                        clearTimeout(timeoutId);
                    } catch (err) {
                        console.error('[AUTO-DEDUCT LOG] Error logging auto-deduction:', err.message);
                    }
                    
                    console.log(`[AUTO-DEDUCT ON ORDER] ${entry.userName}: ${waFormatCurrency(autoDeductedAmount)} deducted from balance`);
                    
                    autoDeductMessage = `\n\n⚡ *Auto-Deduction Applied*\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `Before: ${waFormatCurrency(currentBalance)}\n` +
                        `Deducted: ${waFormatCurrency(autoDeductedAmount)}\n` +
                        `After: ${waFormatCurrency(finalBalance)}`;
                } else if (currentBalance > 0 && currentBalance < orderAmount) {
                    // Partial deduction
                    autoDeductedAmount = currentBalance;
                    finalBalance = db.updateUserBalance(entry.userId, -autoDeductedAmount);
                    
                    // Record partial auto-deduction
                    savePaymentTransaction({
                        userId: entry.userId,
                        userName: entry.userName,
                        groupId: groupId,
                        amount: autoDeductedAmount,
                        type: 'auto',
                        status: 'approved',
                        createdAt: new Date().toISOString(),
                        orderId: entry.id
                    });
                    
                    // Log to admin panel
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 3000);
                        
                        await fetch('http://127.0.0.1:3005/api/auto-deductions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                groupId: groupId,
                                groupName: groupName,
                                amount: autoDeductedAmount,
                                timestamp: new Date().toISOString()
                            }),
                            signal: controller.signal
                        }).catch(err => console.error('[AUTO-DEDUCT LOG] Failed:', err.message));
                        
                        clearTimeout(timeoutId);
                    } catch (err) {
                        console.error('[AUTO-DEDUCT LOG] Error logging auto-deduction:', err.message);
                    }
                    
                    console.log(`[AUTO-DEDUCT ON ORDER] ${entry.userName}: ${waFormatCurrency(autoDeductedAmount)} partial deduction from balance`);
                    
                    const remainingDue = orderAmount - autoDeductedAmount;
                    autoDeductMessage = `\n\n⚡ *Partial Auto-Deduction*\n` +
                        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `Order Amount: ${waFormatCurrency(orderAmount)}\n` +
                        `Balance Available: ${waFormatCurrency(currentBalance)}\n` +
                        `Deducted: ${waFormatCurrency(autoDeductedAmount)}\n` +
                        `Remaining Due: ${waFormatCurrency(remainingDue)}`;
                }
                
                let stockMessage = '';
                if (stockResult.stockDepleted) {
                    stockMessage = `\n\n⚠️ *Stock Depleted!*\n━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `রেমেইনিং স্টক: 0💎\nসিস্টেম স্বয়ংক্রিয়ভাবে বন্ধ হয়ে গেছে।`;
                } else {
                    stockMessage = `\n\n💎 *Stock Update*\n━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `রেমেইনিং স্টক: ${stockResult.newStock}💎`;
                }
                
                return {
                    success: true,
                    orderId: entry.id,
                    userId: entry.userId,
                    userName: entry.userId,
                    userIdFromMsg: entry.userId,
                    diamonds: entry.diamonds,
                    rate: entry.rate,
                    totalValue: entry.diamonds * entry.rate,
                    autoDeductedAmount: autoDeductedAmount,
                    finalBalance: finalBalance,
                    stockInfo: stockResult,
                    message: `✅ *Diamond Order Approved*\n\n` +
                        `💎 Diamonds: ${entry.diamonds}💎\n` +
                        `💰 Amount Due: ${waFormatCurrency(entry.diamonds * entry.rate)}\n` +
                        `📊 Rate: ${waFormatCurrency(entry.rate)}/💎\n\n` +
                        `✓ Status: Approved\n` +
                        `Order ID: ${entry.id}` +
                        autoDeductMessage +
                        stockMessage
                };
            }
            return null;
        }

        // In-memory request
        const request = pendingDiamondRequests[requestId];
        if (!request) return null;

        const rate = 2.3;
        const totalValue = request.diamonds * rate;

        // Check and deduct from admin diamond stock
        const stockResult = deductAdminDiamondStock(request.diamonds);
        if (!stockResult.success) {
            return {
                success: false,
                error: stockResult.error,
                currentStock: stockResult.currentStock,
                requested: stockResult.requested
            };
        }

        // Entry should already be in database from handleMultiLineDiamondRequest
        // Just set to processing instead of approved
        const groupData = db.getGroupData(groupId);
        const entry = groupData.entries.find(e => 
            e.userId === request.userId && 
            e.diamonds === request.diamonds &&
            e.status === 'pending'
        );
        if (entry) {
            db.setEntryProcessing(groupId, entry.id);  // Changed from approveEntry to setEntryProcessing
        }

        // Mark as processing (not approved yet)
        pendingDiamondRequests[requestId].status = 'processing';
        pendingDiamondRequests[requestId].processingAt = new Date().toISOString();
        if (entry) {
            pendingDiamondRequests[requestId].orderId = entry.id;
        }

        // Auto-deduct if balance >= order amount
        const orderAmount = totalValue;
        const currentBalance = db.getUserBalance(request.userId);
        
        let autoDeductedAmount = 0;
        let finalBalance = currentBalance;
        let autoDeductMessage = '';
        
        if (currentBalance >= orderAmount && orderAmount > 0) {
            // Auto-deduct from balance
            autoDeductedAmount = orderAmount;
            finalBalance = db.updateUserBalance(request.userId, -autoDeductedAmount);
            
            // Record auto-deduction using safe function
            savePaymentTransaction({
                userId: request.userId,
                userName: request.userName,
                groupId: groupId,
                amount: autoDeductedAmount,
                type: 'auto',
                status: 'approved',
                createdAt: new Date().toISOString(),
                orderId: entry?.id || Date.now()
            });
            
            // Get group name for logging
            const groupData = db.getGroupData(groupId);
            const groupName = groupData.name || 'Unknown Group';
            
            // Log to admin panel
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                await fetch('http://127.0.0.1:3005/api/auto-deductions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        groupId: groupId,
                        groupName: groupName,
                        amount: autoDeductedAmount,
                        timestamp: new Date().toISOString()
                    }),
                    signal: controller.signal
                }).catch(err => console.error('[AUTO-DEDUCT LOG] Failed:', err.message));
                
                clearTimeout(timeoutId);
            } catch (err) {
                console.error('[AUTO-DEDUCT LOG] Error logging auto-deduction:', err.message);
            }
            
            console.log(`[AUTO-DEDUCT ON ORDER] ${request.userName}: ${waFormatCurrency(autoDeductedAmount)} deducted from balance`);
            
            autoDeductMessage = `\n\n⚡ *Auto-Deduction Applied*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Before: ${waFormatCurrency(currentBalance)}\n` +
                `Deducted: ${waFormatCurrency(autoDeductedAmount)}\n` +
                `After: ${waFormatCurrency(finalBalance)}`;
        } else if (currentBalance > 0 && currentBalance < orderAmount) {
            // Partial deduction
            autoDeductedAmount = currentBalance;
            finalBalance = db.updateUserBalance(request.userId, -autoDeductedAmount);
            
            // Record partial auto-deduction
            savePaymentTransaction({
                userId: request.userId,
                userName: request.userName,
                groupId: groupId,
                amount: autoDeductedAmount,
                type: 'auto',
                status: 'approved',
                createdAt: new Date().toISOString(),
                orderId: entry?.id || Date.now()
            });
            
            // Get group name for logging
            const groupData = db.getGroupData(groupId);
            const groupName = groupData.name || 'Unknown Group';
            
            // Log to admin panel
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                await fetch('http://127.0.0.1:3005/api/auto-deductions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        groupId: groupId,
                        groupName: groupName,
                        amount: autoDeductedAmount,
                        timestamp: new Date().toISOString()
                    }),
                    signal: controller.signal
                }).catch(err => console.error('[AUTO-DEDUCT LOG] Failed:', err.message));
                
                clearTimeout(timeoutId);
            } catch (err) {
                console.error('[AUTO-DEDUCT LOG] Error logging auto-deduction:', err.message);
            }
            
            console.log(`[AUTO-DEDUCT ON ORDER] ${request.userName}: ${waFormatCurrency(autoDeductedAmount)} partial deduction from balance`);
            
            const remainingDue = orderAmount - autoDeductedAmount;
            autoDeductMessage = `\n\n⚡ *Partial Auto-Deduction*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Order Amount: ${waFormatCurrency(orderAmount)}\n` +
                `Balance Available: ${waFormatCurrency(currentBalance)}\n` +
                `Deducted: ${waFormatCurrency(autoDeductedAmount)}\n` +
                `Remaining Due: ${waFormatCurrency(remainingDue)}`;
        }

        let stockMessage = '';
        if (stockResult.stockDepleted) {
            stockMessage = `\n\n⚠️ *Stock Depleted!*\n━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `রেমেইনিং স্টক: 0💎\nসিস্টেম স্বয়ংক্রিয়ভাবে বন্ধ হয়ে গেছে।`;
        } else {
            stockMessage = `\n\n💎 *Stock Update*\n━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `রেমেইনিং স্টক: ${stockResult.newStock}💎`;
        }

        // ✅ CLEAR pending diamond from memory after approval
        console.log(`[PENDING DIAMOND] ✅ Clearing requestId: ${requestId} from memory`);
        delete pendingDiamondRequests[requestId];
        console.log(`[PENDING DIAMOND] ✅ Cleared. Remaining pending: ${Object.keys(pendingDiamondRequests).length}`);

        return {
            success: true,
            orderId: entry?.id || Date.now(),
            userId: request.userId,
            userName: request.userName,
            userIdFromMsg: request.userIdFromMsg,
            diamonds: request.diamonds,
            rate: rate,
            totalValue: totalValue,
            autoDeductedAmount: autoDeductedAmount,
            finalBalance: finalBalance,
            stockInfo: stockResult,
            message: `⏳ *Diamond Order Processing*\n\n` +
                `👤 User ID: ${request.userIdFromMsg}\n` +
                `💎 Diamonds: ${request.diamonds}💎\n` +
                `💰 Amount Due: ${waFormatCurrency(totalValue)}\n` +
                `📊 Rate: ${waFormatCurrency(rate)}/💎\n\n` +
                `⏱️ Status: Processing (2 min)\n` +
                `Order ID: ${entry?.id || 'pending'}\n` +
                `⏰ Will auto-approve in 2 minutes\n` +
                `📱 Delete message to cancel` +
                autoDeductMessage +
                stockMessage
        };
    } catch (error) {
        console.error('Error approving pending diamond:', error);
        return null;
    }
}

function findPendingDiamondByUser(userId, groupId, quotedBody = '', quotedOrderId = null, quotedMessageId = null) {
    console.log(`[SEARCH PENDING] 🔍 Looking for userId: ${userId}, groupId: ${groupId}`);
    console.log(`[SEARCH PENDING] 📋 Search params: orderId=${quotedOrderId}, messageId=${quotedMessageId}`);
    console.log(`[SEARCH PENDING] Available requests:`, Object.entries(pendingDiamondRequests).map(([k, v]) => `${k.substring(0, 25)}... (userId: ${v.userId}, groupId: ${v.groupId})`));
    
    // 🎯 PRIORITY 1: Match by Message ID (most accurate - matches the exact quoted message)
    if (quotedMessageId) {
        console.log(`[SEARCH PENDING] 🎯 PRIORITY 1: Searching by Message ID: ${quotedMessageId}`);
        
        const groupData = db.getGroupData(groupId);
        if (groupData && groupData.entries) {
            const orderByMessageId = groupData.entries.find(e => 
                e.messageId === quotedMessageId && 
                e.userId === userId && 
                e.status === 'pending'
            );
            if (orderByMessageId) {
                console.log(`[SEARCH PENDING] ✅ FOUND by Message ID: Order ${orderByMessageId.id} (${orderByMessageId.diamonds}💎)`);
                return { 
                    requestId: `db_${orderByMessageId.id}`, 
                    request: orderByMessageId,
                    fromDatabase: true 
                };
            } else {
                // ⚠️ CRITICAL FIX: Message ID not found means order already processed or doesn't exist
                // Do NOT fallback - this prevents duplicate processing of the same message
                console.log(`[SEARCH PENDING] ❌ PREVENTED DUPLICATE - Message ID not found (already processed or deleted)`);
                console.log(`[SEARCH PENDING] 💡 TIP: This order was likely already approved. Check order status.`);
                return null;
            }
        }
        console.log(`[SEARCH PENDING] ⚠️ Message ID not found in pending orders`);
    }
    
    // 🎯 PRIORITY 2: Match by Order ID (from text extraction)
    if (quotedOrderId) {
        console.log(`[SEARCH PENDING] 🎯 PRIORITY 2: Searching by Order ID: ${quotedOrderId}`);
        
        const groupData = db.getGroupData(groupId);
        if (groupData && groupData.entries) {
            const orderById = groupData.entries.find(e => e.id === quotedOrderId && e.userId === userId && e.status === 'pending');
            if (orderById) {
                console.log(`[SEARCH PENDING] ✅ FOUND by Order ID: ${quotedOrderId} (${orderById.diamonds}💎)`);
                return { 
                    requestId: `db_${orderById.id}`, 
                    request: orderById,
                    fromDatabase: true 
                };
            }
        }
        console.log(`[SEARCH PENDING] ⚠️ Order ID ${quotedOrderId} not found or not pending`);
    }
    
    // 🎯 PRIORITY 3: Try to extract diamond count from quoted message
    let quotedDiamonds = null;
    if (quotedBody) {
        const diamondMatch = quotedBody.match(/(\d+)\s*💎/);
        if (diamondMatch) {
            quotedDiamonds = parseInt(diamondMatch[1]);
            console.log(`[SEARCH PENDING] 🎯 PRIORITY 3: Extracted ${quotedDiamonds}💎 from quoted message`);
        }
    }
    
    // First check in-memory pendingDiamondRequests
    const userPendingRequests = [];
    for (const [requestId, request] of Object.entries(pendingDiamondRequests)) {
        if (request.userId === userId && request.groupId === groupId && request.status === 'pending_approval') {
            userPendingRequests.push({ requestId, request });
        }
    }
    
    // If we found diamond count in quoted message, find exact match
    if (quotedDiamonds && userPendingRequests.length > 0) {
        const exactMatch = userPendingRequests.find(({ request }) => request.diamonds === quotedDiamonds);
        if (exactMatch) {
            console.log(`[SEARCH PENDING] ✅ FOUND EXACT MATCH in memory: ${exactMatch.requestId} (${quotedDiamonds}💎)`);
            return exactMatch;
        }
        console.log(`[SEARCH PENDING] ⚠️ No exact match for ${quotedDiamonds}💎 in memory`);
    }
    
    // ⚠️ CRITICAL FIX: Only allow single pending (no fallback for multiple)
    if (userPendingRequests.length === 1) {
        console.log(`[SEARCH PENDING] ✅ FOUND in memory (only one): ${userPendingRequests[0].requestId}`);
        return userPendingRequests[0];
    }
    
    // ⚠️ CRITICAL FIX: Do NOT use fallback for multiple pending - require exact match
    if (userPendingRequests.length > 1) {
        console.log(`[SEARCH PENDING] ❌ PREVENTED FALLBACK - Multiple pending orders found (${userPendingRequests.length}), exact match required`);
        console.log(`[SEARCH PENDING] 💡 TIP: Reply to the specific order message with diamond amount to identify it`);
        return null;
    }
    
    // Then check database for pending entries (fallback)
    const groupData = db.getGroupData(groupId);
    console.log(`[SEARCH PENDING] Checking database for groupId: ${groupId}`);
    console.log(`[SEARCH PENDING] Group data exists:`, !!groupData);
    console.log(`[SEARCH PENDING] Entries count:`, groupData?.entries?.length || 0);
    
    if (groupData && groupData.entries) {
        console.log(`[SEARCH PENDING] Searching in ${groupData.entries.length} entries...`);
        
        // Get all pending entries for this user
        const userPendingEntries = groupData.entries.filter(e => e.userId === userId && e.status === 'pending');
        
        groupData.entries.forEach((e, i) => {
            console.log(`[SEARCH PENDING]   Entry ${i}: userId=${e.userId}, diamonds=${e.diamonds}💎, status=${e.status}, matches=${e.userId === userId && e.status === 'pending'}`);
        });
        
        if (userPendingEntries.length === 0) {
            console.log(`[SEARCH PENDING] ❌ No pending entries in DB for user ${userId}`);
            return null;
        }
        
        // 🎯 If we have diamond count from quoted message, find exact match
        if (quotedDiamonds) {
            const exactMatch = userPendingEntries.find(e => e.diamonds === quotedDiamonds);
            if (exactMatch) {
                console.log(`[SEARCH PENDING] ✅ FOUND EXACT MATCH in DB: ${exactMatch.id} (${quotedDiamonds}💎)`);
                return { 
                    requestId: `db_${exactMatch.id}`, 
                    request: exactMatch,
                    fromDatabase: true 
                };
            }
            console.log(`[SEARCH PENDING] ⚠️ No exact match for ${quotedDiamonds}💎 in DB`);
        }
        
        // ⚠️ CRITICAL FIX: Do NOT use fallback - require exact match to prevent duplicate processing
        // If no exact match found (by message ID or diamond count), reject to avoid processing wrong order
        console.log(`[SEARCH PENDING] ❌ PREVENTED FALLBACK - Exact match required to prevent duplicate processing`);
        console.log(`[SEARCH PENDING] 💡 TIP: Reply to the specific order message, not a generic "Done" message`);
        return null;
    }
    
    console.log(`[SEARCH PENDING] ❌ NOT FOUND`);
    return null;
}



async function getDiamondRequestStats(groupId) {
    try {
        const groupData = db.getGroupData(groupId);
        
        let totalDiamonds = 0;
        let totalValue = 0;
        let pendingCount = 0;
        let approvedCount = 0;

        groupData.entries.forEach(entry => {
            const value = entry.diamonds * entry.rate;
            totalDiamonds += entry.diamonds;
            totalValue += value;

            if (entry.status === 'pending') {
                pendingCount++;
            } else if (entry.status === 'approved') {
                approvedCount++;
            }
        });

        return {
            totalDiamonds,
            totalValue,
            pendingCount,
            approvedCount,
            totalOrders: groupData.entries.length,
            currentRate: groupData.rate || 2.3
        };
    } catch (error) {
        console.error('Error getting diamond stats:', error);
        return null;
    }
}

async function showPendingRequests(msg, groupId) {
    try {
        const groupData = db.getGroupData(groupId);
        const pendingEntries = groupData.entries.filter(e => e.status === 'pending');

        if (pendingEntries.length === 0) {
            await msg.reply('✅ No pending diamond requests!');
            return;
        }

        let message = `*⏳ PENDING DIAMOND REQUESTS*\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;

        pendingEntries.forEach((entry, idx) => {
            const value = entry.diamonds * entry.rate;
            message += `${idx + 1}. ${entry.diamonds}💎 @ ${waFormatCurrency(entry.rate)}\n`;
            message += `   Amount: ${waFormatCurrency(value)}\n`;
            message += `   Status: Pending\n\n`;
        });

        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `Total Pending: ${pendingEntries.length} requests\n`;
        message += `Total Diamonds: ${pendingEntries.reduce((sum, e) => sum + e.diamonds, 0)}💎`;

        await msg.reply(message);
        return true;
    } catch (error) {
        console.error('Error showing pending requests:', error);
        await msg.reply('❌ Error loading pending requests.');
        return false;
    }
}

// Cancel/Delete a pending or submitted order
async function cancelDiamondRequest(msg, userId, userName, groupId, orderId = null) {
    try {
        let deleted = false;
        let deletedDetails = {};

        // If orderId provided, delete specific order
        if (orderId) {
            const groupData = db.getGroupData(groupId);
            if (groupData.entries && groupData.entries[orderId]) {
                deletedDetails = groupData.entries[orderId];
                delete groupData.entries[orderId];
                // Save back to database
                const fullDb = db.loadDatabase();
                fullDb.groups[groupId] = groupData;
                db.saveDatabase(fullDb);
                deleted = true;
                console.log(`[CANCEL] Order ${orderId} deleted by ${userName}`);
                
                // 🔄 Broadcast order deletion to admin panel in real-time
                if (global.broadcastOrderDeleted) {
                    global.broadcastOrderDeleted(orderId, `🗑️ Order deleted by ${userName}`);
                }
            }
        } else {
            // Cancel pending request (multi-line format) for this user
            // First try to find and delete from database
            const groupData = db.getGroupData(groupId);
            if (groupData.entries && Array.isArray(groupData.entries)) {
                for (let i = 0; i < groupData.entries.length; i++) {
                    const entry = groupData.entries[i];
                    if (entry.userId === userId && entry.status === 'pending') {
                        deletedDetails = entry;
                        const deletedId = entry.id;
                        groupData.entries.splice(i, 1);
                        // Save back to database
                        const fullDb = db.loadDatabase();
                        fullDb.groups[groupId] = groupData;
                        db.saveDatabase(fullDb);
                        deleted = true;
                        console.log(`[CANCEL] Database entry deleted by ${userName}`);
                        
                        // 🔄 Broadcast order deletion to admin panel in real-time
                        if (global.broadcastOrderDeleted && deletedId) {
                            global.broadcastOrderDeleted(deletedId, `🗑️ Order deleted by ${userName}`);
                        }
                        break;
                    }
                }
            }
            
            // Also delete from in-memory pending requests
            for (const [reqId, req] of Object.entries(pendingDiamondRequests)) {
                if (req.userId === userId && req.groupId === groupId) {
                    if (!deleted) {
                        deletedDetails = req;
                    }
                    delete pendingDiamondRequests[reqId];
                    deleted = true;
                    console.log(`[CANCEL] Pending request ${reqId} cancelled by ${userName}`);
                    
                    // 🔄 Broadcast order deletion to admin panel in real-time
                    if (global.broadcastOrderDeleted && reqId) {
                        global.broadcastOrderDeleted(reqId, `🗑️ Order cancelled by ${userName}`);
                    }
                    break;
                }
            }
        }

        if (deleted) {
            const message = `✅ Your order has been cancelled!\n\n` +
                `💎 Diamonds: ${deletedDetails.diamonds || 'N/A'}\n` +
                `💰 Amount: ${deletedDetails.amount ? waFormatCurrency(deletedDetails.amount) : 'N/A'}\n` +
                `Status: ❌ CANCELLED`;
            
            await msg.reply(message);
            
            // Return deletion info for broadcast
            return {
                success: true,
                userId,
                userName,
                groupId,
                orderId: orderId || deletedDetails.requestId,
                diamonds: deletedDetails.diamonds,
                amount: deletedDetails.amount,
                reason: 'User cancelled'
            };
        } else {
            await msg.reply('❌ No pending or submitted orders found to cancel.');
            return { success: false };
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        await msg.reply('❌ Error cancelling order. Please try again.');
        return { success: false };
    }
}

module.exports = {
    handleDiamondRequest,
    handleMultiLineDiamondRequest,
    approvePendingDiamond,
    findPendingDiamondByUser,
    getDiamondRequestStats,
    showPendingRequests,
    cancelDiamondRequest,
    getDiamondStatus,
    getGroupMessage,
    deductAdminDiamondStock,
    pendingDiamondRequests,
    pendingUserIds,
    waFormatCurrency,
    savePaymentTransaction,
    checkAndRecoverMissingOrders
};
