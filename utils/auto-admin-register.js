/**
 * 🤖 Auto Admin Registration System
 * Automatically registers new admins when they send approval commands
 */

const db = require('../config/database');
const fs = require('fs');
const path = require('path');

const ADMINS_FILE = path.join(__dirname, '../config/admins.json');
const BLOCKED_FILE = path.join(__dirname, '../config/blocked-admins.json');

/**
 * Load blocked admins list
 */
function loadBlockedAdmins() {
    try {
        const data = fs.readFileSync(BLOCKED_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

/**
 * Check if admin is blocked
 */
function isAdminBlocked(whatsappId) {
    if (!whatsappId) return false;
    const blocked = loadBlockedAdmins();
    return blocked.some(b => 
        b.whatsappId === whatsappId || 
        b.phone === whatsappId.match(/^(\d+)/)?.[1]
    );
}

/**
 * Block an admin (remove from active admins)
 */
function blockAdmin(whatsappId, reason) {
    if (!whatsappId) return null;

    try {
        const blocked = loadBlockedAdmins();
        const phoneMatch = whatsappId.match(/^(\d+)/);
        const phone = phoneMatch ? phoneMatch[1] : whatsappId;

        // Check if already blocked
        if (blocked.some(b => b.whatsappId === whatsappId)) {
            console.log(`[BLOCKED-ADMIN] Already blocked: ${whatsappId}`);
            return blocked.find(b => b.whatsappId === whatsappId);
        }

        const blockedEntry = {
            phone: phone,
            whatsappId: whatsappId,
            blockedAt: new Date().toISOString(),
            reason: reason || 'Manual removal'
        };

        blocked.push(blockedEntry);
        fs.writeFileSync(BLOCKED_FILE, JSON.stringify(blocked, null, 2));

        console.log(`[BLOCKED-ADMIN] ✅ Admin blocked: ${whatsappId} - Reason: ${reason}`);
        return blockedEntry;
    } catch (err) {
        console.error(`[BLOCKED-ADMIN] Error blocking admin:`, err.message);
        return null;
    }
}

/**
 * Unblock an admin
 */
function unblockAdmin(whatsappId) {
    if (!whatsappId) return false;

    try {
        const blocked = loadBlockedAdmins();
        const filtered = blocked.filter(b => b.whatsappId !== whatsappId);

        if (filtered.length !== blocked.length) {
            fs.writeFileSync(BLOCKED_FILE, JSON.stringify(filtered, null, 2));
            console.log(`[BLOCKED-ADMIN] ✅ Admin unblocked: ${whatsappId}`);
            return true;
        }
        return false;
    } catch (err) {
        console.error(`[BLOCKED-ADMIN] Error unblocking admin:`, err.message);
        return false;
    }
}

/**
 * Auto-register a new admin if they're not already in the system
 * @param {string} whatsappId - The WhatsApp ID of the user
 * @param {string} userName - The display name of the user
 * @returns {object} - The admin object (existing or newly created)
 */
function autoRegisterAdmin(whatsappId, userName) {
    if (!whatsappId) return null;

    try {
        const admins = db.getAdmins();
        
        // Check if already registered
        const existing = admins.find(a => a.whatsappId === whatsappId);
        if (existing) {
            console.log(`[AUTO-ADMIN] Admin already registered: ${whatsappId}`);
            return existing;
        }

        // Extract phone from WhatsApp ID
        const phoneMatch = whatsappId.match(/^(\d+)/);
        const phone = phoneMatch ? phoneMatch[1] : whatsappId;

        // Create new admin entry
        const newAdmin = {
            phone: phone,
            whatsappId: whatsappId,
            name: userName || `Auto-Admin (${phone.slice(-6)})`,
            role: 'admin',
            addedAt: new Date().toISOString(),
            autoAdded: true
        };

        // Add to list and save
        admins.push(newAdmin);
        
        // Save to file
        fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
        
        console.log(`[AUTO-ADMIN] ✅ New admin registered: ${newAdmin.name} (${whatsappId})`);
        console.log(`[AUTO-ADMIN] Phone: ${phone}`);
        
        return newAdmin;
    } catch (err) {
        console.error(`[AUTO-ADMIN] Error registering admin:`, err.message);
        return null;
    }
}

/**
 * Check if a user is an admin, and auto-register if they send an approval command
 * @param {string} whatsappId - The WhatsApp ID
 * @param {string} userName - The user's display name
 * @param {string} messageBody - The message content
 * @returns {boolean} - True if user is (or was registered as) admin
 */
function checkAndAutoRegisterAdmin(whatsappId, userName, messageBody) {
    const approvalKeywords = ['done', 'ok', 'do', 'dn', 'yes', 'অক', 'okey', 'ওকে'];
    const isApprovalCommand = approvalKeywords.includes(messageBody.toLowerCase().trim());

    if (isApprovalCommand) {
        // Auto-register when approval command is sent
        autoRegisterAdmin(whatsappId, userName);
        return true;
    }

    // Check if already admin
    const admins = db.getAdmins();
    return admins.some(a => {
        // Match by WhatsApp ID or phone
        return a.whatsappId === whatsappId || 
               a.phone === whatsappId.match(/^(\d+)/)?.[1];
    });
}

module.exports = {
    autoRegisterAdmin,
    checkAndAutoRegisterAdmin,
    isAdminBlocked,
    blockAdmin,
    unblockAdmin,
    loadBlockedAdmins
};
