/**
 * Approval Recovery Handler
 * Handles recovery of approval statuses when admin marks orders as approved
 * but the admin panel doesn't update properly
 * 
 * NEW: If order is missing from admin panel, automatically adds it in processing status
 */

const fetch = require('node-fetch');
const activeScans = {};

/**
 * Check if admin sent approval keywords like "Done", "OK", "Approved"
 * This handles cases where admin marked order done but admin panel didn't update
 * 
 * RECOVERY FLOW:
 * 1. Admin sends "done" to approve order
 * 2. Check if order exists in database (bot memory)
 * 3. Check if order exists in admin panel
 * 4. If MISSING from admin panel → Automatically add it in processing status
 */
async function handleAdminApprovalRecovery(msg, groupId, fromUserId, adminName) {
    try {
        // Get message text
        const msgText = msg.body?.trim()?.toLowerCase() || '';
        
        if (!msgText) return false;
        
        // Approval keywords
        const approvalKeywords = [
            'done', 'ok', 'approve', 'approved', 'complete', 'completed',
            'finished', 'finish', 'ready', 'ok done', 'done ok', 'সম্পন্ন', 
            'হয়েছে', 'ঠিক', 'ওকে', 'সম্মতি দিচ্ছি'
        ];
        
        // Check if message contains approval keywords
        const isApprovalMsg = approvalKeywords.some(keyword => msgText.includes(keyword));
        
        if (!isApprovalMsg) {
            return false;
        }
        
        console.log(`[APPROVAL-RECOVERY] ℹ️ Admin ${adminName} sent approval message: "${msg.body}"`);
        
        // ✅ NEW: Check if this is a reply to an order
        if (!msg.hasQuotedMsg) {
            console.log(`[APPROVAL-RECOVERY] ⏭️ Not a quoted message, skipping recovery`);
            return false;
        }
        
        try {
            const quotedMsg = await msg.getQuotedMessage();
            const quotedUserId = quotedMsg.author || quotedMsg.from;
            const quotedMsgText = quotedMsg.body?.trim() || '';
            
            console.log(`[APPROVAL-RECOVERY] 📨 Quoted message from user ${quotedUserId}`);
            console.log(`[APPROVAL-RECOVERY] 📝 Quoted text: "${quotedMsgText}"`);
            
            // ✅ Get database to find orders for this user
            const db = require('../config/database');
            const database = db.loadDatabase();
            const groupData = database.groups?.[groupId];
            
            let latestOrder = null;
            
            // 🔄 STEP 0: First, try to extract diamonds from quoted message to find EXACT order
            let extractedDiamonds = null;
            {
                const lines = quotedMsgText.split('\n').map(l => l.trim()).filter(l => l);
                console.log(`[APPROVAL-RECOVERY] 🔎 STEP 0: Diamond extraction from quoted message`);
                console.log(`[APPROVAL-RECOVERY]    Total lines: ${lines.length}`);
                console.log(`[APPROVAL-RECOVERY]    Lines: ${JSON.stringify(lines)}`);
                
                if (lines.length >= 2) {
                    // Multi-line format: line 1 = player ID, line 2 = diamonds
                    const diamondStr = lines[1].match(/(\d+)/);
                    extractedDiamonds = diamondStr ? parseInt(diamondStr[1]) : null;
                    console.log(`[APPROVAL-RECOVERY]    Multi-line: Line1="${lines[0]}", Line2="${lines[1]}", Extracted=${extractedDiamonds}`);
                } else if (lines.length === 1) {
                    // Single line: extract the number as diamonds
                    const diamondStr = lines[0].match(/(\d+)/);
                    extractedDiamonds = diamondStr ? parseInt(diamondStr[1]) : null;
                    console.log(`[APPROVAL-RECOVERY]    Single-line: Text="${lines[0]}", Extracted=${extractedDiamonds}`);
                } else {
                    console.log(`[APPROVAL-RECOVERY]    ⚠️ No lines found in quoted message`);
                }
            }
            
            // STEP 1: Try to find EXACT matching order by diamonds
            if (extractedDiamonds && groupData && groupData.entries) {
                console.log(`[APPROVAL-RECOVERY] 🔍 STEP 1: Looking for EXACT match with ${extractedDiamonds}💎`);
                console.log(`[APPROVAL-RECOVERY]    Total entries in database: ${groupData.entries.length}`);
                console.log(`[APPROVAL-RECOVERY]    User ID to match: ${quotedUserId}`);
                
                // Get user's pending/processing orders for EXACT diamond amount
                const userOrders = groupData.entries
                    .filter(e => {
                        const isUserMatch = e.userId === quotedUserId;
                        const isStatusMatch = e.status === 'pending' || e.status === 'processing';
                        const isDiamondMatch = e.diamonds === extractedDiamonds;
                        
                        if (!isUserMatch) {
                            console.log(`[APPROVAL-RECOVERY]    ❌ Order ID=${e.id}: User=${e.userId} (need ${quotedUserId})`);
                        } else if (!isStatusMatch) {
                            console.log(`[APPROVAL-RECOVERY]    ❌ Order ID=${e.id}: Status=${e.status} (need pending/processing)`);
                        } else if (!isDiamondMatch) {
                            console.log(`[APPROVAL-RECOVERY]    ❌ Order ID=${e.id}: Diamonds=${e.diamonds}💎 (need ${extractedDiamonds}💎)`);
                        } else {
                            console.log(`[APPROVAL-RECOVERY]    ✅ Order ID=${e.id}: MATCH! User=${e.userId}, Status=${e.status}, Diamonds=${e.diamonds}💎`);
                        }
                        
                        return isUserMatch && isStatusMatch && isDiamondMatch;
                    })
                    .sort((a, b) => b.id - a.id);  // Most recent first
                
                console.log(`[APPROVAL-RECOVERY]    Result: Found ${userOrders.length} exact matches`);
                
                // Log all matching orders for debugging
                userOrders.slice(0, 5).forEach((o, i) => {
                    console.log(`[APPROVAL-RECOVERY]    Match ${i+1}: ID=${o.id}, Diamonds=${o.diamonds}💎, Status=${o.status}, Name=${o.userName}`);
                });
                
                if (userOrders.length > 0) {
                    latestOrder = userOrders[0];
                    console.log(`[APPROVAL-RECOVERY] ✅ SELECTED EXACT MATCH: ${latestOrder.id} (${latestOrder.diamonds}💎, status: ${latestOrder.status}, name: ${latestOrder.userName})`);
                } else {
                    console.log(`[APPROVAL-RECOVERY] ⚠️ No exact matches found, will try fallback`);
                }
            } else {
                if (!extractedDiamonds) console.log(`[APPROVAL-RECOVERY] ⚠️ STEP 1 SKIPPED: Could not extract diamond amount from quoted message`);
                if (!groupData) console.log(`[APPROVAL-RECOVERY] ⚠️ STEP 1 SKIPPED: No group data found`);
                if (!groupData?.entries) console.log(`[APPROVAL-RECOVERY] ⚠️ STEP 1 SKIPPED: No entries in group data`);
            }
            
            // STEP 2: If exact match not found, fallback to most recent order
            if (!latestOrder && groupData && groupData.entries) {
                console.log(`[APPROVAL-RECOVERY] ⚠️ No exact diamond match found, falling back to most recent order`);
                
                // Get user's pending/processing orders SORTED BY MOST RECENT FIRST
                const userOrders = groupData.entries
                    .filter(e => e.userId === quotedUserId && (e.status === 'pending' || e.status === 'processing'))
                    .sort((a, b) => b.id - a.id);
                
                console.log(`[APPROVAL-RECOVERY] 📋 Found ${userOrders.length} pending/processing orders for this user`);
                
                // Log all pending orders for debugging
                userOrders.slice(0, 5).forEach((o, i) => {
                    console.log(`[APPROVAL-RECOVERY]    Order ${i+1}: ID=${o.id}, Diamonds=${o.diamonds}💎, Status=${o.status}, Name=${o.userName}`);
                });
                
                if (userOrders.length > 0) {
                    latestOrder = userOrders[0];
                    console.log(`[APPROVAL-RECOVERY] ✅ FALLBACK SELECTED: ${latestOrder.id} (${latestOrder.diamonds}💎, status: ${latestOrder.status}, name: ${latestOrder.userName})`);
                }
            }
            
            // STEP 2: If not found in database, try to extract diamonds from quoted message
            if (!latestOrder) {
                console.log(`[APPROVAL-RECOVERY] ⚠️ Order not found in database, trying to extract from quoted message`);
                
                // Parse message to extract diamonds (2nd number if multi-line, or 1st if single)
                // Format: 
                // - Single line: "1000" (just diamonds)
                // - Multi-line: "78278947\n1000" (player ID on line 1, diamonds on line 2)
                const lines = quotedMsgText.split('\n').map(l => l.trim()).filter(l => l);
                let extractedDiamonds = null;
                let extractedPlayerId = null;
                
                if (lines.length >= 2) {
                    // Multi-line format: line 1 = player ID, line 2 = diamonds
                    const playerIdMatch = lines[0].match(/(\d+)/);
                    extractedPlayerId = playerIdMatch ? playerIdMatch[1] : null;
                    
                    const diamondStr = lines[1].match(/(\d+)/);
                    extractedDiamonds = diamondStr ? parseInt(diamondStr[1]) : null;
                    
                    console.log(`[APPROVAL-RECOVERY] 📋 Multi-line format detected`);
                    console.log(`[APPROVAL-RECOVERY]    Line 1 (Player ID): ${lines[0]}`);
                    console.log(`[APPROVAL-RECOVERY]    Line 2 (Diamonds): ${lines[1]}`);
                } else if (lines.length === 1) {
                    // Single line: extract the number as diamonds
                    const diamondStr = lines[0].match(/(\d+)/);
                    extractedDiamonds = diamondStr ? parseInt(diamondStr[1]) : null;
                    console.log(`[APPROVAL-RECOVERY] 📋 Single-line format detected: ${lines[0]}`);
                }
                
                if (extractedDiamonds) {
                    console.log(`[APPROVAL-RECOVERY] 💎 Extracted diamonds: ${extractedDiamonds}`);
                    if (extractedPlayerId) {
                        console.log(`[APPROVAL-RECOVERY] 👤 Extracted player ID: ${extractedPlayerId}`);
                    }
                    
                    // ✅ Extract proper user name from multiple sources
                    let userName = 'Unknown';
                    
                    // Try to get name from quoted message
                    if (quotedMsg._data?.notifyName) {
                        userName = quotedMsg._data.notifyName;
                        console.log(`[APPROVAL-RECOVERY] 👤 Got name from notifyName: ${userName}`);
                    } else if (quotedMsg.author) {
                        // Try to extract from author or use phone number
                        const phoneMatch = quotedMsg.author.match(/^(\d+)/);
                        if (phoneMatch) {
                            userName = phoneMatch[1];
                            console.log(`[APPROVAL-RECOVERY] 👤 Got phone from author: ${userName}`);
                        }
                    }
                    
                    // Try to lookup user info from database
                    try {
                        const db = require('../config/database');
                        const database = db.loadDatabase();
                        const groupData = database.groups?.[groupId];
                        
                        if (groupData && groupData.entries) {
                            // Find any previous order from this user to get their name
                            const prevUserOrder = groupData.entries.find(e => e.userId === quotedUserId);
                            if (prevUserOrder && prevUserOrder.userName) {
                                userName = prevUserOrder.userName;
                                console.log(`[APPROVAL-RECOVERY] 👤 Got name from database: ${userName}`);
                            }
                        }
                    } catch (dbLookupError) {
                        console.log(`[APPROVAL-RECOVERY] ⚠️ Could not lookup from database:`, dbLookupError.message);
                    }
                    
                    // Create a temporary order object for recovery
                    latestOrder = {
                        id: Date.now(),
                        userId: quotedUserId,
                        userName: userName,  // ✅ Use extracted/lookup userName
                        userIdFromMsg: extractedPlayerId || quotedUserId,
                        playerIdNumber: extractedPlayerId,
                        diamonds: extractedDiamonds,
                        messageId: quotedMsg.id._serialized,
                        timestamp: Date.now(),
                        status: 'pending',
                        groupName: 'WhatsApp Group'
                    };
                    
                    console.log(`[APPROVAL-RECOVERY] 🆕 Created temporary order from quoted message (userName: ${userName})`);
                }
            }
            
            // STEP 3: If still no order found
            if (!latestOrder) {
                console.log(`[APPROVAL-RECOVERY] ❌ Could not find or extract order details`);
                return false;
            }
            
            console.log(`[APPROVAL-RECOVERY] 🔍 Processing order: ${latestOrder.id} (${latestOrder.diamonds}💎, status: ${latestOrder.status})`);
            
            // ✅ IMPORTANT: Save recovered order to BOT's database too
            try {
                const db = require('../config/database');
                const database = db.loadDatabase();
                const groupData = database.groups?.[groupId];
                
                // ✅ NEW: Validate groupData before accessing entries
                if (!groupData) {
                    console.log(`[APPROVAL-RECOVERY] ⚠️ Group data is undefined for groupId: ${groupId}`);
                    // Initialize group if missing
                    if (!database.groups) database.groups = {};
                    database.groups[groupId] = { 
                        name: 'WhatsApp Group', 
                        entries: [] 
                    };
                }
                
                if (!groupData?.entries || !Array.isArray(groupData.entries)) {
                    console.log(`[APPROVAL-RECOVERY] ⚠️ Entries array is invalid, initializing...`);
                    if (groupData) {
                        groupData.entries = [];
                    }
                }
                
                if (groupData && Array.isArray(groupData.entries)) {
                    // Check if order already exists in bot database
                    const existingIndex = groupData.entries.findIndex(e => e.id == latestOrder.id);
                    
                    if (existingIndex === -1) {
                        // Order doesn't exist - add it
                        console.log(`[APPROVAL-RECOVERY] 💾 Saving recovered order to bot database`);
                        
                        const orderToSave = {
                            id: latestOrder.id,
                            userId: latestOrder.userId,
                            userName: latestOrder.userName,
                            userIdFromMsg: latestOrder.userIdFromMsg,
                            playerIdNumber: latestOrder.playerIdNumber,
                            diamonds: latestOrder.diamonds,
                            rate: groupData.rate || 2.3,
                            amount: latestOrder.diamonds * (groupData.rate || 2.3),
                            status: 'processing',  // ✅ Set to processing
                            processingStartedAt: new Date().toISOString(),
                            messageId: latestOrder.messageId,
                            timestamp: latestOrder.timestamp || Date.now(),
                            createdAt: new Date().toISOString(),
                            groupName: groupData.name || 'WhatsApp Group',
                            recoveryReason: 'Admin approval - missing order recovery',
                            isRecovered: true
                        };
                        
                        groupData.entries.push(orderToSave);
                        db.saveDatabase();
                        
                        console.log(`[APPROVAL-RECOVERY] ✅ Saved to bot database: ${latestOrder.id}`);
                    } else {
                        console.log(`[APPROVAL-RECOVERY] ℹ️ Order already exists in bot database`);
                    }
                }
            } catch (dbSaveError) {
                console.error(`[APPROVAL-RECOVERY] ⚠️ Error saving to bot database:`, dbSaveError.message);
            }
            
            // ✅ UPDATE DATABASE WITH PROCESSING STATUS
            try {
                console.log(`[APPROVAL-RECOVERY] 📝 Updating order in database to PROCESSING status...`);
                const db = require('../config/database');
                const updated = db.setEntryProcessing(groupId, latestOrder.id, adminName);
                
                if (updated) {
                    console.log(`[APPROVAL-RECOVERY] ✅ Database updated: Order ${latestOrder.id} → PROCESSING status`);
                } else {
                    console.log(`[APPROVAL-RECOVERY] ⚠️ Could not update database - order might not exist`);
                }
            } catch (dbUpdateError) {
                console.error(`[APPROVAL-RECOVERY] ⚠️ Error updating database:`, dbUpdateError.message);
            }
            
            // ✅ Check if this order exists in admin panel
            try {
                const checkResponse = await fetch('http://127.0.0.1:3005/api/check-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: latestOrder.id,
                        groupId: groupId,
                        userId: quotedUserId,
                        diamonds: latestOrder.diamonds
                    }),
                    signal: AbortSignal.timeout(2000)
                });
                
                if (!checkResponse.ok) {
                    console.log(`[APPROVAL-RECOVERY] ⚠️ Could not check admin panel (HTTP ${checkResponse.status})`);
                    return false;
                }
                
                const checkResult = await checkResponse.json();
                
                if (checkResult.exists && checkResult.order?.status !== 'pending') {
                    // Order exists and is already processed
                    console.log(`[APPROVAL-RECOVERY] ✅ Order already exists in admin panel (Status: ${checkResult.order?.status})`);
                    return false;
                }
                
                // ✅ ORDER IS MISSING FROM ADMIN PANEL - RECOVER IT!
                if (!checkResult.exists || checkResult.missing) {
                    console.log(`[APPROVAL-RECOVERY] 🚨 MISSING ORDER DETECTED!`);
                    console.log(`[APPROVAL-RECOVERY]    Order ID: ${latestOrder.id}`);
                    console.log(`[APPROVAL-RECOVERY]    Diamonds: ${latestOrder.diamonds}💎`);
                    console.log(`[APPROVAL-RECOVERY]    Status: ${latestOrder.status}`);
                    console.log(`[APPROVAL-RECOVERY] 📤 Recovering to Admin Panel in PROCESSING status...`);
                    
                    // ✅ IMPORTANT: Set status to 'processing' directly (not pending)
                    // because admin said "done", so it should start 2-minute timer immediately
                    const processingStartedAt = new Date().toISOString();
                    
                    // Send recovery request to admin panel with PROCESSING status
                    await fetch('http://127.0.0.1:3005/api/order-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventType: 'missing-order-recovery',
                            data: {
                                entryId: latestOrder.id,
                                userId: latestOrder.userId,
                                userName: latestOrder.userName || quotedUserId,
                                userIdFromMsg: latestOrder.userIdFromMsg || '',
                                groupId: groupId,
                                groupName: latestOrder.groupName || 'WhatsApp Group',
                                diamonds: latestOrder.diamonds,
                                amount: latestOrder.amount || (latestOrder.diamonds * (groupData?.rate || 2.3)),
                                rate: latestOrder.rate || groupData?.rate || 2.3,
                                status: 'processing',  // ✅ Changed from 'pending' to 'processing'
                                processingStartedAt: processingStartedAt,  // ✅ Add processing timestamp
                                recoveredAt: new Date().toISOString(),
                                originalTimestamp: latestOrder.timestamp || latestOrder.id,
                                originalStatus: latestOrder.status,
                                messageId: latestOrder.messageId,
                                recoveryReason: 'Admin approval - order was missing from admin panel',
                                recoveredBy: adminName,
                                approvedBy: adminName  // ✅ Mark as approved by admin
                            }
                        }),
                        signal: AbortSignal.timeout(3000)
                    });
                    
                    console.log(`[APPROVAL-RECOVERY] ✅ Order ${latestOrder.id} recovered and set to PROCESSING!`);
                    console.log(`[APPROVAL-RECOVERY] ⏳ 2-minute auto-approval timer will start in admin panel`);
                    
                    // ✅ Also start auto-approval timer in bot
                    try {
                        const { startAutoApprovalTimer } = require('../utils/auto-approval');
                        const timerStarted = startAutoApprovalTimer(
                            groupId,
                            latestOrder.id,
                            latestOrder,
                            null  // client is not available here
                        );
                        
                        if (timerStarted) {
                            console.log(`[APPROVAL-RECOVERY] ✅ Auto-approval timer started for order ${latestOrder.id}`);
                        }
                    } catch (timerError) {
                        console.error(`[APPROVAL-RECOVERY] ⚠️ Could not start auto-approval timer:`, timerError.message);
                    }
                    
                    return true;
                }
                
            } catch (fetchError) {
                console.error(`[APPROVAL-RECOVERY] ❌ Error checking/recovering order:`, fetchError.message);
                // Don't block the approval flow on error
                return false;
            }
            
        } catch (error) {
            console.error(`[APPROVAL-RECOVERY] ❌ Error processing quoted message:`, error.message);
            return false;
        }
        
    } catch (error) {
        console.error('[APPROVAL-RECOVERY] Error:', error.message);
        return false;
    }
}

/**
 * Start auto-approval scan for a group
 * Monitors group for approval patterns
 */
function startAutoApprovalScan(groupId) {
    try {
        // Prevent duplicate scans
        if (activeScans[groupId]) {
            // Scan already running
            return;
        }
        
        // Mark as active
        activeScans[groupId] = true;
        
        console.log(`[APPROVAL-SCAN] ✅ Approval scan started for group ${groupId}`);
        
    } catch (error) {
        console.error('[APPROVAL-SCAN] Error starting scan:', error.message);
    }
}

/**
 * Stop auto-approval scan for a group
 */
function stopAutoApprovalScan(groupId) {
    try {
        if (activeScans[groupId]) {
            delete activeScans[groupId];
            console.log(`[APPROVAL-SCAN] ✅ Approval scan stopped for group ${groupId}`);
        }
    } catch (error) {
        console.error('[APPROVAL-SCAN] Error stopping scan:', error.message);
    }
}

module.exports = {
    handleAdminApprovalRecovery,
    startAutoApprovalScan,
    stopAutoApprovalScan
};
