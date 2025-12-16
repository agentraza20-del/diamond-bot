/**
 * 📨 QUOTED MESSAGE PARSER
 * 
 * Handles extracting order details from quoted messages
 * when admin sends "Done" to approve orders
 * 
 * Problem: Admin quotes message but details not extracted properly
 * Solution: Aggressive extraction + proper validation + sync
 */

const db = require('../config/database');

/**
 * Extract diamond count from quoted message body
 * Priority 1: Look for "diamonds💎" format
 * Priority 2: Look for standalone numbers on specific lines
 * Priority 3: Extract from any line with "💎" emoji
 */
function extractDiamondCount(quotedBody) {
    if (!quotedBody) return null;
    
    console.log(`[DIAMOND-EXTRACT] 📊 Analyzing: "${quotedBody.substring(0, 100)}..."`);
    
    // Split into lines
    const lines = quotedBody.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    console.log(`[DIAMOND-EXTRACT] Lines found: ${lines.length}`);
    lines.forEach((line, i) => console.log(`[DIAMOND-EXTRACT] Line ${i+1}: "${line}"`));
    
    // 🎯 PRIORITY 1: Look for "NUMBER💎" format anywhere
    const diamondEmojiMatch = quotedBody.match(/(\d+)\s*💎/);
    if (diamondEmojiMatch) {
        const diamonds = parseInt(diamondEmojiMatch[1]);
        console.log(`[DIAMOND-EXTRACT] ✅ PRIORITY 1 - Found by 💎 emoji: ${diamonds}💎`);
        return diamonds;
    }
    
    // 🎯 PRIORITY 2: Look for "Diamonds: NUMBER" format
    const diamondKeywordMatch = quotedBody.match(/(?:diamond|💎|qty|quantity|count|শক)[\s:]*(\d+)/i);
    if (diamondKeywordMatch) {
        const diamonds = parseInt(diamondKeywordMatch[1]);
        console.log(`[DIAMOND-EXTRACT] ✅ PRIORITY 2 - Found by keyword: ${diamonds}💎`);
        return diamonds;
    }
    
    // 🎯 PRIORITY 3: If message has 2+ lines, check 2nd line for pure number
    if (lines.length >= 2) {
        const secondLine = lines[1];
        const pureNumber = secondLine.match(/^(\d+)$/);
        if (pureNumber) {
            const diamonds = parseInt(pureNumber[1]);
            console.log(`[DIAMOND-EXTRACT] ✅ PRIORITY 3 - Found on 2nd line: ${diamonds}💎`);
            return diamonds;
        }
    }
    
    // 🎯 PRIORITY 4: Extract ANY number greater than 10 from the message
    const anyNumber = quotedBody.match(/\b(\d{2,})\b/);
    if (anyNumber) {
        const diamonds = parseInt(anyNumber[1]);
        console.log(`[DIAMOND-EXTRACT] ⚠️ PRIORITY 4 - Using any number found: ${diamonds}💎`);
        return diamonds;
    }
    
    console.log(`[DIAMOND-EXTRACT] ❌ No diamonds found in quoted message`);
    return null;
}

/**
 * Extract player ID from quoted message body
 * Priority 1: Look for "ID: NUMBER" or "Player: NUMBER" format
 * Priority 2: If message has 2+ lines, check 1st line for number
 * Priority 3: Extract any number that looks like a player ID
 */
function extractPlayerId(quotedBody) {
    if (!quotedBody) return null;
    
    console.log(`[PLAYER-EXTRACT] 🎮 Analyzing player ID: "${quotedBody.substring(0, 100)}..."`);
    
    // Split into lines
    const lines = quotedBody.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // 🎯 PRIORITY 1: Look for "ID: NUMBER" or "Player: NUMBER"
    const idKeywordMatch = quotedBody.match(/(?:id|player|শেখ|খেলোয়াড়)[\s:]*(\d+)/i);
    if (idKeywordMatch) {
        const playerId = idKeywordMatch[1];
        console.log(`[PLAYER-EXTRACT] ✅ PRIORITY 1 - Found by keyword: ${playerId}`);
        return playerId;
    }
    
    // 🎯 PRIORITY 2: If message has 2+ lines, check 1st line for number
    if (lines.length >= 1) {
        const firstLine = lines[0];
        const numberMatch = firstLine.match(/\d+/);
        if (numberMatch) {
            const playerId = numberMatch[0];
            console.log(`[PLAYER-EXTRACT] ✅ PRIORITY 2 - Found on 1st line: ${playerId}`);
            return playerId;
        }
    }
    
    // 🎯 PRIORITY 3: Extract first number in message
    const anyNumber = quotedBody.match(/\d+/);
    if (anyNumber) {
        const playerId = anyNumber[0];
        console.log(`[PLAYER-EXTRACT] ⚠️ PRIORITY 3 - Using first number: ${playerId}`);
        return playerId;
    }
    
    console.log(`[PLAYER-EXTRACT] ❌ No player ID found`);
    return null;
}

/**
 * 🔍 Find matching pending order from quoted message
 * 
 * Searches database for pending order that matches:
 * 1. User ID (quotedUserId)
 * 2. Diamond count (extracted from quoted message)
 * 3. Optional: Message ID (exact message match)
 */
function findOrderFromQuotedMessage(groupId, quotedUserId, quotedBody, quotedMessageId = null) {
    console.log(`\n[QUOTED-SEARCH] 🔍 Searching for order from quoted message`);
    console.log(`[QUOTED-SEARCH] User: ${quotedUserId}, Group: ${groupId}`);
    console.log(`[QUOTED-SEARCH] Message ID: ${quotedMessageId}`);
    
    const groupData = db.getGroupData(groupId);
    if (!groupData || !groupData.entries || groupData.entries.length === 0) {
        console.log(`[QUOTED-SEARCH] ❌ No group data found`);
        return null;
    }
    
    // Get all pending orders for this user
    const userPendingOrders = groupData.entries.filter(e => 
        e.userId === quotedUserId && 
        e.status === 'pending'
    );
    
    console.log(`[QUOTED-SEARCH] Found ${userPendingOrders.length} pending order(s) for user`);
    userPendingOrders.forEach((o, i) => {
        console.log(`[QUOTED-SEARCH]   Order ${i+1}: ${o.diamonds}💎 (ID: ${o.id}, MsgID: ${o.messageId})`);
    });
    
    if (userPendingOrders.length === 0) {
        console.log(`[QUOTED-SEARCH] ❌ No pending orders found for this user`);
        return null;
    }
    
    // 🎯 PRIORITY 1: Match by Message ID (exact match)
    if (quotedMessageId) {
        console.log(`[QUOTED-SEARCH] 🎯 PRIORITY 1: Matching by Message ID: ${quotedMessageId}`);
        const exactMatch = userPendingOrders.find(e => e.messageId === quotedMessageId);
        if (exactMatch) {
            console.log(`[QUOTED-SEARCH] ✅ FOUND by Message ID: Order ${exactMatch.id} (${exactMatch.diamonds}💎)`);
            return exactMatch;
        } else {
            console.log(`[QUOTED-SEARCH] ⚠️ Message ID not found in pending - order may have been processed already`);
        }
    }
    
    // 🎯 PRIORITY 2: Extract diamond count and match
    const diamondCount = extractDiamondCount(quotedBody);
    if (diamondCount) {
        console.log(`[QUOTED-SEARCH] 🎯 PRIORITY 2: Searching by diamond count: ${diamondCount}💎`);
        
        // Find exact match
        const exactDiamondMatch = userPendingOrders.find(e => e.diamonds === diamondCount);
        if (exactDiamondMatch) {
            console.log(`[QUOTED-SEARCH] ✅ FOUND by exact diamond count: Order ${exactDiamondMatch.id}`);
            return exactDiamondMatch;
        }
        
        // If single pending order exists, assume it's the one
        if (userPendingOrders.length === 1) {
            console.log(`[QUOTED-SEARCH] ✅ FOUND (only pending order): Order ${userPendingOrders[0].id}`);
            return userPendingOrders[0];
        }
    } else {
        console.log(`[QUOTED-SEARCH] ⚠️ Could not extract diamond count from quoted message`);
        
        // If only 1 pending order, use it
        if (userPendingOrders.length === 1) {
            console.log(`[QUOTED-SEARCH] ✅ FOUND (fallback - only pending order): Order ${userPendingOrders[0].id}`);
            return userPendingOrders[0];
        }
    }
    
    // ❌ Multiple pending orders but can't identify which one
    if (userPendingOrders.length > 1) {
        console.log(`[QUOTED-SEARCH] ❌ AMBIGUOUS: Multiple pending orders found but couldn't identify specific one`);
        console.log(`[QUOTED-SEARCH] 💡 TIP: Send the number of diamonds to identify the correct order`);
        return null;
    }
    
    console.log(`[QUOTED-SEARCH] ❌ No matching order found`);
    return null;
}

/**
 * 📡 Sync approved order to admin panel immediately
 * Ensures admin panel knows about the order before auto-approval timer
 */
async function syncOrderToAdminPanel(groupId, order, status = 'processing') {
    try {
        console.log(`[PANEL-SYNC] 📡 Syncing order ${order.id} to admin panel (Status: ${status})`);
        
        // Get group name
        const groupData = db.getGroupData(groupId);
        const groupName = groupData?.name || 'Unknown Group';
        
        // Send via API
        const response = await fetch('http://localhost:3000/api/order-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: groupId,
                groupName: groupName,
                orderId: order.id,
                userId: order.userId,
                userName: order.userName,
                diamonds: order.diamonds,
                playerIdNumber: order.playerIdNumber,
                status: status,
                rate: order.rate,
                amount: order.diamonds * (order.rate || 1),
                messageId: order.messageId,
                timestamp: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            console.log(`[PANEL-SYNC] ✅ Order synced successfully`);
            return true;
        } else {
            console.log(`[PANEL-SYNC] ⚠️ Sync response: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error(`[PANEL-SYNC] ❌ Failed to sync:`, error.message);
        return false;
    }
}

/**
 * 🔄 Broadcast order status change in real-time
 */
function broadcastOrderUpdate(orderId, status, message) {
    try {
        if (global.broadcastOrderStatusChange) {
            global.broadcastOrderStatusChange(orderId, status, message);
            console.log(`[BROADCAST] ✅ Order update broadcasted: ${orderId} → ${status}`);
        }
    } catch (error) {
        console.error(`[BROADCAST] ❌ Failed to broadcast:`, error.message);
    }
}

module.exports = {
    extractDiamondCount,
    extractPlayerId,
    findOrderFromQuotedMessage,
    syncOrderToAdminPanel,
    broadcastOrderUpdate
};
