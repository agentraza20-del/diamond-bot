/**
 * Order Scan System
 * স্ক্যান করবে যেকোনো সংখ্যক order এবং দেখাবে কোনো order admin panel থেকে মিসিং হয়েছে
 * Scans orders and identifies missing or pending ones
 */

const db = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Scan all pending orders from last N orders
 * Get pending orders and check admin panel status
 */
function scanPendingOrders(groupId, limit = 50) {
    try {
        const database = db.loadDatabase();
        const group = database.groups[groupId];
        
        if (!group || !group.entries) {
            return {
                success: false,
                message: 'Group not found',
                data: []
            };
        }

        // Get last N entries
        const recentEntries = group.entries
            .slice(-limit)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Scan and categorize orders
        const scanResults = {
            totalScanned: recentEntries.length,
            pending: [],
            approved: [],
            missingInAdmin: [],
            cancelled: [],
            withIssues: []
        };

        for (const entry of recentEntries) {
            const scanItem = {
                id: entry.id,
                userId: entry.userId,
                userName: entry.userName,
                playerIdNumber: entry.playerIdNumber,
                diamonds: entry.diamonds,
                rate: entry.rate,
                status: entry.status,
                createdAt: entry.createdAt,
                messageId: entry.messageId
            };

            // Categorize based on status
            if (entry.status === 'pending') {
                scanItem.statusDisplay = '⏳ PENDING';
                scanResults.pending.push(scanItem);
            } else if (entry.status === 'approved') {
                scanItem.statusDisplay = '✅ APPROVED';
                scanItem.approvedAt = entry.approvedAt;
                scanItem.approvedBy = entry.approvedBy;
                scanResults.approved.push(scanItem);
            } else if (entry.status === 'cancelled') {
                scanItem.statusDisplay = '❌ CANCELLED';
                scanItem.cancelledAt = entry.cancelledAt;
                scanItem.cancelledBy = entry.cancelledBy;
                scanResults.cancelled.push(scanItem);
            }

            // Check if order is in admin panel
            if (entry.status === 'pending' && !isOrderInAdminPanel(entry.id)) {
                scanItem.inAdminPanel = false;
                scanItem.issue = 'Missing from Admin Panel';
                scanResults.missingInAdmin.push(scanItem);
            } else {
                scanItem.inAdminPanel = true;
            }
        }

        return {
            success: true,
            message: `Scanned ${recentEntries.length} orders`,
            summary: {
                total: scanResults.totalScanned,
                pending: scanResults.pending.length,
                approved: scanResults.approved.length,
                cancelled: scanResults.cancelled.length,
                missingFromAdmin: scanResults.missingInAdmin.length
            },
            data: scanResults
        };
    } catch (error) {
        console.error('Error scanning orders:', error);
        return {
            success: false,
            message: 'Error scanning orders',
            error: error.message
        };
    }
}

/**
 * Check if an order exists in admin panel
 * Admin panel stores approved orders locally
 */
function isOrderInAdminPanel(orderId) {
    try {
        const adminPanelDB = path.join(__dirname, '../admin-panel/test-database.json');
        
        if (!fs.existsSync(adminPanelDB)) {
            return false;
        }

        const adminData = JSON.parse(fs.readFileSync(adminPanelDB, 'utf8'));
        
        // Check if order ID exists in any admin records
        if (adminData.orders && adminData.orders.length > 0) {
            return adminData.orders.some(order => order.id === orderId);
        }
        
        return false;
    } catch (error) {
        console.error('Error checking admin panel:', error);
        return false;
    }
}

/**
 * Get detailed report of specific user's orders
 */
function getUserOrderReport(groupId, userId, limit = 50) {
    try {
        const database = db.loadDatabase();
        const group = database.groups[groupId];

        if (!group || !group.entries) {
            return {
                success: false,
                message: 'Group not found',
                data: []
            };
        }

        const userOrders = group.entries
            .filter(entry => entry.userId === userId)
            .slice(-limit)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return {
            success: true,
            userId: userId,
            userName: userOrders[0]?.userName || 'Unknown',
            totalOrders: userOrders.length,
            orders: userOrders.map(order => ({
                id: order.id,
                diamonds: order.diamonds,
                rate: order.rate,
                status: order.status,
                statusDisplay: getStatusDisplay(order.status),
                createdAt: order.createdAt,
                inAdminPanel: isOrderInAdminPanel(order.id),
                details: {
                    approvedAt: order.approvedAt,
                    approvedBy: order.approvedBy,
                    cancelledAt: order.cancelledAt,
                    cancelledBy: order.cancelledBy,
                    deliveryConfirmed: order.deliveryConfirmed
                }
            }))
        };
    } catch (error) {
        console.error('Error getting user report:', error);
        return {
            success: false,
            message: 'Error generating report',
            error: error.message
        };
    }
}

/**
 * Get orders that are pending but not in admin panel
 */
function getMissingPendingOrders(groupId) {
    try {
        const database = db.loadDatabase();
        const group = database.groups[groupId];

        if (!group || !group.entries) {
            return {
                success: false,
                message: 'Group not found',
                missingOrders: []
            };
        }

        const missingOrders = group.entries
            .filter(entry => 
                entry.status === 'pending' && 
                !isOrderInAdminPanel(entry.id)
            )
            .map(order => ({
                id: order.id,
                userId: order.userId,
                userName: order.userName,
                playerIdNumber: order.playerIdNumber,
                diamonds: order.diamonds,
                rate: order.rate,
                createdAt: order.createdAt,
                timeAgoMinutes: Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000),
                priority: 'HIGH'
            }));

        return {
            success: true,
            count: missingOrders.length,
            missingOrders: missingOrders.sort((a, b) => b.id - a.id)
        };
    } catch (error) {
        console.error('Error finding missing orders:', error);
        return {
            success: false,
            message: 'Error finding missing orders',
            error: error.message
        };
    }
}

/**
 * Helper to get status display
 */
function getStatusDisplay(status) {
    const statusMap = {
        'pending': '⏳ PENDING',
        'approved': '✅ APPROVED',
        'cancelled': '❌ CANCELLED',
        'delivered': '📦 DELIVERED',
        'failed': '❌ FAILED'
    };
    return statusMap[status] || status;
}

/**
 * Generate WhatsApp message for scan results
 */
function generateScanMessage(groupId, scanResults) {
    try {
        if (!scanResults.success) {
            return `❌ Scan failed: ${scanResults.message}`;
        }

        const { summary, data } = scanResults;
        
        let message = `📊 *ORDER SCAN REPORT*\n`;
        message += `━━━━━━━━━━━━━━━\n`;
        message += `📈 *Total Scanned:* ${summary.total}\n`;
        message += `⏳ *Pending:* ${summary.pending}\n`;
        message += `✅ *Approved:* ${summary.approved}\n`;
        message += `❌ *Cancelled:* ${summary.cancelled}\n`;
        message += `⚠️ *Missing from Admin:* ${summary.missingFromAdmin}\n\n`;

        // Pending orders
        if (data.pending.length > 0) {
            message += `*⏳ PENDING ORDERS (${data.pending.length}):*\n`;
            data.pending.slice(0, 10).forEach(order => {
                message += `• ${order.userName} - ${order.diamonds} 💎 (${order.playerIdNumber})\n`;
            });
            if (data.pending.length > 10) {
                message += `• ... and ${data.pending.length - 10} more\n`;
            }
            message += `\n`;
        }

        // Missing orders
        if (data.missingInAdmin.length > 0) {
            message += `*⚠️ MISSING FROM ADMIN PANEL (${data.missingInAdmin.length}):*\n`;
            data.missingInAdmin.slice(0, 5).forEach(order => {
                message += `• ${order.userName} - ${order.diamonds} 💎\n`;
            });
            if (data.missingInAdmin.length > 5) {
                message += `• ... and ${data.missingInAdmin.length - 5} more\n`;
            }
        }

        return message;
    } catch (error) {
        console.error('Error generating message:', error);
        return '❌ Error generating scan report';
    }
}

module.exports = {
    scanPendingOrders,
    getUserOrderReport,
    getMissingPendingOrders,
    isOrderInAdminPanel,
    generateScanMessage,
    getStatusDisplay
};
