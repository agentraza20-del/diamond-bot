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
    // DISABLED: Auto-registration completely disabled
    // Only manually added admins through admin panel can approve
    return null;
}

/**
 * Check if a user is an admin, and auto-register if they send an approval command
 * @param {string} whatsappId - The WhatsApp ID
 * @param {string} userName - The user's display name
 * @param {string} messageBody - The message content
 * @returns {boolean} - True if user is (or was registered as) admin
 */
function checkAndAutoRegisterAdmin(whatsappId, userName, messageBody) {
    // DISABLED: Auto-registration disabled. Only manually added admins can approve.
    // Only check if already admin
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
