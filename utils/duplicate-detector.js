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
        // ⏸️ DISABLED: Allow user to order same diamonds again after approval
        // const approvedForSameDiamonds = group.entries.find(e =>
        //     e.userId === userId &&
        //     e.diamonds === diamonds &&
        //     (e.status === 'approved' || e.status === 'processing')
        // );

        // if (approvedForSameDiamonds) {
        //     return {
        //         isDuplicate: true,
        //         reason: 'ALREADY_APPROVED',
        //         originalOrderId: approvedForSameDiamonds.id,
        //         originalStatus: approvedForSameDiamonds.status,
        //         message: `✅ আপনার ${approvedForSameDiamonds.diamonds} হীরার অর্ডার ইতিমধ্যে ${approvedForSameDiamonds.status} আছে।`
        //     };
        // }

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

// 🤖 AUTO DUPLICATE SCAN - Periodically scan LAST 5 ORDERS for duplicates
// Runs every 15 seconds to catch any duplicate orders that slipped through
// Only checks recent orders for better performance
const autoDuplicateScanTimers = {};

async function startAutoDuplicateScan(groupId) {
    try {
        // Create unique key for this group
        const scanKey = `duplicate-scan-${groupId}`;
        
        // Clear any existing timer
        if (autoDuplicateScanTimers[scanKey]) {
            clearInterval(autoDuplicateScanTimers[scanKey]);
        }
        
        // Set up interval to scan every 15 seconds
        autoDuplicateScanTimers[scanKey] = setInterval(async () => {
            try {
                const database = db.loadDatabase();
                const group = database.groups[groupId];
                
                if (!group || !group.entries || group.entries.length < 2) {
                    return; // Not enough orders to check for duplicates
                }
                
                // 🔍 IMPORTANT: Only check LAST 5 ORDERS (not all)
                // Sort by ID (newest first) and take only last 5
                const last5Orders = group.entries
                    .sort((a, b) => b.id - a.id)
                    .slice(0, 5);
                
                if (last5Orders.length < 2) {
                    return; // Need at least 2 orders to check
                }
                
                console.log(`[AUTO-DUPLICATE-SCAN] 🔍 Scanning last ${last5Orders.length} orders in group ${groupId.substring(0, 20)}...`);
                
                let duplicatesFound = 0;
                let duplicatesRemoved = 0;
                
                // Track processed orders to avoid checking same pair twice
                const processedPairs = new Set();
                
                // Check each order against others (only from last 5)
                for (let i = 0; i < last5Orders.length; i++) {
                    for (let j = i + 1; j < last5Orders.length; j++) {
                        const order1 = last5Orders[i];
                        const order2 = last5Orders[j];
                        
                        // Skip if already processed
                        const pairKey = `${order1.id}-${order2.id}`;
                        if (processedPairs.has(pairKey)) continue;
                        processedPairs.add(pairKey);
                        
                        // Check for duplicates
                        const isDuplicate = checkIfDuplicatePair(order1, order2);
                        
                        if (isDuplicate.duplicate) {
                            duplicatesFound++;
                            
                            // Remove the newer/duplicate one (keep the first one)
                            const newerOrder = new Date(order1.createdAt) > new Date(order2.createdAt) ? order1 : order2;
                            const olderOrder = newerOrder === order1 ? order2 : order1;
                            
                            console.log(`[AUTO-DUPLICATE-SCAN] 🚨 DUPLICATE FOUND!`);
                            console.log(`[AUTO-DUPLICATE-SCAN]    Reason: ${isDuplicate.reason}`);
                            console.log(`[AUTO-DUPLICATE-SCAN]    🟢 Order 1 (KEEP): ID=${olderOrder.id}, User=${olderOrder.userName}, Diamonds=${olderOrder.diamonds}💎, Time=${new Date(olderOrder.createdAt).toLocaleString()}`);
                            console.log(`[AUTO-DUPLICATE-SCAN]    🔴 Order 2 (DELETE): ID=${newerOrder.id}, User=${newerOrder.userName}, Diamonds=${newerOrder.diamonds}💎, Time=${new Date(newerOrder.createdAt).toLocaleString()}`);
                            
                            // Find and remove the newer duplicate from FULL database (not just last5)
                            const fullGroupEntries = group.entries;
                            const newerIndexInFull = fullGroupEntries.findIndex(e => e.id === newerOrder.id);
                            
                            if (newerIndexInFull !== -1) {
                                fullGroupEntries.splice(newerIndexInFull, 1);
                                duplicatesRemoved++;
                                console.log(`[AUTO-DUPLICATE-SCAN] ✅ Removed newer duplicate Order ${newerOrder.id}`);
                            }
                        }
                    }
                }
                
                // Save if any duplicates were removed
                if (duplicatesRemoved > 0) {
                    db.saveDatabase(database);
                    console.log(`[AUTO-DUPLICATE-SCAN] 📊 Summary: ${duplicatesFound} duplicates found, ${duplicatesRemoved} removed from group`);
                } else if (last5Orders.length >= 2) {
                    console.log(`[AUTO-DUPLICATE-SCAN] ✅ No duplicates in last ${last5Orders.length} orders`);
                }
                
            } catch (error) {
                console.error(`[AUTO-DUPLICATE-SCAN] ❌ Error during scan:`, error.message);
            }
        }, 15000); // Run every 15 seconds
        
        console.log(`[AUTO-DUPLICATE-SCAN] ✅ Auto-scan started for group (checking last 5 orders every 15 seconds)`);
        
    } catch (error) {
        console.error(`[AUTO-DUPLICATE-SCAN] ❌ Failed to start auto-scan:`, error.message);
    }
}

/**
 * Check if two orders are duplicates
 * Returns: { duplicate: boolean, reason: string }
 */
function checkIfDuplicatePair(order1, order2) {
    try {
        // Rule 1: Same user, same diamonds, within 5 minutes
        if (order1.userId === order2.userId && order1.diamonds === order2.diamonds) {
            const time1 = new Date(order1.createdAt).getTime();
            const time2 = new Date(order2.createdAt).getTime();
            const timeDiff = Math.abs(time2 - time1);
            const fiveMinutes = 5 * 60 * 1000;
            
            if (timeDiff < fiveMinutes) {
                return {
                    duplicate: true,
                    reason: 'SAME_USER_SAME_DIAMONDS_WITHIN_5MIN'
                };
            }
        }
        
        // Rule 2: Same messageId
        if (order1.messageId && order2.messageId && order1.messageId === order2.messageId) {
            return {
                duplicate: true,
                reason: 'SAME_MESSAGE_ID'
            };
        }
        
        // Rule 3: Same user, same diamonds, but in processing/approved (shouldn't happen but extra check)
        if (order1.userId === order2.userId && 
            order1.diamonds === order2.diamonds &&
            (order1.status === 'approved' || order1.status === 'processing') &&
            (order2.status === 'approved' || order2.status === 'processing')) {
            return {
                duplicate: true,
                reason: 'SAME_USER_DIAMONDS_BOTH_PROCESSING'
            };
        }
        
        return { duplicate: false };
    } catch (error) {
        console.error('Error checking duplicate pair:', error);
        return { duplicate: false };
    }
}

/**
 * Stop auto-scan for a group
 */
function stopAutoDuplicateScan(groupId) {
    try {
        const scanKey = `duplicate-scan-${groupId}`;
        if (autoDuplicateScanTimers[scanKey]) {
            clearInterval(autoDuplicateScanTimers[scanKey]);
            delete autoDuplicateScanTimers[scanKey];
            console.log(`[AUTO-DUPLICATE-SCAN] ⏹️ Auto-scan stopped for group ${groupId}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('[AUTO-DUPLICATE-SCAN] Error stopping scan:', error);
        return false;
    }
}

module.exports = {
    isDuplicateOrder,
    markOrderSentToAdmin,
    startAutoDuplicateScan,
    stopAutoDuplicateScan,
    checkIfDuplicatePair,
    getMissingFromAdminPanel
};
