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

// 🤖 Auto Admin Registration
const { autoRegisterAdmin, checkAndAutoRegisterAdmin } = require('./utils/auto-admin-register');

// Connect to Admin Panel Socket.IO server
const adminSocket = io('http://localhost:3000');

adminSocket.on('connect', () => {
    console.log('✅ Connected to Admin Panel');
});

adminSocket.on('disconnect', () => {
    console.log('❌ Disconnected from Admin Panel');
});

// Initialize database files
db.initializeDB();
db.initializePayments();
db.initializeUsers();

// Clean up invalid payment transactions on startup
db.initializeCleanup();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-sync',
            '--disable-translate',
            '--disable-default-apps',
            '--enable-automation',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-hang-monitor',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-component-extensions-with-background-pages',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--no-first-run',
            '--use-mock-keychain',
            '--metrics-recording-only',
            '--mute-audio'
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
    fs.writeFileSync('/root/diamond-bot/qr-code.txt', qr, 'utf8');
    console.log('✅ QR code saved to qr-code.txt');
    console.log('\n\n');
});

// Client ready
client.on('ready', () => {
    botIsReady = true; // Set flag when ready
    currentQRCode = null; // Clear QR code when connected
    console.log('✅ WhatsApp Bot Ready!');
    console.log('🤖 Bot is now listening for messages...\n');
    
    // Start periodic check for deleted messages (every 15 seconds)
    startDeletedMessageChecker(client);
    
    // Listen for admin panel messages
    adminSocket.on('sendGroupMessage', async (data) => {
        const { groupId, message } = data;
        try {
            await client.sendMessage(groupId, message);
            console.log(`✅ Sent rate update message to group ${groupId}`);
        } catch (error) {
            console.error(`❌ Failed to send message to group ${groupId}:`, error);
        }
    });
});

// Disconnection handler
client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp Bot Disconnected:', reason);
    botIsReady = false;
});

// Main message handler
client.on('message', async (msg) => {
    try {
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
                console.log('[DIAMOND] Contact info:', { pushname: contact.pushname, name: contact.name, notifyName: msg._data?.notifyName });
                userName = contact.pushname || contact.name || msg._data?.notifyName || fromUserId;
            } catch (contactErr) {
                console.log('[DIAMOND] Could not fetch contact, using fallback name');
                console.log('[DIAMOND] Available fields:', { notifyName: msg._data?.notifyName, author: msg.author });
                userName = msg._data?.notifyName || msg.author || fromUserId;
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

        
        // Admin approval: done, ok, do, dn, yes, অক, okey, ওকে (for diamond orders)
        const approvalKeywords = ['done', 'ok', 'do', 'dn', 'yes', 'অক', 'okey', 'ওকে'];
        if (approvalKeywords.includes(msg.body.toLowerCase().trim()) && isGroup) {
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
            
            console.log(`[APPROVAL DEBUG] Quoted user ID: ${quotedUserId}, Group: ${groupId}`);
            console.log(`[APPROVAL DEBUG] Pending requests:`, Object.keys(pendingDiamondRequests).length);
            
            // First check if it's a pending multi-line diamond request
            const pendingDiamond = findPendingDiamondByUser(quotedUserId, groupId);
            
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
                    console.log(`[APPROVED] Multi-line diamond order: ${approvalResult.diamonds}💎 from ${approvalResult.userIdFromMsg} (Message ${approveMessageEnabled ? 'sent' : 'silenced'})`);
                }
                return;
            } else {
                console.log(`[APPROVAL DEBUG] No pending diamond found for ${quotedUserId}`);
            }
            
            // Find and approve entry from database
            const groupData = db.getGroupData(groupId);
            
            // Check if groupData and entries exist
            if (!groupData || !groupData.entries || groupData.entries.length === 0) {
                console.log(`[APPROVAL] No entries found in group data for ${groupId}`);
                return;
            }
            
            const pendingEntry = groupData.entries.find(e => e.userId === quotedUserId && e.status === 'pending');
            
            if (pendingEntry) {
                db.approveEntry(groupId, pendingEntry.id);
                
                // Get name from quoted message
                let userName = quotedUserId;
                try {
                    if (msg.hasQuotedMsg) {
                        const quotedMsg = await msg.getQuotedMessage();
                        if (quotedMsg._data && quotedMsg._data.notifyName) {
                            userName = quotedMsg._data.notifyName;
                            console.log('[APPROVAL] Got name from notifyName:', userName);
                        } else {
                            // Try from group participants
                            const chat = await msg.getChat();
                            if (chat.isGroup) {
                                const participant = chat.participants.find(p => p.id._serialized === quotedUserId);
                                if (participant && participant.contact && participant.contact.pushname) {
                                    userName = participant.contact.pushname;
                                    console.log('[APPROVAL] Got name from participant:', userName);
                                }
                            }
                        }
                    }
                } catch (contactErr) {
                    console.log('[APPROVAL] Could not fetch name');
                }
                console.log('[APPROVAL] Final userName:', userName);
                
                const totalValue = pendingEntry.diamonds * pendingEntry.rate;
                
                const approvalMsg = `✅ *Diamond Order Approved*\n\n` +
                    `👤 User: ${userName}\n` +
                    `💎 Diamonds: ${pendingEntry.diamonds}💎\n` +
                    `💰 Amount Due: ৳${totalValue.toFixed(2)}\n` +
                    `📊 Rate: ৳${pendingEntry.rate.toFixed(2)}/💎\n\n` +
                    `✓ Status: Approved\n` +
                    `Order ID: ${pendingEntry.id}`;

                // Check if approve message is enabled
                const diamondStatus = require('./config/database').getDiamondStatus?.() || JSON.parse(require('fs').readFileSync(require('path').join(__dirname, './config/diamond-status.json'), 'utf8'));
                const approveMessageEnabled = diamondStatus.approveMessageEnabled !== false;
                
                if (approveMessageEnabled) {
                    await replyWithDelay(msg, approvalMsg);
                    messageCounter.incrementCounter();
                }
                console.log(`[APPROVED] Order ID ${pendingEntry.id}: ${pendingEntry.diamonds}💎 from ${userName} (Message ${approveMessageEnabled ? 'sent' : 'silenced'})`);
            } else {
                await replyWithDelay(msg, '❌ No pending diamond order found for this user.');
                messageCounter.incrementCounter();
            }
            
            return;
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
        // এই handler শুধুমাত্র ডায়মন্ড অর্ডার মেসেজ ডিলিট হওয়ার সময় কাজ করে
        // যখন ইউজার "Delete for Everyone" করে, তখন এই event ট্রিগার হয়
        
        console.log(`[DELETE EVENT] Message revoke detected! Message: "${before?.body}"`);
        
        if (!before) return; // কোন পূর্ববর্তী মেসেজ স্টেট না থাকলে রিটার্ন করো
        
        const messageBody = before.body?.trim() || '';
        const fromUserId = before.from;
        
        console.log(`[DELETE EVENT] Checking message - Body: "${messageBody}", From: ${fromUserId}`);
        
        // শুধুমাত্র ডায়মন্ড অর্ডার মেসেজ প্রসেস করো - আরো সহজ ম্যাচিং
        // যেকোনো সংখ্যা ধারণ করা মেসেজ (ডায়মন্ড অর্ডার হতে পারে)
        const numberMatch = messageBody.match(/\d+/);
        if (!numberMatch) {
            console.log(`[DELETE EVENT] Not a diamond order message, ignoring`);
            return;
        }
        
        // শুধুমাত্র গ্রুপ মেসেজ প্রসেস করো, ডিরেক্ট মেসেজ না
        if (!fromUserId || !fromUserId.includes('@g.us')) {
            console.log(`[DELETE EVENT] Not a group message, ignoring`);
            return;
        }
        
        const diamondAmount = parseInt(numberMatch[0]);
        console.log(`[DELETE EVENT] ✅ Processing delete - Amount: ${diamondAmount}💎, Group: ${fromUserId}`);
        
        // ডাটাবেস থেকে ম্যাচিং অর্ডার খুঁজে বের করে ডিলিট করো
        const database = db.loadDatabase();
        const groupData = database.groups[fromUserId];
        
        if (!groupData || !groupData.entries) {
            console.log(`[DELETE EVENT] Group not found in database`);
            return;
        }
        
        // সবচেয়ে সাম্প্রতিক pending order খুঁজো যা এই ইউজারের এবং ডায়মন্ড সংখ্যা ম্যাচ করে
        let deletedEntry = null;
        let deletedIndex = -1;
        
        for (let i = groupData.entries.length - 1; i >= 0; i--) {
            const entry = groupData.entries[i];
            
            // চেক: pending স্ট্যাটাস, একই ইউজার, এবং ডায়মন্ড সংখ্যা ম্যাচ করে
            if (entry.status === 'pending' && 
                entry.userId === fromUserId && 
                entry.diamonds === diamondAmount) {
                
                // Entry delete না করে শুধু status "deleted" করে দাও
                entry.status = 'deleted';
                entry.deletedAt = new Date().toISOString();
                entry.deletedBy = 'user';
                deletedEntry = entry;
                deletedIndex = i;
                console.log(`[DELETE EVENT] ✅ Order status changed to deleted: ${deletedEntry.diamonds}💎 from ${deletedEntry.userId}`);
                break;
            }
        }
        
        if (deletedEntry) {
            // আপডেটেড ডাটাবেস সেভ করো
            db.saveDatabase(database);
            console.log(`[DELETE EVENT] Database saved`);
            
            // Admin panel কে নোটিফিকেশন পাঠাও
            try {
                await fetch('http://localhost:3000/api/order-event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'order-deleted',
                        reason: 'user-delete',
                        groupId: fromUserId,
                        entry: deletedEntry,
                        message: `🗑️ অর্ডার ${deletedEntry.diamonds}💎 ইউজার ডিলিট করেছে`
                    })
                }).catch(e => console.log('[DELETE EVENT] Admin panel notification failed (offline)'));
            } catch (notifyError) {
                console.log('[DELETE EVENT] Admin panel কে নোটিফাই করতে পারছি না:', notifyError.message);
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
                
                // সব pending orders চেক করো
                for (let i = groupData.entries.length - 1; i >= 0; i--) {
                    const entry = groupData.entries[i];
                    
                    // pending status এর orders চেক করো
                    if (entry.status === 'pending' && entry.messageId) {
                        try {
                            // চেষ্টা করো মেসেজ খুঁজে বের করতে
                            const message = await client.getMessageById(entry.messageId);
                            
                            if (!message || !message.id) {
                                // মেসেজ আর নেই - ডিলিট হয়েছে
                                console.log(`[AUTO-CHECK] ✅ Detected deleted message: ${entry.diamonds}💎 from ${entry.userId}`);
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
                                console.log(`[AUTO-CHECK] ✅ Message not found - marking as deleted: ${entry.diamonds}💎`);
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

// Initialize client with error handling
try {
    console.log('✅ Client initialization started...');
    client.initialize().catch(err => {
        console.error('❌ Failed to initialize WhatsApp client:', err.message);
        console.error('Error details:', err);
        // Restart process after 5 seconds
        setTimeout(() => {
            console.log('Restarting bot...');
            process.exit(0); // Systemd will restart
        }, 5000);
    });
} catch (err) {
    console.error('❌ Error during client initialization:', err.message);
    console.error('Error details:', err);
    setTimeout(() => {
        process.exit(1);
    }, 5000);
}

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
        
        console.log(`📨 [BOT-SEND] Sending message to ${groupId}`);
        
        await client.sendMessage(groupId, message);
        
        console.log(`✅ [BOT-SEND] Message sent to ${groupId}`);
        res.json({ success: true, message: 'Message sent' });
        
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
            await client.sendMessage(groupId, message);
            console.log(`[GROUP-MESSAGE] ✅ Message sent to ${groupId}`);
            res.json({ success: true, message: 'Message sent successfully' });
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
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

console.log('🚀 WhatsApp Bot Starting...');
console.log('⏳ Waiting for QR code...\n');
