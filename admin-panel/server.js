const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { startAutoApprovalTimer } = require('../utils/auto-approval');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        credentials: false,
        allowEIO3: true
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
    allowUpgrades: true,
    maxHttpBufferSize: 1e6,
    perMessageDeflate: false
});

const PORT = process.env.ADMIN_PORT || 3005;

// 🛠️ Ensure critical files exist with proper permissions
async function ensureFileExists(filePath, defaultContent = '') {
    try {
        await fs.access(filePath);
    } catch (err) {
        // File doesn't exist, create it
        try {
            await fs.writeFile(filePath, defaultContent, { mode: 0o666 });
            console.log(`[INIT] Created file: ${filePath}`);
        } catch (writeErr) {
            console.error(`[INIT] Failed to create ${filePath}:`, writeErr.message);
        }
    }
}

// Initialize critical files on startup
async function initializeFiles() {
    const adminLogsPath = path.join(__dirname, 'admin-logs.txt');
    await ensureFileExists(adminLogsPath, '');
    console.log('[INIT] ✅ Admin logs file ready');
}

// Run initialization
initializeFiles().catch(err => console.error('[INIT] Error:', err));

// Middleware
app.use(express.json());

// Authentication middleware
function requireAuth(req, res, next) {
    const token = req.headers['authorization'];
    
    if (!token || !activeSessions.has(token)) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    next();
}

// Check if admin is logged in
function isLoggedIn(req, res, next) {
    const token = req.headers['authorization'];
    
    if (!token || !activeSessions.has(token)) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }
    
    next();
}

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve main page only if authenticated
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Database paths
const dbPath = path.join(__dirname, '..', 'config');
const usersPath = path.join(dbPath, 'users.json');
const paymentsPath = path.join(dbPath, 'payments.json');
const transactionsPath = path.join(dbPath, 'payment-transactions.json');
const databasePath = path.join(dbPath, 'database.json');
const adminsPath = path.join(dbPath, 'admins.json');
const commandsPath = path.join(dbPath, 'commands.json');
const paymentKeywordsPath = path.join(dbPath, 'payment-keywords.json');
const adminCredentialsPath = path.join(dbPath, 'admin-credentials.json');

// Admin panel specific paths
const adminPath = path.join(__dirname);
const autoDeductionsPath = path.join(adminPath, 'auto-deductions.json');
const profilePicDir = path.join(__dirname, '..', 'config', 'profile-pics');

// Active sessions
const activeSessions = new Set();

// Helper functions to read data
async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

async function writeJSON(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Generate random token
function generateToken() {
    return 'admin_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// API Routes

// Login API
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;
        const credentials = await readJSON(adminCredentialsPath);
        
        if (username === credentials.username && password === credentials.password) {
            const token = generateToken();
            activeSessions.add(token);
            
            const logEntry = `[${new Date().toISOString()}] 🔐 Admin logged in\n`;
            await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
            
            res.json({ 
                success: true, 
                token,
                message: 'Login successful' 
            });
        } else {
            res.json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Logout API
app.post('/api/admin/logout', (req, res) => {
    try {
        const token = req.headers['authorization'];
        if (token) {
            activeSessions.delete(token);
        }
        
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Change password API
app.post('/api/admin/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const credentials = await readJSON(adminCredentialsPath);
        
        if (currentPassword !== credentials.password) {
            return res.json({ success: false, message: 'Current password is incorrect' });
        }
        
        if (!newPassword || newPassword.length < 4) {
            return res.json({ success: false, message: 'New password must be at least 4 characters' });
        }
        
        credentials.password = newPassword;
        credentials.lastUpdated = new Date().toISOString();
        
        await writeJSON(adminCredentialsPath, credentials);
        
        const logEntry = `[${new Date().toISOString()}] 🔑 Admin password changed\n`;
        await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
        
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Change username API
app.post('/api/admin/change-username', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newUsername } = req.body;
        const credentials = await readJSON(adminCredentialsPath);
        
        if (currentPassword !== credentials.password) {
            return res.json({ success: false, message: 'Current password is incorrect' });
        }
        
        if (!newUsername || newUsername.length < 3) {
            return res.json({ success: false, message: 'Username must be at least 3 characters' });
        }
        
        const oldUsername = credentials.username;
        credentials.username = newUsername;
        credentials.lastUpdated = new Date().toISOString();
        
        await writeJSON(adminCredentialsPath, credentials);
        
        const logEntry = `[${new Date().toISOString()}] 👤 Admin username changed from '${oldUsername}' to '${newUsername}'\n`;
        await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
        
        res.json({ success: true, message: 'Username changed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Dashboard Stats
app.get('/api/stats', async (req, res) => {
    try {
        const users = await readJSON(usersPath);
        const transactions = await readJSON(transactionsPath);
        const database = await readJSON(databasePath);

        const totalUsers = Object.keys(users).length;
        
        // Calculate fixed deposits (approved deposits from transactions)
        const fixedDeposits = Object.values(transactions).reduce((sum, t) => {
            return sum + ((t && t.status === 'completed' && t.amount) ? t.amount : 0);
        }, 0);
        
        // Calculate total deposits including pending
        const totalDeposits = Object.values(transactions).reduce((sum, t) => sum + ((t && t.amount) || 0), 0);
        
        // Calculate total orders and pending from all groups
        let totalOrders = 0;
        let pendingDiamonds = 0;
        let pendingAmount = 0;
        let newPendingOrders = 0; // Count of NEW pending orders
        let totalDue = 0; // Total due balance across all users
        const groups = database.groups || {};
        const pendingOrdersList = [];
        
        Object.entries(groups).forEach(([groupId, group]) => {
            const entries = group.entries || [];
            const approvedEntries = entries.filter(e => e.status === 'approved');
            const pendingEntries = entries.filter(e => e.status === 'pending');
            
            totalOrders += approvedEntries.length;
            
            pendingEntries.forEach(entry => {
                pendingDiamonds += (entry.diamonds || 0);
                pendingAmount += ((entry.diamonds || 0) * (entry.rate || 0));
                newPendingOrders++;
                
                pendingOrdersList.push({
                    id: entry.id,
                    groupId: groupId,
                    groupName: group.name,
                    userName: entry.userName,
                    userId: entry.userId,
                    diamonds: entry.diamonds,
                    amount: (entry.diamonds || 0) * (entry.rate || 0),
                    createdAt: entry.createdAt
                });
            });
        });

        // Calculate total due balance from users
        Object.values(users).forEach(user => {
            if (user.dueBalanceOverride !== undefined) {
                totalDue += user.dueBalanceOverride;
            }
        });

        res.json({
            totalUsers,
            totalDeposits,
            fixedDeposits,
            pendingDiamonds,
            pendingAmount,
            totalOrders,
            totalDue,
            pendingOrderCount: newPendingOrders,
            activeGroups: Object.keys(groups).length,
            pendingOrders: pendingOrdersList // Include full list for sync
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🔄 Get Duplicate Order Detection Status
app.get('/api/duplicate-check/:groupId/:userId/:diamonds', async (req, res) => {
    try {
        const { groupId, userId, diamonds } = req.params;
        
        const database = await readJSON(databasePath);
        const group = database.groups[groupId];
        
        if (!group) {
            return res.json({ success: false, isDuplicate: false });
        }

        const now = new Date().getTime();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        const diamondsInt = parseInt(diamonds);
        
        // Check recent entries from same user
        const recentUserEntries = (group.entries || []).filter(entry => {
            const entryTime = new Date(entry.createdAt).getTime();
            return entry.userId === userId && entryTime > fiveMinutesAgo;
        });

        for (const recent of recentUserEntries) {
            if (recent.diamonds === diamondsInt) {
                return res.json({
                    success: true,
                    isDuplicate: true,
                    reason: 'DUPLICATE_WITHIN_5_MINUTES',
                    originalOrderId: recent.id,
                    originalStatus: recent.status,
                    timeDiffSeconds: Math.floor((now - new Date(recent.createdAt).getTime()) / 1000)
                });
            }
        }

        res.json({ success: true, isDuplicate: false });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📊 Get Order Tracking Summary
app.get('/api/order-tracking-summary/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        
        const database = await readJSON(databasePath);
        const group = database.groups[groupId];
        
        if (!group) {
            return res.json({ success: false, message: 'Group not found' });
        }

        const entries = group.entries || [];
        const now = new Date().getTime();
        const fiveMinutesAgo = now - (5 * 60 * 1000);

        const summary = {
            totalOrders: entries.length,
            pending: entries.filter(e => e.status === 'pending').length,
            processing: entries.filter(e => e.status === 'processing').length,
            approved: entries.filter(e => e.status === 'approved').length,
            cancelled: entries.filter(e => e.status === 'cancelled').length,
            missingFromAdmin: entries.filter(e => e.status === 'pending' && !e.sentToAdminPanel).length,
            offlineOldOrders: entries.filter(e => {
                const entryTime = new Date(e.createdAt).getTime();
                return e.status === 'pending' && (now - entryTime) > fiveMinutesAgo && !e.sentToAdminPanel;
            }).length
        };

        res.json({
            success: true,
            groupId: groupId,
            summary: summary
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ⚙️ FEATURE TOGGLE MANAGEMENT ENDPOINTS

// Get all feature toggles status
app.get('/api/feature-toggles', (req, res) => {
    try {
        const FeatureToggleManager = require('../utils/feature-toggle-manager');
        const toggles = FeatureToggleManager.getAllToggles();
        const report = FeatureToggleManager.getStatusReport();
        
        res.json({
            success: true,
            toggles: toggles,
            report: report
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get specific feature toggle status
app.get('/api/feature-toggle/:featureName', (req, res) => {
    try {
        const { featureName } = req.params;
        const FeatureToggleManager = require('../utils/feature-toggle-manager');
        const feature = FeatureToggleManager.getFeatureDetails(featureName);
        
        if (!feature) {
            return res.status(404).json({
                success: false,
                message: `Feature '${featureName}' not found`
            });
        }
        
        res.json({
            success: true,
            feature: feature
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Toggle feature on/off
app.post('/api/feature-toggle/:featureName', (req, res) => {
    try {
        const { featureName } = req.params;
        const { enabled } = req.body;
        const adminName = req.headers['x-admin-name'] || 'admin';
        
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'enabled must be a boolean (true/false)'
            });
        }
        
        const FeatureToggleManager = require('../utils/feature-toggle-manager');
        const result = FeatureToggleManager.toggleFeature(featureName, enabled, adminName);
        
        if (result.success) {
            console.log(`[FEATURE TOGGLE] ${featureName} turned ${enabled ? 'ON' : 'OFF'} by ${adminName}`);
        }
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get duplicate detection status specifically
app.get('/api/feature-toggle/duplicate-detection/status', (req, res) => {
    try {
        const FeatureToggleManager = require('../utils/feature-toggle-manager');
        const isEnabled = FeatureToggleManager.isDuplicateDetectionEnabled();
        const details = FeatureToggleManager.getFeatureDetails('duplicateDetection');
        
        res.json({
            success: true,
            feature: 'duplicateDetection',
            enabled: isEnabled,
            details: details
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get offline detection status specifically
// Groups Data
app.get('/api/groups', async (req, res) => {
    try {
        const database = await readJSON(databasePath);
        const users = await readJSON(usersPath);
        const transactions = await readJSON(transactionsPath);
        const groups = database.groups || {};
        
        console.log('[API/GROUPS] Total groups in DB:', Object.keys(groups).length);
        console.log('[API/GROUPS] Group IDs:', Object.keys(groups));
        
        const groupsArray = Object.entries(groups).map(([id, data]) => {
            const entries = data.entries || [];
            const approvedEntries = entries.filter(e => e.status === 'approved');
            const pendingEntries = entries.filter(e => e.status === 'pending');
            
            // Calculate totals
            const totalDiamonds = approvedEntries.reduce((sum, entry) => sum + (entry.diamonds || 0), 0);
            const totalAmount = approvedEntries.reduce((sum, entry) => sum + (entry.diamonds * entry.rate), 0);
            const pendingDiamonds = pendingEntries.reduce((sum, entry) => sum + (entry.diamonds || 0), 0);
            const pendingAmount = pendingEntries.reduce((sum, entry) => sum + (entry.diamonds * entry.rate), 0);
            
            // Get unique users in this group with their due amounts
            const groupUsers = [...new Set(entries.map(e => e.userId))];
            
            // Calculate total paid amount for this group from payment-transactions
            let totalPaidFromTransactions = 0;
            if (Array.isArray(transactions)) {
                totalPaidFromTransactions = transactions
                    .filter(t => t && t.groupId === id && t.status === 'approved')
                    .reduce((sum, t) => sum + (t.amount || 0), 0);
            }
            
            // Total Paid should not exceed Total Orders
            const totalPaidForOrders = Math.min(totalAmount, totalPaidFromTransactions);
            
            // Calculate per-user due breakdown
            const userDueBreakdown = groupUsers.map(userId => {
                const userPhone = userId.replace('@lid', '').replace(/\D/g, '');
                const userData = Object.values(users).find(u => u.phone && u.phone.includes(userPhone));
                const userBalance = userData?.balance || 0;
                
                // Calculate user's order amount in this group
                const userOrders = approvedEntries.filter(e => e.userId === userId);
                const userOrderAmount = userOrders.reduce((sum, entry) => sum + (entry.diamonds * entry.rate), 0);
                
                // Get WhatsApp display name from the most recent entry for this user
                const mostRecentEntry = userOrders[userOrders.length - 1];
                const whatsappDisplayName = mostRecentEntry?.userName || userData?.name || userId.substring(0, 15);
                
                // Calculate how much this user has paid through auto-deductions
                let userPaidAmount = 0;
                if (Array.isArray(transactions)) {
                    userPaidAmount = transactions
                        .filter(t => t && t.userId === userId && t.groupId === id && t.status === 'approved' && (t.type === 'auto' || t.type === 'auto-deduction'))
                        .reduce((sum, t) => sum + (t.amount || 0), 0);
                }
                
                // Use group-specific dueBalanceOverride if set, otherwise calculate from: Total Orders - Paid Amount
                let userDue;
                if (userData?.dueBalanceOverride && typeof userData.dueBalanceOverride === 'object') {
                    // If override is an object (group-specific), use value for this group
                    userDue = userData.dueBalanceOverride[id] !== undefined 
                        ? userData.dueBalanceOverride[id] 
                        : Math.max(0, userOrderAmount - userPaidAmount);
                } else if (userData?.dueBalanceOverride !== undefined && typeof userData.dueBalanceOverride === 'number') {
                    // Legacy: if override is a number, use it only if it's positive (old format)
                    userDue = userData.dueBalanceOverride > 0 ? userData.dueBalanceOverride : Math.max(0, userOrderAmount - userPaidAmount);
                } else {
                    // Due Balance = Total Orders - Total Paid (through auto-deductions)
                    userDue = Math.max(0, userOrderAmount - userPaidAmount);
                }
                
                return {
                    userId: userId,
                    displayName: whatsappDisplayName,
                    orderAmount: Math.round(userOrderAmount),
                    balance: Math.round(userBalance),
                    paid: Math.round(userPaidAmount),
                    due: Math.round(userDue)
                };
            }).filter(u => u.due > 0); // Only show users with due balance
            
            // Also add users with manually set due balance (dueBalanceOverride) who may not be in this group's orders
            Object.entries(users).forEach(([phone, userData]) => {
                if (userData.dueBalanceOverride !== undefined) {
                    let groupDue = 0;
                    
                    // Get the due amount for this specific group
                    if (typeof userData.dueBalanceOverride === 'object') {
                        groupDue = userData.dueBalanceOverride[id] || 0;
                    } else if (typeof userData.dueBalanceOverride === 'number') {
                        groupDue = userData.dueBalanceOverride;
                    }
                    
                    if (groupDue > 0) {
                        // Clean phone for comparison
                        const cleanPhone = phone.replace(/\D/g, '');
                        
                        // Check if this user is already in the breakdown
                        const existingUserIndex = userDueBreakdown.findIndex(u => {
                            const existingCleanPhone = u.userId.replace('@lid', '').replace(/\D/g, '');
                            return existingCleanPhone === cleanPhone || cleanPhone === existingCleanPhone;
                        });
                        
                        if (existingUserIndex !== -1) {
                            // User already exists - update their due to use override (group-specific)
                            userDueBreakdown[existingUserIndex].due = Math.round(groupDue);
                        } else {
                            // Only add if user is in this group
                            const isUserInGroup = groupUsers.some(userId => {
                                const userCleanPhone = userId.replace('@lid', '').replace(/\D/g, '');
                                return userCleanPhone === cleanPhone || cleanPhone === userCleanPhone;
                            });
                            
                            if (isUserInGroup) {
                                // Add this user to the breakdown
                                userDueBreakdown.push({
                                    userId: phone,
                                    displayName: userData.name || phone,
                                    orderAmount: 0,
                                    balance: userData.balance || 0,
                                    paid: 0,
                                    due: Math.round(groupDue)
                                });
                            }
                        }
                    }
                }
            });
            
            // Total Due = Sum of all user dues (uses overrides if set)
            const totalDueAmount = userDueBreakdown.reduce((sum, user) => sum + user.due, 0);
            
            // Calculate total user balance for this group
            const totalUserBalance = groupUsers.reduce((sum, userId) => {
                // userId format: "115930327715989@lid"
                // Try direct match first
                let userData = users[userId];
                if (!userData) {
                    // Try phone-based matching as fallback
                    const userPhone = userId.replace('@lid', '').replace(/\D/g, '');
                    userData = Object.values(users).find(u => {
                        if (u.phone) return u.phone.includes(userPhone);
                        // If no phone field, try matching by key
                        return Object.keys(users).some(key => key.includes(userPhone));
                    });
                }
                return sum + (userData?.balance || 0);
            }, 0);

            return {
                id,
                name: data.groupName || data.name || 'Unknown Group',
                rate: data.rate || 85,
                dueLimit: data.dueLimit || 0,
                
                // All entries (for orders table)
                entries: entries,
                
                // Approved/Completed
                totalOrders: approvedEntries.length,
                totalDiamonds: totalDiamonds,
                totalAmount: Math.round(totalAmount),
                
                // Pending
                pendingOrders: pendingEntries.length,
                pendingDiamonds: pendingDiamonds,
                pendingAmount: Math.round(pendingAmount),
                
                // Users
                totalUsers: groupUsers.length,
                totalUserBalance: Math.round(totalUserBalance),
                totalPaid: Math.round(totalPaidForOrders), // Capped at totalAmount
                totalDue: Math.round(totalDueAmount), // Total due for entire group
                
                // Per-user due breakdown (sorted by due amount, highest first)
                userDueBreakdown: userDueBreakdown.sort((a, b) => b.due - a.due)
            };
        });

        res.json(groupsArray);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Group Rate
app.post('/api/groups/:groupId/rate', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { rate } = req.body;

        const database = await readJSON(databasePath);
        
        if (!database.groups) database.groups = {};
        if (!database.groups[groupId]) {
            database.groups[groupId] = {};
        }

        // Get group name from existing data
        const groupName = database.groups[groupId].groupName || 
                         database.groups[groupId].name || 
                         'Unknown Group';
        
        database.groups[groupId].rate = parseFloat(rate);
        await writeJSON(databasePath, database);

        // Emit real-time update
        io.emit('groupRateUpdated', { groupId, rate });

        // Calculate 1000 diamond price
        const price1000 = parseFloat(rate) * 1000;

        // Send WhatsApp message to group
        const message = `📢 *Rate Update Notice*\n\n✅ Group: ${groupName}\n💎 New Rate: ${rate} TK per Diamond\n\n💰 1000 Diamond = ৳${price1000} TK\n\n_This rate is now effective for all diamond orders._`;
        
        console.log(`[RATE-UPDATE] 📤 Emitting sendGroupMessage to bot:`, { groupId, rate, groupName });
        
        // Emit to bot to send WhatsApp message via Socket.io
        io.emit('sendGroupMessage', { groupId, message });
        
        console.log(`[RATE-UPDATE] ✅ Event emitted successfully`);

        res.json({ success: true, groupId, rate, groupName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Group Due Limit
app.post('/api/groups/:groupId/due-limit', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { dueLimit } = req.body;

        const database = await readJSON(databasePath);
        
        if (!database.groups) database.groups = {};
        if (!database.groups[groupId]) {
            database.groups[groupId] = { name: 'Unknown Group' };
        }

        database.groups[groupId].dueLimit = parseFloat(dueLimit);
        await writeJSON(databasePath, database);

        io.emit('groupDueLimitUpdated', { groupId, dueLimit });

        res.json({ success: true, groupId, dueLimit });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear Group Data
app.post('/api/groups/:groupId/clear', async (req, res) => {
    try {
        const { groupId } = req.params;

        // Read all database files
        const database = await readJSON(databasePath);
        const users = await readJSON(usersPath);
        const transactions = await readJSON(transactionsPath);

        // Clear group entries (orders)
        if (database.groups && database.groups[groupId]) {
            if (database.groups[groupId].entries) {
                database.groups[groupId].entries = [];
            }
        }

        // Clear user balances for this group
        Object.keys(users).forEach(phone => {
            if (users[phone].groups && users[phone].groups[groupId]) {
                users[phone].groups[groupId].balance = 0;
                users[phone].groups[groupId].totalOrders = 0;
                users[phone].groups[groupId].totalDeposits = 0;
            }
        });

        // Clear transactions for this group
        Object.keys(transactions).forEach(txId => {
            if (transactions[txId].groupId === groupId) {
                delete transactions[txId];
            }
        });

        // Save all changes
        await writeJSON(databasePath, database);
        await writeJSON(usersPath, users);
        await writeJSON(transactionsPath, transactions);

        io.emit('groupDataCleared', { groupId });

        res.json({ success: true, groupId, message: 'Group data cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk Update Group Rates
app.post('/api/groups/bulk-rate', async (req, res) => {
    try {
        const { groupIds, rate } = req.body;

        const database = await readJSON(databasePath);
        
        if (!database.groups) database.groups = {};

        // Calculate 1000 diamond price
        const price1000 = parseFloat(rate) * 1000;

        groupIds.forEach(groupId => {
            if (!database.groups[groupId]) {
                database.groups[groupId] = {};
            }
            
            const groupName = database.groups[groupId].groupName || 
                             database.groups[groupId].name || 
                             'Unknown Group';
            
            database.groups[groupId].rate = parseFloat(rate);
            
            // Send WhatsApp message to each group
            const message = `📢 *Rate Update Notice*\n\n✅ Group: ${groupName}\n💎 New Rate: ${rate} TK per Diamond\n\n💰 1000 Diamond = ৳${price1000} TK\n\n_This rate is now effective for all diamond orders._`;
            
            console.log(`[BULK-RATE-UPDATE] 📤 Emitting sendGroupMessage to bot:`, { groupId, rate, groupName });
            
            // Emit to bot to send WhatsApp message via Socket.io
            io.emit('sendGroupMessage', { groupId, message });
        });

        await writeJSON(databasePath, database);

        // Emit real-time update
        io.emit('bulkRateUpdated', { groupIds, rate });

        res.json({ success: true, count: groupIds.length, rate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Users List
app.get('/api/users', async (req, res) => {
    try {
        const users = await readJSON(usersPath);
        const database = await readJSON(databasePath);
        const groups = database.groups || {};
        
        console.log('[API] /api/users called - Groups:', Object.keys(groups).length);
        
        // Create a map of unique users from database entries
        const usersMap = new Map();

        // Extract users from database entries
        Object.values(groups).forEach(group => {
            const entries = group.entries || [];
            entries.forEach(entry => {
                // Extract user ID, filter out group IDs
                let userId = entry.userId;
                if (!userId || userId.includes('@g.us')) return; // Skip group entries
                
                // Clean up user ID (remove @lid suffix)
                userId = userId.replace('@lid', '').trim();
                if (!userId) return;
                
                if (!usersMap.has(userId)) {
                    usersMap.set(userId, {
                        phone: userId,
                        name: entry.userPhone || entry.userName || userId,
                        balance: 0,
                        dueBalance: 0,
                        totalDeposits: 0,
                        totalOrders: 0,
                        status: 'active',
                        joinedDate: entry.createdAt || new Date().toISOString(),
                        whatsappName: entry.userName || 'Unknown'
                    });
                }
            });
        });

        console.log('[API] Extracted users from database:', usersMap.size);

        // Override with users from users.json if they exist
        Object.entries(users).forEach(([phone, data]) => {
            if (usersMap.has(phone)) {
                const existing = usersMap.get(phone);
                usersMap.set(phone, {
                    ...existing,
                    name: data.name || existing.name,
                    balance: data.balance || 0,
                    totalDeposits: data.totalDeposits || 0,
                    totalOrders: data.totalOrders || 0,
                    status: data.blocked ? 'blocked' : 'active'
                });
            } else {
                usersMap.set(phone, {
                    phone,
                    name: data.name || 'Unknown',
                    balance: data.balance || 0,
                    dueBalance: data.dueBalanceOverride !== undefined ? data.dueBalanceOverride : 0,
                    totalDeposits: data.totalDeposits || 0,
                    totalOrders: data.totalOrders || 0,
                    status: data.blocked ? 'blocked' : 'active',
                    joinedDate: data.joinedDate || new Date().toISOString(),
                    whatsappName: data.name || 'Unknown'
                });
            }
        });

        console.log('[API] Total users after merge:', usersMap.size);

        // Calculate due balance for each user
        const usersArray = Array.from(usersMap.values()).map(user => {
            let calculatedDue = 0;
            let orderCount = 0;

            Object.values(groups).forEach(group => {
                const entries = group.entries || [];
                entries.forEach(entry => {
                    let entryUserId = entry.userId;
                    if (!entryUserId) return;
                    
                    entryUserId = entryUserId.replace('@lid', '').trim();
                    
                    if (entryUserId === user.phone) {
                        if (entry.status === 'approved') {
                            calculatedDue += (entry.diamonds || 0) * (entry.rate || 0);
                        }
                        orderCount++;
                    }
                });
            });

            // Use override if set in users.json, otherwise use calculated
            const userData = users[user.phone];
            const dueBalance = userData && userData.dueBalanceOverride !== undefined ? userData.dueBalanceOverride : calculatedDue;

            return {
                phone: user.phone,
                name: user.name,
                whatsappName: user.whatsappName,
                balance: user.balance,
                dueBalance,
                totalDeposits: user.totalDeposits,
                totalOrders: orderCount > 0 ? orderCount : user.totalOrders,
                status: user.status,
                joinedDate: user.joinedDate
            };
        });

        console.log('[API] Returning users:', usersArray.length);
        res.json(usersArray);
    } catch (error) {
        console.error('[API] Error in /api/users:', error);
        res.status(500).json({ error: error.message });
    }
});

// Block/Unblock User
app.post('/api/users/:phone/toggle-block', async (req, res) => {
    try {
        const { phone } = req.params;
        const users = await readJSON(usersPath);

        if (!users[phone]) {
            return res.status(404).json({ error: 'User not found' });
        }

        users[phone].blocked = !users[phone].blocked;
        await writeJSON(usersPath, users);

        io.emit('userStatusChanged', { phone, blocked: users[phone].blocked });

        res.json({ success: true, phone, blocked: users[phone].blocked });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Single User
app.get('/api/users/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const users = await readJSON(usersPath);
        const database = await readJSON(databasePath);

        // Try to find user name from database entries
        let userName = 'Unknown';
        const groups = database.groups || {};
        Object.values(groups).forEach(group => {
            const entries = group.entries || [];
            entries.forEach(entry => {
                const userId = (entry.userId || '').replace('@lid', '');
                if (userId === phone || entry.userName === phone) {
                    userName = entry.userName || entry.userPhone || userName;
                }
            });
        });

        // Create user if doesn't exist
        if (!users[phone]) {
            users[phone] = {
                name: userName,
                balance: 0,
                totalDeposits: 0,
                totalOrders: 0,
                blocked: false,
                joinedDate: new Date().toISOString(),
                groups: {}
            };
            await writeJSON(usersPath, users);
        }

        const user = users[phone];
        
        // Calculate due from groups
        let calculatedDue = 0;
        Object.values(groups).forEach(group => {
            const entries = group.entries || [];
            entries.forEach(entry => {
                // Match by userId or userName
                if (entry.userId === phone || entry.userId === `${phone}@lid` || entry.userName === phone || entry.userName === `${phone}@lid`) {
                    if (entry.status === 'approved') {
                        calculatedDue += (entry.diamonds || 0) * (entry.rate || 0);
                    }
                }
            });
        });

        // Use override if set, otherwise use calculated
        const dueBalance = user.dueBalanceOverride !== undefined ? user.dueBalanceOverride : calculatedDue;

        res.json({
            phone,
            name: user.name || 'Unknown',
            balance: user.balance || 0,
            dueBalance,
            calculatedDue: calculatedDue,
            storedDueBalance: user.dueBalance || 0,
            totalDeposits: user.totalDeposits || 0,
            totalOrders: user.totalOrders || 0,
            status: user.blocked ? 'blocked' : 'active',
            joinedDate: user.joinedDate || new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update User (name, balance, dueBalance)
app.post('/api/users/:phone/update', async (req, res) => {
    try {
        const { phone } = req.params;
        const { name, balance, dueBalance, groupId } = req.body;
        const users = await readJSON(usersPath);
        const database = await readJSON(databasePath);

        // Create user if doesn't exist
        if (!users[phone]) {
            users[phone] = {
                name: name || 'Unknown',
                balance: 0,
                totalDeposits: 0,
                totalOrders: 0,
                blocked: false,
                joinedDate: new Date().toISOString(),
                groups: {}
            };
        }

        users[phone].name = name || users[phone].name;
        users[phone].balance = typeof balance !== 'undefined' ? parseInt(balance) : users[phone].balance || 0;
        
        // Handle dueBalance - store as group-specific override
        const newDueBalance = typeof dueBalance !== 'undefined' ? parseInt(dueBalance) : null;
        
        if (newDueBalance !== null) {
            // If groupId provided, store override specific to that group
            if (groupId) {
                if (!users[phone].dueBalanceOverride) {
                    users[phone].dueBalanceOverride = {};
                }
                users[phone].dueBalanceOverride[groupId] = newDueBalance;
            } else {
                // If no groupId, check if user exists in only one group
                const groups = database.groups || {};
                const userGroups = Object.keys(groups).filter(gid => {
                    const group = groups[gid];
                    if (group.entries) {
                        return group.entries.some(entry => 
                            entry.userId === phone || 
                            entry.phone === phone || 
                            entry.userName === phone
                        );
                    }
                    return false;
                });
                
                if (userGroups.length === 1) {
                    // User is in only one group, apply to that group
                    if (!users[phone].dueBalanceOverride) {
                        users[phone].dueBalanceOverride = {};
                    }
                    users[phone].dueBalanceOverride[userGroups[0]] = newDueBalance;
                }
            }
        }

        await writeJSON(usersPath, users);

        // Log the action
        const logEntry = `[${new Date().toISOString()}] Updated user: ${phone} (Name: ${name}, Balance: ${balance}, DueBalance: ${newDueBalance || 'calculated'}${groupId ? ` for Group: ${groupId}` : ''})\n`;
        await fs.appendFile(path.join(__dirname, 'admin-logs.txt'), logEntry);

        io.emit('userUpdated', { phone, name, balance, dueBalance: newDueBalance, groupId });

        res.json({ 
            success: true, 
            message: 'User updated successfully',
            user: {
                phone,
                name,
                balance: users[phone].balance,
                dueBalance: newDueBalance || userCurrentDue,
                status: users[phone].blocked ? 'blocked' : 'active'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add Main Balance to User
app.post('/api/users/:phone/add-balance', async (req, res) => {
    try {
        const { phone } = req.params;
        const { amount } = req.body;
        const users = await readJSON(usersPath);

        if (!users[phone]) {
            return res.status(404).json({ error: 'User not found' });
        }

        const addAmount = parseInt(amount) || 0;
        users[phone].balance = (users[phone].balance || 0) + addAmount;

        await writeJSON(usersPath, users);

        const logEntry = `[${new Date().toISOString()}] Added ৳${addAmount} to ${phone} balance\n`;
        await fs.appendFile(path.join(__dirname, 'admin-logs.txt'), logEntry);

        io.emit('userBalanceUpdated', { phone, balance: users[phone].balance });

        res.json({ success: true, newBalance: users[phone].balance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add Due Balance to User
app.post('/api/users/:phone/add-due-balance', async (req, res) => {
    try {
        const { phone } = req.params;
        const { amount } = req.body;
        const users = await readJSON(usersPath);

        if (!users[phone]) {
            return res.status(404).json({ error: 'User not found' });
        }

        const addAmount = parseInt(amount) || 0;
        users[phone].dueBalance = (users[phone].dueBalance || 0) + addAmount;

        await writeJSON(usersPath, users);

        const logEntry = `[${new Date().toISOString()}] Added ৳${addAmount} to ${phone} due balance\n`;
        await fs.appendFile(path.join(__dirname, 'admin-logs.txt'), logEntry);

        io.emit('userDueBalanceUpdated', { phone, dueBalance: users[phone].dueBalance });

        res.json({ success: true, newDueBalance: users[phone].dueBalance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await readJSON(transactionsPath);
        const database = await readJSON(databasePath);
        
        const transactionsArray = Object.entries(transactions).map(([id, data]) => {
            // Get group name from database if groupId exists
            let groupName = 'Unknown Group';
            if (data.groupId && database.groups && database.groups[data.groupId]) {
                groupName = database.groups[data.groupId].groupName || 
                           database.groups[data.groupId].name || 
                           'Unknown Group';
            }

            return {
                id,
                phone: data.phone || 'Unknown',
                amount: data.amount || 0,
                type: data.type || 'deposit',
                status: data.status || 'completed',
                date: data.date || new Date().toISOString(),
                method: data.method || 'bKash',
                groupId: data.groupId,
                groupName: groupName
            };
        });

        // Sort by date (newest first)
        transactionsArray.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(transactionsArray);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Pending Deposits
app.get('/api/deposits/pending', async (req, res) => {
    try {
        const database = await readJSON(databasePath);
        const pendingDeposits = database.pendingDeposits || {};

        const depositsArray = Object.entries(pendingDeposits).map(([id, data]) => ({
            id,
            phone: data.phone || 'Unknown',
            amount: data.amount || 0,
            transactionId: data.transactionId || '',
            date: data.date || new Date().toISOString(),
            screenshot: data.screenshot || null
        }));

        res.json(depositsArray);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve Deposit
app.post('/api/deposits/:depositId/approve', async (req, res) => {
    try {
        const { depositId } = req.params;
        const database = await readJSON(databasePath);
        const users = await readJSON(usersPath);

        const deposit = database.pendingDeposits?.[depositId];
        if (!deposit) {
            return res.status(404).json({ error: 'Deposit not found' });
        }

        // Add balance to user
        if (!users[deposit.phone]) {
            users[deposit.phone] = { balance: 0, totalDeposits: 0 };
        }
        users[deposit.phone].balance += deposit.amount;
        users[deposit.phone].totalDeposits = (users[deposit.phone].totalDeposits || 0) + deposit.amount;

        // Move to transactions
        const transactions = await readJSON(transactionsPath);
        transactions[depositId] = {
            ...deposit,
            status: 'completed',
            approvedDate: new Date().toISOString()
        };

        // Remove from pending
        delete database.pendingDeposits[depositId];

        await writeJSON(usersPath, users);
        await writeJSON(transactionsPath, transactions);
        await writeJSON(databasePath, database);

        io.emit('depositApproved', { depositId, phone: deposit.phone, amount: deposit.amount });

        res.json({ success: true, depositId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reject Deposit
app.post('/api/deposits/:depositId/reject', async (req, res) => {
    try {
        const { depositId } = req.params;
        const database = await readJSON(databasePath);

        const deposit = database.pendingDeposits?.[depositId];
        if (!deposit) {
            return res.status(404).json({ error: 'Deposit not found' });
        }

        delete database.pendingDeposits[depositId];
        await writeJSON(databasePath, database);

        io.emit('depositRejected', { depositId });

        res.json({ success: true, depositId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Orders
app.get('/api/orders', async (req, res) => {
    try {
        const database = await readJSON(databasePath);
        const groups = database.groups || {};

        const ordersArray = [];
        
        // Loop through all groups and collect their entries
        Object.entries(groups).forEach(([groupId, groupData]) => {
            const entries = groupData.entries || [];
            entries.forEach(entry => {
                ordersArray.push({
                    id: entry.id,
                    phone: entry.userName || entry.userId || 'Unknown',
                    playerIdType: 'Free Fire',
                    playerId: entry.playerIdNumber || entry.userId || '',
                    amount: Math.round(entry.diamonds * entry.rate),
                    diamonds: entry.diamonds || 0,
                    status: entry.status || 'pending',
                    date: entry.createdAt || new Date().toISOString(),
                    processingStartedAt: entry.processingStartedAt || null,
                    processingTimeout: entry.processingTimeout || null
                });
            });
        });

        ordersArray.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(ordersArray);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single order status by ID
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const database = await readJSON(databasePath);
        const groups = database.groups || {};

        for (const [groupId, groupData] of Object.entries(groups)) {
            const entries = groupData.entries || [];
            const entry = entries.find(e => e.id == orderId);
            
            if (entry) {
                return res.json({
                    success: true,
                    order: {
                        id: entry.id,
                        phone: entry.userName || entry.userId || 'Unknown',
                        playerIdType: 'Free Fire',
                        playerId: entry.playerIdNumber || entry.userId || '',
                        amount: Math.round(entry.diamonds * entry.rate),
                        diamonds: entry.diamonds || 0,
                        status: entry.status || 'pending',
                        date: entry.createdAt || new Date().toISOString(),
                        processingStartedAt: entry.processingStartedAt || null,
                        deletedAt: entry.deletedAt || null,
                        deletedBy: entry.deletedBy || null
                    }
                });
            }
        }

        res.status(404).json({ success: false, error: 'Order not found' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update Order Status (Mark as Done / Approve)
app.post('/api/orders/:orderId/update-status', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, error: 'Status is required' });
        }

        const database = await readJSON(databasePath);
        const groups = database.groups || {};
        let updated = false;

        for (const [groupId, groupData] of Object.entries(groups)) {
            const entries = groupData.entries || [];
            const entryIndex = entries.findIndex(e => e.id == orderId);
            
            if (entryIndex !== -1) {
                const entry = entries[entryIndex];
                const oldStatus = entry.status;
                
                // Update status
                entry.status = status;
                
                // If marking as done (moving to processing), record the start time
                if (status === 'processing') {
                    entry.processingStartedAt = new Date().toISOString();
                    entry.processingTimeout = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes from now
                    
                    // 🔥 START AUTO-APPROVAL TIMER
                    console.log(`[ORDER UPDATE] 🤖 Starting 2-minute auto-approval timer for Order ${orderId}`);
                    startAutoApprovalTimer(groupId, orderId, entry, null);
                }
                
                // Update the database
                await writeJSON(databasePath, database);
                updated = true;

                // Broadcast to all admin panels
                io.emit('orderStatusUpdated', {
                    orderId: orderId,
                    groupId: groupId,
                    oldStatus: oldStatus,
                    newStatus: status,
                    processingStartedAt: entry.processingStartedAt || null,
                    processingTimeout: entry.processingTimeout || null,
                    timestamp: new Date().toISOString()
                });

                console.log(`[ORDER UPDATE] ✅ Order ${orderId} status updated: ${oldStatus} → ${status}`);
                
                return res.json({
                    success: true,
                    message: `Order status updated to ${status}`,
                    order: {
                        id: entry.id,
                        status: entry.status,
                        processingStartedAt: entry.processingStartedAt,
                        processingTimeout: entry.processingTimeout
                    }
                });
            }
        }

        if (!updated) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
    } catch (error) {
        console.error('[ORDER UPDATE ERROR]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete Order (Mark as deleted status, don't remove from DB)
app.post('/api/orders/:orderId/delete', async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderIdNum = parseInt(orderId) || orderId; // Try to convert to number, fallback to string
        
        console.log(`[DELETE API] Received delete request for order: ${orderId} (converted: ${orderIdNum})`);
        
        const database = await readJSON(databasePath);
        const groups = database.groups || {};
        let updated = false;

        for (const [groupId, groupData] of Object.entries(groups)) {
            const entries = groupData.entries || [];
            console.log(`[DELETE API] Checking group ${groupId}, entries count: ${entries.length}`);
            
            const entryIndex = entries.findIndex(e => {
                console.log(`[DELETE API] Comparing: e.id=${e.id} (${typeof e.id}) with orderId=${orderIdNum} (${typeof orderIdNum})`);
                return e.id == orderIdNum;
            });
            
            if (entryIndex !== -1) {
                const entry = entries[entryIndex];
                const oldStatus = entry.status;
                console.log(`[DELETE API] ✅ FOUND order ${orderId} in group ${groupId}, current status: ${oldStatus}`);
                
                // Mark as deleted instead of removing
                entry.status = 'deleted';
                entry.deletedAt = new Date().toISOString();
                entry.deletedBy = 'Admin Panel';
                
                // Update the database
                await writeJSON(databasePath, database);
                console.log(`[DELETE API] ✅ Database updated, status changed to deleted`);
                updated = true;

                // Broadcast to all admin panels
                io.emit('orderStatusUpdated', {
                    orderId: orderId,
                    groupId: groupId,
                    oldStatus: oldStatus,
                    newStatus: 'deleted',
                    timestamp: new Date().toISOString()
                });

                console.log(`[DELETE API] ✅ Order ${orderId} marked as deleted and broadcast sent`);
                
                return res.json({
                    success: true,
                    message: 'Order marked as deleted',
                    order: {
                        id: entry.id,
                        status: 'deleted',
                        deletedAt: entry.deletedAt
                    }
                });
            }
        }

        console.log(`[DELETE API] ❌ Order ${orderId} NOT found in any group`);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
    } catch (error) {
        console.error('[DELETE API ERROR]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Permanent Delete Order (Completely remove from database)
app.post('/api/orders/:orderId/permanent-delete', async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderIdNum = parseInt(orderId) || orderId;
        
        console.log(`[PERMANENT DELETE] 🗑️ Received permanent delete request for order: ${orderId}`);
        
        const database = await readJSON(databasePath);
        const groups = database.groups || {};
        let deleted = false;
        let deletedOrder = null;

        for (const [groupId, groupData] of Object.entries(groups)) {
            const entries = groupData.entries || [];
            const entryIndex = entries.findIndex(e => e.id == orderIdNum);
            
            if (entryIndex !== -1) {
                deletedOrder = entries[entryIndex];
                console.log(`[PERMANENT DELETE] ✅ Found order ${orderId} in group ${groupId}`);
                console.log(`[PERMANENT DELETE] Order details: ${deletedOrder.userName} - ${deletedOrder.diamonds}💎`);
                
                // Completely remove from array
                entries.splice(entryIndex, 1);
                
                // Update the database
                await writeJSON(databasePath, database);
                console.log(`[PERMANENT DELETE] ✅ Order ${orderId} permanently deleted from database`);
                deleted = true;

                // Broadcast to all admin panels
                io.emit('orderPermanentlyDeleted', {
                    orderId: orderId,
                    groupId: groupId,
                    order: deletedOrder,
                    timestamp: new Date().toISOString()
                });

                console.log(`[PERMANENT DELETE] ✅ Broadcast sent to admin panels`);
                
                return res.json({
                    success: true,
                    message: 'Order permanently deleted',
                    order: deletedOrder
                });
            }
        }

        console.log(`[PERMANENT DELETE] ❌ Order ${orderId} NOT found`);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
    } catch (error) {
        console.error('[PERMANENT DELETE ERROR]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Restore a deleted order back to approved status
app.post('/api/orders/:orderId/restore', async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderIdNum = parseInt(orderId) || orderId; // Try to convert to number, fallback to string
        
        console.log(`[RESTORE API] Received restore request for order: ${orderId} (converted: ${orderIdNum})`);
        
        const database = await readJSON(databasePath);
        const groups = database.groups || {};
        let updated = false;

        for (const [groupId, groupData] of Object.entries(groups)) {
            const entries = groupData.entries || [];
            console.log(`[RESTORE API] Checking group ${groupId}, entries count: ${entries.length}`);
            
            const entryIndex = entries.findIndex(e => {
                console.log(`[RESTORE API] Comparing: e.id=${e.id} (${typeof e.id}) with orderId=${orderIdNum} (${typeof orderIdNum})`);
                return e.id == orderIdNum;
            });
            
            if (entryIndex !== -1) {
                const entry = entries[entryIndex];
                const oldStatus = entry.status;
                
                // Only restore if status is deleted
                if (oldStatus !== 'deleted') {
                    console.log(`[RESTORE API] ❌ Order status is ${oldStatus}, not deleted. Cannot restore.`);
                    return res.status(400).json({ success: false, error: `Order status is ${oldStatus}, cannot restore` });
                }
                
                console.log(`[RESTORE API] ✅ FOUND order ${orderId} in group ${groupId}, current status: ${oldStatus}`);
                
                // Restore to approved status
                entry.status = 'approved';
                entry.restoredAt = new Date().toISOString();
                // Keep the original approvedAt and other fields
                
                // Update the database
                await writeJSON(databasePath, database);
                console.log(`[RESTORE API] ✅ Database updated, status changed to approved`);
                updated = true;

                // Broadcast to all admin panels
                io.emit('orderStatusUpdated', {
                    orderId: orderId,
                    groupId: groupId,
                    oldStatus: oldStatus,
                    newStatus: 'approved',
                    timestamp: new Date().toISOString()
                });

                console.log(`[RESTORE API] ✅ Order ${orderId} restored to approved and broadcast sent`);
                
                return res.json({
                    success: true,
                    message: 'Order restored to approved status',
                    order: {
                        id: entry.id,
                        status: 'approved',
                        restoredAt: entry.restoredAt
                    }
                });
            }
        }

        console.log(`[RESTORE API] ❌ Order ${orderId} NOT found in any group`);
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
    } catch (error) {
        console.error('[RESTORE API ERROR]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Payment Numbers
app.get('/api/payment-numbers', async (req, res) => {
    try {
        // Check if request is from admin panel (for admin use only)
        const adminView = req.query.admin_view === 'true';
        
        // Check if payment system is enabled
        const paymentSettingsPath = path.join(dbPath, 'payment-settings.json');
        let settings = { enabled: true };
        
        try {
            settings = await readJSON(paymentSettingsPath);
        } catch (e) {
            // File doesn't exist, default to enabled
        }
        
        // If payment system is disabled and NOT admin view, return empty list
        if (!settings.enabled && !adminView) {
            return res.json({ paymentNumbers: [], isEnabled: false });
        }
        
        // For admin view or when enabled, return all payment numbers
        const paymentNumbers = await readJSON(path.join(dbPath, 'payment-number.json'));
        res.json({ ...paymentNumbers, isEnabled: settings.enabled });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add Payment Number
app.post('/api/payment-numbers/add', async (req, res) => {
    try {
        const payload = req.body;
        const paymentData = await readJSON(path.join(dbPath, 'payment-number.json'));

        // Set enabled to true by default
        if (payload.enabled === undefined) {
            payload.enabled = true;
        }

        // Add to paymentNumbers array
        paymentData.paymentNumbers.push(payload);
        
        await writeJSON(path.join(dbPath, 'payment-number.json'), paymentData);

        io.emit('paymentNumberUpdated', paymentData);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Payment Number
app.delete('/api/payment-numbers/delete/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const paymentData = await readJSON(path.join(dbPath, 'payment-number.json'));

        if (index >= 0 && index < paymentData.paymentNumbers.length) {
            paymentData.paymentNumbers.splice(index, 1);
            await writeJSON(path.join(dbPath, 'payment-number.json'), paymentData);
            
            io.emit('paymentNumberUpdated', paymentData);
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Invalid index' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle Payment Number Status (ON/OFF)
app.post('/api/payment-numbers/toggle/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const paymentData = await readJSON(path.join(dbPath, 'payment-number.json'));

        if (index >= 0 && index < paymentData.paymentNumbers.length) {
            // Toggle the enabled status
            paymentData.paymentNumbers[index].enabled = !paymentData.paymentNumbers[index].enabled;
            await writeJSON(path.join(dbPath, 'payment-number.json'), paymentData);
            
            io.emit('paymentNumberUpdated', paymentData);
            res.json({ 
                success: true, 
                payment: paymentData.paymentNumbers[index],
                status: paymentData.paymentNumbers[index].enabled ? 'enabled' : 'disabled'
            });
        } else {
            res.status(400).json({ error: 'Invalid index' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Payment System Status (Entire System ON/OFF)
app.get('/api/payment-system/status', async (req, res) => {
    try {
        const paymentSettingsPath = path.join(dbPath, 'payment-settings.json');
        let settings = { enabled: true };
        
        try {
            settings = await readJSON(paymentSettingsPath);
        } catch (e) {
            // File doesn't exist, create it with default enabled
            await writeJSON(paymentSettingsPath, settings);
        }
        
        res.json({ enabled: settings.enabled });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle Payment System ON/OFF
app.post('/api/payment-system/toggle', async (req, res) => {
    try {
        const paymentSettingsPath = path.join(dbPath, 'payment-settings.json');
        let settings = { enabled: true };
        
        try {
            settings = await readJSON(paymentSettingsPath);
        } catch (e) {
            // File doesn't exist, create with default
        }
        
        // Toggle the enabled status
        settings.enabled = !settings.enabled;
        await writeJSON(paymentSettingsPath, settings);
        
        console.log(`[PAYMENT-SYSTEM] ✅ Payment system toggled to: ${settings.enabled ? 'ON' : 'OFF'}`);
        
        res.json({ 
            success: true, 
            enabled: settings.enabled,
            message: settings.enabled ? 'Payment system is now ON' : 'Payment system is now OFF'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WhatsApp Admin Management Endpoints
const whatsappAdminsPath = path.join(__dirname, 'whatsapp-admins.json');

// Get all WhatsApp admins
app.get('/api/whatsapp-admins', async (req, res) => {
    try {
        const admins = await readJSON(whatsappAdminsPath);
        res.json(admins);
    } catch (error) {
        res.json({ whatsappAdmins: [] });
    }
});

// Add WhatsApp Admin
app.post('/api/whatsapp-admins/add', async (req, res) => {
    try {
        const { phone, name } = req.body;
        
        console.log(`[ADMIN-ADD] Received request - Phone: ${phone}, Name: ${name}`);
        
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        let admins = await readJSON(whatsappAdminsPath);
        if (!admins.whatsappAdmins) {
            admins.whatsappAdmins = [];
        }

        // Check if phone already exists
        if (admins.whatsappAdmins.some(admin => admin.phone === phone)) {
            return res.status(400).json({ error: 'This phone number is already an admin' });
        }

        // Add new admin to admin panel file with name
        const whatsappId = phone + '@lid';
        admins.whatsappAdmins.push({
            phone: phone,
            name: name || 'Admin',
            whatsappId: whatsappId,
            addedAt: new Date().toISOString()
        });

        await writeJSON(whatsappAdminsPath, admins);
        console.log(`[ADMIN-ADD] ✅ Saved to whatsapp-admins.json`);

        // ALSO ADD TO BOT SIDE admins.json
        const botAdminsPath = path.join(__dirname, '..', 'config', 'admins.json');
        let botAdmins = [];
        try {
            const content = await fs.readFile(botAdminsPath, 'utf8');
            botAdmins = JSON.parse(content);
        } catch (e) {
            botAdmins = [];
        }

        // Add to bot admins if not already there
        if (!botAdmins.some(a => a.whatsappId === whatsappId)) {
            botAdmins.push({
                phone: phone,
                name: name || 'Admin',
                whatsappId: whatsappId,
                addedAt: new Date().toISOString()
            });
            await fs.writeFile(botAdminsPath, JSON.stringify(botAdmins, null, 2));
            console.log(`[ADMIN-ADD] ✅ Saved to config/admins.json - WhatsApp ID: ${whatsappId}`);
        }

        // Log the action
        const logEntry = `[${new Date().toISOString()}] Added WhatsApp admin: ${phone}`;
        const logsPath = path.join(__dirname, 'admin-logs.txt');
        const existingLogs = await fs.readFile(logsPath, 'utf8').catch(() => '');
        await fs.writeFile(logsPath, existingLogs + logEntry + '\n');

        io.emit('whatsappAdminsUpdated', admins);
        console.log(`[ADMIN-ADD] ✅ Admin added successfully: ${name} (${phone})`);
        res.json({ success: true, message: 'Admin added successfully' });
    } catch (error) {
        console.error(`[ADMIN-ADD] ❌ Error:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Delete WhatsApp Admin
app.delete('/api/whatsapp-admins/delete/:index', async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        let admins = await readJSON(whatsappAdminsPath);
        
        if (!admins.whatsappAdmins) {
            admins.whatsappAdmins = [];
        }

        if (index >= 0 && index < admins.whatsappAdmins.length) {
            const removedAdmin = admins.whatsappAdmins[index];
            admins.whatsappAdmins.splice(index, 1);
            await writeJSON(whatsappAdminsPath, admins);

            // ALSO REMOVE FROM BOT SIDE admins.json
            const botAdminsPath = path.join(__dirname, '..', 'config', 'admins.json');
            try {
                let botAdmins = [];
                const content = await fs.readFile(botAdminsPath, 'utf8').catch(() => '[]');
                botAdmins = JSON.parse(content);
                
                const whatsappId = removedAdmin.phone + '@lid';
                const filteredAdmins = botAdmins.filter(a => a.whatsappId !== whatsappId);
                
                if (filteredAdmins.length !== botAdmins.length) {
                    await fs.writeFile(botAdminsPath, JSON.stringify(filteredAdmins, null, 2));
                }
            } catch (e) {
                console.error('Error removing from bot admins:', e);
            }

            // Log the action
            const logEntry = `[${new Date().toISOString()}] Removed WhatsApp admin: ${removedAdmin.phone}`;
            const logsPath = path.join(__dirname, 'admin-logs.txt');
            const existingLogs = await fs.readFile(logsPath, 'utf8').catch(() => '');
            await fs.writeFile(logsPath, existingLogs + logEntry + '\n');

            io.emit('whatsappAdminsUpdated', admins);
            res.json({ success: true, message: 'Admin removed successfully' });
        } else {
            res.status(400).json({ error: 'Invalid index' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Analytics Data
app.get('/api/analytics', async (req, res) => {
    try {
        const transactions = await readJSON(transactionsPath);
        const database = await readJSON(databasePath);

        // Last 7 days data
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Get all completed/approved transactions for this date
            const dayTransactions = Object.values(transactions).filter(t => 
                t.createdAt && t.createdAt.startsWith(dateStr) && 
                (t.status === 'completed' || t.status === 'approved')
            );
            
            // Get orders for this date from all groups
            let dayOrders = 0;
            const groups = database.groups || {};
            Object.values(groups).forEach(group => {
                const entries = group.entries || [];
                dayOrders += entries.filter(e => 
                    e.createdAt && e.createdAt.startsWith(dateStr) && e.status === 'approved'
                ).length;
            });
            
            last7Days.push({
                date: dateStr,
                deposits: dayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
                orders: dayOrders
            });
        }

        // Only show demo data if there is actual data
        // If no data exists, return empty data
        const hasData = last7Days.some(d => d.deposits > 0 || d.orders > 0);
        
        if (!hasData) {
            // Return empty data when no transactions
            res.json({ last7Days: last7Days });
        } else {
            // Show demo/example data overlay when there is real data for visualization
            const demoData = [
                { date: last7Days[0].date, deposits: last7Days[0].deposits || 5000, orders: last7Days[0].orders || 2 },
                { date: last7Days[1].date, deposits: last7Days[1].deposits || 8500, orders: last7Days[1].orders || 4 },
                { date: last7Days[2].date, deposits: last7Days[2].deposits || 12000, orders: last7Days[2].orders || 6 },
                { date: last7Days[3].date, deposits: last7Days[3].deposits || 9500, orders: last7Days[3].orders || 5 },
                { date: last7Days[4].date, deposits: last7Days[4].deposits || 15000, orders: last7Days[4].orders || 7 },
                { date: last7Days[5].date, deposits: last7Days[5].deposits || 11000, orders: last7Days[5].orders || 5 },
                { date: last7Days[6].date, deposits: last7Days[6].deposits || 13500, orders: last7Days[6].orders || 6 }
            ];
            res.json({ last7Days: demoData });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin Activity Log
app.get('/api/admin-logs', async (req, res) => {
    try {
        const logsPath = path.join(__dirname, '..', 'admin-logs.txt');
        const logs = await fs.readFile(logsPath, 'utf8');
        const logLines = logs.split('\n').filter(l => l.trim()).slice(-100); // Last 100 logs
        res.json(logLines);
    } catch (error) {
        res.json([]);
    }
});

// Backup API
app.get('/api/backup', async (req, res) => {
    try {
        const users = await readJSON(usersPath);
        const transactions = await readJSON(transactionsPath);
        const database = await readJSON(databasePath);
        const payments = await readJSON(paymentsPath);
        
        const backup = {
            users,
            transactions,
            database,
            payments,
            backupDate: new Date().toISOString(),
            version: '1.0.0'
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=backup-${new Date().toISOString().split('T')[0]}.json`);
        res.json(backup);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auto-Deduction API - Get last auto-deduction
app.get('/api/auto-deductions/last', async (req, res) => {
    try {
        const deductions = await readJSON(autoDeductionsPath);
        if (Array.isArray(deductions) && deductions.length > 0) {
            const last = deductions[deductions.length - 1];
            
            // Enhance with group name from database if needed
            if (!last.groupName || last.groupName === 'Unknown Group') {
                const database = await readJSON(databasePath);
                const groups = database.groups || {};
                const groupData = groups[last.groupId];
                if (groupData && groupData.groupName) {
                    last.groupName = groupData.groupName;
                }
            }
            
            res.json(last);
        } else {
            res.json(null);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auto-Deduction API - Get all auto-deductions
app.get('/api/auto-deductions', async (req, res) => {
    try {
        const deductions = await readJSON(autoDeductionsPath);
        const database = await readJSON(databasePath);
        const groups = database.groups || {};
        
        // Enhance deductions with group names from database
        const enhancedDeductions = (Array.isArray(deductions) ? deductions : []).map(deduction => {
            if (!deduction.groupName || deduction.groupName === 'Unknown Group') {
                const groupData = groups[deduction.groupId];
                if (groupData && groupData.groupName) {
                    deduction.groupName = groupData.groupName;
                }
            }
            return deduction;
        });
        
        res.json(enhancedDeductions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📋 Get user orders from admin panel database (for missing order detection)
app.post('/api/user-orders', async (req, res) => {
    try {
        const { groupId, userId, limit = 10 } = req.body;
        
        if (!groupId || !userId) {
            return res.status(400).json({ error: 'Missing groupId or userId' });
        }

        console.log(`[USER ORDERS] 📋 Fetching orders for user ${userId} in group ${groupId} (limit: ${limit})`);
        
        // Read database
        const db = await readJSON(databasePath);
        
        if (!db.groups || !db.groups[groupId]) {
            console.log(`[USER ORDERS] ⚠️ Group ${groupId} not found`);
            return res.json({ orders: [] });
        }

        const groupData = db.groups[groupId];
        const userOrders = (groupData.entries || [])
            .filter(e => e.userId === userId)
            .sort((a, b) => b.id - a.id) // Newest first
            .slice(0, limit);
        
        console.log(`[USER ORDERS] ✅ Found ${userOrders.length} orders for user`);
        
        return res.json({ 
            orders: userOrders,
            count: userOrders.length,
            userId,
            groupId
        });
    } catch (error) {
        console.error('[USER ORDERS] ❌ Error:', error);
        return res.status(500).json({ error: error.message, orders: [] });
    }
});

// Order Event API - Handle all order events (new, delete, cancel, etc)
// 🔍 Check if order exists in admin panel (for missing order detection)
app.post('/api/check-order', async (req, res) => {
    try {
        const { orderId, groupId, userId, diamonds } = req.body;
        
        if (!orderId || !groupId) {
            return res.status(400).json({ error: 'Missing orderId or groupId' });
        }

        console.log(`[CHECK ORDER] 🔍 Checking order ${orderId} in group ${groupId}`);
        
        // Read database
        const db = await readJSON(databasePath);
        
        if (!db.groups || !db.groups[groupId]) {
            console.log(`[CHECK ORDER] ⚠️ Group ${groupId} not found`);
            return res.json({ exists: false, missing: true, reason: 'Group not found' });
        }

        const groupData = db.groups[groupId];
        const order = groupData.entries?.find(e => e.id === orderId);
        
        if (!order) {
            console.log(`[CHECK ORDER] 🚨 Order ${orderId} NOT FOUND - COMPLETELY MISSING!`);
            return res.json({ 
                exists: false, 
                missing: true, 
                reason: 'Order completely removed from database',
                orderId,
                groupId
            });
        }

        // Check if order is deleted (status: 'deleted')
        if (order.status === 'deleted') {
            console.log(`[CHECK ORDER] 🗑️ Order ${orderId} is DELETED - Treating as MISSING!`);
            return res.json({ 
                exists: false, 
                missing: true, 
                reason: 'Order has deleted status',
                orderId,
                groupId,
                order: {
                    id: order.id,
                    diamonds: order.diamonds,
                    status: order.status
                }
            });
        }

        // ✅ Order exists in admin panel with active status (pending/approved/processing)
        console.log(`[CHECK ORDER] ✅ Order ${orderId} exists with status: ${order.status}`);
        return res.json({ 
            exists: true, 
            missing: false,
            order: {
                id: order.id,
                diamonds: order.diamonds,
                status: order.status,
                userId: order.userId,
                timestamp: order.timestamp
            }
        });
    } catch (error) {
        console.error('[CHECK ORDER] ❌ Error:', error.message);
        res.status(500).json({ error: error.message, exists: false, missing: true });
    }
});

app.post('/api/order-event', async (req, res) => {
    try {
        const { eventType, type, reason, groupId, entry, data, message } = req.body;
        const eventTypeToUse = eventType || type;
        const entryToUse = entry || data;
        
        if (!eventTypeToUse || !entryToUse) {
            console.log('[ORDER-EVENT] ⚠️ Missing event type or entry/data:', { eventTypeToUse, entryToUse });
            return res.status(400).json({ error: 'Missing event type or entry/data' });
        }

        console.log(`[ORDER-EVENT] 📨 RECEIVED EVENT: ${eventTypeToUse}: ${entryToUse.id || entryToUse.entryId || 'unknown'} - ${reason || 'no reason'}`);
        
        // Handle new order events
        if (eventTypeToUse === 'new-order' || eventTypeToUse === 'newOrder') {
            console.log(`[ORDER-EVENT] 🎯 NEW ORDER: ${entryToUse.diamonds}💎 from ${entryToUse.userName}`);
            
            // Emit event to all connected admin panel clients via Socket.io
            io.emit('newOrderCreated', {
                orderId: entryToUse.entryId || entryToUse.id,
                order: entryToUse,
                message: message || `New order: ${entryToUse.diamonds}💎 from ${entryToUse.userName}`,
                timestamp: new Date().toISOString()
            });
        } else if (eventTypeToUse === 'missing-order-recovery') {
            // Handle recovered missing orders
            console.log(`[ORDER-EVENT] 🚨 MISSING ORDER RECOVERED: ${entryToUse.diamonds}💎 from ${entryToUse.userName}`);
            
            io.emit('missingOrderRecovered', {
                orderId: entryToUse.entryId || entryToUse.id,
                order: entryToUse,
                message: `⚠️ Missing order recovered: ${entryToUse.diamonds}💎`,
                timestamp: new Date().toISOString(),
                recoveredAt: entryToUse.recoveredAt,
                originalTimestamp: entryToUse.originalTimestamp
            });
        } else {
            // Handle other event types (delete, cancel, etc)
            console.log(`[ORDER-EVENT] 📝 STATUS CHANGE: ${eventTypeToUse}`);
            
            io.emit('orderEvent', {
                type: eventTypeToUse,
                reason: reason,
                groupId: groupId,
                entry: entryToUse,
                message: message,
                timestamp: new Date().toISOString()
            });
        }
        
        console.log(`[ORDER-EVENT] ✅ Broadcasted to ${io.engine.clientsCount || 0} admin panel clients`);
        res.json({ success: true, message: 'Event broadcasted', clientCount: io.engine.clientsCount });
    } catch (error) {
        console.error('[ORDER-EVENT] ❌ Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Auto-Deduction API - Log a new auto-deduction
app.post('/api/auto-deductions', async (req, res) => {
    try {
        const { groupId, groupName, amount, timestamp } = req.body;
        
        if (!groupId || !amount) {
            return res.status(400).json({ error: 'Missing groupId or amount' });
        }

        const deductions = await readJSON(autoDeductionsPath);
        const deductionRecord = {
            id: Date.now(),
            groupId,
            groupName: groupName || 'Unknown Group',
            amount: Math.round(amount),
            timestamp: timestamp || new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        const updatedDeductions = Array.isArray(deductions) ? [...deductions, deductionRecord] : [deductionRecord];
        await writeJSON(autoDeductionsPath, updatedDeductions);

        // Emit real-time update
        io.emit('autoDeductionLogged', deductionRecord);

        res.json({ success: true, record: deductionRecord });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auto-Deduction API - Clear all auto-deductions
app.delete('/api/auto-deductions', async (req, res) => {
    try {
        await writeJSON(autoDeductionsPath, []);
        io.emit('autoDeductionCleared');
        res.json({ success: true, message: 'All auto-deductions cleared' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear All Data
app.post('/api/clear-all-data', async (req, res) => {
    try {
        const { pin } = req.body;
        
        // Verify PIN from pin.json
        const pinData = await readJSON(path.join(dbPath, 'pin.json'));
        const adminPin = pinData?.adminPin;
        
        if (pin !== adminPin) {
            return res.status(401).json({ success: false, error: 'Invalid PIN' });
        }
        
        // Clear all data files
        const emptyData = {
            groups: {}
        };
        
        const emptyArray = [];
        const emptyObject = {};
        
        await writeJSON(databasePath, emptyData);
        await writeJSON(transactionsPath, emptyArray);
        await writeJSON(usersPath, emptyObject);
        await writeJSON(paymentsPath, emptyObject);
        await writeJSON(autoDeductionsPath, emptyArray);
        
        // Log the action
        const logEntry = `[${new Date().toISOString()}] 🗑️ ALL DATA CLEARED BY ADMIN\n`;
        await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
        
        // Emit update to all connected clients
        io.emit('allDataCleared');
        
        res.json({ success: true, message: 'All data cleared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send Due Reminders
app.post('/api/send-due-reminders', async (req, res) => {
    try {
        const { groups: reminderGroups } = req.body;
        
        if (!Array.isArray(reminderGroups) || reminderGroups.length === 0) {
            return res.status(400).json({ success: false, error: 'No groups selected for reminders' });
        }
        
        const database = await readJSON(databasePath);
        const groups = database.groups || {};
        
        // Read payment numbers
        const paymentNumbersPath = path.join(dbPath, 'payment-number.json');
        const paymentData = await readJSON(paymentNumbersPath);
        const paymentNumbers = paymentData.paymentNumbers || [];
        
        const results = [];
        
        for (const reminderGroup of reminderGroups) {
            const { groupId, paymentMethodIndices } = reminderGroup;
            const group = groups[groupId];
            
            if (!group) {
                results.push({
                    groupId,
                    success: false,
                    reason: 'Group not found'
                });
                continue;
            }
            
            // Calculate due for this group
            const entries = group.entries || [];
            const approvedEntries = entries.filter(e => e.status === 'approved');
            
            const totalAmount = approvedEntries.reduce((sum, entry) => sum + (entry.diamonds * entry.rate), 0);
            const totalPaid = group.totalPaid || 0;
            const totalDue = Math.max(0, totalAmount - totalPaid);
            
            // Only send reminder if group has due amount
            if (totalDue === 0) {
                results.push({
                    groupId,
                    groupName: group.groupName || group.name,
                    success: false,
                    reason: 'No due amount'
                });
                continue;
            }
            
            // Format payment instructions based on selected payment methods
            let paymentInstructions = '📱 *পেমেন্ট নম্বর:*\n\n';
            
            // If specific payment methods are selected, use only those
            if (Array.isArray(paymentMethodIndices) && paymentMethodIndices.length > 0) {
                paymentMethodIndices.forEach(index => {
                    const payment = paymentNumbers[index];
                    if (payment) {
                        if (payment.isBank) {
                            paymentInstructions += `🏦 *${payment.method}*\n`;
                            paymentInstructions += `💳 একাউন্ট: ${payment.accountNumber}\n`;
                            paymentInstructions += `👤 নাম: ${payment.accountName}\n`;
                            paymentInstructions += `📍 শাখা: ${payment.branch}\n\n`;
                        } else {
                            paymentInstructions += `📱 *${payment.method}* (${payment.type}): ${payment.number}\n`;
                        }
                    }
                });
            } else {
                // If no specific methods selected, use all payment methods
                paymentNumbers.forEach(payment => {
                    if (payment.isBank) {
                        paymentInstructions += `🏦 *${payment.method}*\n`;
                        paymentInstructions += `💳 একাউন্ট: ${payment.accountNumber}\n`;
                        paymentInstructions += `👤 নাম: ${payment.accountName}\n`;
                        paymentInstructions += `📍 শাখা: ${payment.branch}\n\n`;
                    } else {
                        paymentInstructions += `📱 *${payment.method}* (${payment.type}): ${payment.number}\n`;
                    }
                });
            }
            
            paymentInstructions += '\n✅ পেমেন্ট করার পর স্ক্রিনশট পাঠান।';
            
            // Create reminder message with payment instructions
            const message = `
🔔 *দয়া করে মনোযোগ দিন* 🔔

${group.groupName || group.name} গ্রুপের জন্য বকেয়া টাকা পরিশোধের অনুরোধ।

💰 *বকেয়া পরিমাণ:* ৳${totalDue.toLocaleString()}

${paymentInstructions}

অনুগ্রহ করে যত তাড়াতাড়ি সম্ভব পরিশোধ করুন।

ধন্যবাদ!
`.trim();
            
            // Send message via bot API
            try {
                const botResponse = await fetch('http://localhost:3003/api/bot-send-message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        groupId: groupId,
                        message: message
                    })
                });
                
                if (botResponse.ok) {
                    results.push({
                        groupId,
                        groupName: group.groupName || group.name,
                        success: true,
                        dueAmount: totalDue,
                        message: 'Reminder sent'
                    });
                    
                    // Log the reminder
                    const logEntry = `[${new Date().toISOString()}] 📢 Due reminder sent to ${group.groupName || group.name} | Due: ৳${totalDue}\n`;
                    await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
                } else {
                    results.push({
                        groupId,
                        groupName: group.groupName || group.name,
                        success: false,
                        reason: 'Bot failed to send message'
                    });
                }
            } catch (error) {
                results.push({
                    groupId,
                    groupName: group.groupName || group.name,
                    success: false,
                    reason: `Error: ${error.message}`
                });
            }
        }
        
        // Emit update
        io.emit('dueRemindersProcessed', { results });
        
        res.json({
            success: true,
            message: 'Due reminder processing completed',
            results
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Diamond Request Status APIs
const diamondStatusPath = path.join(dbPath, 'diamond-status.json');
const pinPath = path.join(dbPath, 'pin.json');

app.get('/api/diamond-status', async (req, res) => {
    try {
        const status = await readJSON(diamondStatusPath);
        res.json(status || { systemStatus: 'on', globalMessage: '', groupSettings: {} });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/diamond-status/toggle', async (req, res) => {
    try {
        const { systemStatus, pin } = req.body;
        
        // Validate PIN
        const pinData = await readJSON(pinPath);
        if (pin !== pinData.adminPin) {
            return res.status(401).json({ success: false, message: 'Invalid PIN' });
        }
        
        let status = await readJSON(diamondStatusPath);
        status.systemStatus = systemStatus;
        status.lastToggled = new Date().toISOString();
        await writeJSON(diamondStatusPath, status);
        
        console.log(`[TOGGLE] Diamond system toggled to ${systemStatus}`);
        
        // Broadcast to WhatsApp groups
        try {
            await broadcastStatusToGroups(status);
        } catch (broadcastErr) {
            console.error('[BROADCAST] Error sending to groups:', broadcastErr.message);
        }
        
        io.emit('diamondStatusChanged', status);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Toggle approve message notification
app.post('/api/approve-message/toggle', async (req, res) => {
    try {
        let status = await readJSON(diamondStatusPath);
        status.approveMessageEnabled = req.body.approveMessageEnabled;
        status.lastSettingUpdate = new Date().toISOString();
        await writeJSON(diamondStatusPath, status);
        
        io.emit('approveMessageToggled', { enabled: status.approveMessageEnabled });
        res.json({ success: true, enabled: status.approveMessageEnabled });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/diamond-status/global-message', async (req, res) => {
    try {
        let status = await readJSON(diamondStatusPath);
        status.globalMessage = req.body.globalMessage;
        status.lastMessageUpdate = new Date().toISOString();
        await writeJSON(diamondStatusPath, status);
        
        // Broadcast to WhatsApp groups
        try {
            await broadcastStatusToGroups(status);
        } catch (broadcastErr) {
            console.error('[BROADCAST] Error sending to groups:', broadcastErr.message);
        }
        
        io.emit('diamondStatusChanged', status);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/diamond-status/group-message', async (req, res) => {
    try {
        const { groupId, message } = req.body;
        let status = await readJSON(diamondStatusPath);
        
        if (!status.groupSettings) {
            status.groupSettings = {};
        }
        
        if (message.trim() === '') {
            delete status.groupSettings[groupId];
        } else {
            status.groupSettings[groupId] = { message, updatedAt: new Date().toISOString() };
        }
        
        status.lastMessageUpdate = new Date().toISOString();
        await writeJSON(diamondStatusPath, status);
        
        // Broadcast to specific group
        try {
            await broadcastMessageToGroup(groupId, status);
        } catch (broadcastErr) {
            console.error('[BROADCAST] Error sending to group:', broadcastErr.message);
        }
        
        io.emit('diamondStatusChanged', status);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper function to broadcast status to all groups
async function broadcastStatusToGroups(status) {
    try {
        const database = await readJSON(databasePath);
        const groupIds = Object.keys(database.groups || {});
        
        for (const groupId of groupIds) {
            await broadcastMessageToGroup(groupId, status);
        }
        
        console.log(`[BROADCAST] ✅ Status sent to ${groupIds.length} groups`);
        return true;
    } catch (error) {
        console.error('[BROADCAST] Error broadcasting to groups:', error);
        return false;
    }
}

// Helper function to broadcast message to specific group
async function broadcastMessageToGroup(groupId, status) {
    try {
        const message = getGroupStatusMessage(groupId, status);
        
        // Emit to all connected sockets (including bot client)
        io.emit('sendGroupMessage', {
            groupId: groupId,
            message: message,
            type: 'status-update',
            timestamp: new Date().toISOString()
        });
        
        console.log(`[BROADCAST] ✅ Broadcast emitted for group: ${groupId}`);
    } catch (error) {
        console.error(`[BROADCAST] Error sending to group ${groupId}:`, error.message);
    }
}

// Helper function to get the message for a group
function getGroupStatusMessage(groupId, status) {
    let message = '';
    
    if (status.systemStatus === 'on') {
        message = `✅ *Diamond Requests ARE NOW OPEN*\n\n`;
        // If globalMessage is about stock being finished, override it for open status
        if (status.globalMessage && status.globalMessage.includes('স্টক শেষ')) {
            message += 'আপনি এখন ডায়মন্ড অর্ডার করতে পারেন! 💎';
        } else {
            message += status.globalMessage || 'আপনি এখন ডায়মন্ড অর্ডার করতে পারেন! 💎';
        }
    } else {
        message = `❌ *Diamond Requests ARE NOW CLOSED*\n\n`;
        // Show appropriate close message
        message += status.globalMessage || 'ডায়মন্ড রিকোয়েস্ট সাময়িকভাবে বন্ধ আছে। পরে আবার চেষ্টা করুন।';
    }
    
    return message;
}

// Set Diamond Stock
app.post('/api/diamond-status/set-stock', async (req, res) => {
    try {
        const { adminDiamondStock } = req.body;
        
        if (typeof adminDiamondStock !== 'number' || adminDiamondStock < 0) {
            return res.status(400).json({ success: false, error: 'Invalid stock amount' });
        }

        let status = await readJSON(diamondStatusPath);
        status.adminDiamondStock = adminDiamondStock;
        status.lastStockUpdate = new Date().toISOString();
        await writeJSON(diamondStatusPath, status);
        
        // Log the action
        const logEntry = `[${new Date().toISOString()}] 💎 Admin diamond stock updated to: ${adminDiamondStock}\n`;
        await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
        
        io.emit('diamondStatusChanged', status);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Edit Message Settings
app.post('/api/diamond-status/edit-message', async (req, res) => {
    try {
        const { editMessage } = req.body;
        
        if (!editMessage || typeof editMessage !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid message' });
        }

        let status = await readJSON(diamondStatusPath);
        status.editMessage = editMessage;
        status.lastEditMessageUpdate = new Date().toISOString();
        await writeJSON(diamondStatusPath, status);
        
        // Log the action
        const logEntry = `[${new Date().toISOString()}] ✏️ Edit message updated\n`;
        await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
        
        io.emit('diamondStatusChanged', status);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete Message Setting
app.post('/api/diamond-status/delete-message-setting', async (req, res) => {
    try {
        const { disableDeleteMessageEdit } = req.body;
        
        if (typeof disableDeleteMessageEdit !== 'boolean') {
            return res.status(400).json({ success: false, error: 'Invalid setting' });
        }

        let status = await readJSON(diamondStatusPath);
        status.disableDeleteMessageEdit = disableDeleteMessageEdit;
        status.lastDeleteMessageSettingUpdate = new Date().toISOString();
        await writeJSON(diamondStatusPath, status);
        
        // Log the action
        const logEntry = `[${new Date().toISOString()}] 🗑️ Delete message edit: ${disableDeleteMessageEdit ? 'DISABLED' : 'ENABLED'}\n`;
        await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
        
        io.emit('diamondStatusChanged', status);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Auto-Approval Message Setting
app.post('/api/diamond-status/auto-approval-message-setting', async (req, res) => {
    try {
        const { disableAutoApprovalMessage } = req.body;
        
        if (typeof disableAutoApprovalMessage !== 'boolean') {
            return res.status(400).json({ success: false, error: 'Invalid setting' });
        }

        let status = await readJSON(diamondStatusPath);
        status.disableAutoApprovalMessage = disableAutoApprovalMessage;
        status.lastAutoApprovalMessageSettingUpdate = new Date().toISOString();
        await writeJSON(diamondStatusPath, status);
        
        // Log the action
        const logEntry = `[${new Date().toISOString()}] 🤖 Auto-approval message: ${disableAutoApprovalMessage ? 'DISABLED' : 'ENABLED'}\n`;
        await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
        
        io.emit('diamondStatusChanged', status);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Commands Management APIs
app.get('/api/commands', async (req, res) => {
    try {
        const commands = await readJSON(commandsPath);
        res.json(commands);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/commands/add', async (req, res) => {
    try {
        const { command, response, description, category } = req.body;
        
        if (!command || !response || !category) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        let commands = await readJSON(commandsPath);
        
        // Find highest ID
        let maxId = 0;
        Object.values(commands).forEach(catCommands => {
            catCommands.forEach(cmd => {
                if (cmd.id > maxId) maxId = cmd.id;
            });
        });
        
        const newCommand = {
            id: maxId + 1,
            command: command.trim(),
            response: response.trim(),
            description: description.trim(),
            enabled: true,
            category: category
        };
        
        if (!commands[category]) {
            commands[category] = [];
        }
        
        commands[category].push(newCommand);
        await writeJSON(commandsPath, commands);
        
        const logEntry = `[${new Date().toISOString()}] 🆕 New command added: ${command} (${category})\n`;
        await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
        
        io.emit('commandsUpdated', commands);
        res.json({ success: true, command: newCommand });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/commands/update', async (req, res) => {
    try {
        const { id, command, response, description, enabled, category } = req.body;
        
        let commands = await readJSON(commandsPath);
        let found = false;
        
        Object.keys(commands).forEach(cat => {
            commands[cat] = commands[cat].map(cmd => {
                if (cmd.id === id) {
                    found = true;
                    return { ...cmd, command, response, description, enabled, category };
                }
                return cmd;
            });
        });
        
        if (!found) {
            return res.status(404).json({ success: false, error: 'Command not found' });
        }
        
        await writeJSON(commandsPath, commands);
        
        const logEntry = `[${new Date().toISOString()}] ✏️ Command updated: ${command}\n`;
        await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
        
        io.emit('commandsUpdated', commands);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/commands/delete', async (req, res) => {
    try {
        const { id } = req.body;
        
        let commands = await readJSON(commandsPath);
        let deletedCommand = null;
        
        Object.keys(commands).forEach(cat => {
            commands[cat] = commands[cat].filter(cmd => {
                if (cmd.id === id) {
                    deletedCommand = cmd;
                    return false;
                }
                return true;
            });
        });
        
        if (!deletedCommand) {
            return res.status(404).json({ success: false, error: 'Command not found' });
        }
        
        await writeJSON(commandsPath, commands);
        
        const logEntry = `[${new Date().toISOString()}] 🗑️ Command deleted: ${deletedCommand.command}\n`;
        await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
        
        io.emit('commandsUpdated', commands);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Payment Keywords Management
app.get('/api/payment-keywords', async (req, res) => {
    try {
        const data = await readJSON(paymentKeywordsPath);
        res.json(data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/payment-keywords/update', async (req, res) => {
    try {
        const { methods } = req.body;
        
        if (!methods || typeof methods !== 'object') {
            return res.status(400).json({ success: false, error: 'Invalid data' });
        }
        
        // Validate each method
        for (const [methodName, methodConfig] of Object.entries(methods)) {
            if (!methodConfig.keywords || !Array.isArray(methodConfig.keywords) || methodConfig.keywords.length === 0) {
                return res.status(400).json({ success: false, error: `Method ${methodName} must have at least one keyword` });
            }
            if (!methodConfig.response || !methodConfig.response.trim()) {
                return res.status(400).json({ success: false, error: `Method ${methodName} must have a response message` });
            }
        }
        
        const data = {
            methods,
            lastUpdated: new Date().toISOString()
        };
        
        await writeJSON(paymentKeywordsPath, data);
        
        const totalKeywords = Object.values(methods).reduce((sum, m) => sum + m.keywords.length, 0);
        const logEntry = `[${new Date().toISOString()}] 💳 Payment keywords updated (${totalKeywords} total keywords)\n`;
        await fs.appendFile(path.join(adminPath, 'admin-logs.txt'), logEntry);
        
        io.emit('paymentKeywordsUpdated', data);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════════
// 🔄 REAL-TIME ORDER BROADCAST SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Helper function to broadcast order updates to all admin panel users
 * Called by bot or admin panel when order status changes
 */
global.broadcastOrderUpdate = function(event, data) {
    try {
        const timestamp = new Date().toISOString();
        const eventData = {
            ...data,
            timestamp,
            type: event
        };
        
        console.log(`[BROADCAST] 📡 Broadcasting order event: ${event}`, eventData);
        
        // Emit to all connected admin panel users
        io.emit(event, eventData);
        
        // Log the broadcast
        console.log(`[BROADCAST] ✅ ${event} sent to ${io.engine.clientsCount || 0} connected clients`);
        
    } catch (error) {
        console.error(`[BROADCAST] ❌ Error broadcasting:`, error);
    }
};

/**
 * Helper function to broadcast new order creation
 */
global.broadcastNewOrder = function(order) {
    global.broadcastOrderUpdate('newOrderCreated', {
        orderId: order.id,
        order: {
            id: order.id,
            phone: order.phone || order.userName,
            playerId: order.playerId || order.playerIdNumber,
            diamonds: order.diamonds,
            amount: order.amount,
            status: order.status,
            date: order.date || new Date().toISOString()
        },
        message: `🎯 New order from ${order.phone || 'User'}: ${order.diamonds} diamonds`
    });
};

/**
 * Helper function to broadcast order status update
 */
global.broadcastOrderStatusChange = function(orderId, newStatus, message) {
    global.broadcastOrderUpdate('orderStatusUpdated', {
        orderId,
        status: newStatus,
        message: message || `Order ${newStatus}`,
        processingStartedAt: new Date().toISOString()
    });
};

/**
 * Helper function to broadcast order approval
 */
global.broadcastOrderApproved = function(orderId, message) {
    global.broadcastOrderUpdate('orderApproved', {
        orderId,
        status: 'approved',
        message: message || '✅ Order approved'
    });
};

/**
 * Helper function to broadcast order deletion
 */
global.broadcastOrderDeleted = function(orderId, message) {
    global.broadcastOrderUpdate('orderDeleted', {
        orderId,
        status: 'deleted',
        message: message || '🗑️ Order deleted'
    });
};

// ═══════════════════════════════════════════════════════════════════════════════════

// Socket.IO real-time updates
io.on('connection', (socket) => {
    console.log('✅ Admin panel connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('❌ Admin panel disconnected:', socket.id);
    });
    
    // Handle group start command from WhatsApp
    socket.on('groupStarted', async (data) => {
        try {
            console.log('[GROUP-START] New group started:', data);
            
            const { groupId, groupName, admin, timestamp } = data;
            
            // Get current database
            const database = await readJSON(databasePath);
            
            // Check if group already exists
            if (!database.groups) {
                database.groups = {};
            }
            
            if (!database.groups[groupId]) {
                // Create new group
                database.groups[groupId] = {
                    id: groupId,
                    groupName: groupName || 'New Group',
                    rate: 100, // Default rate
                    entries: [],
                    createdAt: timestamp,
                    createdBy: admin,
                    dueLimit: 5000 // Default due limit
                };
                
                // Save database
                await writeJSON(databasePath, database);
                console.log('[GROUP-START] ✅ New group created:', groupId);
                console.log('[GROUP-START] Database saved. Groups in DB:', Object.keys(database.groups));
            }
            
            // Emit to all connected admin panels to refresh groups
            io.emit('groupsUpdated', {
                newGroup: {
                    groupId,
                    groupName,
                    admin,
                    timestamp
                }
            });
            
            console.log('[GROUP-START] ✅ Broadcast to admin panels');
            
        } catch (error) {
            console.error('[GROUP-START] Error:', error.message);
        }
    });
    
    // Handle real-time requests from admin panel
    socket.on('requestOrderUpdate', async (orderId) => {
        try {
            const database = await readJSON(databasePath);
            const groups = database.groups || {};
            
            for (const [groupId, groupData] of Object.entries(groups)) {
                const entries = groupData.entries || [];
                const entry = entries.find(e => e.id == orderId);
                
                if (entry) {
                    socket.emit('orderUpdated', {
                        orderId,
                        status: entry.status,
                        data: entry
                    });
                    return;
                }
            }
        } catch (error) {
            console.error('Error fetching order:', error);
        }
    });
});

// Watch for file changes and emit updates
const chokidar = require('chokidar');
const watcher = chokidar.watch([usersPath, transactionsPath, databasePath], {
    persistent: true,
    ignoreInitial: true
});

watcher.on('change', (path) => {
    console.log(`File ${path} changed, emitting update...`);
    io.emit('dataUpdated', { timestamp: Date.now() });
});

// Send message to group endpoint
app.post('/api/send-message-to-group', async (req, res) => {
    try {
        const { groupId, message } = req.body;
        
        if (!groupId || !message) {
            return res.status(400).json({ success: false, error: 'groupId and message required' });
        }
        
        console.log(`[SEND-MESSAGE] Sending to group ${groupId}: ${message.substring(0, 50)}...`);
        
        // Send via bot API
        try {
            const response = await fetch('http://localhost:3003/api/bot-send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId, message })
            });
            
            if (response.ok) {
                console.log(`✅ [SEND-MESSAGE] Successfully sent to ${groupId}`);
                res.json({ success: true, message: 'Message sent to group' });
            } else {
                console.error(`❌ [SEND-MESSAGE] Bot API returned error`);
                res.json({ success: false, error: 'Bot API error' });
            }
        } catch (error) {
            console.error(`❌ [SEND-MESSAGE] Error calling bot API:`, error.message);
            res.json({ success: false, error: error.message });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Command Management APIs

app.get('/api/commands', async (req, res) => {
    try {
        const commands = await readJSON(commandsPath);
        res.json(commands || { userCommands: [], adminCommands: [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/commands/add', async (req, res) => {
    try {
        const { command, description, response, type } = req.body;
        
        if (!command || !type) {
            return res.status(400).json({ success: false, error: 'Command and type required' });
        }
        
        let commands = await readJSON(commandsPath);
        if (!commands.userCommands) commands.userCommands = [];
        if (!commands.adminCommands) commands.adminCommands = [];
        
        const newCommand = { command, description, response, type, createdAt: new Date().toISOString() };
        
        if (type === 'user') {
            commands.userCommands.push(newCommand);
        } else if (type === 'admin') {
            commands.adminCommands.push(newCommand);
        }
        
        await writeJSON(commandsPath, commands);
        io.emit('commandAdded', newCommand);
        res.json({ success: true, command: newCommand });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/commands/update', async (req, res) => {
    try {
        const { index, type, command, description, response } = req.body;
        
        let commands = await readJSON(commandsPath);
        if (!commands.userCommands) commands.userCommands = [];
        if (!commands.adminCommands) commands.adminCommands = [];
        
        if (type === 'user' && index < commands.userCommands.length) {
            commands.userCommands[index] = { 
                command, description, response, type, 
                createdAt: commands.userCommands[index].createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } else if (type === 'admin' && index < commands.adminCommands.length) {
            commands.adminCommands[index] = { 
                command, description, response, type, 
                createdAt: commands.adminCommands[index].createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }
        
        await writeJSON(commandsPath, commands);
        io.emit('commandUpdated', { index, type, command: commands[type === 'user' ? 'userCommands' : 'adminCommands'][index] });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/commands/delete', async (req, res) => {
    try {
        const { index, type } = req.body;
        
        let commands = await readJSON(commandsPath);
        if (!commands.userCommands) commands.userCommands = [];
        if (!commands.adminCommands) commands.adminCommands = [];
        
        if (type === 'user' && index < commands.userCommands.length) {
            commands.userCommands.splice(index, 1);
        } else if (type === 'admin' && index < commands.adminCommands.length) {
            commands.adminCommands.splice(index, 1);
        }
        
        await writeJSON(commandsPath, commands);
        io.emit('commandDeleted', { index, type });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 📸 Get admin profile picture
app.get('/api/admin/profile-pic/:whatsappId', async (req, res) => {
    try {
        const whatsappId = req.params.whatsappId;
        const fileName = `${whatsappId.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        const picPath = path.join(profilePicDir, fileName);
        
        try {
            const base64Image = await fs.readFile(picPath, 'utf8');
            res.json({ 
                success: true, 
                image: base64Image,
                dataUrl: `data:image/jpeg;base64,${base64Image}`
            });
        } catch (err) {
            // Picture not found or error reading
            res.status(404).json({ 
                success: false, 
                message: 'Profile picture not found',
                image: null 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all bot messages
app.get('/api/messages', async (req, res) => {
    try {
        const messagesPath = path.join(__dirname, '../config/messages.json');
        const messages = await readJSON(messagesPath);
        res.json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update bot message
app.post('/api/messages/:category/:key', async (req, res) => {
    try {
        const { category, key } = req.params;
        const { value } = req.body;
        
        if (!category || !key || !value) {
            return res.status(400).json({ success: false, error: 'Category, key, and value required' });
        }
        
        const messagesPath = path.join(__dirname, '../config/messages.json');
        let messages = await readJSON(messagesPath);
        
        if (!messages[category]) {
            return res.status(400).json({ success: false, error: 'Invalid category' });
        }
        
        messages[category][key] = value;
        await writeJSON(messagesPath, messages);
        
        io.emit('messagesUpdated', { category, key, value });
        res.json({ success: true, message: 'Message updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sales Statistics API

// Get Group Details by Period
app.get('/api/group-details/:period', async (req, res) => {
    try {
        const { period } = req.params;
        const database = await readJSON(databasePath);
        const groups = database.groups || {};
        
        // BD Timezone: UTC+6
        const BD_TIMEZONE_OFFSET = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        
        // Helper to get BD time
        function getBDTime() {
            return new Date(Date.now() + BD_TIMEZONE_OFFSET);
        }
        
        // Helper to get date range
        function getDateRange(type) {
            const now = getBDTime();
            const start = new Date(now);
            
            switch(type) {
                case 'today':
                    start.setUTCHours(0, 0, 0, 0);
                    return { start, end: now };
                case 'yesterday':
                    start.setUTCDate(now.getUTCDate() - 1);
                    start.setUTCHours(0, 0, 0, 0);
                    const end = new Date(start);
                    end.setUTCHours(23, 59, 59, 999);
                    return { start, end };
                case 'weekly':
                    const day = now.getUTCDay();
                    start.setUTCDate(now.getUTCDate() - day);
                    start.setUTCHours(0, 0, 0, 0);
                    return { start, end: now };
                case 'monthly':
                    start.setUTCDate(1);
                    start.setUTCHours(0, 0, 0, 0);
                    return { start, end: now };
                default:
                    return { start: new Date('2000-01-01'), end: now };
            }
        }
        
        const dateRange = getDateRange(period);
        
        // Load users data to calculate dues
        const usersData = await readJSON(usersPath);
        const users = usersData.users || {};
        
        // Calculate group stats for period with actual date filtering
        const groupStats = Object.entries(groups).map(([groupId, groupData]) => {
            const entries = groupData.entries || [];
            
            // Filter entries by date range and completed/processing status
            const filteredEntries = entries.filter(e => {
                // Include approved, processing, or completed statuses (exclude pending/rejected)
                if (!['approved', 'processing', 'completed'].includes(e.status)) return false;
                
                // Get timestamp from either createdAt, timestamp, or orderId
                let entryTime = null;
                if (e.createdAt) {
                    entryTime = new Date(e.createdAt);
                } else if (e.timestamp) {
                    entryTime = new Date(e.timestamp);
                } else if (e.orderId) {
                    // Extract timestamp from orderId (usually first 13 digits)
                    const timeMatch = String(e.orderId).match(/^(\d{13})/);
                    if (timeMatch) {
                        entryTime = new Date(parseInt(timeMatch[1]));
                    }
                }
                
                // If no valid timestamp found, skip this entry
                if (!entryTime || isNaN(entryTime.getTime())) return false;
                
                // Check if date is within range
                return entryTime >= dateRange.start && entryTime <= dateRange.end;
            });
            
            const totalDiamonds = filteredEntries.reduce((sum, e) => sum + (e.diamonds || 0), 0);
            const totalAmount = filteredEntries.reduce((sum, e) => sum + (e.diamonds * (e.rate || 0)), 0);
            
            // 💰 Calculate total due from user balances (negative balance = due)
            let totalDue = 0;
            Object.values(users).forEach(user => {
                // Check if user has activity in this group
                if (user.groups && user.groups[groupId]) {
                    const balance = user.groups[groupId].balance || 0;
                    if (balance < 0) {
                        totalDue += Math.abs(balance); // Negative balance = due amount
                    }
                }
            });
            
            return {
                id: groupId,
                name: groupData.groupName || groupData.name || 'Unknown',
                diamonds: totalDiamonds,
                amount: Math.round(totalAmount),
                orders: filteredEntries.length,
                due: Math.round(totalDue),
                period: period
            };
        });
        
        res.json(groupStats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reconciliation report removed - Using Missing Order Detection logs instead

// 📋 GET All Pending Orders for Order Menu
app.get('/api/orders-menu/pending', requireAuth, (req, res) => {
    try {
        const { getPendingOrders } = require('../utils/order-menu');
        const orders = getPendingOrders();
        res.json(orders);
    } catch (error) {
        console.error('[API] Pending orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 📋 GET All Orders for Order Menu
app.get('/api/orders-menu/all', requireAuth, (req, res) => {
    try {
        const { getAllOrders } = require('../utils/order-menu');
        const orders = getAllOrders();
        res.json(orders);
    } catch (error) {
        console.error('[API] All orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 📋 GET Offline Orders
app.get('/api/orders-menu/offline', requireAuth, (req, res) => {
    try {
        const { getOfflineOrders } = require('../utils/order-menu');
        const orders = getOfflineOrders();
        res.json(orders);
    } catch (error) {
        console.error('[API] Offline orders error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 📋 GET Orders by Status
app.get('/api/orders-menu/status/:status', requireAuth, (req, res) => {
    try {
        const { status } = req.params;
        const { getOrdersByStatus } = require('../utils/order-menu');
        const orders = getOrdersByStatus(status);
        res.json(orders);
    } catch (error) {
        console.error('[API] Orders by status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 📋 GET Single Order Details
app.get('/api/orders-menu/:orderId', requireAuth, (req, res) => {
    try {
        const { orderId } = req.params;
        const { getOrderById } = require('../utils/order-menu');
        const order = getOrderById(orderId);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('[API] Get order error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 📊 GET Order Dashboard Stats
app.get('/api/orders-menu/stats/dashboard', requireAuth, (req, res) => {
    try {
        const { getDashboardStats } = require('../utils/order-menu');
        const stats = getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error('[API] Dashboard stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 📊 GET Order Count Summary
app.get('/api/orders-menu/count/summary', requireAuth, (req, res) => {
    try {
        const { getOrderCountSummary } = require('../utils/order-menu');
        const summary = getOrderCountSummary();
        res.json(summary);
    } catch (error) {
        console.error('[API] Order count error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve main HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🎉 Admin Panel Started Successfully!`);
    console.log(`\n📱 Access from this device: http://localhost:${PORT}`);
    console.log(`📱 Access from other devices: http://YOUR_IP:${PORT}`);
    console.log(`\n💡 To find your IP address, run: ipconfig (Windows) or ifconfig (Mac/Linux)`);
    console.log(`\nExample: http://192.168.1.100:${PORT}`);
    console.log(`\n✅ [SOCKET.IO] Server ready - Bot can now connect on port ${PORT}\n`);
});

// Socket.IO connection logging
io.on('connection', (socket) => {
    console.log(`[SOCKET.IO] Client connected: ${socket.id}`);
    console.log(`[SOCKET.IO] Total clients: ${io.engine.clientsCount}`);
    
    socket.on('disconnect', () => {
        console.log(`[SOCKET.IO] Client disconnected: ${socket.id}`);
    });
    
    socket.on('error', (error) => {
        console.error(`[SOCKET.IO] Socket error (${socket.id}):`, error);
    });
});

io.engine.on('connection_error', (err) => {
    console.error('[SOCKET.IO] Engine connection error:', err);
});
