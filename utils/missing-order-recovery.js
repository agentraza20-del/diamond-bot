/**
 * 🔍 MISSING ORDER RECOVERY WITH USER DATA
 * 
 * Handles when:
 * 1. Order is MISSING from admin panel
 * 2. Admin quotes it and says "Done"
 * 3. We recover it and show user's name
 */

const db = require('../config/database');

/**
 * Try to recover missing order when admin approves it
 * Returns order with user data, or null if not found
 */
async function recoveryMissingOrderWithUserData(groupId, quotedUserId, quotedBody, quotedMessageId, client) {
    try {
        console.log(`[MISSING-RECOVERY] 🔍 Attempting to recover missing order`);
        console.log(`[MISSING-RECOVERY] User: ${quotedUserId}, Group: ${groupId}`);
        
        const groupData = db.getGroupData(groupId);
        if (!groupData || !groupData.entries) {
            console.log(`[MISSING-RECOVERY] ❌ Group not found`);
            return null;
        }
        
        // Look for ANY entry from this user (even if not pending)
        const userOrders = groupData.entries.filter(e => e.userId === quotedUserId);
        console.log(`[MISSING-RECOVERY] Found ${userOrders.length} order(s) for user`);
        
        if (userOrders.length === 0) {
            console.log(`[MISSING-RECOVERY] ❌ No orders found for user`);
            return null;
        }
        
        // Try to find matching order by extracted diamond count
        const diamondMatch = quotedBody.match(/(\d+)\s*💎/) || quotedBody.match(/(\d+)/);
        if (diamondMatch) {
            const targetDiamonds = parseInt(diamondMatch[1]);
            console.log(`[MISSING-RECOVERY] 🎯 Looking for order with ${targetDiamonds}💎`);
            
            const matchedOrder = userOrders.find(e => e.diamonds === targetDiamonds);
            if (matchedOrder) {
                console.log(`[MISSING-RECOVERY] ✅ Found by diamond count: Order ${matchedOrder.id}`);
                
                // Fetch user name
                await enrichOrderWithUserData(matchedOrder, quotedUserId, client);
                return matchedOrder;
            }
        }
        
        // If only 1 order, use it
        if (userOrders.length === 1) {
            const order = userOrders[0];
            console.log(`[MISSING-RECOVERY] ✅ Using only order: ${order.id}`);
            
            // Fetch user name
            await enrichOrderWithUserData(order, quotedUserId, client);
            return order;
        }
        
        console.log(`[MISSING-RECOVERY] ⚠️ Multiple orders found, cannot determine which one`);
        return null;
        
    } catch (error) {
        console.error(`[MISSING-RECOVERY] ❌ Error:`, error.message);
        return null;
    }
}

/**
 * Fetch user data and enrich order with user name, contact info
 */
async function enrichOrderWithUserData(order, userId, client) {
    try {
        console.log(`[USER-ENRICHMENT] 👤 Fetching user data for: ${userId}`);
        
        if (!client) {
            console.log(`[USER-ENRICHMENT] ⚠️ Client not available, skipping enrichment`);
            return;
        }
        
        try {
            const contact = await client.getContactById(userId);
            
            if (contact) {
                // Try all possible name fields
                const name = contact.pushname || contact.name || contact.displayName || userId;
                console.log(`[USER-ENRICHMENT] ✅ Found contact: ${name}`);
                
                order.userDisplayName = name;
                order.userPhone = contact.number || contact.id;
                
                // Also save to database for future reference
                order.userName = name;
                db.saveDatabase(db.loadDatabase());
                
                console.log(`[USER-ENRICHMENT] ✅ Enriched order with user data`);
            } else {
                console.log(`[USER-ENRICHMENT] ⚠️ Contact not found`);
                order.userDisplayName = order.userName || userId;
            }
        } catch (contactErr) {
            console.log(`[USER-ENRICHMENT] ⚠️ Could not fetch contact:`, contactErr.message);
            order.userDisplayName = order.userName || userId;
        }
        
    } catch (error) {
        console.error(`[USER-ENRICHMENT] ❌ Error:`, error.message);
        order.userDisplayName = order.userName || userId;
    }
}

/**
 * Get order by message ID (including recovered missing orders)
 */
function findOrderByMessageId(groupId, messageId) {
    try {
        const groupData = db.getGroupData(groupId);
        if (!groupData || !groupData.entries) return null;
        
        return groupData.entries.find(e => e.messageId === messageId);
    } catch (error) {
        console.error(`[FIND-BY-MSGID] Error:`, error.message);
        return null;
    }
}

/**
 * List all missing pending orders (not yet processed)
 */
function listMissingPendingOrders(groupId) {
    try {
        const groupData = db.getGroupData(groupId);
        if (!groupData || !groupData.entries) return [];
        
        // Orders that are pending but might be "missing" from admin panel
        const missingOrders = groupData.entries.filter(e => 
            e.status === 'pending' && 
            (!e.messageId || e.messageId === 'unknown')
        );
        
        console.log(`[MISSING-ORDERS] Found ${missingOrders.length} potentially missing orders`);
        return missingOrders;
    } catch (error) {
        console.error(`[MISSING-ORDERS] Error:`, error.message);
        return [];
    }
}

module.exports = {
    recoveryMissingOrderWithUserData,
    enrichOrderWithUserData,
    findOrderByMessageId,
    listMissingPendingOrders
};
