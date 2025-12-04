/**
 * 🤖 Auto Admin Registration System
 * Automatically registers new admins when they send approval commands
 */

const db = require('../config/database');
const fs = require('fs');
const path = require('path');

const ADMINS_FILE = path.join(__dirname, '../config/admins.json');

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

        // ❌ SECURITY: Don't auto-register if phone is in the removed list
        const REMOVED_ADMINS = ['8801721016186'];
        if (REMOVED_ADMINS.includes(phone)) {
            console.log(`[AUTO-ADMIN] ❌ BLOCKED: ${whatsappId} is in removed admins list`);
            return null;
        }

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

    // Extract phone from WhatsApp ID
    const phoneMatch = whatsappId.match(/^(\d+)/);
    const phone = phoneMatch ? phoneMatch[1] : whatsappId;

    // ❌ SECURITY: Block removed admins from using approval commands
    const REMOVED_ADMINS = ['8801721016186'];
    if (REMOVED_ADMINS.includes(phone)) {
        console.log(`[AUTO-ADMIN] ❌ BLOCKED approval from removed admin: ${whatsappId}`);
        return false;
    }

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
    checkAndAutoRegisterAdmin
};
