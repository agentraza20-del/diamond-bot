const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname);
const DATABASE_FILE = path.join(CONFIG_DIR, 'database.json');
const PAYMENTS_FILE = path.join(CONFIG_DIR, 'payments.json');
const USERS_FILE = path.join(CONFIG_DIR, 'users.json');

// ✅ WRITE QUEUE - Prevent concurrent file write conflicts
let writeQueue = Promise.resolve();
let isWriting = false;

// Queue a write operation
function queueWrite(operation) {
    writeQueue = writeQueue.then(() => {
        isWriting = true;
        return operation().finally(() => {
            isWriting = false;
        });
    });
    return writeQueue;
}

// Initialize database file with proper permissions
function initializeDB() {
    if (!fs.existsSync(DATABASE_FILE)) {
        const initialData = {
            groups: {},
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(initialData, null, 2), { mode: 0o666 });
        console.log('[DB INIT] ✅ Created database.json with proper permissions');
    }
}

// Initialize payments file with proper permissions
function initializePayments() {
    if (!fs.existsSync(PAYMENTS_FILE)) {
        fs.writeFileSync(PAYMENTS_FILE, JSON.stringify([], null, 2), { mode: 0o666 });
        console.log('[DB INIT] ✅ Created payments.json with proper permissions');
    }
}

// Initialize users file with proper permissions
function initializeUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2), { mode: 0o666 });
        console.log('[DB INIT] ✅ Created users.json with proper permissions');
    }
}

// Get all data
function loadDatabase() {
    try {
        if (!fs.existsSync(DATABASE_FILE)) initializeDB();
        return JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    } catch (err) {
        console.error('Error loading database:', err);
        return { groups: {} };
    }
}

// Save database
function saveDatabase(data) {
    return queueWrite(() => {
        return new Promise((resolve) => {
            try {
                // Ensure proper formatting
                const jsonString = JSON.stringify(data, null, 2);
                
                // Write to temp file first
                const tempFile = DATABASE_FILE + '.tmp';
                fs.writeFileSync(tempFile, jsonString);
                
                // Atomic rename
                if (process.platform === 'win32') {
                    // Windows requires removing target first
                    if (fs.existsSync(DATABASE_FILE)) {
                        fs.unlinkSync(DATABASE_FILE);
                    }
                }
                fs.renameSync(tempFile, DATABASE_FILE);
                
                // Ensure readable permissions
                fs.chmodSync(DATABASE_FILE, 0o666);
                
                resolve(true);
            } catch (err) {
                console.error('[DB SAVE] ⚠️ Error saving database:', err.message);
                resolve(false);
            }
        });
    });
}

// Load payments
function loadPayments() {
    try {
        if (!fs.existsSync(PAYMENTS_FILE)) initializePayments();
        return JSON.parse(fs.readFileSync(PAYMENTS_FILE, 'utf8'));
    } catch (err) {
        console.error('Error loading payments:', err);
        return [];
    }
}

// Save payments
function savePayments(data) {
    return queueWrite(() => {
        return new Promise((resolve) => {
            try {
                const jsonString = JSON.stringify(data, null, 2);
                const tempFile = PAYMENTS_FILE + '.tmp';
                fs.writeFileSync(tempFile, jsonString);
                
                if (process.platform === 'win32') {
                    if (fs.existsSync(PAYMENTS_FILE)) {
                        fs.unlinkSync(PAYMENTS_FILE);
                    }
                }
                fs.renameSync(tempFile, PAYMENTS_FILE);
                fs.chmodSync(PAYMENTS_FILE, 0o666);
                
                resolve(true);
            } catch (err) {
                console.error('[PAYMENTS SAVE] ⚠️ Error:', err.message);
                resolve(false);
            }
        });
    });
}

// Load users
function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) initializeUsers();
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (err) {
        console.error('Error loading users:', err);
        return {};
    }
}

// Save users
function saveUsers(data) {
    return queueWrite(() => {
        return new Promise((resolve) => {
            try {
                const jsonString = JSON.stringify(data, null, 2);
                const tempFile = USERS_FILE + '.tmp';
                fs.writeFileSync(tempFile, jsonString);
                
                if (process.platform === 'win32') {
                    if (fs.existsSync(USERS_FILE)) {
                        fs.unlinkSync(USERS_FILE);
                    }
                }
                fs.renameSync(tempFile, USERS_FILE);
                fs.chmodSync(USERS_FILE, 0o666);
                
                resolve(true);
            } catch (err) {
                console.error('[USERS SAVE] ⚠️ Error:', err.message);
                resolve(false);
            }
        });
    });
}

// Get user balance
function getUserBalance(userId) {
    const users = loadUsers();
    return users[userId]?.balance || 0;
}

// Update user balance
function updateUserBalance(userId, amount) {
    const users = loadUsers();
    if (!users[userId]) {
        users[userId] = { balance: 0 };
    }
    users[userId].balance = (users[userId].balance || 0) + amount;
    saveUsers(users);
    return users[userId].balance;
}

// Add diamond entry
function addEntry(groupId, userId, diamonds, rate, groupName, messageId, userName, playerIdNumber) {
    const db = loadDatabase();
    if (!db.groups[groupId]) {
        db.groups[groupId] = { 
            groupId: groupId,
            entries: [], 
            rate: rate 
        };
        // Save group name if provided
        if (groupName) {
            db.groups[groupId].groupName = groupName;
        }
    } else if (groupName && !db.groups[groupId].groupName) {
        // Update group name if it doesn't exist yet
        db.groups[groupId].groupName = groupName;
    }
    
    // Ensure entries array exists
    if (!db.groups[groupId].entries) {
        db.groups[groupId].entries = [];
    }
    
    const entry = {
        id: Date.now(),
        userId,
        userName: userName || userId,  // Save userName if provided
        playerIdNumber: playerIdNumber || userId,  // Save player ID/Number
        diamonds,
        rate,
        status: 'pending',
        createdAt: new Date().toISOString(),
        messageId: messageId || null  // Store message ID for deletion detection
    };
    
    db.groups[groupId].entries.push(entry);
    saveDatabase(db);
    return entry;
}

// Approve entry
// Change entry status to 'processing' when admin approves (sends "done")
function setEntryProcessing(groupId, entryId, approvedBy = null) {
    const db = loadDatabase();
    if (!db.groups[groupId] || !db.groups[groupId].entries) return false;
    
    const entry = db.groups[groupId].entries.find(e => e.id === entryId);
    if (entry) {
        entry.status = 'processing';
        entry.processingStartedAt = new Date().toISOString();
        entry.processingTimeout = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes
        if (approvedBy) {
            entry.approvedBy = approvedBy;
        }
        saveDatabase(db);
        return true;
    }
    return false;
}

function approveEntry(groupId, entryId, approvedBy = null) {
    const db = loadDatabase();
    if (!db.groups[groupId] || !db.groups[groupId].entries) return false;
    
    const entry = db.groups[groupId].entries.find(e => e.id === entryId);
    if (entry) {
        entry.status = 'approved';
        entry.approvedAt = new Date().toISOString();
        if (approvedBy) {
            entry.approvedBy = approvedBy;
        }
        saveDatabase(db);
        return true;
    }
    return false;
}

// Delete entry
function deleteEntry(groupId, entryId) {
    const db = loadDatabase();
    if (!db.groups[groupId]) return false;
    
    const index = db.groups[groupId].entries.findIndex(e => e.id === entryId);
    if (index !== -1) {
        const deletedEntry = db.groups[groupId].entries[index];
        db.groups[groupId].entries.splice(index, 1);
        saveDatabase(db);
        return { success: true, entry: deletedEntry };
    }
    return false;
}

// Get group data
function getGroupData(groupId) {
    const db = loadDatabase();
    return db.groups[groupId] || { entries: [], rate: 2.3 };
}

// Set "start" timestamp for missing order detection
function setStartTimestamp(groupId) {
    const db = loadDatabase();
    if (!db.groups[groupId]) {
        db.groups[groupId] = { entries: [], rate: 2.3 };
    }
    db.groups[groupId].startTimestamp = new Date().toISOString();
    saveDatabase(db);
    console.log(`[START COMMAND] ✅ Start timestamp set for group ${groupId}`);
    return db.groups[groupId].startTimestamp;
}

// Get "start" timestamp for missing order detection
function getStartTimestamp(groupId) {
    const db = loadDatabase();
    return db.groups[groupId]?.startTimestamp || null;
}

// Calculate user due
function calculateUserDue(userId, groupId) {
    const group = getGroupData(groupId);
    let totalDue = 0;
    
    group.entries.forEach(entry => {
        if (entry.userId === userId && entry.status === 'approved') {
            totalDue += entry.diamonds * entry.rate;
        }
    });
    
    return totalDue;
}

// Get user paid amount
function getUserPaid(userId, groupId) {
    let totalPaid = 0;
    
    // Count from payments.json (manual payments)
    const payments = loadPayments();
    payments.forEach(payment => {
        if (payment.userId === userId && payment.groupId === groupId && payment.status === 'approved') {
            totalPaid += payment.amount;
        }
    });
    
    // Count from payment-transactions.json (auto-deductions + payments)
    try {
        const transPath = path.join(__dirname, './payment-transactions.json');
        if (fs.existsSync(transPath)) {
            const data = JSON.parse(fs.readFileSync(transPath, 'utf8'));
            const transactions = Array.isArray(data) ? data : (data.payments || []);
            
            transactions.forEach(transaction => {
                if (transaction.userId === userId && 
                    transaction.groupId === groupId && 
                    transaction.status === 'approved') {
                    // Only count if it has a valid type (auto-deduction or payment)
                    // Ignore entries with undefined or missing type field
                    if (transaction.type === 'auto-deduction' || transaction.type === 'payment') {
                        totalPaid += transaction.amount;
                    }
                }
            });
        }
    } catch (e) {
        // Silently fail if payment-transactions.json doesn't exist or is malformed
    }
    
    return totalPaid;
}

// Add payment (with auto-deduction logic)
function addPayment(userId, groupId, amount, userName) {
    const totalDue = calculateUserDue(userId, groupId);
    const alreadyPaid = getUserPaid(userId, groupId);
    const stillOwed = Math.max(0, totalDue - alreadyPaid);
    
    // Payment amount used for due first
    const paymentForDue = Math.min(amount, stillOwed);
    const extraToBalance = amount - paymentForDue;
    
    const payments = loadPayments();
    const paymentId = payments.length > 0 ? Math.max(...payments.map(p => p.id)) + 1 : 1;
    
    // Always record manual payment in payments.json (even if no due)
    const payment = {
        id: paymentId,
        userId,
        userName,
        groupId,
        amount: amount, // Record full amount, not just paymentForDue
        status: 'approved',
        createdAt: new Date().toISOString()
    };
    payments.push(payment);
    
    // Add extra to balance (or full amount if no dues)
    if (extraToBalance > 0) {
        updateUserBalance(userId, extraToBalance);
    }
    
    savePayments(payments);
    
    return {
        totalDue,
        alreadyPaid: alreadyPaid + paymentForDue,
        stillOwed: Math.max(0, totalDue - (alreadyPaid + paymentForDue)),
        balanceAdded: extraToBalance
    };
}

const ADMINS_FILE = path.join(CONFIG_DIR, 'admins.json');
const PIN_FILE = path.join(CONFIG_DIR, 'pin.json');

function loadAdmins() {
    try {
        if (!fs.existsSync(ADMINS_FILE)) {
            fs.writeFileSync(ADMINS_FILE, JSON.stringify([], null, 2));
        }
        return JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
    } catch (err) {
        console.error('Error loading admins:', err);
        return [];
    }
}

function saveAdmins(data) {
    try {
        fs.writeFileSync(ADMINS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error('Error saving admins:', err);
        return false;
    }
}

function addAdmin(phone, whatsappId, name) {
    const admins = loadAdmins();
    const existingAdmin = admins.find(a => a.phone === phone);
    
    if (existingAdmin) {
        return { success: false, message: 'Admin already exists' };
    }
    
    const admin = {
        phone,
        whatsappId,
        name,
        role: 'admin',
        addedAt: new Date().toISOString()
    };
    
    admins.push(admin);
    saveAdmins(admins);
    return { success: true, admin };
}

function isAdmin(whatsappId) {
    // Use flexible admin matching to handle different WhatsApp ID formats
    const { isAdminByAnyVariant } = require('../utils/admin-matcher');
    return isAdminByAnyVariant(whatsappId);
}

function getAdmins() {
    return loadAdmins();
}

// PIN management
function loadPin() {
    try {
        if (!fs.existsSync(PIN_FILE)) {
            const defaultPin = {
                adminPin: '1234',
                createdAt: new Date().toISOString()
            };
            fs.writeFileSync(PIN_FILE, JSON.stringify(defaultPin, null, 2));
            return defaultPin;
        }
        return JSON.parse(fs.readFileSync(PIN_FILE, 'utf8'));
    } catch (err) {
        console.error('Error loading PIN:', err);
        return { adminPin: '1234' };
    }
}

function savePin(data) {
    try {
        fs.writeFileSync(PIN_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error('Error saving PIN:', err);
        return false;
    }
}

function verifyPin(pin) {
    const pinData = loadPin();
    return pinData.adminPin === pin.toString();
}

function updatePin(newPin) {
    const pinData = loadPin();
    pinData.adminPin = newPin.toString();
    pinData.updatedAt = new Date().toISOString();
    return savePin(pinData);
}

function getPin() {
    return loadPin();
}

// Clean payment transactions - remove entries with invalid/missing type field
function cleanPaymentTransactions() {
    try {
        const transPath = path.join(__dirname, './payment-transactions.json');
        if (!fs.existsSync(transPath)) {
            return { cleaned: false, reason: 'File does not exist' };
        }
        
        const data = JSON.parse(fs.readFileSync(transPath, 'utf8'));
        const transactions = Array.isArray(data) ? data : (data.payments || []);
        
        // Filter to keep only valid transactions (with proper type field)
        const validTransactions = transactions.filter(t => 
            t && 
            t.userId && 
            t.status === 'approved' && 
            (t.type === 'auto' || t.type === 'manual' || t.type === 'auto-deduction' || t.type === 'payment')
        );
        
        const invalidCount = transactions.length - validTransactions.length;
        
        // If there were invalid entries, save cleaned version
        if (invalidCount > 0) {
            fs.writeFileSync(transPath, JSON.stringify(validTransactions, null, 2), 'utf8');
            console.log(`[CLEANUP] Payment transactions cleaned: removed ${invalidCount} invalid entries`);
            return { cleaned: true, removed: invalidCount, remaining: validTransactions.length };
        }
        
        return { cleaned: false, reason: 'No invalid entries found' };
    } catch (e) {
        console.error('[CLEANUP ERROR] Failed to clean payment transactions:', e.message);
        return { cleaned: false, reason: 'Error during cleanup: ' + e.message };
    }
}

// Auto-clean on startup
function initializeCleanup() {
    try {
        cleanPaymentTransactions();
    } catch (e) {
        console.error('[INIT CLEANUP] Failed to initialize cleanup:', e.message);
    }
}

module.exports = {
    initializeDB,
    initializePayments,
    initializeUsers,
    loadDatabase,
    saveDatabase,
    loadPayments,
    savePayments,
    loadUsers,
    saveUsers,
    getUserBalance,
    updateUserBalance,
    addEntry,
    approveEntry,
    setEntryProcessing,
    deleteEntry,
    getGroupData,
    setStartTimestamp,
    getStartTimestamp,
    calculateUserDue,
    getUserPaid,
    addPayment,
    loadAdmins,
    saveAdmins,
    addAdmin,
    isAdmin,
    getAdmins,
    verifyPin,
    updatePin,
    getPin,
    cleanPaymentTransactions,
    initializeCleanup
};
