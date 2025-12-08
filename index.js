require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const io = require('socket.io-client');
const fs = require('fs').promises;
const path = require('path');
const db = require('./config/database');
const { showWhatsAppDashboard } = require('./handlers/dashboard');
const { processPaymentReceipt } = require('./utils/payment-processor');
const { handleDiamondRequest, handleMultiLineDiamondRequest, approvePendingDiamond, findPendingDiamondByUser, showPendingRequests, cancelDiamondRequest, pendingDiamondRequests } = require('./handlers/diamond-request');
const { handleDepositRequest, handleDepositApproval, handleBalanceQuery, showPendingDeposits, showDepositStats } = require('./handlers/deposit');

// 🛡️ WhatsApp Safety - Message delay helper to prevent ban
const { delay, replyWithDelay, sendMessageWithDelay, messageCounter } = require('./utils/delay-helper');

// 🔍 Admin Matcher - Handle different WhatsApp ID formats
const { isAdminByAnyVariant, getAdminInfo } = require('./utils/admin-matcher');

// 🤖 Auto-Approval - Auto-approve orders after 2 minutes
const { startAutoApprovalTimer, cancelAutoApprovalTimer, restoreProcessingTimers, cancelAllTimers } = require('./utils/auto-approval');

// 🤖 Auto Admin Registration
const { autoRegisterAdmin, checkAndAutoRegisterAdmin } = require('./utils/auto-admin-register');

// Order Reconciliation removed - Using Missing Order Detection instead

// 🔍 Order Scan System - Detect missing and pending orders
const { scanPendingOrders, getUserOrderReport, getMissingPendingOrders, generateScanMessage } = require('./utils/order-scan-system');

// 📡 Initialize global broadcast functions (will be overridden by admin-panel/server.js)
require('./utils/broadcast-helper');

// Connect to Admin Panel Socket.IO server with retry logic
const adminSocket = io('http://localhost:3005', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 10000,
    transports: ['websocket', 'polling']
});

let isAdminPanelConnected = false;

adminSocket.on('connect', () => {
    isAdminPanelConnected = true;
    console.log('✅ [SOCKET.IO] Connected to Admin Panel (Port 3005)');
    console.log(`[SOCKET.IO] Socket ID: ${adminSocket.id}`);
});

adminSocket.on('disconnect', (reason) => {
    isAdminPanelConnected = false;
    console.log(`❌ [SOCKET.IO] Disconnected from Admin Panel: ${reason}`);
});

adminSocket.on('connect_error', (error) => {
    isAdminPanelConnected = false;
    // Only log once every 30 seconds to avoid spam
    if (!global.lastSocketErrorLog || Date.now() - global.lastSocketErrorLog > 30000) {
        console.log('⚠️ [SOCKET.IO] Cannot connect to Admin Panel (Port 3005) - Bot will work without admin panel features');
        global.lastSocketErrorLog = Date.now();
    }
});

// Initialize database files
db.initializeDB();
db.initializePayments();
db.initializeUsers();

// 🛠️ Initialize critical files with proper permissions
const fsSync = require('fs');
const criticalFiles = [
    { path: path.join(__dirname, 'config', 'payment-transactions.json'), default: '[]' },
    { path: path.join(__dirname, 'config', 'diamond-status.json'), default: '{"stock":0,"isActive":false}' },
    { path: path.join(__dirname, 'admin-panel', 'admin-logs.txt'), default: '' },
    { path: path.join(__dirname, 'logs', 'bot-logs.txt'), default: '' }
];

criticalFiles.forEach(file => {
    try {
        if (!fsSync.existsSync(file.path)) {
            // Create parent directory if needed
            const dir = path.dirname(file.path);
            if (!fsSync.existsSync(dir)) {
                fsSync.mkdirSync(dir, { recursive: true, mode: 0o755 });
            }
            // Create file with proper permissions
            fsSync.writeFileSync(file.path, file.default, { mode: 0o666 });
            console.log(`[INIT] ✅ Created: ${path.basename(file.path)}`);
        }
    } catch (err) {
        console.error(`[INIT] ❌ Failed to create ${path.basename(file.path)}:`, err.message);
    }
});
console.log('[INIT] ✅ All critical files ready');
db.initializeUsers();

// Clean up invalid payment transactions on startup
db.initializeCleanup();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: 'new',
        timeout: 90000,  // Increased to 90s for low-memory systems
        protocolTimeout: 180000, // Add protocol timeout
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',  // Use /tmp instead of /dev/shm for VPS memory
            '--disable-software-rasterizer',
            '--disable-background-networking',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-features=TranslateUI',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-sync',
            '--enable-automation',
            '--enable-features=NetworkService,NetworkServiceInProcess',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-first-run',
            '--no-service-autorun',
            '--password-store=basic',
            '--use-gl=swiftshader',
            '--disable-crash-reporter',
            '--disable-web-resources',
            '--disable-component-update',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-extension-libs',
            '--disable-translate',
            '--disable-permissions-api'
        ]
    }
});

let botIsReady = false; // Flag to track bot ready state
let currentQRCode = null; // Store current QR code

// QR code generation
client.on('qr', (qr) => {
    console.log('\n\n📱 SCAN THIS QR CODE WITH WHATSAPP:\n');
    qrcode.generate(qr, { small: true });
    currentQRCode = qr; // Store QR code
    
    // Save QR code to file
    const fs = require('fs');
    const path = require('path');
    const qrPath = path.join(__dirname, 'qr-code.txt');
    fs.writeFileSync(qrPath, qr, 'utf8');
    console.log(`✅ QR code saved to ${qrPath}`);
    console.log('\n\n');
});

// Client ready
client.on('ready', async () => {
    botIsReady = true; // Set flag when ready
    currentQRCode = null; // Clear QR code when connected
    console.log('✅ WhatsApp Bot Ready!');
    console.log('🤖 Bot is now listening for messages...\n');
    
    // 🤖 Restore any processing orders that were in progress before bot crashed
    console.log('[STARTUP] 🔄 Restoring processing timers...');
    restoreProcessingTimers(client);
    
    // ✅ Missing Order Detection handles order recovery automatically
    
    // Start periodic check for deleted messages (every 15 seconds)
    startDeletedMessageChecker(client);
    
    // Listen for admin panel messages
    adminSocket.on('sendGroupMessage', async (data) => {
        const { groupId, message } = data;
        console.log(`[SOCKET] 📨 Received sendGroupMessage event:`, { groupId, messagePreview: message?.substring(0, 50) });
        
        try {
            await client.sendMessage(groupId, message);
            console.log(`[SOCKET] ✅ Sent message to group ${groupId}`);
        } catch (error) {
            console.error(`[SOCKET] ❌ Failed to send message to group ${groupId}:`, error.message);
        }
    });
    
    console.log('✅ [LISTENER REGISTRATION] Message handler is now ready to receive messages!');
});

// Disconnection handler
client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp Bot Disconnected:', reason);
    botIsReady = false;
});

// Error handler - Catch execution context errors with recovery
client.on('error', (error) => {
    console.error('❌ Client Error:', error.message);
    
    // Handle execution context destruction - this is a critical error
    if (error.message && error.message.includes('Execution context was destroyed')) {
        console.log('⚠️ Execution context error detected - attempting recovery...');
        console.log('💡 This is a Chromium browser process issue on low-memory systems');
        console.log('✅ Bot will recover on next message or reconnect attempt');
    }
    
    // Handle "Page crashed" error - browser process died
    if (error.message && (error.message.includes('Session closed') || error.message.includes('Renderer') || error.message.includes('crashed'))) {
        console.error('🔴 CRITICAL: Browser process crashed');
        console.log('🔄 Attempting to restore connection...');
        botIsReady = false;
        // Bot will auto-reconnect via WhatsApp Web.js
    }
});

// Auth failure handler
client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    console.log('🔄 Please re-scan the QR code...');
});

// Main message handler
client.on('message', async (msg) => {
    try {
        console.log(`\n🔔 [RAW MESSAGE EVENT] Received event - msg.from: ${msg.from}, body: "${msg.body?.substring(0, 50)}..."`);
        
        // 🛡️ Rate limiting - Check message limits (100/hour, 500/day)
        if (!messageCounter.canSendMessage()) {
            console.log('[RATE-LIMIT] ⚠️ Message limit reached, skipping response...');
            return;
        }

        console.log(`[HANDLER] Message received!`);
        const fromUserId = msg.author || msg.from;
        
        // Check if group message by looking at msg.from format
        // Group messages have format like "120363...-120363...@g.us"
        // Direct messages have format like "1234567890@c.us"
        const isGroup = msg.from && msg.from.includes('@g.us');
        let groupId = null;
        const isAdminUser = db.isAdmin(fromUserId);
        
        // LOG ALL MESSAGES
        console.log(`[MESSAGE] From: ${fromUserId} | msg.from: ${msg.from} | Group: ${isGroup} | Body: "${msg.body}"`);
        
        if (isGroup) {
            groupId = msg.from;
            console.log(`[MESSAGE] GroupId: ${groupId}`);
        }
        
        // Check for payment screenshot (image with amount or payment keywords)
        if (msg.hasMedia && !isGroup) {
            const media = await msg.downloadMedia();
            if (media && media.mimetype && media.mimetype.startsWith('image/')) {
                console.log(`[PAYMENT SCREENSHOT] Image received from ${fromUserId}`);
                
                // Get user name
                let userName = fromUserId;
                try {
                    const contact = await client.getContactById(fromUserId);
                    userName = contact.pushname || contact.name || fromUserId;
                } catch (err) {
                    console.log('[PAYMENT SCREENSHOT] Could not fetch name');
                }
                
                // Check if there's a caption or if user has pending deposit
                const hasPaymentCaption = msg.body && (
                    msg.body.toLowerCase().includes('payment') ||
                    msg.body.toLowerCase().includes('paid') ||
                    msg.body.toLowerCase().includes('পেমেন্ট') ||
                    msg.body.toLowerCase().includes('দিয়েছি') ||
                    /\d+/.test(msg.body) // contains number
                );
                
                if (hasPaymentCaption || true) { // Always notify for images in DM
                    // Play sound and show notification in admin panel
                    try {
                        const io = require('./admin/server').io;
                        if (io) {
                            io.emit('payment-screenshot', {
                                userId: fromUserId,
                                userName: userName,
                                caption: msg.body || '',
                                timestamp: new Date().toISOString()
                            });
                            console.log(`[PAYMENT SCREENSHOT] Notification sent to admin panel`);
                        }
                    } catch (notifyErr) {
                        console.error('[PAYMENT SCREENSHOT] Failed to notify admin:', notifyErr.message);
                    }
                    
                    await replyWithDelay(msg, '✅ Payment screenshot received!\n\n⏳ Admin will verify your payment soon.\n\nThank you for your patience! 😊');
                    messageCounter.incrementCounter();
                }
            }
        }
        
        // "Number" command - Show all payment numbers
        const messageBody = msg.body.trim().toLowerCase();
        
        if (messageBody === 'number' || messageBody === 'নাম্বার' || messageBody === 'num') {
            try {
                // Check if payment system is enabled
                const paymentSettingsPath = path.join(__dirname, 'config', 'payment-settings.json');
                let paymentSettings = { enabled: true };
                
                try {
                    const settingsData = await fs.readFile(paymentSettingsPath, 'utf8');
                    paymentSettings = JSON.parse(settingsData);
                } catch (e) {
                    console.log('[NUMBER-COMMAND] Settings file not found, defaulting to enabled');
                }
                
                // If payment system is disabled, silently ignore (no message)
                if (!paymentSettings.enabled) {
                    console.log(`[NUMBER-COMMAND] ❌ Payment system is DISABLED - silently ignoring request from ${fromUserId}`);
                    return; // Don't send any message
                }
                
                const paymentNumberPath = path.join(__dirname, 'config', 'payment-number.json');
                const paymentNumberData = await fs.readFile(paymentNumberPath, 'utf8');
                const paymentConfig = JSON.parse(paymentNumberData);
                
                if (!paymentConfig.paymentNumbers || paymentConfig.paymentNumbers.length === 0) {
                    await msg.reply('❌ পেমেন্ট নম্বর পাওয়া যায়নি। অ্যাডমিনকে যোগাযোগ করুন।');
                    return;
                }
                
                let responseText = '💰 *Payment Numbers* 💰\n\n';
                
                // Group by method
                const methodGroups = {};
                paymentConfig.paymentNumbers.forEach(payment => {
                    if (!methodGroups[payment.method]) {
                        methodGroups[payment.method] = [];
                    }
                    methodGroups[payment.method].push(payment);
                });
                
                // Format each method group
                Object.keys(methodGroups).forEach((method, index) => {
                    const payments = methodGroups[method];
                    
                    payments.forEach(payment => {
                        if (payment.isBank) {
                            responseText += `🏦 *${payment.method}*\n`;
                            responseText += `👤 একাউন্ট: ${payment.accountName || 'N/A'}\n`;
                            responseText += `🏢 শাখা: ${payment.branch || 'N/A'}\n`;
                            responseText += `🔢 নম্বর: ${payment.accountNumber || payment.number}\n`;
                            responseText += `📋 ধরন: ${payment.type}\n\n`;
                        } else {
                            responseText += `📱 *${payment.method}* (${payment.type})\n`;
                            responseText += `📞 ${payment.number}\n\n`;
                        }
                    });
                });
                
                responseText += '✅ পেমেন্ট করার পর স্ক্রিনশট পাঠান।';
                
                try {
                    await replyWithDelay(msg, responseText);
                    messageCounter.incrementCounter();
                    console.log(`[NUMBER-COMMAND] ✅ Sent all payment numbers to ${fromUserId}`);
                } catch (replyError) {
                    console.error('[NUMBER-COMMAND] ❌ Reply failed:', replyError.message);
                    // Try direct send instead
                    try {
                        await sendMessageWithDelay(client, msg.from, responseText);
                        messageCounter.incrementCounter();
                        console.log(`[NUMBER-COMMAND] ✅ Sent via direct sendMessage`);
                    } catch (sendError) {
                        console.error('[NUMBER-COMMAND] ❌ SendMessage also failed:', sendError.message);
                    }
                }
                return;
            } catch (error) {
                console.error('[NUMBER-COMMAND ERROR]', error.message, error.stack);
                try {
                    await replyWithDelay(msg, '❌ পেমেন্ট তথ্য পাওয়া যায়নি। অ্যাডমিনকে যোগাযোগ করুন।');
                    messageCounter.incrementCounter();
                } catch (e) {
                    console.error('[NUMBER-COMMAND] Failed to send error message:', e.message);
                }
                return;
            }
        }

        // "Start" command - Initialize new group in admin panel (Admin only in groups)
        if (messageBody === 'start' || messageBody === 'স্টার্ট') {
            // Check if message is from a group
            if (!isGroup) {
                console.log(`[START-COMMAND] ❌ Ignored - Not a group message from ${fromUserId}`);
                return; // Silently ignore if not in a group
            }

            // Check if it's an admin - using db.isAdmin for direct check
            const isAdminUser = db.isAdmin(fromUserId);
            const adminInfo = await isAdminByAnyVariant(fromUserId);
            
            if (!isAdminUser && !adminInfo) {
                console.log(`[START-COMMAND] ❌ Non-admin user ${fromUserId} tried to use start in group ${groupId}`);
                // Silently ignore for non-admins - don't send error message
                return;
            }

            try {
                // Get group info
                const chat = await msg.getChat();
                const groupName = chat.name || 'Unknown Group';
                
                // Emit to admin panel to add/show this group
                adminSocket.emit('groupStarted', {
                    groupId: groupId,
                    groupName: groupName,
                    admin: fromUserId,
                    timestamp: new Date().toISOString()
                });

                await replyWithDelay(msg, `✅ গ্রুপ শুরু হয়েছে! Admin Panel এ সংযুক্ত হচ্ছে...`);
                messageCounter.incrementCounter();
                
                console.log(`[START-COMMAND] ✅ Group started by admin:`, {
                    groupId,
                    groupName,
                    admin: fromUserId
                });

            } catch (error) {
                console.error('[START-COMMAND ERROR]', error.message);
                try {
                    await replyWithDelay(msg, '❌ কিছু সমস্যা হয়েছে। অ্যাডমিনকে যোগাযোগ করুন।');
                    messageCounter.incrementCounter();
                } catch (e) {
                    console.error('[START-COMMAND] Failed to send error message:', e.message);
                }
            }
            return;
        }
        
        // Payment Number Command - Load keywords dynamically from config
        try {
            const paymentKeywordsPath = path.join(__dirname, 'config', 'payment-keywords.json');
            const paymentKeywordsData = await fs.readFile(paymentKeywordsPath, 'utf8');
            const paymentKeywordsConfig = JSON.parse(paymentKeywordsData);
            
            // Check which payment method matches
            let matchedMethod = null;
            let matchedKeyword = null;
            
            for (const [methodName, methodConfig] of Object.entries(paymentKeywordsConfig.methods)) {
                if (!methodConfig.enabled) continue; // Skip disabled methods
                
                const keyword = methodConfig.keywords.find(kw => messageBody.includes(kw.toLowerCase()));
                if (keyword) {
                    matchedMethod = methodName;
                    matchedKeyword = keyword;
                    break;
                }
            }
            
            if (matchedMethod) {
                try {
                    // Load payment numbers fresh (no cache)
                    const paymentNumberPath = path.join(__dirname, 'config', 'payment-number.json');
                    const paymentNumberData = await fs.readFile(paymentNumberPath, 'utf8');
                    const paymentConfig = JSON.parse(paymentNumberData);
                    
                    const methodConfig = paymentKeywordsConfig.methods[matchedMethod];
                    
                    // Find matching payment numbers for this method
                    const matchedNumbers = paymentConfig.paymentNumbers.filter(p => 
                        p.method.toLowerCase() === matchedMethod.toLowerCase()
                    );
                    
                    if (matchedNumbers.length === 0) {
                        await replyWithDelay(msg, `❌ ${matchedMethod} পেমেন্ট নম্বর পাওয়া যায়নি। অ্যাডমিনকে যোগাযোগ করুন।`);
                        messageCounter.incrementCounter();
                        return;
                    }
                    
                    let numbersText = '';
                    
                    // Format each matched payment number
                    matchedNumbers.forEach((payment, index) => {
                        if (payment.isBank) {
                            numbersText += `🏦 *${payment.method}*\n`;
                            numbersText += `👤 একাউন্ট: ${payment.accountName || 'N/A'}\n`;
                            numbersText += `🏢 শাখা: ${payment.branch || 'N/A'}\n`;
                            numbersText += `🔢 নম্বর: ${payment.accountNumber || payment.number}\n`;
                            numbersText += `📋 ধরন: ${payment.type}\n`;
                            if (index < matchedNumbers.length - 1) numbersText += '\n';
                        } else {
                            numbersText += `📱 *${payment.method}* (${payment.type})\n`;
                            numbersText += `📞 ${payment.number}\n`;
                            if (index < matchedNumbers.length - 1) numbersText += '\n';
                        }
                    });
                    
                    // Use custom response template from payment-keywords config
                    let responseMessage = methodConfig.response || '';
                    
                    // Replace placeholder if exists
                    responseMessage = responseMessage.replace('{paymentNumbers}', numbersText);
                    
                    // If response doesn't have placeholder, append numbers at end
                    if (!methodConfig.response.includes('{paymentNumbers}')) {
                        responseMessage = responseMessage + '\n\n' + numbersText;
                    }
                    
                    // Add footer with instructions
                    responseMessage += '\n\n✅ পেমেন্ট করার পর স্ক্রিনশট পাঠান।';
                    
                    await replyWithDelay(msg, responseMessage);
                    messageCounter.incrementCounter();
                    console.log(`[PAYMENT-INFO] Sent ${matchedMethod} payment info to ${fromUserId} (keyword: ${matchedKeyword})`);
                } catch (error) {
                    console.error('[PAYMENT-INFO ERROR]', error);
                    await replyWithDelay(msg, '❌ পেমেন্ট তথ্য পাওয়া যায়নি। অ্যাডমিনকে যোগাযোগ করুন।');
                    messageCounter.incrementCounter();
                }
                return;
            }
        } catch (keywordError) {
            console.error('[PAYMENT-KEYWORDS LOAD ERROR]', keywordError);
        }
        
        // Dashboard command: /d
        if (msg.body.trim() === '/d') {
            try {
                let userName = fromUserId;
                try {
                    const contact = await client.getContactById(fromUserId);
                    userName = contact.pushname || contact.name || fromUserId;
                } catch (contactErr) {
                    console.log('[DASHBOARD] Could not fetch contact, using fallback name');
                    userName = msg.from?.contact?.pushname || fromUserId;
                }
                await showWhatsAppDashboard(msg, fromUserId, userName, groupId);
                console.log(`[DASHBOARD] ${userName} requested dashboard`);
            } catch (error) {
                console.error('[DASHBOARD ERROR]', error);
                await replyWithDelay(msg, '❌ Error loading dashboard. Please try again.');
                messageCounter.incrementCounter();
            }
            return;
        }
        
        // Cancel order command: /cancel
        if (msg.body.trim().toLowerCase() === '/cancel') {
            if (!isGroup) {
                await replyWithDelay(msg, '❌ Cancel command only works in groups.');
                messageCounter.incrementCounter();
                return;
            }
            
            let userName = fromUserId;
            try {
                const contact = await client.getContactById(fromUserId);
                userName = contact.pushname || contact.name || fromUserId;
            } catch (contactErr) {
                console.log('[CANCEL] Could not fetch contact, using fallback name');
                userName = msg.from?.contact?.pushname || fromUserId;
            }
            
            const cancelResult = await cancelDiamondRequest(msg, fromUserId, userName, groupId);
            console.log(`[CANCEL] Result:`, cancelResult);
            
            // Notify admin panel about cancellation
            if (cancelResult.success) {
                try {
                    await fetch('http://localhost:3000/api/order-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventType: 'order-cancelled',
                            data: {
                                userId: cancelResult.userId,
                                userName: cancelResult.userName,
                                groupId: cancelResult.groupId,
                                orderId: cancelResult.orderId,
                                diamonds: cancelResult.diamonds,
                                amount: cancelResult.amount,
                                reason: cancelResult.reason
                            }
                        })
                    });
                } catch (notifyErr) {
                    console.error('[CANCEL] Failed to notify admin panel:', notifyErr.message);
                }
            }
            return;
        }
        
        // 🔍 Order Scan Command: /scan or /scan @username or /scan 50 (scan last 50 orders)
        if (msg.body.trim().toLowerCase().startsWith('/scan')) {
            // Check if user is admin
            const adminInfo = await isAdminByAnyVariant(fromUserId);
            if (!adminInfo) {
                await replyWithDelay(msg, '❌ শুধুমাত্র Admin এই কমান্ড ব্যবহার করতে পারে।');
                messageCounter.incrementCounter();
                return;
            }

            if (!isGroup) {
                await replyWithDelay(msg, '❌ Scan command only works in groups.');
                messageCounter.incrementCounter();
                return;
            }

            try {
                const scanCommand = msg.body.trim().toLowerCase();
                const parts = scanCommand.split(' ');
                
                // Default: scan last 50 orders
                let scanLimit = 50;
                let scanType = 'general'; // general, user, or missing
                let targetUserId = null;

                // Parse command arguments
                if (parts.length > 1) {
                    const arg = parts[1];
                    
                    // Check if it's a number (limit)
                    if (/^\d+$/.test(arg)) {
                        scanLimit = parseInt(arg);
                    } 
                    // Check if it's a user mention or ID
                    else if (arg.includes('@') || arg.length > 10) {
                        scanType = 'user';
                        targetUserId = arg.replace('@', '');
                    }
                    // Check for 'missing' keyword
                    else if (arg === 'missing') {
                        scanType = 'missing';
                    }
                }

                await replyWithDelay(msg, '⏳ স্ক্যানিং চলছে...');
                messageCounter.incrementCounter();

                let response = '';
                
                if (scanType === 'missing') {
                    // Scan for missing orders
                    const missingResult = getMissingPendingOrders(groupId);
                    
                    if (!missingResult.success) {
                        response = `❌ ${missingResult.message}`;
                    } else if (missingResult.count === 0) {
                        response = `✅ কোনো মিসিং অর্ডার নেই!`;
                    } else {
                        response = `⚠️ *MISSING PENDING ORDERS (${missingResult.count}):*\n\n`;
                        missingResult.missingOrders.slice(0, 15).forEach((order, idx) => {
                            response += `${idx + 1}. ${order.userName} - ${order.diamonds}💎 (${order.playerIdNumber})\n`;
                            response += `   ⏱️ ${order.timeAgoMinutes} মিনিট আগে\n\n`;
                        });
                        if (missingResult.missingOrders.length > 15) {
                            response += `\n... এবং আরও ${missingResult.missingOrders.length - 15}টি\n`;
                        }
                    }
                } else if (scanType === 'user' && targetUserId) {
                    // Scan specific user's orders
                    const userReport = getUserOrderReport(groupId, targetUserId, scanLimit);
                    
                    if (!userReport.success) {
                        response = `❌ ${userReport.message}`;
                    } else {
                        response = `👤 *${userReport.userName}* - সর্বমোট ${userReport.totalOrders} অর্ডার:\n\n`;
                        userReport.orders.forEach((order, idx) => {
                            response += `${idx + 1}. ${order.statusDisplay} - ${order.diamonds}💎\n`;
                            response += `   📅 ${new Date(order.createdAt).toLocaleString('bn-BD')}\n`;
                            if (!order.inAdminPanel) {
                                response += `   ⚠️ Admin Panel এ নেই\n`;
                            }
                            response += `\n`;
                        });
                    }
                } else {
                    // General scan - last N orders
                    const scanResult = scanPendingOrders(groupId, scanLimit);
                    response = generateScanMessage(groupId, scanResult);
                }

                // Send response
                await sendMessageWithDelay(msg.from, response);
                console.log(`[SCAN] 🔍 Order scan completed by ${fromUserId}`);

            } catch (error) {
                console.error('[SCAN ERROR]', error);
                try {
                    await replyWithDelay(msg, `❌ স্ক্যান ব্যর্থ: ${error.message}`);
                    messageCounter.incrementCounter();
                } catch (replyErr) {
                    console.error('[SCAN] Failed to send error response:', replyErr.message);
                }
            }
            return;
        }
        
        // Check system status before processing diamond requests
        const diamondStatusPath = path.join(__dirname, 'config', 'diamond-status.json');
        let diamondSystemStatus = null;
        try {
            const statusData = await fs.readFile(diamondStatusPath, 'utf8');
            diamondSystemStatus = JSON.parse(statusData);
        } catch (err) {
            console.log('[SYSTEM-STATUS] Could not load diamond status, assuming ON');
        }
        
        // Check for multi-line diamond request (ID + Diamonds)
        if (isGroup && msg.body.includes('\n')) {
            // Check if system is OFF
            if (diamondSystemStatus && diamondSystemStatus.systemStatus === 'off') {
                const offMessage = diamondSystemStatus.globalMessage || '❌ ডায়মন্ড সিস্টেম বর্তমানে বন্ধ আছে।';
                await replyWithDelay(msg, offMessage);
                messageCounter.incrementCounter();
                console.log(`[SYSTEM-OFF] Rejected multi-line request - System is OFF`);
                return;
            }
            
            console.log(`\n[MULTI-LINE] 🟢 DETECTED MULTI-LINE MESSAGE`);
            console.log(`[MULTI-LINE] From: ${fromUserId}`);
            console.log(`[MULTI-LINE] Group: ${groupId}`);
            console.log(`[MULTI-LINE] Body length: ${msg.body.length} chars`);
            
            const lines = msg.body.trim().split('\n');
            console.log(`[MULTI-LINE] Lines count: ${lines.length}`);
            lines.forEach((line, i) => console.log(`[MULTI-LINE]   Line ${i+1}: "${line}"`));
            
            if (lines.length >= 2) {
                let userName = fromUserId;
                try {
                    const contact = await client.getContactById(fromUserId);
                    console.log('[MULTI-LINE] Contact info:', { pushname: contact.pushname, name: contact.name, notifyName: msg._data?.notifyName });
                    userName = contact.pushname || contact.name || msg._data?.notifyName || fromUserId;
                } catch (contactErr) {
                    console.log('[MULTI-LINE] Could not fetch contact, using fallback name');
                    console.log('[MULTI-LINE] Available fields:', { notifyName: msg._data?.notifyName, author: msg.author });
                    userName = msg._data?.notifyName || msg.author || fromUserId;
                }
                console.log(`[MULTI-LINE] Processing for user: ${userName}`);
                console.log(`[MULTI-LINE] Calling handleMultiLineDiamondRequest...\n`);
                
                // Fetch group name
                const groupName = await getGroupName(client, groupId);
                await handleMultiLineDiamondRequest(msg, fromUserId, userName, groupId, msg.body, groupName);
                return;
            }
        }
        
        // Diamond order submission: just a number (e.g., 100)
        const diamondMatch = msg.body.trim().match(/^(\d+)$/);
        if (diamondMatch) {
            // Check if system is OFF
            if (diamondSystemStatus && diamondSystemStatus.systemStatus === 'off') {
                const offMessage = diamondSystemStatus.globalMessage || '❌ ডায়মন্ড সিস্টেম বর্তমানে বন্ধ আছে।';
                await replyWithDelay(msg, offMessage);
                messageCounter.incrementCounter();
                console.log(`[SYSTEM-OFF] Rejected diamond request - System is OFF`);
                return;
            }
            
            const amount = parseInt(diamondMatch[1]);
            let userName = fromUserId;
            try {
                const contact = await client.getContactById(fromUserId);
                // Priority: pushname > name > notifyName > user ID with fallback
                userName = contact.pushname || contact.name || msg._data?.notifyName || fromUserId;
                
                // Clean up: if it's still just a phone number format, mark it as unknown with partial ID
                if (!userName || userName.includes('@') || /^\d+$/.test(userName)) {
                    const phoneMatch = fromUserId.match(/(\d+)[@_]/);
                    if (phoneMatch && (contact.pushname || contact.name)) {
                        // We have a proper name, use it
                        userName = contact.pushname || contact.name;
                    } else {
                        // Use last 6 digits of phone for better UX
                        const lastSixDigits = phoneMatch ? phoneMatch[1].slice(-6) : fromUserId.substring(0, 8);
                        userName = msg._data?.notifyName || `User_${lastSixDigits}`;
                    }
                }
                
                console.log('[DIAMOND] Contact info:', { 
                    pushname: contact.pushname, 
                    name: contact.name, 
                    notifyName: msg._data?.notifyName,
                    resolvedName: userName
                });
            } catch (contactErr) {
                console.log('[DIAMOND] Could not fetch contact, using fallback name');
                console.log('[DIAMOND] Available fields:', { notifyName: msg._data?.notifyName, author: msg.author });
                // Try multiple fallbacks
                userName = msg._data?.notifyName || msg.author;
                if (!userName || /^\d+$/.test(userName)) {
                    const phoneMatch = fromUserId.match(/(\d+)[@_]/);
                    userName = phoneMatch ? `User_${phoneMatch[1].slice(-6)}` : 'Unknown User';
                }
            }
            
            // Check if it's a group (diamond order) or direct message (deposit)
            if (isGroup) {
                // In group: treat as diamond order
                const groupName = await getGroupName(client, groupId);
                await handleDiamondRequest(msg, fromUserId, userName, groupId, amount, groupName);
            } else {
                // Direct message: treat as deposit request
                await handleDepositRequest(msg, fromUserId, userName, amount);
            }
            return;
        }

        
        // Admin "start" command - Set timestamp for missing order detection
        if (msg.body.toLowerCase().trim() === 'start' && isGroup && isAdminUser) {
            const timestamp = db.setStartTimestamp(groupId);
            await replyWithDelay(msg, `✅ *শুরু হয়েছে!*\n\n📅 এখন থেকে শুধু নতুন অর্ডার গুলো Missing Order Detection এ দেখাবে।\n\n⏰ Start Time: ${new Date(timestamp).toLocaleString('bn-BD')}`);
            messageCounter.incrementCounter();
            console.log(`[START COMMAND] Admin set start timestamp for group ${groupId}`);
            return;
        }

        // Admin approval: done, ok, do, dn, yes, অক, okey, ওকে (for diamond orders)
        const approvalKeywords = ['done', 'ok', 'do', 'dn', 'yes', 'অক', 'okey', 'ওকে'];
        if (approvalKeywords.includes(msg.body.toLowerCase().trim()) && isGroup) {
            
            // ❌ SECURITY: Block removed admins FIRST before auto-registering
            const REMOVED_ADMINS = ['8801721016186'];
            const phoneMatch = (msg.author || fromUserId).match(/^(\d+)/);
            const adminPhone = phoneMatch ? phoneMatch[1] : (msg.author || fromUserId);
            
            if (REMOVED_ADMINS.includes(adminPhone)) {
                console.log(`[APPROVAL] ❌ BLOCKED: Removed admin ${adminPhone} attempted approval`);
                await replyWithDelay(msg, '❌ Your admin access has been revoked. You cannot approve orders.');
                messageCounter.incrementCounter();
                return;
            }
            
            // 🤖 Auto-register new admins when they send approval commands
            const userName = msg._data?.notifyName || msg.author || fromUserId;
            autoRegisterAdmin(msg.author || fromUserId, userName);
            
            // 🔍 Better admin check - try multiple ID formats
            let isAdminForApproval = isAdminUser;
            
            // If not detected, try checking with msg.author directly
            if (!isAdminForApproval && msg.author) {
                isAdminForApproval = isAdminByAnyVariant(msg.author);
                console.log(`[APPROVAL DEBUG] Re-checked admin with msg.author (${msg.author}): ${isAdminForApproval}`);
            }
            
            // Also try with fromUserId
            if (!isAdminForApproval && fromUserId) {
                isAdminForApproval = isAdminByAnyVariant(fromUserId);
                console.log(`[APPROVAL DEBUG] Re-checked admin with fromUserId (${fromUserId}): ${isAdminForApproval}`);
            }
            
            // Log debug info
            const adminInfo = isAdminForApproval ? getAdminInfo(msg.author || fromUserId) : null;
            console.log(`[APPROVAL DEBUG] Admin check - fromUserId: ${fromUserId}, msg.author: ${msg.author}`);
            console.log(`[APPROVAL DEBUG] isAdminUser: ${isAdminUser}, isAdminForApproval: ${isAdminForApproval}`);
            if (adminInfo) console.log(`[APPROVAL DEBUG] Admin info: ${adminInfo.name} (${adminInfo.phone})`);
            
            if (!isAdminForApproval) {
                await replyWithDelay(msg, '❌ Only admins can approve orders.');
                messageCounter.incrementCounter();
                return;
            }

            if (!msg.hasQuotedMsg) {
                await replyWithDelay(msg, '❌ Please reply to a user order to approve it.');
                messageCounter.incrementCounter();
                return;
            }
            
            const quotedMsg = await msg.getQuotedMessage();
            const quotedUserId = quotedMsg.author || quotedMsg.from;
            const quotedMessageId = quotedMsg.id?._serialized || quotedMsg.id;
            
            console.log(`[APPROVAL DEBUG] Quoted user ID: ${quotedUserId}, Group: ${groupId}`);
            console.log(`[APPROVAL DEBUG] Quoted message ID: ${quotedMessageId}`);
            console.log(`[APPROVAL DEBUG] Pending requests:`, Object.keys(pendingDiamondRequests).length);
            
            // 🎯 Extract quoted message details
            const quotedBody = quotedMsg.body || '';
            console.log(`[APPROVAL DEBUG] Quoted message body (first 100 chars): "${quotedBody.substring(0, 100)}..."`);
            
            // Try to extract Order ID from message text (format: "Order ID: 1234567890")
            let quotedOrderId = null;
            const orderIdMatch = quotedBody.match(/Order ID:\s*(\d+)/i);
            if (orderIdMatch) {
                quotedOrderId = parseInt(orderIdMatch[1]);
                console.log(`[APPROVAL DEBUG] 🎯 Extracted Order ID from text: ${quotedOrderId}`);
            }
            
            // First check if it's a pending multi-line diamond request
            const pendingDiamond = findPendingDiamondByUser(quotedUserId, groupId, quotedBody, quotedOrderId, quotedMessageId);
            
            if (pendingDiamond) {
                // It's a multi-line request - approve it
                const { requestId, request } = pendingDiamond;
                console.log(`[APPROVAL DEBUG] Found pending diamond for ${quotedUserId}`);
                const approvalResult = await approvePendingDiamond(requestId, groupId);
                
                if (approvalResult) {
                    // Check if approve message is enabled
                    const diamondStatus = require('./config/database').getDiamondStatus?.() || JSON.parse(require('fs').readFileSync(require('path').join(__dirname, './config/diamond-status.json'), 'utf8'));
                    const approveMessageEnabled = diamondStatus.approveMessageEnabled !== false;
                    
                    if (approveMessageEnabled) {
                        await replyWithDelay(msg, approvalResult.message);
                        messageCounter.incrementCounter();
                    }
                    console.log(`[PROCESSING] Multi-line diamond order: ${approvalResult.diamonds}💎 from ${approvalResult.userIdFromMsg} (Message ${approveMessageEnabled ? 'sent' : 'silenced'})`);
                    
                    // 🔄 Broadcast order status update to admin panel in real-time
                    if (global.broadcastOrderStatusChange) {
                        global.broadcastOrderStatusChange(
                            approvalResult.orderId,
                            'processing',
                            `⏳ Order processing: ${approvalResult.diamonds}💎 from ${approvalResult.userName}`
                        );
                    }
                    
                    // Start auto-approval timer - create entry object from approvalResult
                    const inMemoryEntry = {
                        id: approvalResult.orderId,
                        userId: approvalResult.userId,
                        diamonds: approvalResult.diamonds,
                        status: 'processing'
                    };
                    startAutoApprovalTimer(groupId, inMemoryEntry.id, inMemoryEntry, client);
                }
                return;
            } else {
                console.log(`[APPROVAL DEBUG] No pending diamond found for ${quotedUserId}`);
                
                // ✅ NEW: Check if order was already approved by checking message ID in database
                if (quotedMessageId) {
                    const groupData = db.getGroupData(groupId);
                    if (groupData && groupData.entries) {
                        const existingOrder = groupData.entries.find(e => 
                            e.messageId === quotedMessageId && 
                            e.userId === quotedUserId
                        );
                        
                        if (existingOrder && existingOrder.status !== 'pending') {
                            // Order exists but not pending - it's already been processed
                            let statusText = '';
                            let adminName = existingOrder.approvedBy || 'Admin';
                            
                            if (existingOrder.status === 'processing') {
                                statusText = `⏳ *এই অর্ডারটি ইতিমধ্যে ${adminName} দ্বারা Processing শুরু হয়েছে*`;
                            } else if (existingOrder.status === 'approved') {
                                statusText = `✅ *এই অর্ডারটি ইতিমধ্যে ${adminName} দ্বারা Approve করা হয়েছে*`;
                            } else if (existingOrder.status === 'deleted') {
                                statusText = `🗑️ *এই অর্ডারটি ইতিমধ্যে ${adminName} দ্বারা Delete করা হয়েছে*`;
                            } else {
                                statusText = `ℹ️ *এই অর্ডারটি ইতিমধ্যে প্রসেস করা হয়েছে* (Status: ${existingOrder.status})`;
                            }
                            
                            await replyWithDelay(msg, `${statusText}\n\n💎 Diamonds: ${existingOrder.diamonds}💎\n📅 Order ID: ${existingOrder.id}`);
                            messageCounter.incrementCounter();
                            console.log(`[APPROVAL] ❌ Order ${existingOrder.id} already ${existingOrder.status} by ${adminName}`);
                            return;
                        }
                    }
                }
            }
            
            // Find and approve entry from database
            const groupData = db.getGroupData(groupId);
            
            // Check if groupData and entries exist
            if (!groupData || !groupData.entries || groupData.entries.length === 0) {
                console.log(`[APPROVAL] No entries found in group data for ${groupId}`);
                return;
            }
            
            // Find all pending orders for this user
            const userPendingOrders = groupData.entries.filter(e => e.userId === quotedUserId && e.status === 'pending');
            
            if (userPendingOrders.length === 0) {
                console.log(`[APPROVAL] No pending orders found for user ${quotedUserId}`);
                return;
            }
            
            // 🎯 CRITICAL FIX: Find the EXACT order that was quoted
            // Extract diamond count from quoted message to identify the right order
            let pendingEntry = null;
            
            // Try to extract diamond count from quoted message (formats: "100💎", "100 💎", "Diamonds: 100💎")
            const diamondMatch = quotedBody.match(/(\d+)\s*💎/);
            if (diamondMatch) {
                const quotedDiamonds = parseInt(diamondMatch[1]);
                console.log(`[APPROVAL] Extracted ${quotedDiamonds}💎 from quoted message`);
                
                // Find order with matching diamond count
                pendingEntry = userPendingOrders.find(e => e.diamonds === quotedDiamonds);
                
                if (!pendingEntry && userPendingOrders.length === 1) {
                    // Only one pending order, use it
                    pendingEntry = userPendingOrders[0];
                    console.log(`[APPROVAL] Only 1 pending order found, using it (ID: ${pendingEntry.id})`);
                } else if (pendingEntry) {
                    console.log(`[APPROVAL] Found exact match: ${quotedDiamonds}💎 order (ID: ${pendingEntry.id})`);
                }
            }
            
            // ⚠️ CRITICAL FIX: Do NOT use fallback - require exact match to prevent duplicate processing
            if (!pendingEntry) {
                console.log(`[APPROVAL] ❌ PREVENTED FALLBACK - Could not find exact match for quoted message`);
                console.log(`[APPROVAL] 💡 TIP: Reply to the specific order message that shows diamond amount (e.g., "50💎")`);
                await replyWithDelay(msg, '❌ দয়া করে সঠিক অর্ডার মেসেজে Reply করুন যেখানে ডায়মন্ড এমাউন্ট আছে (উদাহরণ: 50💎)');
                messageCounter.incrementCounter();
                return;
            }
            
            console.log(`[APPROVAL] Found ${userPendingOrders.length} pending order(s) for user ${quotedUserId}, approving: ${pendingEntry.diamonds}💎 (ID ${pendingEntry.id})`);
            
            // Get admin name (reuse adminInfo from above)
            const adminName = adminInfo ? adminInfo.name : 'Admin';
            
            // Change status to 'processing' instead of 'approved'
            db.setEntryProcessing(groupId, pendingEntry.id, adminName);
            
            // Get name from quoted message
            let userNameForOrder = quotedUserId;
            try {
                if (msg.hasQuotedMsg) {
                    const quotedMsg = await msg.getQuotedMessage();
                    if (quotedMsg._data && quotedMsg._data.notifyName) {
                        userNameForOrder = quotedMsg._data.notifyName;
                        console.log('[APPROVAL] Got name from notifyName:', userNameForOrder);
                    } else {
                        // Try from group participants
                        const chat = await msg.getChat();
                        if (chat.isGroup) {
                            const participant = chat.participants.find(p => p.id._serialized === quotedUserId);
                            if (participant && participant.contact && participant.contact.pushname) {
                                userNameForOrder = participant.contact.pushname;
                                console.log('[APPROVAL] Got name from participant:', userNameForOrder);
                            }
                        }
                    }
                }
            } catch (contactErr) {
                console.log('[APPROVAL] Could not fetch name');
            }
            console.log('[APPROVAL] Final userName:', userNameForOrder);
            
            const totalValue = pendingEntry.diamonds * pendingEntry.rate;
            
            const approvalMsg = `⏳ *Diamond Order Processing*\n\n` +
                `👤 User: ${userNameForOrder}\n` +
                `💎 Diamonds: ${pendingEntry.diamonds}💎\n` +
                `💰 Amount Due: ৳${totalValue.toFixed(2)}\n` +
                `📊 Rate: ৳${pendingEntry.rate.toFixed(2)}/💎\n\n` +
                `⏱️ Status: Processing (2 min)\n` +
                `Order ID: ${pendingEntry.id}\n\n` +
                `✓ Will auto-approve in 2 minutes\n` +
                `📱 Delete this message to cancel`;

            // Check if approve message is enabled
            const diamondStatus = require('./config/database').getDiamondStatus?.() || JSON.parse(require('fs').readFileSync(require('path').join(__dirname, './config/diamond-status.json'), 'utf8'));
            const approveMessageEnabled = diamondStatus.approveMessageEnabled !== false;
            
            if (approveMessageEnabled) {
                await replyWithDelay(msg, approvalMsg);
                messageCounter.incrementCounter();
            }
            console.log(`[PROCESSING] Order ID ${pendingEntry.id}: ${pendingEntry.diamonds}💎 from ${userNameForOrder} - Will auto-approve in 2 minutes (Message ${approveMessageEnabled ? 'sent' : 'silenced'})`);
            
            // 🔄 Broadcast order status update to admin panel in real-time
            if (global.broadcastOrderStatusChange) {
                global.broadcastOrderStatusChange(
                    pendingEntry.id,
                    'processing',
                    `⏳ Order processing: ${pendingEntry.diamonds}💎 from ${userNameForOrder}`
                );
            }
            
            // Start auto-approval timer
            startAutoApprovalTimer(groupId, pendingEntry.id, pendingEntry, client);
            
            return;
        }

        // ⚠️ ADMIN CORRECTION: When admin quotes a PROCESSING order and sends correction
        // Keywords: vul (wrong), mistake, correction, cancel, wrong number, remove, stop, delete, etc.
        if (msg.hasQuotedMsg && isGroup) {
            const correctionKeywords = ['vul', 'mistake', 'correction', 'cancel', 'wrong', 'remove', 'stop', 'delete', 'mistake hoise', 'vul number', 'wrong number', 'vull number', 'vull', 'ভুল নাম্বার', 'ভুল', 'নাম্বার ভুল', 'number vul'];
            const bodyLower = msg.body.toLowerCase().trim();
            const hasCorrection = correctionKeywords.some(kw => bodyLower.includes(kw));

            if (hasCorrection) {
                // Check if admin
                let isAdminForCorrection = isAdminUser;
                if (!isAdminForCorrection && msg.author) {
                    isAdminForCorrection = isAdminByAnyVariant(msg.author);
                }

                if (isAdminForCorrection) {
                    try {
                        const quotedMsg = await msg.getQuotedMessage();
                        const quotedUserId = quotedMsg.author || quotedMsg.from;
                        
                        // Get quoted message timestamp for exact matching
                        const quotedTimestamp = quotedMsg.timestamp;
                        
                        console.log(`[CORRECTION] Admin (${msg.author}) sent correction for order`);
                        console.log(`[CORRECTION] Quoted user: ${quotedUserId}, Group: ${groupId}`);
                        console.log(`[CORRECTION] Quoted timestamp: ${quotedTimestamp} (${new Date(quotedTimestamp * 1000).toISOString()})`);
                        console.log(`[CORRECTION] Admin message: "${msg.body}"`);
                        console.log(`[CORRECTION] Quoted message: "${quotedMsg.body}"`);

                        // ✅ Load database ONCE to ensure consistency
                        const currentDatabase = db.loadDatabase();
                        const groupData = currentDatabase.groups[groupId];
                        if (!groupData || !groupData.entries) {
                            console.log(`[CORRECTION] Group not found`);
                            return;
                        }
                        
                        // Debug: Show all processing orders for this user
                        const userProcessingOrders = groupData.entries.filter(entry => 
                            entry.userId === quotedUserId && entry.status === 'processing'
                        );
                        console.log(`[CORRECTION] Found ${userProcessingOrders.length} processing orders for user:`);
                        userProcessingOrders.forEach(order => {
                            const orderTime = order.messageTimestamp ? new Date(order.messageTimestamp * 1000).toISOString() : 'N/A';
                            console.log(`  - Order ${order.id}: ${order.diamonds}💎, timestamp: ${order.messageTimestamp} (${orderTime})`);
                        });

                        // ✅ EXACT MATCH: Find the order that matches the quoted message
                        let processingOrder = null;
                        
                        // Strategy 1: Match by messageTimestamp (most accurate)
                        if (quotedTimestamp) {
                            // Try exact match first
                            processingOrder = groupData.entries.find(entry => 
                                entry.userId === quotedUserId && 
                                entry.status === 'processing' &&
                                entry.messageTimestamp === quotedTimestamp
                            );
                            
                            if (processingOrder) {
                                console.log(`[CORRECTION] ✅ EXACT MATCH by timestamp: Order ${processingOrder.id} (${processingOrder.diamonds}💎)`);
                            }
                            
                            // If not found, try timestamp proximity (within 5 seconds)
                            if (!processingOrder) {
                                const quotedTime = quotedTimestamp * 1000; // Convert to milliseconds
                                let closestOrder = null;
                                let closestTimeDiff = Infinity;
                                
                                groupData.entries.forEach(entry => {
                                    if (entry.userId === quotedUserId && 
                                        entry.status === 'processing' &&
                                        entry.messageTimestamp) {
                                        
                                        const entryTime = entry.messageTimestamp * 1000;
                                        const timeDiff = Math.abs(entryTime - quotedTime);
                                        
                                        if (timeDiff < closestTimeDiff && timeDiff < 5000) { // Within 5 seconds
                                            closestTimeDiff = timeDiff;
                                            closestOrder = entry;
                                        }
                                    }
                                });
                                
                                if (closestOrder) {
                                    processingOrder = closestOrder;
                                    console.log(`[CORRECTION] ✅ MATCH by timestamp proximity: Order ${processingOrder.id} (${processingOrder.diamonds}💎, time diff: ${closestTimeDiff}ms)`);
                                }
                            }
                        }
                        
                        // Strategy 2: If timestamp match fails, try Order ID from quoted message
                        if (!processingOrder) {
                            const orderIdMatch = quotedMsg.body.match(/Order ID:\s*(O-\d+)/i) || quotedMsg.body.match(/(O-\d+)/i);
                            if (orderIdMatch) {
                                const targetOrderId = orderIdMatch[1];
                                processingOrder = groupData.entries.find(entry => 
                                    entry.userId === quotedUserId && 
                                    entry.status === 'processing' && 
                                    entry.id === targetOrderId
                                );
                                
                                if (processingOrder) {
                                    console.log(`[CORRECTION] ✅ MATCH by Order ID: ${processingOrder.id}`);
                                }
                            }
                        }
                        
                        // Strategy 3: Parse user input format (ID\nDiamond) from quoted message
                        if (!processingOrder) {
                            // User input format: "5555555\n15" or "5555555 15"
                            const lines = quotedMsg.body.trim().split(/[\n\s]+/);
                            if (lines.length >= 2) {
                                const possibleId = lines[0];
                                const possibleDiamonds = parseInt(lines[lines.length - 1]); // Last number is diamonds
                                
                                console.log(`[CORRECTION] Parsing user input - ID: ${possibleId}, Diamonds: ${possibleDiamonds}`);
                                
                                if (!isNaN(possibleDiamonds)) {
                                    // Find order with matching diamonds from this user, closest to quoted timestamp
                                    const quotedTime = quotedTimestamp * 1000;
                                    let closestOrder = null;
                                    let closestTimeDiff = Infinity;
                                    
                                    groupData.entries.forEach(entry => {
                                        if (entry.userId === quotedUserId && 
                                            entry.status === 'processing' && 
                                            entry.diamonds === possibleDiamonds) {
                                            
                                            if (entry.messageTimestamp) {
                                                const entryTime = entry.messageTimestamp * 1000;
                                                const timeDiff = Math.abs(entryTime - quotedTime);
                                                
                                                if (timeDiff < closestTimeDiff && timeDiff < 30000) { // Within 30 seconds
                                                    closestTimeDiff = timeDiff;
                                                    closestOrder = entry;
                                                }
                                            }
                                        }
                                    });
                                    
                                    if (closestOrder) {
                                        processingOrder = closestOrder;
                                        console.log(`[CORRECTION] ✅ MATCH by user input format: Order ${processingOrder.id} (${processingOrder.diamonds}💎, time diff: ${closestTimeDiff}ms)`);
                                    }
                                }
                            }
                        }
                        
                        // Strategy 4: Match by diamond amount with 💎 emoji or "diamond" keyword
                        if (!processingOrder) {
                            const diamondMatch = quotedMsg.body.match(/(\d+)\s*💎|(\d+)\s*diamond/i);
                            if (diamondMatch && quotedTimestamp) {
                                const targetDiamonds = parseInt(diamondMatch[1] || diamondMatch[2]);
                                const quotedTime = quotedTimestamp * 1000;
                                
                                let closestOrder = null;
                                let closestTimeDiff = Infinity;
                                
                                groupData.entries.forEach(entry => {
                                    if (entry.userId === quotedUserId && 
                                        entry.status === 'processing' && 
                                        entry.diamonds === targetDiamonds &&
                                        entry.messageTimestamp) {
                                        
                                        const entryTime = entry.messageTimestamp * 1000;
                                        const timeDiff = Math.abs(entryTime - quotedTime);
                                        
                                        if (timeDiff < closestTimeDiff && timeDiff < 30000) { // Within 30 seconds
                                            closestTimeDiff = timeDiff;
                                            closestOrder = entry;
                                        }
                                    }
                                });
                                
                                if (closestOrder) {
                                    processingOrder = closestOrder;
                                    console.log(`[CORRECTION] ✅ MATCH by diamonds + time proximity: Order ${processingOrder.id} (${processingOrder.diamonds}💎, time diff: ${closestTimeDiff}ms)`);
                                }
                            }
                        }
                        
                        // Strategy 5: If only one processing order exists for this user, use that
                        if (!processingOrder) {
                            const userProcessingOrders = groupData.entries.filter(entry => 
                                entry.userId === quotedUserId && entry.status === 'processing'
                            );
                            
                            if (userProcessingOrders.length === 1) {
                                processingOrder = userProcessingOrders[0];
                                console.log(`[CORRECTION] ✅ MATCH by single processing order: Order ${processingOrder.id} (${processingOrder.diamonds}💎)`);
                            } else if (userProcessingOrders.length > 1) {
                                console.log(`[CORRECTION] ⚠️ Multiple processing orders found (${userProcessingOrders.length})`);
                                
                                // As last resort, use the OLDEST processing order (FIFO)
                                processingOrder = userProcessingOrders[0];
                                console.log(`[CORRECTION] ✅ Using OLDEST processing order (FIFO): Order ${processingOrder.id} (${processingOrder.diamonds}💎)`);
                            }
                        }
                        
                        // If still not found, show error
                        if (!processingOrder) {
                            console.log(`[CORRECTION] ❌ Could not find exact matching order - not deleting anything to be safe`);
                            await replyWithDelay(msg, `❌ Order খুঁজে পাওয়া যায়নি। অনুগ্রহ করে সঠিক order message quote করুন।`);
                            messageCounter.incrementCounter();
                            return;
                        }

                        if (processingOrder) {
                            // ✅ Cancel the auto-approval timer
                            cancelAutoApprovalTimer(groupId, processingOrder.id);
                            console.log(`[CORRECTION] Cancelled auto-approval timer for order ${processingOrder.id}`);

                            // ✅ Update status to 'deleted' in the loaded database
                            processingOrder.status = 'deleted';
                            processingOrder.deletedAt = new Date().toISOString();
                            processingOrder.deletedBy = 'User Correction';
                            processingOrder.correctionReason = msg.body;
                            
                            // ✅ Save the database with the updated entry
                            db.saveDatabase(currentDatabase);
                            console.log(`[CORRECTION] Order ${processingOrder.id} marked as DELETED and saved to database`);
                            console.log(`[CORRECTION] Database file updated: status=${processingOrder.status}, deletedAt=${processingOrder.deletedAt}`);

                            // ✅ Check if delete message edit is disabled
                            let shouldSendDeleteMessage = true;
                            try {
                                const statusData = await fs.readFile(path.join(__dirname, 'config/diamond-status.json'), 'utf8');
                                const status = JSON.parse(statusData);
                                if (status.disableDeleteMessageEdit) {
                                    shouldSendDeleteMessage = false;
                                    console.log('[CORRECTION] Delete message edit is DISABLED - not sending message');
                                }
                            } catch (e) {
                                console.log('[CORRECTION] Could not read settings, sending message by default');
                            }

                            // ✅ Send confirmation to group (only if enabled)
                            if (shouldSendDeleteMessage) {
                                const confirmMsg = `✅ *Order Cancelled*\n\n` +
                                    `🗑️ Order ID: ${processingOrder.id}\n` +
                                    `💎 Diamonds: ${processingOrder.diamonds}💎\n` +
                                    `👤 User: ${processingOrder.userName}\n\n` +
                                    `📝 Admin Reason: ${msg.body}\n` +
                                    `⏹️ Status: DELETED (Correction applied)`;
                                
                                await replyWithDelay(msg, confirmMsg);
                                console.log(`[CORRECTION] Confirmation sent to group`);
                            } else {
                                console.log('[CORRECTION] Order deleted silently (no message sent)');
                            }

                            // ✅ Notify admin panel
                            try {
                                const controller = new AbortController();
                                const timeoutId = setTimeout(() => controller.abort(), 3000);
                                
                                await fetch('http://localhost:3005/api/order-event', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        type: 'order-deleted',
                                        reason: 'admin-correction',
                                        groupId: groupId,
                                        orderId: processingOrder.id,
                                        entry: processingOrder,
                                        adminMessage: msg.body,
                                        message: `🗑️ Order ${processingOrder.id} cancelled by admin (Correction: ${msg.body})`
                                    }),
                                    signal: controller.signal
                                }).catch(e => console.log('[CORRECTION] Admin panel notified'));
                                
                                clearTimeout(timeoutId);
                            } catch (notifyErr) {
                                console.log('[CORRECTION] Admin panel notification failed (expected if offline)');
                            }

                            messageCounter.incrementCounter();
                            return;
                        }
                    } catch (correctionErr) {
                        console.error('[CORRECTION] Error handling correction:', correctionErr.message);
                    }
                }
            }
        }
        
        // Admin payment receipt: amount//rcv (e.g., 100//rcv)
        const paymentMatch = msg.body.trim().match(/^(\d+(?:\.\d{1,2})?)\/\/rcv$/i);
        if (paymentMatch && isGroup) {
            // Better admin check
            let isAdminForPayment = isAdminUser;
            if (!isAdminForPayment && msg.author) {
                isAdminForPayment = isAdminByAnyVariant(msg.author);
            }
            
            if (!isAdminForPayment) {
                await replyWithDelay(msg, '❌ Only admins can process payments/deposits.');
                messageCounter.incrementCounter();
                return;
            }
            if (!msg.hasQuotedMsg) {
                await replyWithDelay(msg, '❌ Please reply to a user message to process payment/deposit.');
                messageCounter.incrementCounter();
                return;
            }
            
            const quotedMsg = await msg.getQuotedMessage();
            const quotedUserId = quotedMsg.author || quotedMsg.from;
            const amount = parseFloat(paymentMatch[1]);
            
            // Get name from quoted message - try notifyName first
            let userName = quotedUserId;
            
            if (quotedMsg._data && quotedMsg._data.notifyName) {
                userName = quotedMsg._data.notifyName;
                console.log('[PAYMENT] Got name from notifyName:', userName);
            } else {
                // Try from group participants
                try {
                    const chat = await msg.getChat();
                    if (chat.isGroup) {
                        const participant = chat.participants.find(p => p.id._serialized === quotedUserId);
                        if (participant && participant.contact && participant.contact.pushname) {
                            userName = participant.contact.pushname;
                            console.log('[PAYMENT] Got name from participant:', userName);
                        }
                    }
                } catch (e) {
                    console.log('[PAYMENT] Could not get participant name');
                }
            }
            
            console.log('[PAYMENT] Final userName:', userName);
            
            // First check if it's a deposit approval
            const depositResult = await handleDepositApproval(msg, amount, quotedUserId, userName, isAdminUser);
            
            if (depositResult.success) {
                // Deposit approved
                await replyWithDelay(msg, depositResult.adminMessage);
                messageCounter.incrementCounter();
                
                // Send user notification
                try {
                    const userChat = await client.getChatById(quotedUserId);
                    await sendMessageWithDelay(client, quotedUserId, depositResult.userMessage);
                    messageCounter.incrementCounter();
                } catch (err) {
                    console.log('Could not send direct message to user:', err);
                    await replyWithDelay(msg, `📲 User notification: ${depositResult.userMessage}`);
                    messageCounter.incrementCounter();
                }
            } else {
                // Not a deposit, try as payment for order dues
                const paymentResult = await processPaymentReceipt(quotedUserId, userName, groupId, amount);
                
                if (paymentResult.success) {
                    // Send admin confirmation
                    await replyWithDelay(msg, paymentResult.adminMessage);
                    messageCounter.incrementCounter();
                    
                    // Notify admin panel about manual payment
                    try {
                        await fetch('http://localhost:3000/api/payment-event', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'payment-added',
                                userId: quotedUserId,
                                userName: userName,
                                groupId: groupId,
                                amount: amount,
                                message: `💰 Manual payment: ৳${amount.toFixed(2)} from ${userName}`
                            })
                        });
                    } catch (e) {
                        console.log('[PAYMENT] Could not notify admin panel');
                    }
                    
                    // Send user notification
                    try {
                        const userChat = await client.getChatById(quotedUserId);
                        await sendMessageWithDelay(client, quotedUserId, paymentResult.userMessage);
                        messageCounter.incrementCounter();
                    } catch (err) {
                        console.log('Could not send direct message to user:', err);
                        await replyWithDelay(msg, `📲 User notification failed. Message them: ${paymentResult.userMessage}`);
                        messageCounter.incrementCounter();
                    }
                } else {
                    await replyWithDelay(msg, paymentResult.adminMessage);
                    messageCounter.incrementCounter();
                }
            }
            
            return;
        }
        
        // Show pending deposits command
        if (msg.body.trim() === '/pendingdeposits') {
            if (!isAdminUser) {
                await replyWithDelay(msg, '❌ Only admins can view pending deposits.');
                messageCounter.incrementCounter();
                return;
            }
            await showPendingDeposits(msg);
            return;
        }
        
        // Show pending requests command
        if (msg.body.trim() === '/pending') {
            if (isGroup) {
                await showPendingRequests(msg, groupId);
            } else {
                await replyWithDelay(msg, '❌ This command works only in groups.');
                messageCounter.incrementCounter();
            }
            return;
        }
        
        // Balance check command: /balance
        if (msg.body.trim() === '/balance') {
            let userName = fromUserId;
            try {
                const contact = await client.getContactById(fromUserId);
                userName = contact.pushname || contact.name || fromUserId;
            } catch (contactErr) {
                console.log('[BALANCE] Could not fetch contact, using fallback name');
                userName = msg.from?.contact?.pushname || fromUserId;
            }
            
            await handleBalanceQuery(msg, fromUserId, userName);
            return;
        }
        
        // Deposit stats command: /depstats
        if (msg.body.trim() === '/depstats') {
            if (!isAdminUser) {
                await replyWithDelay(msg, '❌ Only admins can view deposit statistics.');
                messageCounter.incrementCounter();
                return;
            }
            await showDepositStats(msg);
            return;
        }
        
        // Dynamic Commands from commands.json
        if (msg.body.trim().startsWith('/')) {
            try {
                const commandsData = JSON.parse(await fs.readFile(path.join(__dirname, 'config', 'commands.json'), 'utf8'));
                const userCommand = msg.body.trim().toLowerCase();
                
                // Search through all categories
                for (const category of Object.keys(commandsData)) {
                    const matchedCmd = commandsData[category].find(cmd => 
                        cmd.command.toLowerCase() === userCommand && cmd.enabled
                    );
                    
                    if (matchedCmd) {
                        // Check category permissions
                        if (matchedCmd.category === 'admin' && !isAdminUser) {
                            await replyWithDelay(msg, '❌ This is an admin-only command.');
                            messageCounter.incrementCounter();
                            return;
                        }
                        
                        // Handle dynamic responses
                        if (matchedCmd.response === 'dynamic') {
                            // Skip - handled by existing code
                            break;
                        }
                        
                        // Replace placeholders in response
                        let response = matchedCmd.response;
                        
                        // Get group rate if available
                        if (isGroup) {
                            const groupData = db.getGroupData(groupId);
                            if (groupData && groupData.rate) {
                                response = response.replace('{rate}', groupData.rate);
                            }
                        }
                        
                        await replyWithDelay(msg, response);
                        messageCounter.incrementCounter();
                        return;
                    }
                }
            } catch (cmdError) {
                console.log('[COMMANDS] Error loading commands.json:', cmdError.message);
            }
        }
        
        // Help command
        if (msg.body.trim() === '/help') {
            const helpText = `*🤖 DIAMOND BOT COMMANDS*\n\n` +
                `/d - Show your dashboard\n` +
                `/balance - Check your balance\n` +
                `/balance - Check your balance\n` +
                `/pending - Show pending diamond requests\n` +
                `/help - Show this help message\n\n` +
                `*USER ACTIONS:*\n` +
                `Send any number in DM (e.g., 500) to request deposit\n` +
                `Send any number in group (e.g., 100) to order diamonds\n\n` +
                `*ADMIN ACTIONS:*\n` +
                `Reply with "done" or "ok" to approve an order\n` +
                `Reply with "amount//rcv" (e.g., 500//rcv) to approve deposit or process payment\n` +
                `/pendingdeposits - View pending deposit requests\n` +
                `/depstats - View deposit statistics\n` +
                `Reply with "/addadmin phone_number name" to add new admin`;
            
            await replyWithDelay(msg, helpText);
            messageCounter.incrementCounter();
            return;
        }
        
        // Add admin command (only for existing admins)
        const addAdminMatch = msg.body.trim().match(/^\/addadmin\s+(\d+)\s+(.+)$/);
        if (addAdminMatch) {
            // Better admin check
            let isAdminForAddingAdmin = isAdminUser;
            if (!isAdminForAddingAdmin && msg.author) {
                isAdminForAddingAdmin = isAdminByAnyVariant(msg.author);
            }
            
            if (!isAdminForAddingAdmin) {
                await replyWithDelay(msg, '❌ Only admins can add new admins.');
                messageCounter.incrementCounter();
                return;
            }
            
            const phone = addAdminMatch[1];
            const name = addAdminMatch[2];
            const whatsappId = phone + '@c.us';
            
            const result = db.addAdmin(phone, whatsappId, name);
            
            if (result.success) {
                await replyWithDelay(msg, `✅ *Admin Added*\n\nPhone: +${phone}\nName: ${name}\nStatus: Active\n\n📱 New admin WhatsApp ID: ${whatsappId}`);
                messageCounter.incrementCounter();
                console.log(`[ADMIN] New admin added: ${name} (+${phone})`);
                console.log(`[ADMIN] WhatsApp ID: ${whatsappId}`);
            } else {
                await replyWithDelay(msg, `❌ ${result.message}`);
                messageCounter.incrementCounter();
            }
            return;
        }
        
    } catch (error) {
        console.error('Error handling message:', error);
    }
});

// Handle message deletion (Delete for Everyone)
// ব্যবহারকারী যখন "Delete for Everyone" ব্যবহার করে মেসেজ ডিলিট করবে,
// তখন admin panel থেকেও অটোমেটিক সেই order ডিলিট হয়ে যাবে
client.on('message_revoke', async (after, before) => {
    try {
        console.log(`[DELETE EVENT] ========================================`);
        console.log(`[DELETE EVENT] MESSAGE REVOKE DETECTED!`);
        console.log(`[DELETE EVENT] Before object keys:`, Object.keys(before || {}));
        console.log(`[DELETE EVENT] Before object:`, JSON.stringify(before, null, 2));
        console.log(`[DELETE EVENT] ========================================`);
        
        if (!before) {
            console.log(`[DELETE EVENT] No 'before' object found, returning`);
            return;
        }
        
        const messageBody = before.body?.trim() || '';
        const fromUserId = before.from;
        const msgFrom = before.author || fromUserId;
        
        console.log(`[DELETE EVENT] Checking message - Body: "${messageBody}", From: ${fromUserId}, Author: ${msgFrom}`);
        
        // শুধুমাত্র গ্রুপ মেসেজ প্রসেস করো
        if (!fromUserId || !fromUserId.includes('@g.us')) {
            console.log(`[DELETE EVENT] Not a group message, ignoring`);
            return;
        }
        
        const database = db.loadDatabase();
        const groupData = database.groups[fromUserId];
        
        if (!groupData || !groupData.entries) {
            console.log(`[DELETE EVENT] Group not found in database`);
            return;
        }
        
        // Check 1: Detect deleted "done" approval message (admin's approval)
        // The message will contain "Processing" or mention the order approval
        if (messageBody.includes('Processing') || messageBody.includes('Order')) {
            console.log(`[DELETE EVENT] 🔍 Detected potential approval message deletion`);
            
            // Look for the most recent order in "processing" or "approved" state
            let processingOrder = null;
            for (let i = groupData.entries.length - 1; i >= 0; i--) {
                const entry = groupData.entries[i];
                if ((entry.status === 'processing' || entry.status === 'approved') && entry.processingStartedAt) {
                    // Check if this order was recently approved (within 5 minutes)
                    const approvalTime = new Date(entry.processingStartedAt).getTime();
                    const now = Date.now();
                    if (now - approvalTime < 5 * 60 * 1000) {
                        processingOrder = entry;
                        console.log(`[DELETE EVENT] ✅ Found processing order: ${entry.id}`);
                        break;
                    }
                }
            }
            
            if (processingOrder) {
                console.log(`[DELETE EVENT] ⏸️ Admin deleted approval message - Cancelling Order ${processingOrder.id}`);
                
                // Cancel the auto-approval timer
                cancelAutoApprovalTimer(fromUserId, processingOrder.id);
                
                // Change status back to 'pending' with cancellation note
                processingOrder.status = 'pending';
                processingOrder.cancelledByAdmin = true;
                processingOrder.cancelledAt = new Date().toISOString();
                processingOrder.cancelReason = 'Admin deleted approval message';
                delete processingOrder.processingStartedAt;
                delete processingOrder.processingTimeout;
                
                db.saveDatabase(database);
                
                // Check if delete message edit is disabled
                let shouldSendCancelMsg = true;
                try {
                    const statusData = await fs.readFile(path.join(__dirname, 'config/diamond-status.json'), 'utf8');
                    const status = JSON.parse(statusData);
                    if (status.disableDeleteMessageEdit) {
                        shouldSendCancelMsg = false;
                        console.log('[DELETE EVENT] Delete message edit is DISABLED - not sending message');
                    }
                } catch (e) {
                    console.log('[DELETE EVENT] Could not read settings, sending message by default');
                }
                
                // Notify users about cancellation (only if enabled)
                if (shouldSendCancelMsg) {
                    const cancelMsg = `❌ *Order CANCELLED*\n\n` +
                        `💎 Order ID: ${processingOrder.id}\n` +
                        `💎 Diamonds: ${processingOrder.diamonds}💎\n` +
                        `👤 User: ${processingOrder.userName}\n\n` +
                        `📋 Reason: Admin cancelled the approval\n` +
                        `⏸️ Status: Back to Pending`;
                    
                    try {
                        await client.sendMessage(fromUserId, cancelMsg);
                        console.log(`[DELETE EVENT] Cancel message sent to group`);
                    } catch (sendErr) {
                        console.error(`[DELETE EVENT] Failed to send cancel message:`, sendErr.message);
                    }
                } else {
                    console.log('[DELETE EVENT] Order cancelled silently (no message sent)');
                }

                // Notify admin panel via HTTP with correct port (3005)
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);
                    
                    await fetch('http://localhost:3005/api/order-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'order-cancelled',
                            reason: 'admin-deleted-approval',
                            groupId: fromUserId,
                            orderId: processingOrder.id,
                            entry: processingOrder,
                            message: `❌ Order ${processingOrder.id} cancelled by admin`
                        }),
                        signal: controller.signal
                    }).catch(e => console.log('[DELETE EVENT] Admin notification sent to port 3005'));
                    
                    clearTimeout(timeoutId);
                } catch (notifyErr) {
                    console.error('[DELETE EVENT] Failed to notify admin panel:', notifyErr.message);
                }
                
                return;
            }
        }
        
        // Check 2: Detect deleted user order message
        const numberMatch = messageBody.match(/\d+/);
        if (!numberMatch) {
            console.log(`[DELETE EVENT] Not a diamond order message (no digits found), ignoring - Body: "${messageBody}"`);
            return;
        }
        
        const diamondAmount = parseInt(numberMatch[0]);
        
        // Get the actual message author (the user who sent the order, not the group)
        // For group messages, author is in "before.author"
        const actualUserId = before.author || before.from;
        
        console.log(`[DELETE EVENT] ✅ Processing user delete - Amount: ${diamondAmount}💎, Group: ${fromUserId}, User: ${actualUserId}`);
        console.log(`[DELETE EVENT] Searching for entry with userId: ${actualUserId}, diamonds: ${diamondAmount}, status: pending or processing`);
        console.log(`[DELETE EVENT] Total entries in database: ${groupData.entries.length}`);
        
        // Find and mark as deleted - user deleting their own order
        let deletedEntry = null;
        
        for (let i = groupData.entries.length - 1; i >= 0; i--) {
            const entry = groupData.entries[i];
            console.log(`[DELETE EVENT] Checking entry ${i}: id=${entry.id}, userId=${entry.userId}, diamonds=${entry.diamonds}, status=${entry.status}`);
            
            // Check for pending OR processing status (processing = admin approved but not yet auto-approved)
            if ((entry.status === 'pending' || entry.status === 'processing') && 
                entry.userId === actualUserId && 
                entry.diamonds === diamondAmount) {
                
                console.log(`[DELETE EVENT] ✅ MATCH FOUND! Entry ${entry.id}`);
                
                // If was in processing, cancel the auto-approval timer
                if (entry.status === 'processing') {
                    const { cancelAutoApprovalTimer } = require('./utils/auto-approval');
                    cancelAutoApprovalTimer(fromUserId, entry.id);
                    console.log(`[DELETE EVENT] ⏹️ Cancelled auto-approval timer for processing order ${entry.id}`);
                }
                
                entry.status = 'deleted';
                entry.deletedAt = new Date().toISOString();
                entry.deletedBy = 'user';
                deletedEntry = entry;
                console.log(`[DELETE EVENT] ✅ Order status changed to deleted: ${deletedEntry.diamonds}💎 from ${deletedEntry.userId}`);
                break;
            }
        }
        
        if (!deletedEntry) {
            console.log(`[DELETE EVENT] ❌ NO MATCHING ENTRY FOUND for amount=${diamondAmount}, userId=${actualUserId}`);
        }
        
        if (deletedEntry) {
            db.saveDatabase(database);
            console.log(`[DELETE EVENT] Database saved`);
            console.log(`[DELETE EVENT] 📤 Sending deletion notification to admin panel...`);
            
            try {
                // Send notification immediately (don't wait)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                // Use async IIFE to send without blocking
                (async () => {
                    try {
                        const response = await fetch('http://localhost:3005/api/order-event', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'order-deleted',
                                reason: 'user-delete',
                                groupId: fromUserId,
                                entry: deletedEntry,
                                message: `🗑️ অর্ডার ${deletedEntry.diamonds}💎 ইউজার ডিলিট করেছে`
                            }),
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        console.log(`[DELETE EVENT] ✅ Admin panel notified (HTTP ${response.status})`);
                    } catch (e) {
                        clearTimeout(timeoutId);
                        console.log(`[DELETE EVENT] ℹ️ Admin panel notification sent (error expected if panel offline)`);
                    }
                })();
            } catch (notifyError) {
                console.log('[DELETE EVENT] Admin panel notify error:', notifyError.message);
            }
        } else {
            console.log(`[DELETE EVENT] No matching pending order found`);
        }
        
    } catch (error) {
        console.error('[DELETE EVENT] Error handling message revoke:', error.message);
    }
});

// Handle message edit - when admin edits their approval message
client.on('message_edit', async (msg, newBody, prevBody) => {
    try {
        console.log(`[EDIT EVENT] Message edited! Prev: "${prevBody}", New: "${newBody}"`);
        console.log(`[EDIT EVENT] From: ${msg.from}, Author: ${msg.author}`);
        
        const fromUserId = msg.from;
        const isGroup = fromUserId && fromUserId.includes('@g.us');
        
        if (!isGroup) {
            console.log('[EDIT EVENT] Not a group message, ignoring');
            return;
        }
        
        // Check if this is admin user
        const admins = db.getAdmins();
        console.log('[EDIT EVENT] Admins:', admins);
        console.log('[EDIT EVENT] Message author:', msg.author);
        
        // Check if author whatsappId matches any admin
        const isAdmin = admins.some(admin => admin.whatsappId === msg.author);
        
        if (!isAdmin) {
            console.log('[EDIT EVENT] Not an admin, ignoring');
            return;
        }
        
        console.log('[EDIT EVENT] ✅ Admin confirmed!');
        
        // Check if previous message was approval (done, ok, etc.)
        const approvalKeywords = ['done', 'ok', 'do', 'dn', 'yes', 'অক', 'okey', 'ওকে'];
        const wasPreviouslyApproval = approvalKeywords.some(keyword => 
            prevBody.toLowerCase().trim() === keyword
        );
        
        if (!wasPreviouslyApproval) return;
        
        console.log('[EDIT EVENT] Admin edited an approval message!');
        
        // Find the approved order that was just approved by this message
        const database = db.loadDatabase();
        const groupData = database.groups[fromUserId];
        
        if (!groupData || !groupData.entries) return;
        
        // Find recently approved entry (within last 2 minutes)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const recentApproval = groupData.entries.find(entry => 
            entry.status === 'approved' && 
            entry.approvedAt && 
            entry.approvedAt > twoMinutesAgo
        );
        
        if (recentApproval) {
            console.log('[EDIT EVENT] Found recently approved order:', recentApproval.diamonds);
            
            // Change status to pending again and add edit note
            recentApproval.status = 'pending';
            recentApproval.editedAt = new Date().toISOString();
            recentApproval.editReason = 'admin-edited-approval';
            delete recentApproval.approvedAt;
            
            db.saveDatabase(database);
            
            // Get custom edit message from diamond-status or use default
            let userMessage = `❌ আপনার অর্ডার ইনফো ভুল ছিল।\n\n` +
                `দয়া করে আপনার নাম্বার সঠিক করে আবার অর্ডার দিন।\n\n` +
                `⚠️ এই অর্ডার আর প্রসেস করা হবে না।\n\n` +
                `📝 নতুন করে সঠিক তথ্য দিয়ে অর্ডার করুন।`;
            
            try {
                const statusResponse = await fetch('http://localhost:3000/api/diamond-status');
                const status = await statusResponse.json();
                if (status.editMessage && status.editMessage.trim()) {
                    userMessage = status.editMessage;
                }
            } catch (fetchErr) {
                console.log('[EDIT EVENT] Using default message');
            }
            
            try {
                await sendMessageWithDelay(client, fromUserId, userMessage);
                messageCounter.incrementCounter();
                console.log('[EDIT EVENT] Sent error message to group');
            } catch (msgError) {
                console.error('[EDIT EVENT] Failed to send message:', msgError.message);
            }
            
            // Notify admin panel
            try {
                await fetch('http://localhost:3000/api/order-event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'order-reverted',
                        reason: 'admin-edited-approval',
                        groupId: fromUserId,
                        entry: recentApproval,
                        message: `⚠️ অর্ডার ${recentApproval.diamonds}💎 এডমিন এডিট করেছে - pending এ ফিরে গেছে`
                    })
                }).catch(e => console.log('[EDIT EVENT] Admin panel notification failed'));
            } catch (notifyError) {
                console.log('[EDIT EVENT] Admin panel notify failed:', notifyError.message);
            }
        }
        
    } catch (error) {
        console.error('[EDIT EVENT] Error handling message edit:', error.message);
    }
});

// Function to periodically check for deleted messages
// এটি একটি ফলব্যাক মেকানিজম - message_revoke event কাজ না করলে এটি কাজ করবে
async function startDeletedMessageChecker(client) {
    setInterval(async () => {
        try {
            const database = db.loadDatabase();
            
            for (const [groupId, groupData] of Object.entries(database.groups)) {
                if (!groupData.entries || !Array.isArray(groupData.entries)) continue;
                
                // সব pending এবং processing orders চেক করো
                for (let i = groupData.entries.length - 1; i >= 0; i--) {
                    const entry = groupData.entries[i];
                    
                    // pending বা processing status এর orders চেক করো
                    if ((entry.status === 'pending' || entry.status === 'processing') && entry.messageId) {
                        try {
                            // চেষ্টা করো মেসেজ খুঁজে বের করতে
                            const message = await client.getMessageById(entry.messageId);
                            
                            if (!message || !message.id) {
                                // মেসেজ আর নেই - ডিলিট হয়েছে
                                console.log(`[AUTO-CHECK] ✅ Detected deleted message: ${entry.diamonds}💎 from ${entry.userId} (status: ${entry.status})`);
                                
                                // If processing, cancel the auto-approval timer first
                                if (entry.status === 'processing') {
                                    const { cancelAutoApprovalTimer } = require('./utils/auto-approval');
                                    cancelAutoApprovalTimer(groupId, entry.id);
                                    console.log(`[AUTO-CHECK] ⏹️ Cancelled auto-approval timer for order ${entry.id}`);
                                }
                                
                                // Entry delete না করে status "deleted" করে দাও
                                entry.status = 'deleted';
                                entry.deletedAt = new Date().toISOString();
                                entry.deletedBy = 'user';
                                const deletedEntry = entry;
                                
                                // Notify admin
                                try {
                                    await fetch('http://localhost:3000/api/order-event', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            type: 'order-deleted',
                                            reason: 'message-deleted',
                                            groupId: groupId,
                                            entry: deletedEntry,
                                            message: `🗑️ অর্ডার ${deletedEntry.diamonds}💎 ডিলিট হয়েছে`
                                        })
                                    }).catch(e => {});
                                } catch (e) {}
                            }
                        } catch (e) {
                            // মেসেজ আর এক্সেসযোগ্য না হলে status "deleted" করো
                            if (e.message && e.message.includes('not found')) {
                                console.log(`[AUTO-CHECK] ✅ Message not found - marking as deleted: ${entry.diamonds}💎 (status: ${entry.status})`);
                                
                                // If processing, cancel the timer
                                if (entry.status === 'processing') {
                                    const { cancelAutoApprovalTimer } = require('./utils/auto-approval');
                                    cancelAutoApprovalTimer(groupId, entry.id);
                                    console.log(`[AUTO-CHECK] ⏹️ Cancelled auto-approval timer for order ${entry.id}`);
                                }
                                
                                entry.status = 'deleted';
                                entry.deletedAt = new Date().toISOString();
                                entry.deletedBy = 'user';
                            }
                        }
                    }
                }
            }
            
            // চেঞ্জেস সেভ করো
            db.saveDatabase(database);
            
        } catch (error) {
            console.log(`[AUTO-CHECK] Error in deleted message checker: ${error.message}`);
        }
    }, 3000); // প্রতি ৩ সেকেন্ডে চেক করো
    
    console.log('[AUTO-CHECK] ✅ Deleted message checker enabled as fallback');
}

// Helper function to get group name
async function getGroupName(client, groupId) {
    try {
        const chat = await client.getChatById(groupId);
        return chat.name || null;
    } catch (error) {
        console.log(`[GROUP NAME] Could not fetch group name for ${groupId}:`, error.message);
        return null;
    }
}

// ✅ Client initialization now handled by initializeClient() function at the end

console.log('🚀 Starting bot initialization...');

// Start Express server for message sending from admin panel
const app = express();
app.use(cors());
app.use(bodyParser.json());

console.log('✅ Express app created');

// Health check endpoint
app.get('/api/bot-status', async (req, res) => {
    console.log(`[BOT-STATUS] botIsReady: ${botIsReady}`);
    
    let qrCodeImage = null;
    
    // Generate QR code image if disconnected and we have the QR string
    if (!botIsReady && currentQRCode) {
        try {
            const QRCode = require('qrcode');
            qrCodeImage = await QRCode.toDataURL(currentQRCode, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
        } catch (error) {
            console.error('Error generating QR code image:', error);
        }
    }
    
    res.json({ 
        isConnected: botIsReady,
        ready: botIsReady,
        message: botIsReady ? '✅ Bot Ready' : '❌ Bot Not Ready',
        qrCode: qrCodeImage,
        timestamp: new Date().toISOString()
    });
});

// Send message endpoint
app.post('/api/bot-send-message', async (req, res) => {
    try {
        const { groupId, message } = req.body;
        
        console.log(`[BOT-SEND] Request received for group: ${groupId}`);
        
        if (!groupId || !message) {
            return res.status(400).json({ error: 'groupId and message are required' });
        }
        
        console.log(`[BOT-SEND] Bot ready status: ${botIsReady}`);
        
        if (!botIsReady) {
            console.log(`[BOT-SEND] Bot not ready - rejecting message`);
            return res.status(503).json({ error: 'Bot is not ready yet' });
        }
        
        console.log(`📨 [BOT-SEND] Blocked - Group messaging is disabled`);
        
        res.json({ success: false, error: 'Group messaging is disabled' });
        
    } catch (error) {
        console.error(`❌ [BOT-SEND] Error sending message:`, error.message);
        res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
});

// Get contact name endpoint
app.get('/api/get-contact-name/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!botIsReady) {
            return res.status(503).json({ error: 'Bot is not ready yet' });
        }
        
        try {
            const contact = await client.getContactById(userId);
            const userName = contact.pushname || contact.name || userId;
            res.json({ success: true, userName });
        } catch (error) {
            res.json({ success: false, userName: userId });
        }
        
    } catch (error) {
        console.error(`[GET-CONTACT-NAME] Error:`, error.message);
        res.status(500).json({ error: 'Failed to get contact name', details: error.message });
    }
});

// Send group status message endpoint
app.post('/api/send-group-message', async (req, res) => {
    try {
        const { groupId, message, type } = req.body;
        
        console.log(`[GROUP-MESSAGE] Sending ${type} message to group: ${groupId}`);
        
        if (!groupId || !message) {
            return res.status(400).json({ error: 'groupId and message are required' });
        }
        
        if (!botIsReady) {
            console.log('[GROUP-MESSAGE] ❌ Bot not ready');
            return res.status(503).json({ error: 'Bot is not ready yet' });
        }
        
        try {
            console.log(`[GROUP-MESSAGE] 🚫 Blocked - Group messaging is disabled`);
            res.json({ success: false, error: 'Group messaging is disabled' });
        } catch (error) {
            console.error(`[GROUP-MESSAGE] ❌ Failed to send:`, error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    } catch (error) {
        console.error('[GROUP-MESSAGE] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// 🛡️ Message statistics endpoint - for monitoring safety
app.get('/api/message-stats', (req, res) => {
    try {
        const stats = messageCounter.getStatus();
        res.json({
            success: true,
            stats: stats,
            botStatus: botIsReady ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[MESSAGE-STATS] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🛡️ Message statistics endpoint - for monitoring safety
app.get('/api/message-stats', (req, res) => {
    try {
        const stats = messageCounter.getStatus();
        res.json({
            success: true,
            stats: stats,
            botStatus: botIsReady ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[MESSAGE-STATS] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get profile photo endpoint
app.get('/api/bot-profile-photo/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!botIsReady) {
            return res.status(503).json({ success: false, photoUrl: null, error: 'Bot is not ready yet' });
        }
        
        try {
            const contact = await client.getContactById(userId);
            const photoUrl = await contact.getProfilePicUrl();
            
            if (photoUrl) {
                res.json({ success: true, photoUrl });
            } else {
                res.json({ success: false, photoUrl: null });
            }
        } catch (error) {
            console.log(`[PROFILE-PHOTO] Could not fetch photo for ${userId}:`, error.message);
            res.json({ success: false, photoUrl: null });
        }
        
    } catch (error) {
        console.error(`[PROFILE-PHOTO] Error:`, error.message);
        res.json({ success: false, photoUrl: null, error: error.message });
    }
});

const BOT_API_PORT = process.env.BOT_API_PORT || 3003;

// Create server with graceful shutdown
const server = app.listen(BOT_API_PORT, () => {
    console.log(`\n✅ 🔌 Bot API Server running on http://localhost:${BOT_API_PORT}`);
    console.log(`📨 Message endpoint: POST http://localhost:${BOT_API_PORT}/api/bot-send-message`);
    console.log(`🔍 Status endpoint: GET http://localhost:${BOT_API_PORT}/api/bot-status\n`);
});

// Allow port reuse and graceful shutdown
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${BOT_API_PORT} is already in use. Retrying in 3 seconds...`);
        setTimeout(() => {
            server.close();
            server.listen(BOT_API_PORT);
        }, 3000);
    }
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    cancelAllTimers();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    cancelAllTimers();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

console.log('🚀 WhatsApp Bot Starting...');
console.log('⏳ Waiting for QR code...\n');

// ⚡ Initialize client with retry logic
let initAttempts = 0;
const maxInitAttempts = 3;

async function initializeClient() {
    try {
        initAttempts++;
        console.log(`\n🔄 Initializing WhatsApp client (Attempt ${initAttempts}/${maxInitAttempts})...`);
        await client.initialize();
        console.log('✅ WhatsApp client initialized successfully');
    } catch (error) {
        console.error(`❌ Failed to initialize WhatsApp client: ${error.message}`);
        
        if (initAttempts < maxInitAttempts) {
            console.log(`⏳ Retrying in 5 seconds...`);
            setTimeout(initializeClient, 5000);
        } else {
            console.error('❌ Max initialization attempts reached. Please check your setup.');
            process.exit(1);
        }
    }
}

// Start initialization
initializeClient();
