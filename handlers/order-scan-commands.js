/**
 * Order Scan Commands Handler
 * Advanced commands for order scanning and monitoring
 */

const { scanPendingOrders, getUserOrderReport, getMissingPendingOrders, generateScanMessage } = require('../utils/order-scan-system');
const { replyWithDelay, sendMessageWithDelay } = require('../utils/delay-helper');
const db = require('../config/database');

/**
 * Handle scan command with various options
 * /scan - scan last 50 orders
 * /scan 100 - scan last 100 orders
 * /scan @user - scan specific user's orders
 * /scan missing - scan for missing orders only
 * /scan report - get detailed report
 */
async function handleScanCommand(msg, fromUserId, groupId, command) {
    try {
        const parts = command.toLowerCase().trim().split(' ');
        const action = parts[1] || 'general';

        // Parse arguments
        let limit = 50;
        let option = null;

        if (parts.length > 1) {
            // Check if second arg is a number
            if (/^\d+$/.test(parts[1])) {
                limit = Math.min(parseInt(parts[1]), 200); // Cap at 200
            } else {
                option = parts[1];
            }
        }

        // Execute specific scan
        if (option === 'missing') {
            return handleMissingScan(msg, groupId);
        } else if (option === 'report') {
            return handleDetailedReport(msg, groupId, limit);
        } else if (option === 'stats') {
            return handleOrderStats(msg, groupId);
        } else if (option === 'pending') {
            return handlePendingOnlyScan(msg, groupId, limit);
        } else {
            // General scan
            const result = scanPendingOrders(groupId, limit);
            return generateScanMessage(groupId, result);
        }
    } catch (error) {
        console.error('[SCAN-HANDLER] Error:', error);
        return `❌ স্ক্যান ব্যর্থ: ${error.message}`;
    }
}

/**
 * Scan for missing pending orders only
 */
function handleMissingScan(msg, groupId) {
    try {
        const result = getMissingPendingOrders(groupId);

        if (!result.success) {
            return `❌ ${result.message}`;
        }

        if (result.count === 0) {
            return `✅ *কোনো মিসিং অর্ডার নেই!*\nসব অর্ডার Admin Panel এ আছে।`;
        }

        let response = `⚠️ *MISSING PENDING ORDERS (${result.count}):*\n`;
        response += `━━━━━━━━━━━━━━━━━━\n\n`;

        result.missingOrders.slice(0, 20).forEach((order, idx) => {
            response += `${idx + 1}. 👤 ${order.userName}\n`;
            response += `   💎 ${order.diamonds} Diamond\n`;
            response += `   🆔 Player: ${order.playerIdNumber}\n`;
            response += `   ⏱️ ${order.timeAgoMinutes} মিনিট আগে\n`;
            response += `   🔴 *PRIORITY: HIGH*\n\n`;
        });

        if (result.missingOrders.length > 20) {
            response += `\n... এবং আরও *${result.missingOrders.length - 20}টি* অর্ডার\n`;
        }

        response += `\n💡 এই অর্ডারগুলো এখনও Admin Panel এ দেখা যাচ্ছে না।\n`;
        response += `এগুলো পরীক্ষা করে Admin Panel এ যোগ করুন।`;

        return response;
    } catch (error) {
        console.error('[MISSING-SCAN] Error:', error);
        return `❌ ত্রুটি: ${error.message}`;
    }
}

/**
 * Scan pending orders only
 */
function handlePendingOnlyScan(msg, groupId, limit) {
    try {
        const result = scanPendingOrders(groupId, limit);

        if (!result.success) {
            return `❌ ${result.message}`;
        }

        const pending = result.data.pending;

        if (pending.length === 0) {
            return `✅ *কোনো পেন্ডিং অর্ডার নেই!*\nসব অর্ডার প্রসেস হয়েছে।`;
        }

        let response = `⏳ *PENDING ORDERS (${pending.length}):*\n`;
        response += `━━━━━━━━━━━━━━━━━━\n\n`;

        pending.slice(0, 25).forEach((order, idx) => {
            response += `${idx + 1}. 👤 ${order.userName}\n`;
            response += `   💎 ${order.diamonds}💎 @ ৳${order.rate}\n`;
            response += `   🆔 ID: ${order.playerIdNumber}\n`;
            response += `   📅 ${new Date(order.createdAt).toLocaleString('bn-BD')}\n\n`;
        });

        if (pending.length > 25) {
            response += `\n... এবং *${pending.length - 25}টি* আরও পেন্ডিং অর্ডার\n`;
        }

        return response;
    } catch (error) {
        console.error('[PENDING-SCAN] Error:', error);
        return `❌ ত্রুটি: ${error.message}`;
    }
}

/**
 * Generate detailed order statistics
 */
function handleOrderStats(msg, groupId) {
    try {
        const database = db.loadDatabase();
        const group = database.groups[groupId];

        if (!group || !group.entries) {
            return `❌ গ্রুপ ডেটা পাওয়া যায়নি`;
        }

        const entries = group.entries;
        const stats = {
            total: entries.length,
            pending: entries.filter(e => e.status === 'pending').length,
            approved: entries.filter(e => e.status === 'approved').length,
            cancelled: entries.filter(e => e.status === 'cancelled').length,
            delivered: entries.filter(e => e.status === 'delivered').length,
            totalDiamonds: 0,
            totalAmount: 0
        };

        // Calculate totals
        entries.forEach(entry => {
            stats.totalDiamonds += entry.diamonds || 0;
            stats.totalAmount += (entry.diamonds * entry.rate) || 0;
        });

        // Get unique users
        const uniqueUsers = new Set(entries.map(e => e.userId)).size;

        // Get today's stats
        const today = new Date().toDateString();
        const todayEntries = entries.filter(e => 
            new Date(e.createdAt).toDateString() === today
        );

        let response = `📊 *ORDER STATISTICS*\n`;
        response += `━━━━━━━━━━━━━━━━━\n\n`;
        response += `📈 *Overall:*\n`;
        response += `   📦 Total Orders: ${stats.total}\n`;
        response += `   👥 Unique Users: ${uniqueUsers}\n`;
        response += `   💎 Total Diamonds: ${stats.totalDiamonds}💎\n`;
        response += `   💰 Total Amount: ৳${stats.totalAmount.toFixed(2)}\n\n`;

        response += `🎯 *Status Breakdown:*\n`;
        response += `   ⏳ Pending: ${stats.pending} (${((stats.pending/stats.total)*100).toFixed(1)}%)\n`;
        response += `   ✅ Approved: ${stats.approved} (${((stats.approved/stats.total)*100).toFixed(1)}%)\n`;
        response += `   ❌ Cancelled: ${stats.cancelled} (${((stats.cancelled/stats.total)*100).toFixed(1)}%)\n`;
        response += `   📦 Delivered: ${stats.delivered} (${((stats.delivered/stats.total)*100).toFixed(1)}%)\n\n`;

        response += `📅 *Today's Activity:*\n`;
        response += `   Orders: ${todayEntries.length}\n`;
        response += `   Diamonds: ${todayEntries.reduce((sum, e) => sum + (e.diamonds || 0), 0)}💎\n`;

        return response;
    } catch (error) {
        console.error('[STATS] Error:', error);
        return `❌ ত্রুটি: ${error.message}`;
    }
}

/**
 * Generate detailed report with multiple sections
 */
function handleDetailedReport(msg, groupId, limit) {
    try {
        const result = scanPendingOrders(groupId, limit);

        if (!result.success) {
            return `❌ ${result.message}`;
        }

        const { data, summary } = result;

        let response = `📋 *DETAILED ORDER REPORT*\n`;
        response += `━━━━━━━━━━━━━━━━━━\n\n`;

        response += `📊 *Summary:*\n`;
        response += `   Total Scanned: ${summary.total}\n`;
        response += `   ⏳ Pending: ${summary.pending}\n`;
        response += `   ✅ Approved: ${summary.approved}\n`;
        response += `   ❌ Cancelled: ${summary.cancelled}\n`;
        response += `   ⚠️ Missing: ${summary.missingFromAdmin}\n\n`;

        // Critical section - Missing orders
        if (data.missingInAdmin.length > 0) {
            response += `🚨 *CRITICAL - Missing from Admin Panel:*\n`;
            data.missingInAdmin.slice(0, 8).forEach(order => {
                response += `   • ${order.userName} - ${order.diamonds}💎\n`;
            });
            if (data.missingInAdmin.length > 8) {
                response += `   • ... and ${data.missingInAdmin.length - 8} more\n`;
            }
            response += `\n`;
        }

        // Pending section
        if (data.pending.length > 0) {
            response += `⏳ *Pending Orders (${data.pending.length}):*\n`;
            data.pending.slice(0, 5).forEach(order => {
                response += `   • ${order.userName} - ${order.diamonds}💎\n`;
            });
            if (data.pending.length > 5) {
                response += `   • ... and ${data.pending.length - 5} more\n`;
            }
            response += `\n`;
        }

        response += `✅ Run /scan for more details`;

        return response;
    } catch (error) {
        console.error('[DETAILED-REPORT] Error:', error);
        return `❌ ত্রুটি: ${error.message}`;
    }
}

/**
 * Get list of all scan commands available
 */
function getScanCommandHelp() {
    return `🔍 *ORDER SCAN COMMANDS*\n\n` +
        `*Basic Usage:*\n` +
        `/scan - স্ক্যান করুন সর্বশেষ 50 অর্ডার\n` +
        `/scan 100 - স্ক্যান করুন সর্বশেষ 100 অর্ডার\n\n` +

        `*Advanced Options:*\n` +
        `/scan missing - শুধু মিসিং অর্ডার খুঁজুন\n` +
        `/scan pending - শুধু পেন্ডিং অর্ডার খুঁজুন\n` +
        `/scan stats - অর্ডার পরিসংখ্যান দেখুন\n` +
        `/scan report - বিস্তারিত রিপোর্ট তৈরি করুন\n\n` +

        `💡 *Admin Only* - শুধুমাত্র Admin রা এই কমান্ড ব্যবহার করতে পারে`;
}

module.exports = {
    handleScanCommand,
    handleMissingScan,
    handlePendingOnlyScan,
    handleOrderStats,
    handleDetailedReport,
    getScanCommandHelp
};
