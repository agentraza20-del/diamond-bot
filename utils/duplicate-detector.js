/**
 * Duplicate Order Detection System
 * Prevents duplicate orders and tracks offline orders
 * 
 * Features:
 * 1. Detect duplicate orders within time window
 * 2. Track approved/processing orders to prevent re-submission
 * 3. Detect offline orders that went unprocessed
 * 4. Auto-rescan and resend missing orders
 */

const db = require('../config/database');
const FeatureToggleManager = require('./feature-toggle-manager');

/**
 * Check if order is duplicate
 * An order is duplicate if:
 * - Same user submitted same diamonds within 5 minutes
 * - Order was already approved/processing
 * - Same messageId (offline order resubmitted)
 */
function isDuplicateOrder(groupId, userId, diamonds, messageId) {
    try {
        const database = db.loadDatabase();
        const group = database.groups[groupId];
        
        if (!group || !group.entries) {
            return { isDuplicate: false };
        }

        const now = new Date().getTime();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        // Check recent entries from same user
        const recentUserEntries = group.entries.filter(entry => {
            const entryTime = new Date(entry.createdAt).getTime();
            return entry.userId === userId && entryTime > fiveMinutesAgo;
        });

        for (const recent of recentUserEntries) {
            // Same diamonds within 5 minutes = DUPLICATE
            if (recent.diamonds === diamonds) {
                return {
                    isDuplicate: true,
                    reason: 'DUPLICATE_SUBMISSION',
                    originalOrderId: recent.id,
                    originalStatus: recent.status,
                    timeDiffSeconds: Math.floor((now - new Date(recent.createdAt).getTime()) / 1000),
                    message: `⚠️ আপনি ${recent.diamonds} হীরা মাত্র ${Math.floor((now - new Date(recent.createdAt).getTime()) / 1000)} সেকেন্ড আগে জমা দিয়েছেন। অপেক্ষা করুন..`
                };
            }
        }

        // Check if same order (messageId) is being resubmitted
        if (messageId) {
            const existingWithMessageId = group.entries.find(e => 
                e.messageId === messageId && 
                (e.status === 'approved' || e.status === 'processing' || e.status === 'pending')
            );
            
            if (existingWithMessageId) {
                return {
                    isDuplicate: true,
                    reason: 'OFFLINE_ORDER_RESUBMIT',
                    originalOrderId: existingWithMessageId.id,
                    originalStatus: existingWithMessageId.status,
                    message: `✅ এই অর্ডার ইতিমধ্যে ${existingWithMessageId.status} অবস্থায় আছে। দয়া করে নতুন অর্ডার পাঠান।`
                };
            }
        }

        // Check if user has approved order for same diamonds
        const approvedForSameDiamonds = group.entries.find(e =>
            e.userId === userId &&
            e.diamonds === diamonds &&
            (e.status === 'approved' || e.status === 'processing')
        );

        if (approvedForSameDiamonds) {
            return {
                isDuplicate: true,
                reason: 'ALREADY_APPROVED',
                originalOrderId: approvedForSameDiamonds.id,
                originalStatus: approvedForSameDiamonds.status,
                message: `✅ আপনার ${approvedForSameDiamonds.diamonds} হীরার অর্ডার ইতিমধ্যে ${approvedForSameDiamonds.status} আছে।`
            };
        }

        return { isDuplicate: false };
    } catch (error) {
        console.error('Error checking duplicate:', error);
        return { isDuplicate: false };
    }
}

/**
 * Mark order as successfully sent to admin panel
 * This helps track which orders reached admin safely
 */
function markOrderSentToAdmin(groupId, orderId) {
    try {
        const database = db.loadDatabase();
        const group = database.groups[groupId];
        
        if (!group || !group.entries) return false;

        const entry = group.entries.find(e => e.id === orderId);
        if (entry) {
            entry.sentToAdminPanel = true;
            entry.sentToAdminAt = new Date().toISOString();
            db.saveDatabase(database);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error marking order:', error);
        return false;
    }
}

/**
 * Get orders that were never received in admin panel
 * These are critical orders that need resending
 */
function getMissingFromAdminPanel(groupId, ageMinutes = 5) {
    try {
        const database = db.loadDatabase();
        const group = database.groups[groupId];
        
        if (!group || !group.entries) {
            return [];
        }

        const now = new Date().getTime();
        const ageMs = ageMinutes * 60 * 1000;

        return group.entries.filter(entry => {
            const entryTime = new Date(entry.createdAt).getTime();
            const isOldEnough = (now - entryTime) > ageMs;
            const neverReachedAdmin = !entry.sentToAdminPanel;
            
            return isOldEnough && neverReachedAdmin && entry.status === 'pending';
        });
    } catch (error) {
        console.error('Error getting missing orders:', error);
        return [];
    }
}

module.exports = {
    isDuplicateOrder,
    markOrderSentToAdmin
};
