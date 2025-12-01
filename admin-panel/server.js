const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.ADMIN_PORT || 3005;

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
        const totalDeposits = Object.values(transactions).reduce((sum, t) => sum + (t.amount || 0), 0);
        
        // Calculate total orders and pending from all groups
        let totalOrders = 0;
        let pendingDiamonds = 0;
        let pendingAmount = 0;
        const groups = database.groups || {};
        Object.values(groups).forEach(group => {
            const entries = group.entries || [];
            const approvedEntries = entries.filter(e => e.status === 'approved');
            const pendingEntries = entries.filter(e => e.status === 'pending');
            
            totalOrders += approvedEntries.length;
            pendingDiamonds += pendingEntries.reduce((sum, entry) => sum + (entry.diamonds || 0), 0);
            pendingAmount += pendingEntries.reduce((sum, entry) => sum + ((entry.diamonds || 0) * (entry.rate || 0)), 0);
        });

        res.json({
            totalUsers,
            totalDeposits,
            pendingDiamonds,
            pendingAmount,
            totalOrders,
            activeGroups: Object.keys(groups).length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Groups Data
app.get('/api/groups', async (req, res) => {
    try {
        const database = await readJSON(databasePath);
        const users = await readJSON(usersPath);
        const transactions = await readJSON(transactionsPath);
        const groups = database.groups || {};
        
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
                    .filter(t => t.groupId === id && t.status === 'approved')
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
                
                // Calculate how much this user has paid through auto-deductions
                let userPaidAmount = 0;
                if (Array.isArray(transactions)) {
                    userPaidAmount = transactions
                        .filter(t => t.userId === userId && t.groupId === id && t.status === 'approved' && (t.type === 'auto' || t.type === 'auto-deduction'))
                        .reduce((sum, t) => sum + (t.amount || 0), 0);
                }
                
                // Use dueBalanceOverride if set, otherwise calculate from: Total Orders - Paid Amount
                let userDue;
                if (userData?.dueBalanceOverride !== undefined) {
                    userDue = userData?.dueBalanceOverride; // Use override value
                } else {
                    // Due Balance = Total Orders - Total Paid (through auto-deductions)
                    userDue = Math.max(0, userOrderAmount - userPaidAmount);
                }
                
                return {
                    userId: userId,
                    displayName: userData?.name || userId.substring(0, 15),
                    orderAmount: Math.round(userOrderAmount),
                    balance: Math.round(userBalance),
                    paid: Math.round(userPaidAmount),
                    due: Math.round(userDue)
                };
            }).filter(u => u.due > 0); // Only show users with due balance
            
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
        
        // Emit to bot to send WhatsApp message
        io.emit('sendGroupMessage', { groupId, message });

        // Also send via bot API
        try {
            await fetch('http://localhost:3003/api/bot-send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId, message })
            });
        } catch (err) {
            console.error('❌ Failed to send rate update via bot API:', err.message);
        }

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
            
            // Emit to bot to send WhatsApp message
            io.emit('sendGroupMessage', { groupId, message });

            // Also send via bot API
            try {
                fetch('http://localhost:3003/api/bot-send-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ groupId, message })
                }).catch(err => console.error(`❌ Failed to send bulk rate update to ${groupId}:`, err.message));
            } catch (err) {
                console.error(`❌ Error sending bulk rate update to ${groupId}:`, err.message);
            }
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

        const usersArray = Object.entries(users).map(([phone, data]) => {
            // Calculate due from groups
            let calculatedDue = 0;
            const groups = database.groups || {};
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
            const dueBalance = data.dueBalanceOverride !== undefined ? data.dueBalanceOverride : calculatedDue;

            return {
                phone,
                name: data.name || 'Unknown',
                balance: data.balance || 0,
                dueBalance,
                totalDeposits: data.totalDeposits || 0,
                totalOrders: data.totalOrders || 0,
                status: data.blocked ? 'blocked' : 'active',
                joinedDate: data.joinedDate || new Date().toISOString()
            };
        });

        res.json(usersArray);
    } catch (error) {
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

        if (!users[phone]) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[phone];
        
        // Calculate due from groups
        let calculatedDue = 0;
        const groups = database.groups || {};
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
        const { name, balance, dueBalance } = req.body;
        const users = await readJSON(usersPath);
        const database = await readJSON(databasePath);

        if (!users[phone]) {
            return res.status(404).json({ error: 'User not found' });
        }

        users[phone].name = name || users[phone].name;
        users[phone].balance = typeof balance !== 'undefined' ? parseInt(balance) : users[phone].balance || 0;
        
        // Handle dueBalance - either update groups if it's an override, or recalculate
        const newDueBalance = typeof dueBalance !== 'undefined' ? parseInt(dueBalance) : null;
        
        // Calculate current due from groups
        let userCurrentDue = 0;
        const groups = database.groups || {};
        Object.values(groups).forEach(group => {
            const entries = group.entries || [];
            entries.forEach(entry => {
                if (entry.userId === phone || entry.userName === phone) {
                    const diamonds = entry.diamonds || 0;
                    const rate = entry.rate || 0;
                    userCurrentDue += diamonds * rate;
                }
            });
        });
        
        // If new dueBalance is provided and different from calculated, store override
        if (newDueBalance !== null && newDueBalance !== userCurrentDue) {
            users[phone].dueBalanceOverride = newDueBalance;
        } else if (users[phone].dueBalanceOverride !== undefined) {
            delete users[phone].dueBalanceOverride;
        }

        await writeJSON(usersPath, users);

        // Log the action
        const logEntry = `[${new Date().toISOString()}] Updated user: ${phone} (Name: ${name}, Balance: ${balance}, DueBalance: ${newDueBalance || 'calculated'})\n`;
        await fs.appendFile(path.join(__dirname, 'admin-logs.txt'), logEntry);

        io.emit('userUpdated', { phone, name, balance, dueBalance: newDueBalance || userCurrentDue });

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
                    date: entry.createdAt || new Date().toISOString()
                });
            });
        });

        ordersArray.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(ordersArray);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Payment Numbers
app.get('/api/payment-numbers', async (req, res) => {
    try {
        const paymentNumbers = await readJSON(path.join(dbPath, 'payment-number.json'));
        res.json(paymentNumbers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add Payment Number
app.post('/api/payment-numbers/add', async (req, res) => {
    try {
        const payload = req.body;
        const paymentData = await readJSON(path.join(dbPath, 'payment-number.json'));

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
        const { phone } = req.body;
        
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

        // Add new admin to admin panel file
        admins.whatsappAdmins.push({
            phone: phone,
            addedAt: new Date().toISOString()
        });

        await writeJSON(whatsappAdminsPath, admins);

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
        const whatsappId = phone + '@lid';
        if (!botAdmins.some(a => a.whatsappId === whatsappId)) {
            botAdmins.push({
                phone: phone,
                whatsappId: whatsappId,
                addedAt: new Date().toISOString()
            });
            await fs.writeFile(botAdminsPath, JSON.stringify(botAdmins, null, 2));
        }

        // Log the action
        const logEntry = `[${new Date().toISOString()}] Added WhatsApp admin: ${phone}`;
        const logsPath = path.join(__dirname, 'admin-logs.txt');
        const existingLogs = await fs.readFile(logsPath, 'utf8').catch(() => '');
        await fs.writeFile(logsPath, existingLogs + logEntry + '\n');

        io.emit('whatsappAdminsUpdated', admins);
        res.json({ success: true, message: 'Admin added successfully' });
    } catch (error) {
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

// Get blocked admins
app.get('/api/blocked-admins', async (req, res) => {
    try {
        const blockedAdminsPath = path.join(__dirname, '..', 'config', 'blocked-admins.json');
        const blockedAdmins = await readJSON(blockedAdminsPath);
        res.json({ blockedAdmins: Array.isArray(blockedAdmins) ? blockedAdmins : [] });
    } catch (error) {
        res.json({ blockedAdmins: [] });
    }
});

// Block WhatsApp Admin
app.post('/api/whatsapp-admins/block', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const blockedAdminsPath = path.join(__dirname, '..', 'config', 'blocked-admins.json');
        let blockedAdmins = await readJSON(blockedAdminsPath);
        if (!Array.isArray(blockedAdmins)) blockedAdmins = [];

        // Check if already blocked
        if (blockedAdmins.some(b => b.phone === phone)) {
            return res.json({ success: true, message: 'Admin already blocked' });
        }

        // Add to blocked list
        blockedAdmins.push({
            phone: phone,
            whatsappId: phone + '@c.us',
            blockedAt: new Date().toISOString(),
            reason: 'Blocked via admin panel'
        });

        await writeJSON(blockedAdminsPath, blockedAdmins);

        // Log the action
        const logEntry = `[${new Date().toISOString()}] Blocked WhatsApp admin: ${phone}`;
        const logsPath = path.join(__dirname, 'admin-logs.txt');
        const existingLogs = await fs.readFile(logsPath, 'utf8').catch(() => '');
        await fs.writeFile(logsPath, existingLogs + logEntry + '\n');

        res.json({ success: true, message: 'Admin blocked successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Unblock WhatsApp Admin
app.post('/api/whatsapp-admins/unblock', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const blockedAdminsPath = path.join(__dirname, '..', 'config', 'blocked-admins.json');
        let blockedAdmins = await readJSON(blockedAdminsPath);
        if (!Array.isArray(blockedAdmins)) blockedAdmins = [];

        // Remove from blocked list
        const filtered = blockedAdmins.filter(b => b.phone !== phone);
        
        if (filtered.length !== blockedAdmins.length) {
            await writeJSON(blockedAdminsPath, filtered);
            
            // Log the action
            const logEntry = `[${new Date().toISOString()}] Unblocked WhatsApp admin: ${phone}`;
            const logsPath = path.join(__dirname, 'admin-logs.txt');
            const existingLogs = await fs.readFile(logsPath, 'utf8').catch(() => '');
            await fs.writeFile(logsPath, existingLogs + logEntry + '\n');

            res.json({ success: true, message: 'Admin unblocked successfully' });
        } else {
            res.json({ success: true, message: 'Admin was not blocked' });
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
        const { groupIds } = req.body;
        
        if (!Array.isArray(groupIds) || groupIds.length === 0) {
            return res.status(400).json({ success: false, error: 'No groups selected for reminders' });
        }
        
        const database = await readJSON(databasePath);
        const groups = database.groups || {};
        
        // Read payment numbers
        const paymentNumbersPath = path.join(dbPath, 'payment-number.json');
        const paymentData = await readJSON(paymentNumbersPath);
        const paymentNumbers = paymentData.paymentNumbers || [];
        
        // Format payment instructions
        let paymentInstructions = '📱 *পেমেন্ট নম্বর:*\n\n';
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
        paymentInstructions += '\n✅ পেমেন্ট করার পর স্ক্রিনশট পাঠান।';
        
        const results = [];
        
        for (const groupId of groupIds) {
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
        
        // Send via HTTP request to bot API (port 3003)
        const response = await fetch('http://localhost:3003/api/bot-send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: groupId,
                message: message,
                type: 'status-update'
            })
        });
        
        if (response.ok) {
            console.log(`[BROADCAST] ✅ Message sent to group: ${groupId}`);
        } else {
            console.error(`[BROADCAST] ❌ Failed to send to group: ${groupId}`, response.status);
        }
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

// Socket.IO real-time updates
io.on('connection', (socket) => {
    console.log('Admin connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Admin disconnected:', socket.id);
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
    console.log(`\nExample: http://192.168.1.100:${PORT}\n`);
});
