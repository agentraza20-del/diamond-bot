/**
 * 🔍 WhatsApp ID Matcher
 * Different formats এ WhatsApp ID কে identify করার জন্য
 */

const db = require('../config/database');
const { isAdminBlocked } = require('./auto-admin-register');

// সব possible WhatsApp ID formats থেকে একজন admin কে খুঁজে বের করা
function findAdminByAnyId(idVariant) {
    if (!idVariant) return null;
    
    // 🚫 Check if blocked first
    if (isAdminBlocked(idVariant)) {
        console.log(`[ADMIN-MATCHER] ❌ Blocked admin detected: ${idVariant}`);
        return null;
    }
    
    const admins = db.getAdmins();
    
    // Direct match
    let found = admins.find(a => a.whatsappId === idVariant);
    if (found) return found;
    
    // Extract phone number from ID
    const phoneMatch = idVariant.match(/^(\d+)/);
    if (phoneMatch) {
        const phone = phoneMatch[1];
        
        // Try different formats
        const formats = [
            phone + '@c.us',
            phone + '@lid',      // LID format
            phone.slice(-10) + '@c.us', // Last 10 digits
            phone.slice(-10) + '@lid', // Last 10 digits with @lid
            phone + '@g.us', // Group format
        ];
        
        for (const format of formats) {
            found = admins.find(a => a.whatsappId === format);
            if (found) return found;
        }
        
        // Match by phone
        found = admins.find(a => a.phone === phone || a.phone.slice(-10) === phone.slice(-10));
        if (found) return found;
    }
    
    return null;
}

// Check if any variant of ID is admin
function isAdminByAnyVariant(idVariant) {
    return findAdminByAnyId(idVariant) !== null;
}

// Get admin info by any ID format
function getAdminInfo(idVariant) {
    return findAdminByAnyId(idVariant);
}

module.exports = {
    findAdminByAnyId,
    isAdminByAnyVariant,
    getAdminInfo
};
