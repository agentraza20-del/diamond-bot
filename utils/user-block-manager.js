/**
 * 🚫 User Block Management System
 * Block users from using the bot (only admins can approve after blocking)
 */

const fs = require('fs');
const path = require('path');

const BLOCKED_USERS_FILE = path.join(__dirname, '../config/blocked-users.json');

/**
 * Initialize blocked users file if it doesn't exist
 */
function initializeBlockedUsersFile() {
    if (!fs.existsSync(BLOCKED_USERS_FILE)) {
        fs.writeFileSync(BLOCKED_USERS_FILE, JSON.stringify([], null, 2));
    }
}

/**
 * Load all blocked users
 */
function loadBlockedUsers() {
    try {
        if (!fs.existsSync(BLOCKED_USERS_FILE)) {
            initializeBlockedUsersFile();
        }
        const data = fs.readFileSync(BLOCKED_USERS_FILE, 'utf8');
        return JSON.parse(data) || [];
    } catch (err) {
        console.error('[USER-BLOCK] Error loading blocked users:', err.message);
        return [];
    }
}

/**
 * Check if a user is blocked
 * @param {string} whatsappId - The WhatsApp ID or phone number
 * @returns {object|null} - Blocked user object if blocked, null otherwise
 */
function isUserBlocked(whatsappId) {
    if (!whatsappId) return null;
    
    const blocked = loadBlockedUsers();
    const phoneMatch = whatsappId.match(/^(\d+)/);
    const phone = phoneMatch ? phoneMatch[1] : whatsappId;

    return blocked.find(b => 
        b.whatsappId === whatsappId || 
        b.phone === phone ||
        b.whatsappId === phone
    ) || null;
}

/**
 * Block a user
 * @param {string} whatsappId - The WhatsApp ID
 * @param {string} phone - The phone number
 * @param {string} reason - Reason for blocking
 * @returns {object} - Blocked user entry
 */
function blockUser(whatsappId, phone, reason = 'Account removed') {
    if (!whatsappId && !phone) {
        console.error('[USER-BLOCK] ❌ Must provide whatsappId or phone');
        return null;
    }

    try {
        const blocked = loadBlockedUsers();
        const phoneMatch = whatsappId?.match(/^(\d+)/);
        const phoneNum = phone || (phoneMatch ? phoneMatch[1] : null);

        // Check if already blocked
        if (isUserBlocked(whatsappId)) {
            console.log(`[USER-BLOCK] Already blocked: ${whatsappId || phoneNum}`);
            return isUserBlocked(whatsappId);
        }

        const blockedEntry = {
            phone: phoneNum,
            whatsappId: whatsappId || phoneNum,
            blockedAt: new Date().toISOString(),
            reason: reason
        };

        blocked.push(blockedEntry);
        fs.writeFileSync(BLOCKED_USERS_FILE, JSON.stringify(blocked, null, 2));

        console.log(`[USER-BLOCK] ✅ User blocked: ${phoneNum || whatsappId} - Reason: ${reason}`);
        return blockedEntry;
    } catch (err) {
        console.error('[USER-BLOCK] Error blocking user:', err.message);
        return null;
    }
}

/**
 * Block multiple users by phone numbers
 * @param {array} phoneNumbers - Array of phone numbers to block
 * @param {string} reason - Reason for blocking
 * @returns {array} - Array of blocked user entries
 */
function blockMultipleUsers(phoneNumbers, reason = 'Account removed') {
    if (!Array.isArray(phoneNumbers)) {
        console.error('[USER-BLOCK] ❌ Phone numbers must be an array');
        return [];
    }

    const blockedEntries = [];
    phoneNumbers.forEach(phone => {
        const entry = blockUser(null, phone, reason);
        if (entry) {
            blockedEntries.push(entry);
        }
    });

    return blockedEntries;
}

/**
 * Unblock a user
 * @param {string} whatsappId - The WhatsApp ID or phone number
 * @returns {boolean} - True if unblocked successfully
 */
function unblockUser(whatsappId) {
    if (!whatsappId) return false;

    try {
        const blocked = loadBlockedUsers();
        const phoneMatch = whatsappId.match(/^(\d+)/);
        const phone = phoneMatch ? phoneMatch[1] : whatsappId;

        const filtered = blocked.filter(b => 
            b.whatsappId !== whatsappId && 
            b.phone !== phone &&
            b.whatsappId !== phone
        );

        if (filtered.length !== blocked.length) {
            fs.writeFileSync(BLOCKED_USERS_FILE, JSON.stringify(filtered, null, 2));
            console.log(`[USER-BLOCK] ✅ User unblocked: ${whatsappId}`);
            return true;
        }
        return false;
    } catch (err) {
        console.error('[USER-BLOCK] Error unblocking user:', err.message);
        return false;
    }
}

/**
 * Delete all blocked users
 * @returns {boolean} - True if successful
 */
function deleteAllBlockedUsers() {
    try {
        fs.writeFileSync(BLOCKED_USERS_FILE, JSON.stringify([], null, 2));
        console.log('[USER-BLOCK] ✅ All blocked users deleted');
        return true;
    } catch (err) {
        console.error('[USER-BLOCK] Error deleting blocked users:', err.message);
        return false;
    }
}

/**
 * Get all blocked users
 * @returns {array} - Array of blocked users
 */
function getAllBlockedUsers() {
    return loadBlockedUsers();
}

/**
 * Get blocked user count
 * @returns {number} - Number of blocked users
 */
function getBlockedUserCount() {
    return loadBlockedUsers().length;
}

module.exports = {
    initializeBlockedUsersFile,
    isUserBlocked,
    blockUser,
    blockMultipleUsers,
    unblockUser,
    deleteAllBlockedUsers,
    getAllBlockedUsers,
    getBlockedUserCount,
    loadBlockedUsers
};
