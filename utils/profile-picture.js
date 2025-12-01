/**
 * 📸 WhatsApp Profile Picture Handler
 * Fetch and manage admin profile pictures
 */

const fs = require('fs').promises;
const path = require('path');

const PROFILE_PIC_DIR = path.join(__dirname, '../config/profile-pics');

/**
 * Ensure profile pictures directory exists
 */
async function ensureProfilePicDir() {
    try {
        await fs.mkdir(PROFILE_PIC_DIR, { recursive: true });
    } catch (err) {
        console.error('[PROFILE-PIC] Error creating directory:', err.message);
    }
}

/**
 * Get profile picture from WhatsApp contact
 * @param {object} contact - WhatsApp contact object
 * @param {string} whatsappId - WhatsApp ID
 * @returns {Promise<string|null>} - Base64 encoded image or null
 */
async function getProfilePicture(contact) {
    try {
        if (!contact) return null;
        
        const profilePic = await contact.getProfilePicUrl();
        
        if (!profilePic) {
            console.log(`[PROFILE-PIC] No profile picture for ${contact.id.user}`);
            return null;
        }

        // Fetch image from URL
        const https = require('https');
        return new Promise((resolve) => {
            https.get(profilePic, (response) => {
                let data = '';
                response.on('data', chunk => {
                    data += chunk;
                });
                response.on('end', () => {
                    try {
                        const base64 = Buffer.from(data).toString('base64');
                        resolve(base64);
                    } catch (err) {
                        console.error('[PROFILE-PIC] Error converting to base64:', err.message);
                        resolve(null);
                    }
                });
            }).on('error', (err) => {
                console.error('[PROFILE-PIC] Error fetching image:', err.message);
                resolve(null);
            });
        });
    } catch (err) {
        console.error('[PROFILE-PIC] Error getting profile picture:', err.message);
        return null;
    }
}

/**
 * Save profile picture to cache
 * @param {string} whatsappId - WhatsApp ID
 * @param {string} base64Image - Base64 encoded image
 */
async function saveProfilePicture(whatsappId, base64Image) {
    try {
        await ensureProfilePicDir();
        
        const fileName = `${whatsappId.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        const filePath = path.join(PROFILE_PIC_DIR, fileName);
        
        await fs.writeFile(filePath, base64Image, 'utf8');
        console.log(`[PROFILE-PIC] ✅ Saved profile picture for ${whatsappId}`);
    } catch (err) {
        console.error('[PROFILE-PIC] Error saving profile picture:', err.message);
    }
}

/**
 * Get cached profile picture
 * @param {string} whatsappId - WhatsApp ID
 * @returns {Promise<string|null>} - Base64 encoded image or null
 */
async function getCachedProfilePicture(whatsappId) {
    try {
        const fileName = `${whatsappId.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        const filePath = path.join(PROFILE_PIC_DIR, fileName);
        
        const data = await fs.readFile(filePath, 'utf8');
        return data || null;
    } catch (err) {
        return null;
    }
}

/**
 * Get and cache profile picture from message
 * @param {object} msg - WhatsApp message object
 * @param {string} whatsappId - WhatsApp ID
 * @returns {Promise<void>}
 */
async function captureProfilePictureFromMessage(msg, whatsappId) {
    try {
        if (!msg || !whatsappId) return;
        
        // Try to get contact from message
        let contact = null;
        
        try {
            contact = msg.getContact ? await msg.getContact() : null;
        } catch (err) {
            // Contact fetch failed, try alternative method
            console.log(`[PROFILE-PIC] ⚠️ Could not get contact from message: ${err.message}`);
            return;
        }
        
        if (!contact) {
            return;
        }
        
        // Try to get profile picture URL
        let profilePicUrl = null;
        
        try {
            profilePicUrl = await contact.getProfilePicUrl();
        } catch (err) {
            // Profile picture fetch failed - this is expected sometimes
            console.log(`[PROFILE-PIC] ⚠️ Could not get profile picture URL for ${whatsappId}`);
            return;
        }
        
        if (!profilePicUrl) {
            return;
        }
        
        // Fetch and save the image
        const https = require('https');
        
        return new Promise((resolve) => {
            https.get(profilePicUrl, (response) => {
                let data = '';
                response.setEncoding('binary');
                
                response.on('data', chunk => {
                    data += chunk;
                });
                
                response.on('end', async () => {
                    try {
                        const base64Image = Buffer.from(data, 'binary').toString('base64');
                        await saveProfilePicture(whatsappId, base64Image);
                        console.log(`[PROFILE-PIC] ✅ Captured picture for ${whatsappId}`);
                        resolve(base64Image);
                    } catch (err) {
                        console.error('[PROFILE-PIC] Error converting image:', err.message);
                        resolve(null);
                    }
                });
            }).on('error', (err) => {
                console.log(`[PROFILE-PIC] ⚠️ Could not download image: ${err.message}`);
                resolve(null);
            });
        });
    } catch (err) {
        console.log(`[PROFILE-PIC] ⚠️ Error capturing profile picture: ${err.message}`);
    }
}

/**
 * Fetch and cache admin profile pictures
 * @param {object} client - WhatsApp client
 * @param {array} admins - Admin list
 */
async function fetchAdminProfilePictures(client, admins) {
    try {
        await ensureProfilePicDir();
        console.log(`[PROFILE-PIC] ⚠️ Profile pictures will be captured when admins send messages`);
    } catch (err) {
        console.error('[PROFILE-PIC] Error initializing profile pictures:', err.message);
    }
}

module.exports = {
    getProfilePicture,
    saveProfilePicture,
    getCachedProfilePicture,
    fetchAdminProfilePictures,
    ensureProfilePicDir,
    captureProfilePictureFromMessage
};
