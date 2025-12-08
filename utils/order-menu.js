// Order Menu System - Show offline detected orders
// This file handles showing orders in admin panel's order menu

const db = require('../config/database');

// Get all pending orders for order menu
function getPendingOrders() {
    try {
        const database = db.loadDatabase();
        if (!database.groups) {
            return [];
        }

        const allOrders = [];

        // Collect all pending orders from all groups
        for (const [groupId, groupData] of Object.entries(database.groups)) {
            if (!groupData.entries) continue;

            for (const entry of groupData.entries) {
                // Only show pending orders (not deleted, not cancelled)
                if (entry.status === 'pending' || entry.status === 'processing') {
                    allOrders.push({
                        id: entry.id,
                        userId: entry.userId,
                        userName: entry.userName,
                        userPhone: entry.userPhone || '', // Include extracted phone number
                        diamonds: entry.diamonds,
                        rate: entry.rate || 100,
                        amount: entry.diamonds * (entry.rate || 100),
                        status: entry.status,
                        createdAt: entry.createdAt,
                        groupId: groupId,
                        source: entry.source || 'normal', // 'normal' or 'offline'
                        messageId: entry.messageId
                    });
                }
            }
        }

        // Sort by creation time (newest first)
        allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return allOrders;
    } catch (error) {
        console.error('[ORDER MENU] Error getting pending orders:', error.message);
        return [];
    }
}

// Get all orders with full details for admin view
function getAllOrders() {
    try {
        const database = db.loadDatabase();
        if (!database.groups) {
            return [];
        }

        const allOrders = [];

        // Collect all orders from all groups
        for (const [groupId, groupData] of Object.entries(database.groups)) {
            if (!groupData.entries) continue;

            for (const entry of groupData.entries) {
                allOrders.push({
                    id: entry.id,
                    userId: entry.userId,
                    userName: entry.userName,
                    userPhone: entry.userPhone || '', // Include extracted phone number
                    diamonds: entry.diamonds,
                    rate: entry.rate || 100,
                    amount: entry.diamonds * (entry.rate || 100),
                    status: entry.status,
                    createdAt: entry.createdAt,
                    groupId: groupId,
                    source: entry.source || 'normal',
                    messageId: entry.messageId,
                    approvedAt: entry.approvedAt,
                    deliveryConfirmed: entry.deliveryConfirmed
                });
            }
        }

        // Sort by creation time (newest first)
        allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return allOrders;
    } catch (error) {
        console.error('[ORDER MENU] Error getting all orders:', error.message);
        return [];
    }
}

// Get orders by status
function getOrdersByStatus(status) {
    try {
        const allOrders = getAllOrders();
        return allOrders.filter(o => o.status === status);
    } catch (error) {
        console.error('[ORDER MENU] Error filtering orders:', error.message);
        return [];
    }
}

// Get offline orders specifically
function getOfflineOrders() {
    try {
        const allOrders = getAllOrders();
        return allOrders.filter(o => o.source === 'offline' && (o.status === 'pending' || o.status === 'processing'));
    } catch (error) {
        console.error('[ORDER MENU] Error getting offline orders:', error.message);
        return [];
    }
}

// Get order by ID with full details
function getOrderById(orderId) {
    try {
        const database = db.loadDatabase();
        if (!database.groups) {
            return null;
        }

        for (const [groupId, groupData] of Object.entries(database.groups)) {
            if (!groupData.entries) continue;

            for (const entry of groupData.entries) {
                if (entry.id === parseInt(orderId) || entry.id === orderId) {
                    return {
                        id: entry.id,
                        userId: entry.userId,
                        userName: entry.userName,
                        diamonds: entry.diamonds,
                        rate: entry.rate || 100,
                        amount: entry.diamonds * (entry.rate || 100),
                        status: entry.status,
                        createdAt: entry.createdAt,
                        groupId: groupId,
                        source: entry.source || 'normal',
                        messageId: entry.messageId,
                        approvedAt: entry.approvedAt,
                        deliveryConfirmed: entry.deliveryConfirmed,
                        processingStartedAt: entry.processingStartedAt
                    };
                }
            }
        }

        return null;
    } catch (error) {
        console.error('[ORDER MENU] Error getting order by ID:', error.message);
        return null;
    }
}

// Get order count summary
function getOrderCountSummary() {
    try {
        const allOrders = getAllOrders();
        const summary = {
            total: allOrders.length,
            pending: 0,
            processing: 0,
            approved: 0,
            cancelled: 0,
            deleted: 0,
            offline: 0
        };

        for (const order of allOrders) {
            summary[order.status]++;
            if (order.source === 'offline') {
                summary.offline++;
            }
        }

        return summary;
    } catch (error) {
        console.error('[ORDER MENU] Error getting count summary:', error.message);
        return {
            total: 0,
            pending: 0,
            processing: 0,
            approved: 0,
            cancelled: 0,
            deleted: 0,
            offline: 0
        };
    }
}

// Mark order as source (normal or offline)
function markOrderSource(orderId, source = 'normal') {
    try {
        const database = db.loadDatabase();
        if (!database.groups) return false;

        for (const [groupId, groupData] of Object.entries(database.groups)) {
            if (!groupData.entries) continue;

            for (const entry of groupData.entries) {
                if (entry.id === parseInt(orderId) || entry.id === orderId) {
                    entry.source = source;
                    db.saveDatabase(database);
                    console.log(`[ORDER MENU] Marked order ${orderId} as ${source}`);
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        console.error('[ORDER MENU] Error marking order source:', error.message);
        return false;
    }
}

// Get dashboard stats
function getDashboardStats() {
    try {
        const summary = getOrderCountSummary();
        const pendingOrders = getOrdersByStatus('pending');
        const offlineOrders = getOfflineOrders();
        
        // Calculate total amount
        const totalAmount = pendingOrders.reduce((sum, o) => sum + o.amount, 0);
        const offlineAmount = offlineOrders.reduce((sum, o) => sum + o.amount, 0);

        return {
            summary: summary,
            totalAmount: totalAmount,
            offlineAmount: offlineAmount,
            offlineCount: offlineOrders.length,
            newestOrders: getAllOrders().slice(0, 5)
        };
    } catch (error) {
        console.error('[ORDER MENU] Error getting dashboard stats:', error.message);
        return {
            summary: {},
            totalAmount: 0,
            offlineAmount: 0,
            offlineCount: 0,
            newestOrders: []
        };
    }
}

module.exports = {
    getPendingOrders,
    getAllOrders,
    getOrdersByStatus,
    getOfflineOrders,
    getOrderById,
    getOrderCountSummary,
    markOrderSource,
    getDashboardStats
};
