// 📅 Daily Date Rollover System - Automatically refresh date filters when midnight hits
// 🧪 TEST MODE: 1 minute = 1 day (for rapid testing)
let lastKnownDate = new Date().toDateString();
let dateCheckInterval = null;
let testModeEnabled = localStorage.getItem('testModeDateRollover') === 'true';
let secondsElapsed = 0;
let countdownActive = false;
let countdownDisplayInterval = null;
let nextUpdateTime = null;

// 🚀 DISABLE TEST MODE ON PAGE LOAD - PRODUCTION 24-HOUR MODE
if (testModeEnabled) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🔄 DISABLING TEST MODE - SWITCHING TO PRODUCTION 24-HOUR MODE');
    console.log('═══════════════════════════════════════════════════════════\n');
    localStorage.setItem('testModeDateRollover', 'false');
    testModeEnabled = false;
}

function initializeDailyRollover() {
    console.log(`[DATE ROLLOVER] 📅 System initialized for date: ${lastKnownDate}`);
    
    if (testModeEnabled) {
        console.log('[DATE ROLLOVER] 🧪 ⚠️  TEST MODE ACTIVE - 1 minute = 1 day');
        console.log('[DATE ROLLOVER] 🧪 Orders will move to Yesterday after 1 minute');
        console.log('[DATE ROLLOVER] 🧪 Type in console: toggleTestMode() to disable test mode');
        startCountdown();
    } else {
        console.log('[DATE ROLLOVER] ✨ PRODUCTION MODE - 24 HOUR CYCLE');
        console.log('[DATE ROLLOVER] ✨ Monitoring for date changes - orders will automatically transition from Today to Yesterday at midnight');
        startProductionMode();
        updateCountdownDisplay();
    }
}

// Test mode countdown - updates every second
function startCountdown() {
    if (countdownActive) return; // Prevent multiple intervals
    countdownActive = true;
    secondsElapsed = 0;
    
    console.log('\n⏱️  TEST MODE COUNTDOWN STARTED - WAIT 60 SECONDS\n');
    
    dateCheckInterval = setInterval(() => {
        secondsElapsed++;
        
        // Create visual progress bar
        const totalBars = 30;
        const filledBars = Math.floor((secondsElapsed / 60) * totalBars);
        const emptyBars = totalBars - filledBars;
        const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
        const percentage = Math.round((secondsElapsed / 60) * 100);
        
        // Clear previous line and show new countdown
        console.clear();
        console.log(`\n⏱️  TEST MODE COUNTDOWN\n`);
        console.log(`Progress: [${progressBar}] ${percentage}%`);
        console.log(`Time: ${secondsElapsed}s / 60s`);
        console.log(`\nWaiting for date transition...`);
        
        if (secondsElapsed >= 60) {
            clearInterval(dateCheckInterval);
            countdownActive = false;
            simulateDateChange();
        }
    }, 1000); // Update every 1 second
}

// Production mode - checks every 60 seconds
function startProductionMode() {
    if (dateCheckInterval) clearInterval(dateCheckInterval);
    if (countdownDisplayInterval) clearInterval(countdownDisplayInterval);
    
    // Calculate next midnight
    calculateNextMidnight();
    
    // Update countdown display every second
    countdownDisplayInterval = setInterval(updateCountdownDisplay, 1000);
    
    // Check for date change every 60 seconds
    dateCheckInterval = setInterval(() => {
        const currentDate = new Date().toDateString();
        if (currentDate !== lastKnownDate) {
            simulateDateChange();
        }
    }, 60000); // Check every 60 seconds
}

// Calculate next midnight
function calculateNextMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    nextUpdateTime = tomorrow;
}

// Update countdown display in navbar
function updateCountdownDisplay() {
    const countdownElement = document.getElementById('countdownText');
    if (!countdownElement) return;
    
    if (!nextUpdateTime) {
        calculateNextMidnight();
    }
    
    const now = new Date();
    const diff = nextUpdateTime - now;
    
    if (diff <= 0) {
        calculateNextMidnight();
        return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    let displayText = '';
    if (hours > 0) {
        displayText = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        displayText = `${minutes}m ${seconds}s`;
    } else {
        displayText = `${seconds}s`;
    }
    
    countdownElement.textContent = displayText;
    
    // Add warning color when close to midnight
    const countdownDisplay = document.getElementById('countdownDisplay');
    if (hours === 0 && minutes < 5) {
        countdownDisplay.style.color = '#f59e0b';
    } else if (hours === 0 && minutes === 0 && seconds < 30) {
        countdownDisplay.style.color = '#ef4444';
    } else {
        countdownDisplay.style.color = 'var(--text-secondary)';
    }
}

function simulateDateChange() {
    const previousDate = lastKnownDate;
    if (testModeEnabled) {
        // In test mode, increment date by 1 day
        const currentDate = new Date(lastKnownDate);
        currentDate.setDate(currentDate.getDate() + 1);
        lastKnownDate = currentDate.toDateString();
    } else {
        lastKnownDate = new Date().toDateString();
    }
    
    console.clear();
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                                                        ║');
    console.log('║              ✨ DATE CHANGE DETECTED! ✨               ║');
    console.log('║                                                        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`📅 Date transition: ${previousDate} → ${lastKnownDate}`);
    console.log('✨ "Today" orders have automatically moved to "Yesterday" view\n');
    console.log('[DATE CHANGE] 🔄 Refreshing all order displays with new date filters...\n');
    
    // Refresh all order displays WITHOUT full page reload
    try {
        // Refresh the Orders view
        if (typeof loadOrdersNew === 'function') {
            loadOrdersNew();
            console.log('[DATE CHANGE] ✅ Orders tab refreshed');
        }
        
        // Refresh All Orders view 
        if (typeof loadAllGroupOrders === 'function') {
            loadAllGroupOrders();
            console.log('[DATE CHANGE] ✅ All Orders tab refreshed');
        }
        
        // Refresh group details
        if (typeof loadGroupDetails === 'function') {
            const currentPeriod = document.querySelector('.tab-detail.active')?.getAttribute('onclick')?.match(/'(today|yesterday|weekly|monthly)'/)?.[1] || 'today';
            loadGroupDetails(currentPeriod);
            console.log('[DATE CHANGE] ✅ Group details refreshed');
        }
        
        console.log('\n✨ All displays updated successfully!\n');
        
        if (testModeEnabled) {
            showNotification('🧪 [TEST] 1 minute passed! Today\'s orders moved to Yesterday.', 'info');
            console.log('[DATE CHANGE] 🧪 Restarting countdown for next minute...\n');
            // Restart countdown for next test
            startCountdown();
        } else {
            showNotification('📅 Midnight! Today\'s orders moved to Yesterday. Displays updated.', 'info');
        }
    } catch (error) {
        console.error('[DATE CHANGE] Error refreshing displays:', error);
        showNotification('📅 Date changed - reloading for full sync...', 'info');
        setTimeout(() => location.reload(), 2000);
    }
}

// 🧪 Test Mode Toggle Function
function toggleTestMode() {
    testModeEnabled = !testModeEnabled;
    localStorage.setItem('testModeDateRollover', testModeEnabled);
    
    // Clear any existing interval
    if (dateCheckInterval) {
        clearInterval(dateCheckInterval);
        dateCheckInterval = null;
        countdownActive = false;
    }
    
    console.clear();
    
    if (testModeEnabled) {
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║                                                        ║');
        console.log('║             ✅ TEST MODE ENABLED! ✅                  ║');
        console.log('║                                                        ║');
        console.log('║              1 Minute = 1 Day                         ║');
        console.log('║                                                        ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
        console.log('📝 INSTRUCTIONS:\n');
        console.log('  1. Go to Orders tab');
        console.log('  2. Click "Today" filter');
        console.log('  3. You should see the 3 test orders');
        console.log('  4. Watch console below...');
        console.log('  5. After 60 seconds, orders will move to "Yesterday"\n');
        console.log('To disable: type toggleTestMode() again\n');
        
        showNotification('🧪 TEST MODE ENABLED - Countdown starts now!', 'info');
        startCountdown();
    } else {
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║                                                        ║');
        console.log('║          ❌ TEST MODE DISABLED ❌                     ║');
        console.log('║                                                        ║');
        console.log('║        Back to Production Mode                        ║');
        console.log('║        Waiting for actual midnight...                 ║');
        console.log('║                                                        ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
        
        showNotification('❌ TEST MODE DISABLED - Production mode active', 'info');
        startProductionMode();
    }
}

// Authentication Check
function checkAuthentication() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

// Show Notification Toast
function showNotification(message, type = 'info') {
    try {
        // Create notification container if doesn't exist
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(notificationContainer);
        }

        // Create notification element
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#43e97b' : type === 'error' ? '#f5576c' : '#4facfe';
        const textColor = '#fff';

        notification.style.cssText = `
            background: ${bgColor};
            color: ${textColor};
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-weight: 600;
            animation: slideIn 0.3s ease forwards;
            pointer-events: auto;
            max-width: 400px;
            word-wrap: break-word;
        `;

        notification.textContent = message;
        notificationContainer.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);

        console.log(`[NOTIFICATION] ${type.toUpperCase()}: ${message}`);
    } catch (error) {
        console.error('[NOTIFICATION ERROR]', error);
        // Fallback to alert if DOM not ready
        alert(message);
    }
}

// Add animation styles if not present
if (!document.getElementById('notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.innerHTML = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Logout Function
async function logout() {
    if (!confirm('আপনি কি সত্যিই লগআউট করতে চান?')) {
        return;
    }

    try {
        const token = localStorage.getItem('adminToken');
        
        // Call logout API
        await fetch('/api/admin/logout', {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        // Clear all stored data
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('rememberMe');
        sessionStorage.removeItem('adminLoggedIn');

        // Redirect to login
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
        // Force logout even if API call fails
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('rememberMe');
        sessionStorage.removeItem('adminLoggedIn');
        window.location.href = '/login';
    }
}

// Delete Order Function - EARLY DECLARATION
async function deleteOrder(orderId) {
    try {
        console.log(`[DELETE ORDER] Starting delete process for order: ${orderId}`);
        
        if (!confirm('🗑️ Are you sure you want to DELETE this order? This cannot be undone!')) {
            console.log('[DELETE ORDER] User cancelled delete');
            return;
        }

        console.log(`[DELETE ORDER] Sending DELETE request for order: ${orderId}`);
        
        const response = await fetch(`/api/orders/${orderId}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`[DELETE ORDER] Response status: ${response.status}`);
        const data = await response.json();
        console.log(`[DELETE ORDER] Response data:`, data);

        if (data.success) {
            console.log(`✅ Order ${orderId} marked as deleted`);
            showNotification(`✅ Order deleted successfully`, 'success');
            
            // Refresh orders immediately to show deleted status
            await loadOrdersNew();
        } else {
            console.error(`[DELETE ORDER] Error from server:`, data.error);
            showNotification(`❌ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('[DELETE ORDER] Exception:', error);
        showNotification(`❌ Error deleting order: ${error.message}`, 'error');
    }
}

// Restore a deleted order back to approved status
async function restoreOrder(orderId) {
    try {
        console.log(`[RESTORE ORDER] Starting restore process for order: ${orderId}`);
        
        if (!confirm('♻️ Are you sure you want to RESTORE this order? It will be marked as approved again.')) {
            console.log('[RESTORE ORDER] User cancelled restore');
            return;
        }

        console.log(`[RESTORE ORDER] Sending RESTORE request for order: ${orderId}`);
        
        const response = await fetch(`/api/orders/${orderId}/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`[RESTORE ORDER] Response status: ${response.status}`);
        const data = await response.json();
        console.log(`[RESTORE ORDER] Response data:`, data);

        if (data.success) {
            console.log(`✅ Order ${orderId} restored to approved status`);
            showNotification(`✅ Order restored successfully`, 'success');
            
            // Refresh orders immediately to show restored status
            await loadOrdersNew();
        } else {
            console.error(`[RESTORE ORDER] Error from server:`, data.error);
            showNotification(`❌ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('[RESTORE ORDER] Exception:', error);
        showNotification(`❌ Error restoring order: ${error.message}`, 'error');
    }
}

// Socket.IO Connection with Auto-Reconnect & Heartbeat
const socket = io({
    reconnection: true,
    reconnectionDelay: 1000,        // Start with 1 second
    reconnectionDelayMax: 5000,     // Max 5 seconds
    reconnectionAttempts: Infinity, // Try forever
    transports: ['websocket', 'polling'],  // Try websocket first, fallback to polling
    upgrade: true,                   // Allow upgrade from polling to websocket
    pingInterval: 15000,             // Send ping every 15 seconds (match server)
    pingTimeout: 30000,              // Wait 30 seconds for pong (match server)
    rememberUpgrade: true,           // Remember transport preference
    path: '/socket.io',              // Standard Socket.IO path
    forceNew: false,                 // Reuse existing connection
    autoConnect: true                // Auto connect on creation
});

// Global State
let currentLang = 'bn';
let currentTheme = localStorage.getItem('theme') || 'dark';
let allGroups = [];
let allTransactions = [];
let allOrders = [];
let allUsers = [];
let diamondStatus = { systemStatus: 'on', globalMessage: '', groupSettings: {} };
let analyticsChart = null;
let expandedGroups = new Set(); // Track expanded groups
let isInputFocused = false; // Track if user is typing
let selectedGroups = new Set(); // Track selected checkboxes
let groupsMarkedForDueReminder = new Set(); // Track groups marked for due reminders
let processingTimeMinutes = parseInt(localStorage.getItem('processingTimeMinutes') || '2'); // Processing time in minutes (default 2)

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (!checkAuthentication()) {
        return;
    }

    initTheme();
    initLanguage();
    initSocketListeners();
    loadDashboardData();
    
    // Load initial data
    refreshData();

    // Initialize daily date rollover system
    initializeDailyRollover();

    // Restore previous view if saved
    const savedView = localStorage.getItem('currentView');
    if (savedView && document.getElementById(savedView)) {
        // Simulate click on the corresponding nav item
        const navItem = document.querySelector(`.nav-item[onclick*="${savedView}"]`);
        if (navItem) {
            navItem.click();
        }
    }
    
    // Initialize global input focus tracking with event delegation
    initGlobalInputTracking();
});

// Cleanup function to clear intervals on page unload
window.addEventListener('beforeunload', () => {
    if (dateCheckInterval) clearInterval(dateCheckInterval);
    if (ordersPollingInterval) clearInterval(ordersPollingInterval);
    console.log('[CLEANUP] ✅ All intervals cleared');
});

// Global Input Focus Tracking (Event Delegation - persists across page reloads)
function initGlobalInputTracking() {
    // Use event delegation on document level for focus/blur
    document.addEventListener('focus', (e) => {
        if (e.target.matches('.rate-input, .due-limit-input')) {
            isInputFocused = true;
            console.log('✏️ Input focused - auto-refresh paused');
        }
    }, true); // Use capture phase to catch all focus events
    
    document.addEventListener('blur', (e) => {
        if (e.target.matches('.rate-input, .due-limit-input')) {
            isInputFocused = false;
            console.log('✏️ Input blurred - auto-refresh resumed');
        }
    }, true); // Use capture phase
}

// Theme Management
function initTheme() {
    if (currentTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.setAttribute('data-theme', 'light');
        document.querySelector('#themeToggle i').className = 'fas fa-sun';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.removeAttribute('data-theme');
        document.querySelector('#themeToggle i').className = 'fas fa-moon';
    }
}

document.getElementById('themeToggle').addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
    
    if (currentTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.setAttribute('data-theme', 'light');
        document.querySelector('#themeToggle i').className = 'fas fa-sun';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.removeAttribute('data-theme');
        document.querySelector('#themeToggle i').className = 'fas fa-moon';
    }
});

// Language Translations
const translations = {
    bn: {
        // Navigation & Main
        'dashboard': 'ড্যাশবোর্ড',
        'groups': 'গ্রুপ',
        'orders': 'অর্ডার',
        'users': 'ব্যবহারকারী',
        'settings': 'সেটিংস',
        'logout': 'লগআউট',
        'home': 'হোম',
        'allOrders': 'সমস্ত অর্ডার',
        
        // Buttons
        'add': 'যোগ করুন',
        'edit': 'সম্পাদনা করুন',
        'delete': 'মুছুন',
        'save': 'সংরক্ষণ করুন',
        'cancel': 'বাতিল করুন',
        'approve': 'অনুমোদন করুন',
        'reject': 'প্রত্যাখ্যান করুন',
        'restore': 'পুনরুদ্ধার করুন',
        'permanent': 'চিরস্থায়ী',
        'refresh': 'রিফ্রেশ করুন',
        
        // Status
        'pending': 'অপেক্ষমাণ',
        'processing': 'প্রক্রিয়াকরণ',
        'approved': 'অনুমোদিত',
        'rejected': 'প্রত্যাখ্যাত',
        'deleted': '❌ মুছে ফেলা হয়েছে',
        
        // Labels
        'phone': 'ফোন',
        'name': 'নাম',
        'user': 'ব্যবহারকারী',
        'group': 'গ্রুপ',
        'orderId': 'অর্ডার আইডি',
        'diamonds': 'হীরা',
        'amount': 'পরিমাণ',
        'status': 'অবস্থা',
        'date': 'তারিখ',
        'time': 'সময়',
        'actions': 'পদক্ষেপ',
        'search': 'অনুসন্ধান করুন',
        'itemsPerPage': 'প্রতি পৃষ্ঠায় আইটেম',
        'all': 'সব',
        
        // Messages
        'noData': 'কোনো ডেটা পাওয়া যায়নি',
        'loading': 'লোড হচ্ছে...',
        'success': 'সফল',
        'error': 'ত্রুটি',
        'confirm': 'নিশ্চিত করুন',
        'areYouSure': 'আপনি কি নিশ্চিত?',
    },
    en: {
        // Navigation & Main
        'dashboard': 'Dashboard',
        'groups': 'Groups',
        'orders': 'Orders',
        'users': 'Users',
        'settings': 'Settings',
        'logout': 'Logout',
        'home': 'Home',
        'allOrders': 'All Orders',
        
        // Buttons
        'add': 'Add',
        'edit': 'Edit',
        'delete': 'Delete',
        'save': 'Save',
        'cancel': 'Cancel',
        'approve': 'Approve',
        'reject': 'Reject',
        'restore': 'Restore',
        'permanent': 'Permanent',
        'refresh': 'Refresh',
        
        // Status
        'pending': 'Pending',
        'processing': 'Processing',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'deleted': '❌ DELETED',
        
        // Labels
        'phone': 'Phone',
        'name': 'Name',
        'user': 'User',
        'group': 'Group',
        'orderId': 'Order ID',
        'diamonds': 'Diamonds',
        'amount': 'Amount',
        'status': 'Status',
        'date': 'Date',
        'time': 'Time',
        'actions': 'Actions',
        'search': 'Search',
        'itemsPerPage': 'Items per page',
        'all': 'All',
        
        // Messages
        'noData': 'No data found',
        'loading': 'Loading...',
        'success': 'Success',
        'error': 'Error',
        'confirm': 'Confirm',
        'areYouSure': 'Are you sure?',
    }
};

// Function to get translated text
function t(key) {
    return translations[currentLang]?.[key] || key;
}

// Function to update page language
function updatePageLanguage() {
    // Update HTML lang attribute
    document.documentElement.lang = currentLang;
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });
    
    // Update all elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
    
    // Update common UI elements by ID
    const uiMappings = {
        'homeView': { selector: 'h1', key: 'home' },
        'allOrdersView': { selector: 'h1', key: 'allOrders' },
    };
    
    // Save to localStorage
    localStorage.setItem('language', currentLang);
    
    // Dispatch custom event for components to listen
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: currentLang } }));
}

// Initialize language from localStorage
function initLanguage() {
    const savedLang = localStorage.getItem('language');
    if (savedLang && (savedLang === 'bn' || savedLang === 'en')) {
        currentLang = savedLang;
    }
    updatePageLanguage();
}

// Language Toggle
document.getElementById('langToggle').addEventListener('click', () => {
    currentLang = currentLang === 'bn' ? 'en' : 'bn';
    updatePageLanguage();
    showToast(currentLang === 'bn' ? '🇧🇩 বাংলা' : '🇬🇧 English', 'success');
});

// Socket.IO Listeners
function initSocketListeners() {
    socket.on('connect', () => {
        console.log('✅ Connected to server (Socket ID: ' + socket.id + ')');
        showToast('✅ Admin panel connected', 'success');
        
        // Sync pending orders on reconnect
        syncPendingOrdersOnReconnect();
        
        // Clear any disconnect warnings
        hideConnectionWarning();
    });

    socket.on('disconnect', (reason) => {
        console.warn('❌ Disconnected from server. Reason:', reason);
        showToast('❌ Admin panel disconnected - reconnecting...', 'warning');
        showConnectionWarning('সংযোগ হারিয়েছি, পুনরায় সংযোগ করছি...');
    });

    socket.on('connect_error', (error) => {
        console.warn('⚠️ Connection error:', error);
        // Show warning but don't block UI
        if (error.message) {
            console.log(`[SOCKET ERROR] ${error.message}`);
        }
    });

    socket.on('error', (error) => {
        console.error('🔴 Socket error:', error);
        showConnectionWarning('সংযোগ সমস্যা। দয়া করে পৃষ্ঠা রিফ্রেশ করুন।');
    });

    socket.on('reconnect_attempt', () => {
        console.log('🔄 Attempting to reconnect...');
        hideConnectionWarning();
    });

    socket.on('reconnect', () => {
        console.log('✅ Reconnected successfully!');
        showToast('✅ পুনরায় সংযুক্ত হয়েছি', 'success');
        hideConnectionWarning();
        syncPendingOrdersOnReconnect();
    });

    socket.on('dataUpdated', () => {
        console.log('Data updated event received (refresh disabled for Groups page)');
        playNotificationSound(); // Play sound when data is updated (new order)
        
        // DISABLED: Don't reload page - prevents scroll jump on Groups view
        // Real-time order updates handled via orderStatusUpdated, newOrderCreated, orderDeleted events instead
    });

    socket.on('groupsUpdated', (data) => {
        console.log('✅ New group started:', data);
        showToast(`🎉 নতুন গ্রুপ শুরু হয়েছে: ${data.newGroup.groupName}`, 'success');
        
        // Reload groups list
        setTimeout(() => {
            loadGroups();
            console.log('✅ Groups list refreshed');
        }, 1000);
    });

    socket.on('groupRateUpdated', (data) => {
        console.log(`Group ${data.groupId} rate updated to ${data.rate}`);
        // DISABLED: Don't reload groups on rate update - prevents page jump
        // Users will see updated rate when they manually refresh
    });

    socket.on('bulkRateUpdated', (data) => {
        console.log(`${data.count} groups updated to rate ${data.rate}`);
        // DISABLED: Don't reload groups on bulk update - prevents page jump
        // Users will see updated rates when they manually refresh
    });

    socket.on('depositApproved', (data) => {
        console.log(`Deposit approved: ৳${data.amount}`);
        loadPendingDeposits();
        loadStats();
    });

    socket.on('depositRejected', () => {
        console.log('Deposit rejected');
        loadPendingDeposits();
    });

    socket.on('userStatusChanged', (data) => {
        const status = data.blocked ? 'blocked' : 'unblocked';
        console.log(`User ${status}`);
    });

    socket.on('userUpdated', (data) => {
        console.log(`User ${data.phone} updated: balance=${data.balance}, dueBalance=${data.dueBalance}`);
        // DISABLED: Don't reload groups on user update - prevents page jump
        // Stats will update via loadStats() if needed
        loadStats(); // Only update stats, not full groups reload
        // Also refresh the user list if modal is open
        const modalContainer = document.getElementById('modalContainer');
        if (modalContainer && modalContainer.innerHTML.includes('User')) {
            loadUsers(); // This will refresh the user list
        }
    });

    socket.on('autoDeductionLogged', (data) => {
        console.log(`Auto-deduction logged: ৳${data.amount} for ${data.groupName}`);
        loadLastAutoDeduction();
    });

    socket.on('autoDeductionCleared', () => {
        console.log('Auto-deductions cleared');
        loadLastAutoDeduction();
    });

    // ⚡ REAL-TIME ORDER UPDATES - Advanced System
    // NOTE: This is DEPRECATED - Use specific orderStatusUpdated, newOrderCreated, orderDeleted events instead
    socket.on('orderEvent', (data) => {
        console.log(`[ORDER EVENT - DEPRECATED] 🔔 Received:`, data);
        // Don't refresh - let specific event handlers take over
        // Just show notification if provided
        if (data.message) {
            showToast(data.message, 'info');
            console.log(`[ORDER EVENT] 📢 ${data.message}`);
        }
    });

    // 🔄 REAL-TIME ORDER STATUS UPDATE - Direct socket event
    socket.on('orderStatusUpdated', (data) => {
        console.log(`[REAL-TIME UPDATE] 🔄 Order status changed:`, data);
        if (data.orderId && data.status) {
            // Instantly update the order in memory and UI without full page refresh
            updateOrderStatusRealTime(data.orderId, data.status, data);
            
            // Show subtle notification
            if (data.message) {
                showToast(data.message, 'info');
            }
        }
    });

    socket.on('orderPermanentlyDeleted', (data) => {
        console.log(`[REAL-TIME UPDATE] 🗑️ Order permanently deleted:`, data);
        showNotification(`⚠️ Order ${data.order.userName} (${data.order.diamonds}💎) permanently deleted`, 'warning');
        // Don't call loadOrdersNew() - the polling will handle it
        // loadOrdersNew(); // Removed to prevent excessive reloads
    });

    // 📊 NEW ORDER CREATED - Real-time add to table
    socket.on('newOrderCreated', (data) => {
        console.log(`[NEW ORDER] ✨ New order created:`, data);
        if (data.order) {
            addNewOrderToTable(data.order);
            playNotificationSound();
            showToast(`🎯 New order from ${data.order.phone}`, 'success');
            
            // 🔔 Update notification badge in real-time
            updateNotificationBadge();
        }
    });

    // 🗑️ ORDER DELETED - Real-time removal from table
    socket.on('orderDeleted', (data) => {
        console.log(`[DELETE ORDER] 🗑️ Order deleted:`, data);
        if (data.orderId) {
            removeOrderFromTable(data.orderId);
            showToast(data.message || 'Order deleted', 'warning');
        }
    });

    // ✅ ORDER APPROVED - Real-time status change with highlight
    socket.on('orderApproved', (data) => {
        console.log(`[APPROVE ORDER] ✅ Order approved:`, data);
        if (data.orderId) {
            updateOrderStatusRealTime(data.orderId, 'approved', data);
            highlightOrderRow(data.orderId, 'success');
            showToast(data.message || 'Order approved', 'success');
            
            // 🔔 Update notification badge when order is approved
            updateNotificationBadge();
        }
    });
    
    // ✅ NEW: Missing Orders Recovered Event
    socket.on('missingOrdersRecovered', (data) => {
        console.log(`[MISSING ORDERS RECOVERED] ✨ Recovered ${data.recoveredCount} orders:`, data);
        
        if (data.recoveredCount > 0) {
            showNotification(`✨ ${data.recoveredCount} missing order(s) recovered!`, 'success');
            
            data.orders.forEach(order => {
                console.log(`  ✅ Order ${order.id}: ${order.userName} (${order.diamonds}💎)`);
            });
            
            // Reload orders to show the recovered ones
            loadOrdersNew();
        }
    });
}

// 🔄 Sync Pending Orders on Reconnect
async function syncPendingOrdersOnReconnect() {
    try {
        console.log('[RECONNECT SYNC] 🔄 Fetching pending orders from server...');
        
        // Fetch stats which includes pendingOrders list
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        if (stats.pendingOrders && Array.isArray(stats.pendingOrders) && stats.pendingOrders.length > 0) {
            console.log(`[RECONNECT SYNC] ✅ Found ${stats.pendingOrders.length} pending orders, syncing...`);
            
            let syncedCount = 0;
            
            // Add each pending order to the orders table if not already there
            stats.pendingOrders.forEach(order => {
                const orderId = order.id || order.orderId;
                
                // Check if order already exists in allOrders array
                const orderExists = allOrders.some(o => o.id === orderId);
                
                // Only add if not already in the system
                if (!orderExists) {
                    // Ensure order has proper structure
                    const orderWithStatus = {
                        ...order,
                        status: order.status || 'pending',
                        date: order.createdAt
                    };
                    
                    addNewOrderToTable(orderWithStatus);
                    syncedCount++;
                    console.log(`[RECONNECT SYNC] ➕ Added pending order: ${orderId}`);
                }
            });
            
            // Update stats and badges
            updateNotificationBadge();
            loadStats();
            
            if (syncedCount > 0) {
                showToast(`🔄 Synced ${syncedCount} pending orders`, 'info');
            }
        } else {
            console.log('[RECONNECT SYNC] ✅ No pending orders to sync');
        }
    } catch (error) {
        console.error('[RECONNECT SYNC] ❌ Error syncing pending orders:', error);
    }
}

// View Navigation
function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Show selected view
    document.getElementById(viewId).classList.add('active');

    // Update bottom nav - only if event exists (called from click)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Only update nav item if we have an event (click-triggered)
    if (typeof event !== 'undefined' && event && event.target) {
        const navItem = event.target.closest('.nav-item');
        if (navItem) {
            navItem.classList.add('active');
        }
    } else {
        // If called programmatically, find and activate matching nav item
        const navItems = {
            'homeView': 'nav-home',
            'dashboardView': 'nav-dashboard',
            'groupsView': 'nav-groups',
            'ordersView': 'nav-orders',
            'allOrdersView': 'nav-all-orders',
            'offlineOrdersView': 'nav-offline-orders',
            'transactionsView': 'nav-transactions'
        };
        
        if (navItems[viewId]) {
            const navItem = document.querySelector(`[data-nav="${navItems[viewId]}"]`);
            if (navItem) navItem.classList.add('active');
        }
    }

    // Save current view to localStorage
    localStorage.setItem('currentView', viewId);

    // Load data for specific view
    if (viewId === 'groupsView') {
        loadGroups();
    } else if (viewId === 'transactionsView') {
        loadPendingDeposits();
        loadTransactions();
        loadOrders();
    } else if (viewId === 'ordersView') {
        enableOrdersPolling(); // Start real-time polling
    } else if (viewId === 'offlineOrdersView') {
        loadOfflineOrders(); // Load all offline orders
    } else if (viewId === 'allOrdersView') {
        loadAllGroupOrders(); // Load all orders from all groups
    }
}
// Refresh All Data
async function refreshData() {
    try {
        await Promise.all([
            loadStats(),
            loadGroups(),
            loadTransactions(),
            loadPendingDeposits(),
            loadOrders(),
            loadAnalytics(),
            loadUsers(),
            loadLastAutoDeduction(),
            loadDiamondStatus()
        ]);
        showToast('Data updated successfully', 'success');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Error loading data', 'error');
    }
}

// Silent Refresh (no toast notification)
// DISABLED for Orders page - only Socket.io events trigger updates
async function silentRefreshData() {
    try {
        // Check if we're on Orders page - skip refresh if so
        const ordersView = document.getElementById('ordersView');
        const isOrdersPageActive = ordersView && ordersView.classList.contains('active');
        
        // Don't refresh if on Orders page (it uses Socket.io events only)
        if (isOrdersPageActive) {
            console.log('[SILENT REFRESH] Orders page active - skipping auto refresh');
            return;
        }
        
        await Promise.all([
            loadStats(),
            loadGroups(),
            loadTransactions(),
            loadPendingDeposits(),
            loadOrders(),
            loadOrdersNew(),
            loadAnalytics(),
            loadUsers(),
            loadLastAutoDeduction(),
            loadDiamondStatus()
        ]);
        console.log('Data refreshed silently');
    } catch (error) {
        console.error('Error refreshing data:', error);
    }
}

// Diamond Request System Functions
async function loadDiamondStatus() {
    try {
        const response = await fetch('/api/diamond-status');
        diamondStatus = await response.json();
        updateDiamondStatusUI();
        updateGroupMessagesList();
    } catch (error) {
        console.error('Error loading diamond status:', error);
    }
}

function refreshDiamondStatus() {
    loadDiamondStatus();
    showToast('Diamond status updated', 'success');
}

async function toggleDiamondSystem() {
    try {
        // Show PIN input modal
        const pin = prompt('Enter PIN:');
        if (pin === null) return; // User cancelled
        
        const newStatus = diamondStatus.systemStatus === 'on' ? 'off' : 'on';
        const response = await fetch('/api/diamond-status/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemStatus: newStatus, pin: pin })
        });
        
        if (response.ok) {
            await loadDiamondStatus();
            const statusText = newStatus === 'on' ? '✅ TURNED ON' : '❌ TURNED OFF';
            showToast(`Diamond request system ${statusText}. Message sent to all groups!`, 'success');
        } else {
            const errorData = await response.json();
            showToast(errorData.message || 'Failed to toggle system', 'error');
        }
    } catch (error) {
        console.error('Error toggling system:', error);
        showToast('Failed to toggle system', 'error');
    }
}

function updateDiamondStatusUI() {
    const statusBadge = document.getElementById('statusBadge');
    const statusMessage = document.getElementById('globalMessage');
    const stockAmount = document.getElementById('stockAmount');
    const diamondStatusCard = document.getElementById('diamondStatusCard');
    
    if (statusBadge && statusMessage) {
        const isOn = diamondStatus.systemStatus === 'on';
        statusBadge.innerHTML = `<i class="fas fa-${isOn ? 'check-circle' : 'times-circle'}"></i> ${isOn ? 'ON' : 'OFF'}`;
        statusBadge.className = isOn ? 'status-badge' : 'status-badge off';
        statusMessage.textContent = diamondStatus.globalMessage || 'No message set';
    }
    
    if (stockAmount) {
        stockAmount.textContent = (diamondStatus.adminDiamondStock || 0).toLocaleString();
    }
}

function updateGroupMessagesList() {
    const groupsList = document.getElementById('groupMessagesList');
    if (!groupsList) return;
    
    if (allGroups.length === 0) {
        groupsList.innerHTML = '<div class="loading-placeholder"><i class="fas fa-info-circle"></i> No groups available</div>';
        return;
    }
    
    groupsList.innerHTML = allGroups.map(group => {
        const groupId = group.id || group.groupId;
        const groupName = group.name || group.groupName || 'Unknown';
        const groupSettings = diamondStatus.groupSettings && diamondStatus.groupSettings[groupId] ? diamondStatus.groupSettings[groupId] : {};
        const message = groupSettings.message || 'Use global message';
        
        return `
            <div class="group-message-item">
                <div class="group-message-info">
                    <p class="group-message-name">${groupName}</p>
                    <p class="group-message-text">${message}</p>
                </div>
                <div class="group-message-actions">
                    <button class="btn-group-edit" onclick="showEditGroupMessageModal('${groupId}', '${groupName}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function showEditGlobalMessageModal() {
    const modalHTML = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Edit Message</h2>
                    <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="form-group">
                    <label>System Message (when ON):</label>
                    <textarea class="form-input" id="globalMessageInput" style="resize: vertical; min-height: 100px; padding: 12px;" placeholder="Enter message...">${diamondStatus.globalMessage}</textarea>
                </div>
                
                <div class="button-group">
                    <button class="btn-save" onclick="saveGlobalMessage()">
                        <i class="fas fa-save"></i> Save
                    </button>
                    <button class="btn-cancel" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modalHTML;
}

function showEditStockModal() {
    const modalHTML = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-gem"></i> Set Diamond Stock</h2>
                    <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="form-group">
                    <label>💎 Total Diamond Stock:</label>
                    <input type="number" class="form-input" id="stockInput" value="${diamondStatus.adminDiamondStock || 10000}" placeholder="Stock amount">
                </div>
                
                <div class="form-group" style="background: rgba(67, 233, 123, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #43e97b;">
                    <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> When stock runs out, the system will automatically turn off and send messages to all groups.
                    </p>
                </div>
                
                <div class="button-group">
                    <button class="btn-save" onclick="saveStock()">
                        <i class="fas fa-save"></i> Save
                    </button>
                    <button class="btn-cancel" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modalHTML;
}

async function saveGlobalMessage() {
    try {
        const message = document.getElementById('globalMessageInput').value;
        
        if (!message.trim()) {
            showToast('Please enter a message', 'warning');
            return;
        }

        const response = await fetch('/api/diamond-status/global-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ globalMessage: message })
        });
        
        if (response.ok) {
            await loadDiamondStatus();
            closeModal();
            showToast('Message saved and sent to all groups', 'success');
        } else {
            showToast('Failed to save message', 'error');
        }
    } catch (error) {
        console.error('Error saving message:', error);
        showToast('Failed to save message', 'error');
    }
}

async function saveStock() {
    try {
        const stock = parseInt(document.getElementById('stockInput').value);
        
        if (isNaN(stock) || stock < 0) {
            showToast('Please enter a valid number', 'warning');
            return;
        }

        const response = await fetch('/api/diamond-status/set-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminDiamondStock: stock })
        });
        
        if (response.ok) {
            await loadDiamondStatus();
            closeModal();
            showToast(`Stock saved: ${stock.toLocaleString()} 💎`, 'success');
        } else {
            showToast('Failed to save stock', 'error');
        }
    } catch (error) {
        console.error('Error saving stock:', error);
        showToast('Failed to save stock', 'error');
    }
}

function showEditGroupMessageModal(groupId, groupName) {
    if (!groupId || groupId === 'undefined') {
        showToast('Invalid group ID', 'error');
        return;
    }
    
    const groupSettings = diamondStatus.groupSettings && diamondStatus.groupSettings[groupId] ? diamondStatus.groupSettings[groupId] : {};
    const message = groupSettings.message || '';
    
    const modalHTML = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Edit Group Message</h2>
                    <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="form-group">
                    <label>Group: <strong>${groupName}</strong></label>
                </div>
                
                <div class="form-group">
                    <label>Custom Message (leave empty to use global message):</label>
                    <textarea class="form-input" id="groupMessageInput" style="resize: vertical; min-height: 100px; padding: 12px;" placeholder="Enter custom message for this group...">${message}</textarea>
                </div>
                
                <div class="button-group">
                    <button class="btn-save" onclick="saveGroupMessage('${groupId}')">
                        <i class="fas fa-save"></i> Save
                    </button>
                    <button class="btn-cancel" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modalHTML;
}

async function saveGroupMessage(groupId) {
    try {
        if (!groupId || groupId === 'undefined') {
            showToast('Invalid group ID', 'error');
            return;
        }
        
        const message = document.getElementById('groupMessageInput').value;
        
        const response = await fetch('/api/diamond-status/group-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId, message })
        });
        
        if (response.ok) {
            // Send message to group via bot API
            try {
                await fetch('/api/send-message-to-group', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ groupId, message })
                });
                console.log('✅ Message sent to group');
            } catch (err) {
                console.error('❌ Failed to send message to group:', err);
            }
            
            await loadDiamondStatus();
            closeModal();
            showToast('Group message updated and sent', 'success');
        } else {
            showToast('Failed to save group message', 'error');
        }
    } catch (error) {
        console.error('Error saving group message:', error);
        showToast('Failed to save group message', 'error');
    }
}

// Load Dashboard Stats
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();

        // Update elements only if value changed (prevents DOM thrashing)
        const updateElement = (elementId, value) => {
            const el = document.getElementById(elementId);
            if (el && el.textContent !== value.toString()) {
                el.textContent = value;
            }
        };

        updateElement('totalUsers', stats.totalUsers);
        updateElement('totalDeposits', `৳${stats.totalDeposits.toLocaleString()}`);
        updateElement('fixedDeposits', `৳${stats.fixedDeposits.toLocaleString()}`);
        updateElement('pendingDiamonds', stats.pendingDiamonds.toLocaleString());
        updateElement('pendingAmount', `৳${Math.round(stats.pendingAmount).toLocaleString()}`);
        updateElement('totalOrders', stats.totalOrders);
        updateElement('totalDueBalance', `৳${(stats.totalDue || 0).toLocaleString()}`);
        updateElement('quickPendingCount', stats.pendingDiamonds > 0 ? stats.pendingDiamonds : '0');
        
        // Update Pending Orders Count Card
        const pendingCountEl = document.getElementById('pendingOrdersCount');
        if (pendingCountEl) {
            const newCount = (stats.pendingOrderCount || 0).toString();
            if (pendingCountEl.textContent !== newCount) {
                pendingCountEl.textContent = newCount;
            }
            
            const pendingTimeEl = document.getElementById('pendingOrdersCountTime');
            if (pendingTimeEl) {
                const now = new Date();
                pendingTimeEl.textContent = `Updated: ${now.toLocaleTimeString()}`;
            }
        }

        // Update notification badge
        updateElement('notifBadge', stats.pendingDiamonds > 0 ? stats.pendingDiamonds : '0');
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// 🔔 Update notification badge in real-time
async function updateNotificationBadge() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        const badge = document.getElementById('notifBadge');
        if (badge) {
            const newCount = stats.pendingDiamonds > 0 ? stats.pendingDiamonds : '0';
            const oldCount = badge.textContent;
            
            // Update count
            badge.textContent = newCount;
            
            // Animate badge if count changed
            if (oldCount !== newCount) {
                // Remove existing pulse animation
                badge.classList.remove('pulse');
                
                // Trigger reflow to restart animation
                void badge.offsetWidth;
                
                // Add pulse animation
                badge.classList.add('pulse');
                
                // Remove pulse class after animation completes
                setTimeout(() => {
                    badge.classList.remove('pulse');
                }, 600);
            }
            
            console.log(`[BADGE UPDATE] 🔔 Notification count: ${oldCount} → ${newCount}`);
        }
        
        // 🆕 Update Pending Orders Count Card
        const pendingCountEl = document.getElementById('pendingOrdersCount');
        const pendingTimeEl = document.getElementById('pendingOrdersCountTime');
        if (pendingCountEl) {
            const newPendingCount = stats.pendingOrderCount || 0;
            const oldPendingCount = pendingCountEl.textContent;
            
            // Only update if changed to avoid unnecessary DOM updates
            if (oldPendingCount !== newPendingCount.toString()) {
                pendingCountEl.textContent = newPendingCount;
                
                // Animate the number change
                pendingCountEl.style.opacity = '0.5';
                setTimeout(() => {
                    pendingCountEl.style.opacity = '1';
                }, 150);
            }
            
            if (pendingTimeEl) {
                const now = new Date();
                pendingTimeEl.textContent = `Updated: ${now.toLocaleTimeString()}`;
            }
        }
    } catch (error) {
        console.error('Error updating notification badge:', error);
    }
}

// Load Last Auto-Deduction
async function loadLastAutoDeduction() {
    try {
        const response = await fetch('/api/auto-deductions');
        const deductions = await response.json();
        const container = document.getElementById('autoDeductList');

        // If deductions array is empty, try to get from transactions instead
        if (!Array.isArray(deductions) || deductions.length === 0) {
            // Try to fetch auto-deductions from transactions
            try {
                const txResponse = await fetch('/api/transactions');
                const allTransactions = await txResponse.json();
                
                // Filter for auto-deductions from transactions
                const autoDeductions = allTransactions.filter(t => 
                    t && (t.type === 'auto' || t.type === 'auto-deduction')
                );
                
                if (Array.isArray(autoDeductions) && autoDeductions.length > 0) {
                    // Sort by newest first and get only the last one
                    const sorted = [...autoDeductions].sort((a, b) => 
                        new Date(b.date || b.createdAt || b.timestamp) - new Date(a.date || a.createdAt || a.timestamp)
                    );
                    
                    const lastDeduction = sorted[0];
                    const deductionDate = new Date(lastDeduction.date || lastDeduction.createdAt || lastDeduction.timestamp);
                    const timeAgo = getTimeAgo(deductionDate);

                    container.innerHTML = `
                        <div class="auto-deduct-item">
                            <div class="auto-deduct-item-left">
                                <div class="auto-deduct-item-group">
                                    <i class="fas fa-layer-group"></i>
                                    ${lastDeduction.groupName || 'Unknown Group'}
                                </div>
                                <div class="auto-deduct-item-time">
                                    <i class="fas fa-clock"></i>
                                    ${timeAgo}
                                </div>
                            </div>
                            <div class="auto-deduct-item-amount">
                                ৳${lastDeduction.amount.toLocaleString()}
                            </div>
                        </div>
                    `;
                    return;
                }
            } catch (e) {
                console.error('Error fetching transactions:', e);
            }
            
            // If still no deductions, show placeholder
            container.innerHTML = `
                <div class="auto-deduct-placeholder">
                    <i class="fas fa-info-circle"></i>
                    <p>No auto-deductions yet</p>
                </div>
            `;
            return;
        }

        // Sort by newest first and get only the last one
        const sorted = [...deductions].sort((a, b) => 
            new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)
        );
        
        const lastDeduction = sorted[0]; // Only the most recent one
        const deductionDate = new Date(lastDeduction.timestamp || lastDeduction.createdAt);
        const timeAgo = getTimeAgo(deductionDate);

        container.innerHTML = `
            <div class="auto-deduct-item">
                <div class="auto-deduct-item-left">
                    <div class="auto-deduct-item-group">
                        <i class="fas fa-layer-group"></i>
                        ${lastDeduction.groupName}
                    </div>
                    <div class="auto-deduct-item-time">
                        <i class="fas fa-clock"></i>
                        ${timeAgo}
                    </div>
                </div>
                <div class="auto-deduct-item-amount">
                    ৳${lastDeduction.amount.toLocaleString()}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading auto-deductions:', error);
    }
}

// Helper function to calculate time ago
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

// Load Groups
async function loadGroups() {
    try {
        // Add a loading state
        const container = document.getElementById('groupsGrid');
        if (!container.innerHTML.includes('Loading')) {
            container.innerHTML = '<div class="loading-state" style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading groups...</div>';
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch('/api/groups', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        allGroups = await response.json();

        container.innerHTML = '';
        
        if (!Array.isArray(allGroups) || allGroups.length === 0) {
            container.innerHTML = '<div class="loading-state" style="grid-column: 1/-1;">No groups found</div>';
            return;
        }

        container.innerHTML = allGroups.map(group => {
            const isExpanded = expandedGroups.has(group.id);
            const isSelected = selectedGroups.has(group.id);
            
            return `
            <div class="group-card-collapsed ${isExpanded ? 'expanded' : ''}" data-group-id="${group.id}">
                <!-- Collapsed Header (Always Visible) -->
                <div class="group-header-collapsed">
                    <div class="group-name-main" onclick="toggleGroupDashboard('${group.id}')">
                        <input type="checkbox" class="checkbox-select" value="${group.id}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleGroupSelection('${group.id}')">
                        <i class="fas fa-users"></i>
                        <span>${group.name}</span>
                        ${group.pendingOrders > 0 ? `<span class="pending-badge">${group.pendingOrders}</span>` : ''}
                    </div>
                    <div class="group-info-quick">
                        <div class="quick-info-item">
                            <span class="info-label"><i class="fas fa-gem" style="color: #60a5fa; margin-right: 5px;"></i>Rate:</span>
                            <span class="info-value">${group.rate}/tk</span>
                        </div>
                        <div class="quick-info-item">
                            <span class="info-label"><i class="fas fa-money-bill-wave" style="color: #f59e0b; margin-right: 5px;"></i>Due:</span>
                            <span class="info-value">৳${group.totalDue.toLocaleString()}</span>
                        </div>
                        <button class="reminder-toggle-btn ${groupsMarkedForDueReminder.has(group.id) ? 'active' : ''}" 
                                onclick="event.stopPropagation(); toggleDueReminder('${group.id}')" 
                                title="Mark for due reminder"
                                style="background: none; border: none; cursor: pointer; font-size: 18px; color: ${groupsMarkedForDueReminder.has(group.id) ? '#ff6b6b' : '#666'}; transition: all 0.3s ease;">
                            <i class="fas fa-bell"></i>
                        </button>
                    </div>
                    <div class="expand-icon" onclick="toggleGroupDashboard('${group.id}')">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                
                <!-- Expandable Dashboard (Hidden by default) -->
                <div class="group-dashboard-expandable ${isExpanded ? 'open' : ''}">
                    <!-- Group Dashboard -->
                    <div class="group-dashboard">
                        <div class="dashboard-section">
                            <h4><i class="fas fa-check-circle"></i> Completed Orders</h4>
                            <div class="stats-mini-grid">
                                <div class="stat-mini">
                                    <div class="stat-mini-value">${group.totalOrders}</div>
                                    <div class="stat-mini-label">Orders</div>
                                </div>
                                <div class="stat-mini">
                                    <div class="stat-mini-value">${group.totalDiamonds.toLocaleString()}</div>
                                    <div class="stat-mini-label">Diamonds</div>
                                </div>
                                <div class="stat-mini">
                                    <div class="stat-mini-value">৳${group.totalAmount.toLocaleString()}</div>
                                    <div class="stat-mini-label">Total Amount</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="dashboard-section">
                            <h4><i class="fas fa-clock"></i> Pending Orders</h4>
                            <div class="stats-mini-grid">
                                <div class="stat-mini">
                                    <div class="stat-mini-value">${group.pendingOrders}</div>
                                    <div class="stat-mini-label">Orders</div>
                                </div>
                                <div class="stat-mini">
                                    <div class="stat-mini-value">${group.pendingDiamonds.toLocaleString()}</div>
                                    <div class="stat-mini-label">Diamonds</div>
                                </div>
                                <div class="stat-mini">
                                    <div class="stat-mini-value">৳${group.pendingAmount.toLocaleString()}</div>
                                    <div class="stat-mini-label">Pending Amount</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="dashboard-section">
                            <h4><i class="fas fa-user-friends"></i> Users & Balance</h4>
                            <div class="stats-mini-grid">
                                <div class="stat-mini">
                                    <div class="stat-mini-value">${group.totalUsers}</div>
                                    <div class="stat-mini-label">Total Users</div>
                                </div>
                                <div class="stat-mini">
                                    <div class="stat-mini-value">৳${group.totalUserBalance.toLocaleString()}</div>
                                    <div class="stat-mini-label">Users Balance</div>
                                </div>
                                <div class="stat-mini">
                                    <div class="stat-mini-value">৳${(group.dueLimit || 0).toLocaleString()}</div>
                                    <div class="stat-mini-label">Due Limit</div>
                                </div>
                                <div class="stat-mini stat-mini-due" style="background: linear-gradient(135deg, ${group.totalDue === 0 ? '#4facfe 0%, #00f2fe' : '#f093fb 0%, #f5576c'} 100%);">
                                    <div class="stat-mini-value stat-mini-due-value">৳${group.totalDue.toLocaleString()}</div>
                                    <div class="stat-mini-label stat-mini-due-label">Due Balance</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Due Summary by User -->
                    ${group.userDueBreakdown && group.userDueBreakdown.length > 0 ? `
                    <div class="dashboard-section">
                        <h4><i class="fas fa-credit-card"></i> Due Summary</h4>
                        <div class="due-summary">
                            ${group.userDueBreakdown.map(user => {
                                // Smart name formatting - if name is purely numeric, format it better
                                const displayName = /^\d+$/.test(user.displayName) 
                                    ? `User_${user.displayName.slice(-6)}` 
                                    : user.displayName;
                                // Clean phone number - remove @lid and format properly
                                const cleanPhone = user.userId.replace('@lid', '').replace(/\D/g, '');
                                return `
                                <div class="due-item">
                                    <div class="due-user-info">
                                        <span class="due-user-name">${displayName}</span>
                                        <span class="due-user-phone">${cleanPhone}</span>
                                    </div>
                                    <div class="due-user-amount">৳${user.due.toLocaleString()}</div>
                                </div>
                            `;
                            }).join('')}
                            <div class="due-footer">
                                <div class="due-footer-row">
                                    <span>📊 Total Orders:</span>
                                    <strong style="color: #43e97b;">৳${group.totalAmount.toLocaleString()}</strong>
                                </div>
                                <div class="due-footer-row">
                                    <span>💰 Total Paid:</span>
                                    <strong style="color: #4facfe;">৳${group.totalPaid.toLocaleString()}</strong>
                                </div>
                                <div class="due-total">
                                    <span><strong>📉 Total Due:</strong></span>
                                    <strong style="color: #667eea; font-size: 1.1em;">৳${Math.max(0, group.totalAmount - group.totalPaid).toLocaleString()}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- View All Orders Button -->
                    <div class="dashboard-section" style="margin-top: 20px;">
                        <button class="btn-view-all-orders" onclick="showGroupOrders('${group.id}', '${group.name}')" style="width: 100%; padding: 15px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1rem; font-weight: 600; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                            <i class="fas fa-list"></i> View All Orders from This Group
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    
                    <!-- Rate Control -->
                    <div class="rate-control">
                        <input type="number" 
                               class="rate-input" 
                               value="${group.rate}" 
                               min="1" 
                               max="100"
                               placeholder="Rate">
                        <button class="btn-update" onclick="updateGroupRate('${group.id}')">
                            <i class="fas fa-save"></i> Update Rate
                        </button>
                    </div>
                    
                    <!-- Due Limit Control -->
                    <div class="rate-control" style="margin-top: 10px;">
                        <input type="number" 
                               class="due-limit-input" 
                               value="${group.dueLimit || 0}" 
                               min="0" 
                               step="1000"
                               placeholder="Due Limit (৳)">
                        <button class="btn-update" onclick="updateGroupDueLimit('${group.id}')" style="background: #4facfe;">
                            <i class="fas fa-money-bill-wave"></i> Set Due Limit
                        </button>
                    </div>
                    
                    <!-- Clear Data Button -->
                    <div class="rate-control" style="margin-top: 10px;">
                        <button class="btn-delete" onclick="clearGroupData('${group.id}', '${group.name}')" style="width: 100%; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border: none;">
                            <i class="fas fa-trash-alt"></i> Clear Group Data
                        </button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
        
        // Add event listeners after HTML is rendered
        setTimeout(() => {
            document.querySelectorAll('.rate-input, .due-limit-input, .btn-update, .btn-delete, .group-dashboard').forEach(el => {
                el.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                }, { passive: true });
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            });
            
            // Initialize totals for all groups
            allGroups.forEach(group => {
                filterGroupOrders(group.id, 'all');
            });
            
            // Note: Input focus tracking is now handled by initGlobalInputTracking() with event delegation
            // This prevents listeners from being lost during page reloads
        }, 100);
    } catch (error) {
        const container = document.getElementById('groupsGrid');
        console.error('Error loading groups:', error);
        
        if (error.name === 'AbortError') {
            container.innerHTML = `
                <div class="loading-state" style="grid-column: 1/-1; color: #ff6b6b;">
                    <i class="fas fa-exclamation-triangle"></i> 
                    <p>Loading taking too long - Connection timeout</p>
                    <button onclick="loadGroups()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="loading-state" style="grid-column: 1/-1; color: #ff6b6b;">
                    <i class="fas fa-exclamation-circle"></i> 
                    <p>Error loading groups</p>
                    <button onclick="loadGroups()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

// Toggle Group Dashboard
function toggleGroupDashboard(groupId) {
    const card = document.querySelector(`[data-group-id="${groupId}"]`);
    const dashboard = card.querySelector('.group-dashboard-expandable');
    const icon = card.querySelector('.expand-icon i');
    
    const isCurrentlyOpen = dashboard.classList.contains('open');
    
    if (!isCurrentlyOpen) {
        // Expand
        dashboard.classList.add('open');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        card.classList.add('expanded');
        expandedGroups.add(groupId);
    } else {
        // Collapse
        dashboard.classList.remove('open');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        card.classList.remove('expanded');
        expandedGroups.delete(groupId);
    }
}

// Toggle Group Selection (Checkbox)
function toggleGroupSelection(groupId) {
    if (selectedGroups.has(groupId)) {
        selectedGroups.delete(groupId);
    } else {
        selectedGroups.add(groupId);
    }
    updateToggleButton();
    updateSelectionCount();
}

// Update toggle select/deselect button state
function updateToggleButton() {
    const btn = document.getElementById('toggleSelectBtn');
    if (!btn) return;
    
    const icon = btn.querySelector('i');
    const allSelected = selectedGroups.size === allGroups.length && allGroups.length > 0;
    
    if (allSelected) {
        btn.classList.add('btn-deselect');
        btn.innerHTML = '<i class="fas fa-times-square"></i> Deselect All';
    } else {
        btn.classList.remove('btn-deselect');
        btn.innerHTML = '<i class="fas fa-check-square"></i> Select All';
    }
}

// Filter Group Orders by Time Period with Pagination
function filterGroupOrders(groupId, timeFilter, page = 1) {
    const bodyId = `ordersTableBody-${groupId}`;
    const tbody = document.getElementById(bodyId);
    if (!tbody) return;

    // Get the parent dashboard section
    const dashboardSection = tbody.closest('.dashboard-section');
    if (!dashboardSection) return;

    // Get items per page setting for this group (default: 10)
    const itemsPerPage = groupItemsPerPage.get(groupId) || 10;

    // Update active button styling
    const buttons = dashboardSection.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        const filterType = onclickAttr.match(/'(all|today|yesterday|week|month)'/)?.[1];
        
        if (filterType === timeFilter) {
            btn.style.background = '#667eea';
            btn.style.borderColor = '#667eea';
            btn.style.color = '#eee';
        } else {
            btn.style.background = '#16213e';
            btn.style.borderColor = '#2d3561';
            btn.style.color = '#eee';
        }
    });

    const rows = tbody.querySelectorAll('tr');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    let totalDiamonds = 0;
    let totalAmount = 0;
    let visibleCount = 0;
    let filteredRows = [];

    rows.forEach((row, index) => {
        const dateCell = row.querySelector('td:last-child');
        if (!dateCell) return;

        const dateStr = dateCell.textContent;
        const rowDate = new Date(dateStr);
        const rowDateOnly = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());

        let show = false;
        
        if (timeFilter === 'all') {
            show = true;
        } else if (timeFilter === 'today') {
            show = rowDateOnly.getTime() === today.getTime();
        } else if (timeFilter === 'yesterday') {
            show = rowDateOnly.getTime() === yesterday.getTime();
        } else if (timeFilter === 'week') {
            show = rowDate >= weekAgo;
        } else if (timeFilter === 'month') {
            show = rowDate >= monthAgo;
        }

        if (show) {
            filteredRows.push(row);
            const diamondsCell = row.querySelector('td:nth-child(3)');
            const amountCell = row.querySelector('td:nth-child(4)');
            
            if (diamondsCell && amountCell) {
                const diamonds = parseInt(diamondsCell.textContent.match(/\d+/)?.[0] || 0);
                const amountText = amountCell.textContent.replace(/[^\d]/g, '');
                const amount = parseInt(amountText || 0);
                
                totalDiamonds += diamonds;
                totalAmount += amount;
                visibleCount++;
            }
        }
    });

    // Hide all rows first
    rows.forEach(row => row.style.display = 'none');

    // Show only rows for current page
    const startIdx = (page - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const pageRows = filteredRows.slice(startIdx, endIdx);
    pageRows.forEach(row => row.style.display = '');

    // Calculate total pages
    const totalPages = Math.ceil(visibleCount / itemsPerPage);

    // Update pagination with per-page selector
    updatePagination(groupId, totalPages, page, timeFilter, itemsPerPage, visibleCount);

    // Update footer totals
    const totalDiamondsEl = document.getElementById(`totalDiamonds-${groupId}`);
    const totalAmountEl = document.getElementById(`totalAmount-${groupId}`);
    const totalOrdersEl = document.getElementById(`totalOrders-${groupId}`);

    if (totalDiamondsEl) totalDiamondsEl.textContent = `${totalDiamonds.toLocaleString()} 💎`;
    if (totalAmountEl) totalAmountEl.textContent = `৳${totalAmount.toLocaleString()}`;
    if (totalOrdersEl) totalOrdersEl.textContent = `${visibleCount} order${visibleCount !== 1 ? 's' : ''}`;

    console.log(`[GROUP ORDERS] Filtered to ${visibleCount} orders (${timeFilter}) | Page ${page}/${totalPages} | Total: ৳${totalAmount.toLocaleString()}`);
}

// Change items per page for a group
function changeItemsPerPage(groupId, itemsPerPage, timeFilter) {
    groupItemsPerPage.set(groupId, parseInt(itemsPerPage));
    filterGroupOrders(groupId, timeFilter, 1); // Reset to page 1
}

// Update Pagination Controls
function updatePagination(groupId, totalPages, currentPage, timeFilter, itemsPerPage = 10, totalItems = 0) {
    let paginationRow = document.getElementById(`pagination-row-${groupId}`);
    
    // Create pagination row if it doesn't exist
    if (!paginationRow) {
        const tfoot = document.getElementById(`ordersTotalRow-${groupId}`);
        if (!tfoot) return;
        
        paginationRow = document.createElement('tr');
        paginationRow.id = `pagination-row-${groupId}`;
        paginationRow.className = 'pagination-row';
        
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.style.padding = '0';
        cell.style.border = 'none';
        
        const paginationContainer = document.createElement('div');
        paginationContainer.id = `pagination-${groupId}`;
        paginationContainer.className = 'pagination-container';
        
        cell.appendChild(paginationContainer);
        paginationRow.appendChild(cell);
        tfoot.appendChild(paginationRow);
    }
    
    const paginationContainer = document.getElementById(`pagination-${groupId}`);
    if (!paginationContainer) return;

    let html = '';
    
    // Per-page selector with better mobile layout
    html += `
        <div class="pagination-selector">
            <span style="font-size: 0.9rem; font-weight: 600;">📄 Show:</span>
            <select onchange="changeItemsPerPage('${groupId}', this.value, '${timeFilter}')" 
                    style="padding: 8px 12px; background: var(--card-bg); color: var(--text-primary); border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; min-width: 90px;">
                <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option>
                <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100</option>
                <option value="999999" ${itemsPerPage === 999999 ? 'selected' : ''}>All</option>
            </select>
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--primary-color);">per page</span>
            <span style="font-size: 0.85rem; padding: 4px 10px; background: rgba(102, 126, 234, 0.15); border-radius: 6px; color: var(--text-primary); font-weight: 600;">📊 ${totalItems} total</span>
        </div>
    `;
    
    // Pagination buttons container
    html += `<div class="pagination-buttons-container">`;

    // Previous button
    if (currentPage > 1) {
        html += `<button class="pagination-btn" onclick="filterGroupOrders('${groupId}', '${timeFilter}', ${currentPage - 1})">← Prev</button>`;
    }

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="filterGroupOrders('${groupId}', '${timeFilter}', 1)">1</button>`;
        if (startPage > 2) html += `<span class="pagination-dots">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<button class="pagination-btn active">${i}</button>`;
        } else {
            html += `<button class="pagination-btn" onclick="filterGroupOrders('${groupId}', '${timeFilter}', ${i})">${i}</button>`;
        }
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="pagination-dots">...</span>`;
        html += `<button class="pagination-btn" onclick="filterGroupOrders('${groupId}', '${timeFilter}', ${totalPages})">${totalPages}</button>`;
    }

    // Next button
    if (currentPage < totalPages) {
        html += `<button class="pagination-btn" onclick="filterGroupOrders('${groupId}', '${timeFilter}', ${currentPage + 1})">Next →</button>`;
    }
    
    html += `</div>`; // Close pagination buttons container

    paginationContainer.innerHTML = html;
}

// Update Group Rate
async function updateGroupRate(groupId) {
    const card = document.querySelector(`[data-group-id="${groupId}"]`);
    const rateInput = card.querySelector('.rate-input');
    const rate = parseFloat(rateInput.value);

    if (rate < 1 || rate > 100) {
        showToast('Rate must be between 1 and 100', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/groups/${groupId}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rate })
        });

        const result = await response.json();
        
        if (result.success) {
            showToast(`Rate updated to ${rate}`, 'success');
            // Here you would send WhatsApp notification to the group
        } else {
            showToast('Failed to update rate', 'error');
        }
    } catch (error) {
        console.error('Error updating rate:', error);
        showToast('Error updating rate', 'error');
    }
}

// Update Group Due Limit
async function updateGroupDueLimit(groupId) {
    const card = document.querySelector(`[data-group-id="${groupId}"]`);
    const dueLimitInput = card.querySelector('.due-limit-input');
    const dueLimit = parseFloat(dueLimitInput.value);

    if (dueLimit < 0) {
        showToast('Due limit cannot be negative', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/groups/${groupId}/due-limit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dueLimit })
        });

        const result = await response.json();
        
        if (result.success) {
            showToast(`Due limit set to ৳${dueLimit.toLocaleString()}`, 'success');
            loadGroups();
        } else {
            showToast('Failed to update due limit', 'error');
        }
    } catch (error) {
        console.error('Error updating due limit:', error);
        showToast('Error updating due limit', 'error');
    }
}

// Clear Group Data
async function clearGroupData(groupId, groupName) {
    const confirmMsg = `Are you sure you want to delete all data for "${groupName}" group?\n\nThis will delete:\n• All Completed Orders\n• All Pending Orders\n• All User Balance\n• All Transaction History\n\nThis action cannot be undone!`;
    
    if (!confirm(confirmMsg)) {
        return;
    }

    // Double confirmation
    const doubleConfirm = confirm('Warning! This is a dangerous action. Please confirm again.');
    if (!doubleConfirm) {
        return;
    }

    try {
        const response = await fetch(`/api/groups/${groupId}/clear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        
        if (result.success) {
            showToast(`All data for "${groupName}" has been deleted`, 'success');
            await silentRefreshData();
        } else {
            showToast('Failed to delete data', 'error');
        }
    } catch (error) {
        console.error('Error clearing group data:', error);
        showToast('Error deleting data', 'error');
    }
}

// Toggle Select All Groups
function toggleSelectAll() {
    const allSelected = selectedGroups.size === allGroups.length && allGroups.length > 0;
    
    if (allSelected) {
        // Deselect all
        selectedGroups.clear();
    } else {
        // Select all
        allGroups.forEach(group => selectedGroups.add(group.id));
    }
    
    loadGroups(); // Refresh to update checkboxes
    updateSelectionCount();
}

// Start Selected Groups - Send start message to selected groups only
async function startSelectedGroups() {
    // Check if any groups are selected
    if (selectedGroups.size === 0) {
        showToast('❌ Please select at least one group first!', 'warning');
        return;
    }
    
    const selectedGroupsList = allGroups.filter(g => selectedGroups.has(g.id));
    const groupNames = selectedGroupsList.map(g => g.name).join('\n• ');
    
    // Confirm action
    const confirm = window.confirm(`🚀 Start Selected Groups?\n\n📊 ${selectedGroups.size} group(s) selected:\n• ${groupNames}\n\n📨 Start message will be sent to these groups\n\nContinue?`);
    
    if (!confirm) {
        showToast('Action cancelled', 'info');
        return;
    }
    
    // Show loading toast
    showToast(`Starting ${selectedGroups.size} groups...`, 'info');
    
    // Send start message to selected groups
    let successCount = 0;
    let failCount = 0;
    
    for (const group of selectedGroupsList) {
        try {
            const response = await fetch('/api/send-start-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId: group.id })
            });
            
            if (response.ok) {
                successCount++;
            } else {
                failCount++;
            }
            
            // Small delay between messages
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('Error sending start message:', error);
            failCount++;
        }
    }
    
    // Show result
    if (failCount === 0) {
        showToast(`✅ Started ${successCount} group(s) successfully!`, 'success');
    } else {
        showToast(`⚠️ Started ${successCount} groups, ${failCount} failed`, 'warning');
    }
}

// Update Selection Count Display
function updateSelectionCount() {
    const countEl = document.getElementById('selectionCount');
    if (countEl) {
        if (selectedGroups.size > 0) {
            countEl.textContent = `${selectedGroups.size} group(s) selected`;
            countEl.style.color = '#667eea';
            countEl.style.fontWeight = '600';
        } else {
            countEl.textContent = '';
        }
    }
}

// Bulk Clear Data
async function bulkClearData() {
    if (selectedGroups.size === 0) {
        showToast('Please select at least one group', 'warning');
        return;
    }

    const groupNames = allGroups
        .filter(g => selectedGroups.has(g.id))
        .map(g => g.name)
        .join(', ');

    const confirmMsg = `⚠️ DANGER: You are about to delete ALL data from ${selectedGroups.size} groups:\n\n${groupNames}\n\nThis will delete:\n• All Completed Orders\n• All Pending Orders  \n• All User Balances\n• All Transaction History\n\nThis action CANNOT be undone!\n\nType "DELETE" to confirm:`;
    
    const userInput = prompt(confirmMsg);
    if (userInput !== 'DELETE') {
        showToast('Deletion cancelled', 'info');
        return;
    }

    try {
        console.log('[BULK-CLEAR] Sending request for', selectedGroups.size, 'groups:', Array.from(selectedGroups));
        
        const response = await fetch('/api/groups/bulk-clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupIds: Array.from(selectedGroups) })
        });

        console.log('[BULK-CLEAR] Response status:', response.status);
        
        const result = await response.json();
        console.log('[BULK-CLEAR] Response data:', result);
        
        if (result.success) {
            showToast(`${result.count} groups cleared successfully`, 'success');
            selectedGroups.clear();
            updateSelectionCount();
            await silentRefreshData();
        } else {
            console.error('[BULK-CLEAR] Failed:', result);
            showToast('Failed to clear groups: ' + (result.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('[BULK-CLEAR] Error:', error);
        showToast('Error clearing groups: ' + error.message, 'error');
    }
}

// Bulk Rate Update
function showBulkRateModal() {
    const selectedGroups = Array.from(document.querySelectorAll('.checkbox-select:checked'))
        .map(cb => cb.value);

    if (selectedGroups.length === 0) {
        showToast('Please select at least one group', 'warning');
        return;
    }

    const modal = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Bulk Rate Update</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Selected Groups: <strong>${selectedGroups.length}</strong></p>
                    <div style="margin: 20px 0;">
                        <label>New Rate:</label>
                        <input type="number" id="bulkRate" class="rate-input" 
                               min="1" max="100" placeholder="Enter rate" 
                               style="width: 100%; margin-top: 10px;">
                    </div>
                    <button class="btn-primary" onclick="applyBulkRate(${JSON.stringify(selectedGroups).replace(/"/g, '&quot;')})" 
                            style="width: 100%;">
                        <i class="fas fa-check"></i> Update All Groups
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modal;
}

// Apply Bulk Rate
async function applyBulkRate(groupIds) {
    const rate = parseFloat(document.getElementById('bulkRate').value);

    if (!rate || rate < 1 || rate > 100) {
        showToast('Invalid rate', 'error');
        return;
    }

    try {
        const response = await fetch('/api/groups/bulk-rate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupIds, rate })
        });

        const result = await response.json();
        
        if (result.success) {
            showToast(`${result.count} groups updated`, 'success');
            closeModal();
            loadGroups();
        }
    } catch (error) {
        console.error('Error applying bulk rate:', error);
        showToast('Error updating rates', 'error');
    }
}

// Filter Groups
function filterGroups() {
    const search = document.getElementById('groupSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.group-card');

    cards.forEach(card => {
        const name = card.querySelector('.group-name').textContent.toLowerCase();
        card.style.display = name.includes(search) ? 'block' : 'none';
    });
}

// Load Transactions
async function loadTransactions() {
    try {
        const response = await fetch('/api/transactions');
        allTransactions = await response.json();

        const tbody = document.getElementById('transactionsTable');
        
        if (allTransactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">No transactions found</td></tr>';
            return;
        }

        tbody.innerHTML = allTransactions.slice(0, 50).map(t => {
            // ✅ Fix: Convert id to string and handle if it's null/undefined
            const idStr = (t.id || '').toString().substring(0, 8);
            const displayId = idStr ? idStr + '...' : 'N/A';
            
            return `
            <tr>
                <td>${displayId}</td>
                <td><strong>${t.groupName || t.phone || 'Unknown'}</strong></td>
                <td>৳${(t.amount || 0).toLocaleString()}</td>
                <td>${t.method || 'Unknown'}</td>
                <td><span class="status-badge status-${t.status}">${t.status}</span></td>
                <td>${new Date(t.date || Date.now()).toLocaleString('bn-BD')}</td>
            </tr>
        `;
        }).join('');

        // Update recent transactions on dashboard - only manual type
        const recentTbody = document.getElementById('recentTransactions');
        const manualTransactions = allTransactions.filter(t => t.type === 'manual');
        recentTbody.innerHTML = manualTransactions.slice(0, 5).map(t => `
            <tr>
                <td data-label="Group Name">${t.groupName || 'Unknown Group'}</td>
                <td data-label="Amount">৳${(t.amount || 0).toLocaleString()}</td>
                <td data-label="Type">${t.type || 'manual'}</td>
                <td data-label="Date">${new Date(t.date || Date.now()).toLocaleDateString('bn-BD')}</td>
            </tr>
        `).join('');
        
        if (manualTransactions.length === 0) {
            recentTbody.innerHTML = '<tr><td colspan="4" class="loading">No manual transactions found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Load Pending Deposits
async function loadPendingDeposits() {
    try {
        const response = await fetch('/api/deposits/pending');
        const deposits = await response.json();

        const tbody = document.getElementById('pendingDepositsTable');
        
        if (deposits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading">No pending deposits</td></tr>';
            return;
        }

        tbody.innerHTML = deposits.map(d => `
            <tr>
                <td>${d.phone}</td>
                <td>৳${d.amount.toLocaleString()}</td>
                <td>${d.transactionId}</td>
                <td>${new Date(d.date).toLocaleString('bn-BD')}</td>
                <td>
                    <button class="btn-approve" onclick="approveDeposit('${d.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-reject" onclick="rejectDeposit('${d.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading pending deposits:', error);
    }
}

// Approve Deposit
async function approveDeposit(depositId) {
    if (!confirm('Approve this deposit?')) return;

    try {
        const response = await fetch(`/api/deposits/${depositId}/approve`, {
            method: 'POST'
        });

        const result = await response.json();
        
        if (result.success) {
            showToast('Deposit approved', 'success');
        }
    } catch (error) {
        console.error('Error approving deposit:', error);
        showToast('Error approving deposit', 'error');
    }
}

// Reject Deposit
async function rejectDeposit(depositId) {
    if (!confirm('Reject this deposit?')) return;

    try {
        const response = await fetch(`/api/deposits/${depositId}/reject`, {
            method: 'POST'
        });

        const result = await response.json();
        
        if (result.success) {
            showToast('Deposit rejected', 'info');
        }
    } catch (error) {
        console.error('Error rejecting deposit:', error);
        showToast('Error rejecting deposit', 'error');
    }
}

// Load Orders
async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        allOrders = await response.json();

        const tbody = document.getElementById('ordersTableNew');
        
        if (!tbody) {
            console.warn('ordersTableNew element not found');
            return;
        }
        
        if (allOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">No orders found</td></tr>';
            return;
        }

        tbody.innerHTML = allOrders.slice(0, 50).map(o => `
            <tr>
                <td>${o.phone}</td>
                <td>${o.playerId}</td>
                <td>${o.diamonds}</td>
                <td>৳${o.amount.toLocaleString()}</td>
                <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                <td>${new Date(o.date).toLocaleString('bn-BD')}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// ============= OFFLINE ORDERS VIEW =============
let offlineOrders = [];
let currentOfflineOrderPage = 1;
const offlineOrdersPerPage = 50;

async function loadOfflineOrders() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/orders-menu/all', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            showNotification('❌ Failed to load offline orders', 'error');
            return;
        }

        const allOrders = await response.json();
        // Filter only offline orders
        offlineOrders = allOrders.filter(o => o.source === 'offline');

        // Sort by date (newest first)
        offlineOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log(`[OFFLINE ORDERS] Loaded ${offlineOrders.length} offline orders`);
        
        displayOfflineOrdersPage(1);
        renderOfflineOrdersPagination();
    } catch (error) {
        console.error('[OFFLINE ORDERS] Error loading:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    }
}

function displayOfflineOrdersPage(page) {
    const tbody = document.getElementById('offlineOrdersTableBody');
    const start = (page - 1) * offlineOrdersPerPage;
    const end = start + offlineOrdersPerPage;
    const pageOrders = offlineOrders.slice(start, end);

    if (pageOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">No offline orders found</td></tr>';
        return;
    }

    tbody.innerHTML = pageOrders.map(o => {
        // Format date
        const date = new Date(o.createdAt);
        const formattedDate = date.toLocaleDateString('en-US') + ', ' + date.toLocaleTimeString('en-US');
        
        // Status display
        let statusDisplay = '';
        if (o.status === 'pending') {
            statusDisplay = '<span class="status-badge status-pending">⏳ PENDING</span>';
        } else if (o.status === 'approved') {
            statusDisplay = '<span class="status-badge status-approved">✅ APPROVED</span>';
        } else if (o.status === 'deleted') {
            statusDisplay = '<span class="status-badge status-deleted">🗑️ DELETED</span>';
        }

        // Actions
        let actionsHTML = '';
        if (o.status === 'pending') {
            actionsHTML = `
                <td data-label="Actions">
                    <div class="order-actions">
                        <button class="btn-action btn-delete" onclick="deleteOrder('${o.id}')" title="Delete Order">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
        } else if (o.status === 'approved') {
            actionsHTML = `
                <td data-label="Actions">
                    <div class="order-actions">
                        <button class="btn-action btn-delete" onclick="deleteOrder('${o.id}')" title="Delete Order">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
        } else if (o.status === 'deleted') {
            actionsHTML = `
                <td data-label="Actions">
                    <div class="order-actions">
                        <button class="btn-action btn-restore" onclick="restoreOrder('${o.id}')" title="Restore Order" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <i class="fas fa-undo"></i> Restore
                        </button>
                    </div>
                </td>
            `;
        }

        return `
            <tr>
                <td data-label="Phone">${o.userName || 'N/A'}</td>
                <td data-label="ID/Number">${o.playerId || o.playerIdNumber || o.userPhone || o.userId || 'N/A'}</td>
                <td data-label="Diamonds">${o.diamonds}</td>
                <td data-label="Amount">৳${(o.amount || o.diamonds * 100).toLocaleString()}</td>
                <td data-label="Status">${statusDisplay}</td>
                <td data-label="Date">${formattedDate}</td>
                ${actionsHTML}
            </tr>
        `;
    }).join('');

    currentOfflineOrderPage = page;
}

function renderOfflineOrdersPagination() {
    const paginationDiv = document.getElementById('offlineOrdersPagination');
    const totalPages = Math.ceil(offlineOrders.length / offlineOrdersPerPage);

    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let html = '<div class="pagination-controls">';
    
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === currentOfflineOrderPage ? 'active' : '';
        html += `<button class="pagination-btn ${activeClass}" onclick="goToOfflineOrdersPage(${i})">${i}</button>`;
    }

    if (currentOfflineOrderPage < totalPages) {
        html += `<button class="pagination-btn" onclick="goToOfflineOrdersPage(${currentOfflineOrderPage + 1})">
            Next <i class="fas fa-chevron-right"></i>
        </button>`;
    }

    html += '</div>';
    paginationDiv.innerHTML = html;
}

function goToOfflineOrdersPage(page) {
    displayOfflineOrdersPage(page);
    renderOfflineOrdersPagination();
}

function filterOfflineOrders() {
    const searchInput = document.getElementById('offlineOrderSearch').value.toLowerCase();
    
    if (!searchInput) {
        displayOfflineOrdersPage(1);
        renderOfflineOrdersPagination();
        return;
    }

    const filtered = offlineOrders.filter(o => 
        (o.userPhone || '').toLowerCase().includes(searchInput) ||
        (o.userName || '').toLowerCase().includes(searchInput) ||
        (o.userId || '').toLowerCase().includes(searchInput) ||
        (o.diamonds + '').includes(searchInput) ||
        (o.status || '').toLowerCase().includes(searchInput)
    );

    const tbody = document.getElementById('offlineOrdersTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">No matching offline orders</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(o => {
        const date = new Date(o.createdAt);
        const formattedDate = date.toLocaleDateString('en-US') + ', ' + date.toLocaleTimeString('en-US');
        
        let statusDisplay = '';
        if (o.status === 'pending') {
            statusDisplay = '<span class="status-badge status-pending">⏳ PENDING</span>';
        } else if (o.status === 'approved') {
            statusDisplay = '<span class="status-badge status-approved">✅ APPROVED</span>';
        } else if (o.status === 'deleted') {
            statusDisplay = '<span class="status-badge status-deleted">🗑️ DELETED</span>';
        }

        let actionsHTML = '';
        if (o.status === 'pending' || o.status === 'approved') {
            actionsHTML = `
                <td data-label="Actions">
                    <div class="order-actions">
                        <button class="btn-action btn-delete" onclick="deleteOrder('${o.id}')" title="Delete Order">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
        } else if (o.status === 'deleted') {
            actionsHTML = `
                <td data-label="Actions">
                    <div class="order-actions">
                        <button class="btn-action btn-restore" onclick="restoreOrder('${o.id}')" title="Restore Order" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <i class="fas fa-undo"></i> Restore
                        </button>
                    </div>
                </td>
            `;
        }

        return `
            <tr>
                <td data-label="Phone">${o.userName || 'N/A'}</td>
                <td data-label="ID/Number">${o.playerId || o.playerIdNumber || o.userPhone || o.userId || 'N/A'}</td>
                <td data-label="Diamonds">${o.diamonds}</td>
                <td data-label="Amount">৳${(o.amount || o.diamonds * 100).toLocaleString()}</td>
                <td data-label="Status">${statusDisplay}</td>
                <td data-label="Date">${formattedDate}</td>
                ${actionsHTML}
            </tr>
        `;
    }).join('');
}

// Load Orders for New Orders View with Pagination
let currentOrderPage = 1;
const ordersPerPage = 20;
let processingTimers = {}; // Track timers for each processing order

// Start countdown timer update every second
function startProcessingCountdown() {
    setInterval(() => {
        // Find all processing order badges and update their timers
        document.querySelectorAll('[data-order-id][data-start-time]').forEach(element => {
            const orderId = element.getAttribute('data-order-id');
            const startTime = parseInt(element.getAttribute('data-start-time'));
            
            // 🔧 Check if this order badge still has status-processing class
            // If not, it means order is already approved - skip updating to prevent flicker
            if (!element.classList.contains('status-processing')) {
                return;
            }
            
            // Skip if no valid start time
            if (!startTime || isNaN(startTime)) return;
            
            const elapsedMs = Date.now() - startTime;
            const remainingMs = (2 * 60 * 1000) - elapsedMs; // 2 minutes = 120000 ms
            
            if (remainingMs > 0) {
                const totalSeconds = Math.ceil(remainingMs / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                // 🔧 ONLY update the inner text, preserve element reference
                // This prevents DOM flickering when silentRefreshOrders runs
                const firstChild = element.firstChild;
                if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
                    firstChild.textContent = `⏳ ${timeDisplay}`;
                } else {
                    element.textContent = `⏳ ${timeDisplay}`;
                }
                
                element.classList.remove('status-expired');
                
                // Change color when less than 30 seconds - RED WARNING
                if (totalSeconds <= 30) {
                    element.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)';
                    element.style.borderColor = '#ff8a80';
                    element.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.7)';
                    element.classList.add('countdown-warning');
                } else {
                    // Normal blue processing color
                    element.style.background = 'linear-gradient(135deg, #4facfe 0%, #2196f3 100%)';
                    element.style.borderColor = '#64b5f6';
                    element.style.boxShadow = '0 0 10px rgba(79, 172, 254, 0.5)';
                    element.classList.remove('countdown-warning');
                }
            } else {
                // Time expired - show as approved
                // 🔧 Only update text, not the whole element
                const firstChild = element.firstChild;
                if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
                    firstChild.textContent = '✅ APPROVED';
                } else {
                    element.textContent = '✅ APPROVED';
                }
                
                element.classList.add('status-expired');
                element.style.background = 'linear-gradient(135deg, #43e97b 0%, #38ad65 100%)';
                element.style.borderColor = '#66bb6a';
                element.style.boxShadow = '0 0 20px rgba(67, 233, 123, 0.7)';
                
                // Auto-reload orders once timer expires
                setTimeout(() => {
                    loadOrdersNew();
                }, 1000);
            }
        });
    }, 1000); // Update every 1 second (synchronized with silentRefreshOrders)
}

// Initialize countdown when page loads
document.addEventListener('DOMContentLoaded', () => {
    startProcessingCountdown();
});

// Real-time polling system - refreshes orders every 1 second for real-time updates
let ordersPollingInterval = null;
let isOrdersViewActive = false;
let isRefreshing = false;
let pendingRefresh = false;

function startOrdersPolling() {
    if (ordersPollingInterval) return; // Already polling
    
    console.log('[ORDERS POLLING] ❌ DISABLED - Polling turned off to prevent flickering. Updates via socket events only.');
    isOrdersViewActive = true;
    
    // Initial load
    loadOrdersNew();
    
    // ❌ DISABLED: Polling causes flickering even with silent refresh
    // Refresh every 3 seconds while Orders view is active (reduced from 1 second)
    // ordersPollingInterval = setInterval(() => {
    //     if (isOrdersViewActive && !isRefreshing) {
    //         silentRefreshOrders();
    //     } else if (isOrdersViewActive && isRefreshing) {
    //         pendingRefresh = true;
    //     }
    // }, 3000); // Changed from 1000 to 3000 (3 seconds)
}

function stopOrdersPolling() {
    if (ordersPollingInterval) {
        clearInterval(ordersPollingInterval);
        ordersPollingInterval = null;
        isOrdersViewActive = false;
        console.log('[ORDERS POLLING] Stopped');
    }
}

async function loadOrdersNew() {
    try {
        const token = localStorage.getItem('adminToken');
        // First try to get all orders including offline ones
        const response = await fetch('/api/orders-menu/all', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // Fallback to regular orders API if new endpoint fails
            const fallbackResponse = await fetch('/api/orders');
            allOrders = await fallbackResponse.json();
        } else {
            allOrders = await response.json();
        }

        // ✅ SORT BY NEWEST FIRST (descending order by createdAt)
        allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const tbody = document.getElementById('ordersTableNew');
        
        if (allOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No orders found</td></tr>';
            document.getElementById('ordersPagination').innerHTML = '';
            return;
        }

        // Display orders for current page
        displayOrdersPage(currentOrderPage);
        
        // Populate all tabs
        displayOrdersByStatus('all');
        displayOrdersByStatus('pending');
        displayOrdersByStatus('processing');
        displayOrdersByStatus('approved');
        displayOrdersByStatus('deleted');  // ✅ ADD: Deleted orders tab
        
        // Render pagination controls
        renderOrdersPagination(allOrders.length);
    } catch (error) {
        console.error('Error loading orders:', error);
        // Fallback to regular orders API
        try {
            const fallbackResponse = await fetch('/api/orders');
            allOrders = await fallbackResponse.json();
            displayOrdersPage(currentOrderPage);
            renderOrdersPagination(allOrders.length);
        } catch (fallbackError) {
            console.error('Fallback failed:', fallbackError);
        }
    }
}

// Silent background refresh - ENABLED for polling
// This function refreshes orders silently without page reload
async function silentRefreshOrders() {
    try {
        // Prevent simultaneous refreshes
        if (isRefreshing) return;
        isRefreshing = true;
        
        // Save current scroll position
        const bodyScrollY = window.scrollY || document.documentElement.scrollTop;
        const mainContent = document.querySelector('.main-content');
        const mainScrollY = mainContent ? mainContent.scrollTop : 0;
        
        const response = await fetch('/api/orders');
        const newOrders = await response.json();
        
        // ✅ SORT BY NEWEST FIRST (descending order by createdAt)
        newOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Only update if data has changed
        if (JSON.stringify(newOrders) !== JSON.stringify(allOrders)) {
            allOrders = newOrders;
            console.log('[SILENT REFRESH] Orders updated (rerender disabled to prevent flickering)');
            
            // ❌ DISABLED: Table rerender causes flickering
            // Update the current page display silently (NO page reload)
            // displayOrdersPage(currentOrderPage);
            
            // Note: Real-time updates handled via socket events instead:
            // - orderStatusUpdated
            // - newOrderCreated  
            // - orderDeleted
        }
    } catch (error) {
        console.log('[SILENT REFRESH] Error:', error.message);
    } finally {
        isRefreshing = false;
        
        // If refresh was requested while we were refreshing, do it now
        if (pendingRefresh) {
            pendingRefresh = false;
            silentRefreshOrders();
        }
    }
}

// Auto enable polling when Orders page is viewed
function enableOrdersPolling() {
    startOrdersPolling();
}

// Auto disable polling when Orders page is hidden
function disableOrdersPolling() {
    stopOrdersPolling();
}

// Display orders for a specific page
function displayOrdersPage(page) {
    const tbody = document.getElementById('ordersTableNew');
    const start = (page - 1) * ordersPerPage;
    const end = start + ordersPerPage;
    const pageOrders = allOrders.slice(start, end);

    if (pageOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = pageOrders.map((o, index) => {
        const serialNumber = start + index + 1; // Calculate serial number
        // Format date to English: MM/DD/YYYY, HH:MM:SS AM/PM
        const date = new Date(o.date || o.createdAt);
        const formattedDate = date.toLocaleDateString('en-US') + ', ' + date.toLocaleTimeString('en-US');
        
        // Create status display with processing info and real-time countdown
        let statusDisplay = '';
        if (o.status === 'processing') {
            // Only render the badge with data-start-time attribute
            // The countdown function will handle ALL text updates
            const approvalTime = o.processingStartedAt ? new Date(o.processingStartedAt) : new Date(o.date || o.createdAt);
            
            statusDisplay = `<span class="status-badge status-${o.status}" 
                                data-order-id="${o.id}" 
                                data-start-time="${approvalTime.getTime()}"
                                title="⏳ Processing - Auto-approves in 2 minutes. Delete message to cancel.">⏳ 2:00</span>`;
        } else {
            // Handle different statuses with icons and proper formatting
            let statusText = o.status;
            let statusIcon = '';
            
            if (o.status === 'deleted') {
                statusText = 'DELETED';
                statusIcon = '🗑️';
            } else if (o.status === 'approved') {
                statusText = 'APPROVED';
                statusIcon = '✅';
            } else if (o.status === 'pending') {
                statusText = 'PENDING';
                statusIcon = '⏳';
            } else if (o.status === 'cancelled') {
                statusText = 'CANCELLED';
                statusIcon = '❌';
            }
            
            statusDisplay = `<span class="status-badge status-${o.status}">${statusIcon} ${statusText}</span>`;
        }
        
        // Show action buttons ONLY for pending orders
        let actionsHTML = '';
        if (o.status === 'pending') {
            actionsHTML = `
                <td data-label="Actions">
                    <div class="order-actions">
                        <button class="btn-action btn-delete" onclick="deleteOrder('${o.id}')" title="Delete Order">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
        } else if (o.status === 'approved') {
            actionsHTML = `
                <td data-label="Actions">
                    <div class="order-actions">
                        <button class="btn-action btn-delete" onclick="deleteOrder('${o.id}')" title="Delete Order">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
        } else if (o.status === 'deleted') {
            actionsHTML = `
                <td data-label="Actions">
                    <div class="order-actions">
                        <button class="btn-action btn-restore" onclick="restoreOrder('${o.id}')" title="Restore Order" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <i class="fas fa-undo"></i> Restore
                        </button>
                        <button class="btn-action btn-permanent-delete" onclick="permanentDeleteOrder('${o.id}')" title="Permanent Delete" style="background: linear-gradient(135deg, #d63031 0%, #eb2f06 100%);">
                            <i class="fas fa-times-circle"></i> Permanent
                        </button>
                    </div>
                </td>
            `;
        } else {
            actionsHTML = '<td data-label="Actions"><span style="color: var(--text-secondary);">—</span></td>';
        }
        
        // Add [OFFLINE] badge if order source is 'offline'
        let offlineBadge = '';
        if (o.source === 'offline') {
            offlineBadge = '<span style="display: inline-block; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-right: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="Order detected while bot was offline">[OFFLINE]</span>';
        }
        
        // Show approvedBy only for approved orders
        const approvedByDisplay = o.status === 'approved' && o.approvedBy 
            ? `<span style="color: var(--success-color); font-weight: 600;">✅ ${o.approvedBy}</span>` 
            : '<span style="color: var(--text-secondary);">—</span>';
        
        return `
            <tr>
                <td data-label="#">${serialNumber}</td>
                <td data-label="Order ID"><span style="font-family: monospace; font-size: 0.85em; color: var(--info-color);">${o.id}</span></td>
                <td data-label="User">${o.userName || 'N/A'}</td>
                <td data-label="ID/Number">${o.playerId || o.playerIdNumber || o.userPhone || o.userId}</td>
                <td data-label="Diamonds">${o.diamonds}</td>
                <td data-label="Amount">৳${(o.amount || o.diamonds * 100).toLocaleString()}</td>
                <td data-label="Status">${offlineBadge}${statusDisplay}</td>
                <td data-label="Approved By">${approvedByDisplay}</td>
                <td data-label="Date">${formattedDate}</td>
                ${actionsHTML}
            </tr>
        `;
    }).join('');
}

// Render pagination controls
function renderOrdersPagination(totalOrders) {
    const paginationDiv = document.getElementById('ordersPagination');
    const totalPages = Math.ceil(totalOrders / ordersPerPage);

    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let html = '<div class="pagination-controls">';
    
    // Previous button
    if (currentOrderPage > 1) {
        html += `<button class="pagination-btn" onclick="goToOrdersPage(${currentOrderPage - 1})">
            <i class="fas fa-chevron-left"></i> Previous
        </button>`;
    }

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentOrderPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="goToOrdersPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="pagination-ellipsis">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn ${i === currentOrderPage ? 'active' : ''}" 
                    onclick="goToOrdersPage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="pagination-ellipsis">...</span>`;
        html += `<button class="pagination-btn" onclick="goToOrdersPage(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    if (currentOrderPage < totalPages) {
        html += `<button class="pagination-btn" onclick="goToOrdersPage(${currentOrderPage + 1})">
            Next <i class="fas fa-chevron-right"></i>
        </button>`;
    }

    html += '</div>';
    paginationDiv.innerHTML = html;
}

// Navigate to specific orders page
function goToOrdersPage(page) {
    const totalPages = Math.ceil(allOrders.length / ordersPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentOrderPage = page;
    displayOrdersPage(page);
    renderOrdersPagination(allOrders.length);
    
    // Scroll to top of table
    document.getElementById('ordersTableNew').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Instantly update order row status when event received
function updateOrderRowStatus(orderId, newStatus) {
    try {
        console.log(`[UPDATE ROW] Attempting to update order ${orderId} to status: ${newStatus}`);
        
        // Find the order in the allOrders array
        const orderIndex = allOrders.findIndex(o => o.id == orderId);
        if (orderIndex === -1) {
            console.log(`[UPDATE ROW] Order ${orderId} not found in allOrders, will reload data`);
            // Force refresh if order not found
            loadOrdersNew();
            return;
        }
        
        // Update the order in memory
        allOrders[orderIndex].status = newStatus;
        console.log(`[UPDATE ROW] ✅ Updated order in memory: ${orderId} → ${newStatus}`);
        
        // Completely re-render the orders table to ensure proper display
        // This ensures all status badges, timers, and formatting are correct
        loadOrdersNew();
        console.log(`[UPDATE ROW] ✅ Reloaded orders table for instant display`);
        
    } catch (error) {
        console.error(`[UPDATE ROW] Error updating row:`, error);
    }
}

// Helper function for paginating filtered results
let filteredOrdersCache = [];
function filterOrdersPage(page) {
    const tbody = document.getElementById('ordersTableNew');
    const start = (page - 1) * ordersPerPage;
    const end = start + ordersPerPage;
    const pageOrders = filteredOrdersCache.slice(start, end);

    tbody.innerHTML = pageOrders.map(o => {
        const date = new Date(o.date);
        const formattedDate = date.toLocaleDateString('en-US') + ', ' + date.toLocaleTimeString('en-US');
        
        return `
            <tr>
                <td data-label="Phone">${o.userName || 'N/A'}</td>
                <td data-label="ID/Number">${o.playerId}</td>
                <td data-label="Diamonds">${o.diamonds}</td>
                <td data-label="Amount">৳${o.amount.toLocaleString()}</td>
                <td data-label="Status"><span class="status-badge status-${o.status}">${o.status}</span></td>
                <td data-label="Date">${formattedDate}</td>
            </tr>
        `;
    }).join('');
}

// Load Users
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        allUsers = await response.json();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load Analytics
async function loadAnalytics() {
    try {
        const response = await fetch('/api/analytics');
        const data = await response.json();

        console.log('Analytics data received:', data); // DEBUG
        console.log('Last 7 days:', data.last7Days); // DEBUG

        // Check if there's actual data
        const hasData = data.last7Days && data.last7Days.some(d => d.deposits > 0 || d.orders > 0);
        console.log('Has data:', hasData); // DEBUG
        
        if (!hasData) {
            // Show empty state
            const chartContainer = document.querySelector('.chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        text-align: center;
                        color: var(--text-secondary);
                        z-index: 10;
                    ">
                        <i class="fas fa-chart-line" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.6; display: block;"></i>
                        <p style="margin: 10px 0; font-size: 1.1rem; font-weight: 500;">No data for last 7 days</p>
                        <p style="font-size: 0.9rem; opacity: 0.7; margin: 5px 0;">Data will appear when orders are placed</p>
                    </div>
                `;
            }
        } else {
            renderChart(data.last7Days);
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Render Chart
function renderChart(data) {
    const ctx = document.getElementById('analyticsChart');
    if (!ctx) return;

    if (analyticsChart) {
        analyticsChart.destroy();
    }

    const isDark = currentTheme === 'dark';
    const textColor = isDark ? '#eee' : '#2c3e50';
    const gridColor = isDark ? '#2d3561' : '#e1e8ed';

    analyticsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => new Date(d.date).toLocaleDateString('bn-BD')),
            datasets: [
                {
                    label: 'Deposits',
                    data: data.map(d => d.deposits),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'Orders',
                    data: data.map(d => d.orders),
                    borderColor: '#43e97b',
                    backgroundColor: 'rgba(67, 233, 123, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor },
                    display: true
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: { color: textColor },
                    grid: { color: gridColor },
                    beginAtZero: true
                }
            }
        }
    });
}

// Tab Switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Filter Functions
function filterTransactions() {
    const search = document.getElementById('transactionSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#transactionsTable tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
}

function filterOrders() {
    const search = document.getElementById('orderSearchNew').value.toLowerCase();
    
    if (!search) {
        // Reset to page 1 and show all orders
        currentOrderPage = 1;
        displayOrdersPage(1);
        renderOrdersPagination(allOrders.length);
        return;
    }

    // Filter orders
    filteredOrdersCache = allOrders.filter(o => {
        const orderId = o.id.toString().toLowerCase();
        const phone = o.phone.toLowerCase();
        const playerId = o.playerId.toLowerCase();
        const diamonds = o.diamonds.toString();
        const amount = o.amount.toString();
        const status = o.status.toLowerCase();
        
        return orderId.includes(search) || phone.includes(search) || playerId.includes(search) || 
               diamonds.includes(search) || amount.includes(search) || 
               status.includes(search);
    });

    // Display filtered results
    const tbody = document.getElementById('ordersTableNew');
    
    if (filteredOrdersCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">No matching orders found</td></tr>';
        document.getElementById('ordersPagination').innerHTML = '';
        return;
    }

    // Show first page of filtered results
    const start = 0;
    const end = ordersPerPage;
    const pageOrders = filteredOrdersCache.slice(start, end);

    tbody.innerHTML = pageOrders.map((o, index) => {
        const serialNumber = start + index + 1;
        const date = new Date(o.date);
        const formattedDate = date.toLocaleDateString('en-US') + ', ' + date.toLocaleTimeString('en-US');
        
        return `
            <tr>
                <td data-label="#">${serialNumber}</td>
                <td data-label="Order ID"><span style="font-family: monospace; font-size: 0.85em; color: var(--info-color);">${o.id}</span></td>
                <td data-label="Phone">${o.userName || 'N/A'}</td>
                <td data-label="ID/Number">${o.playerId}</td>
                <td data-label="Diamonds">${o.diamonds}</td>
                <td data-label="Amount">৳${o.amount.toLocaleString()}</td>
                <td data-label="Status"><span class="status-badge status-${o.status}">${o.status}</span></td>
                <td data-label="Date">${formattedDate}</td>
            </tr>
        `;
    }).join('');

    // Show pagination for filtered results if needed
    if (filteredOrdersCache.length > ordersPerPage) {
        const totalPages = Math.ceil(filteredOrdersCache.length / ordersPerPage);
        let paginationHtml = '<div class="pagination-controls">';
        
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            paginationHtml += `<button class="pagination-btn ${i === 1 ? 'active' : ''}" 
                                onclick="filterOrdersPage(${i})">${i}</button>`;
        }
        if (totalPages > 5) paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        
        paginationHtml += '</div>';
        document.getElementById('ordersPagination').innerHTML = paginationHtml;
    } else {
        document.getElementById('ordersPagination').innerHTML = '';
    }
}

// Switch between order tabs (All, Pending, Processing, Approved)
function switchOrderTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-orders-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-order');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    const selectedTab = document.getElementById(`ordersTab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Mark button as active
    event.target.closest('.tab-order').classList.add('active');

    // Filter and display orders based on status
    displayOrdersByStatus(tabName);
}

// Display orders filtered by status
function displayOrdersByStatus(status) {
    let filteredOrders = allOrders;

    // Filter based on status
    if (status !== 'all') {
        filteredOrders = allOrders.filter(o => {
            if (status === 'pending') {
                return o.status === 'pending';
            } else if (status === 'processing') {
                return o.status === 'processing';
            } else if (status === 'approved') {
                return o.status === 'approved';
            } else if (status === 'deleted') {
                return o.status === 'deleted';
            }
            return true;
        });
    }

    // Display on appropriate table
    const tableIds = {
        'all': 'ordersTableNew',
        'pending': 'ordersTablePending',
        'processing': 'ordersTableProcessing',
        'approved': 'ordersTableApproved',
        'deleted': 'ordersTableDeleted'
    };

    const tableId = tableIds[status];
    const tbody = document.getElementById(tableId);

    if (!tbody) {
        console.error(`Table with ID ${tableId} not found`);
        return;
    }

    if (filteredOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="loading">No ${status === 'all' ? '' : status} orders found</td></tr>`;
        return;
    }

    // Render the orders
    tbody.innerHTML = filteredOrders.map((o, index) => {
        const serialNumber = index + 1;
        const date = new Date(o.date);
        const formattedDate = date.toLocaleDateString('en-US') + ', ' + date.toLocaleTimeString('en-US');

        let statusDisplay = '';
        
        // For processing orders, show only countdown timer (no "PROCESSING" text)
        if (o.status === 'processing') {
            const approvalTime = o.processingStartedAt ? new Date(o.processingStartedAt) : new Date(o.date);
            statusDisplay = `<span class="status-badge status-${o.status}" 
                                data-order-id="${o.id}" 
                                data-start-time="${approvalTime.getTime()}"
                                title="⏳ Processing - Auto-approves in 2 minutes. Delete message to cancel.">⏳ 2:00</span>`;
        } else {
            // For other statuses, show icon + text
            let statusIcon = '';
            
            if (o.status === 'pending') {
                statusIcon = '⏳';
            } else if (o.status === 'approved') {
                statusIcon = '✅';
            } else if (o.status === 'deleted') {
                statusIcon = '🗑️';
            }
            
            statusDisplay = `<span class="status-badge status-${o.status}">${statusIcon} ${o.status.toUpperCase()}</span>`;
        }

        // Show approvedBy for approved/processing orders
        const approvedByDisplay = (o.status === 'approved' || o.status === 'processing') && o.approvedBy 
            ? `<span style="color: var(--success-color); font-weight: 600;">✅ ${o.approvedBy}</span>` 
            : '<span style="color: var(--text-secondary);">—</span>';
        
        // Format date properly
        const dateObj = new Date(o.date);
        const displayDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-US') + ', ' + dateObj.toLocaleTimeString('en-US') : 'Invalid Date';
        
        return `
            <tr>
                <td data-label="#">${serialNumber}</td>
                <td data-label="Order ID"><span style="font-family: monospace; font-size: 0.85em; color: var(--info-color);">${o.id}</span></td>
                <td data-label="User">${o.userName || 'N/A'}</td>
                <td data-label="ID/Number">${o.playerId || o.playerIdNumber || o.userPhone || 'N/A'}</td>
                <td data-label="Diamonds">${o.diamonds}</td>
                <td data-label="Amount">৳${o.amount.toLocaleString()}</td>
                <td data-label="Status">${statusDisplay}</td>
                <td data-label="Approved By">${approvedByDisplay}</td>
                <td data-label="Date">${displayDate}</td>
                <td data-label="Actions">
                    <div class="order-actions">
                        ${o.status === 'deleted' ? `<button class="btn-action btn-restore" onclick="restoreOrder('${o.id}')" title="Restore Order"><i class="fas fa-undo"></i> Restore</button>` : ''}
                        ${o.status === 'pending' ? `<button class="btn-action btn-approve" onclick="approveOrder('${o.id}')" title="Approve Order"><i class="fas fa-check"></i> Approve</button>` : ''}
                        ${o.status !== 'deleted' ? `<button class="btn-action btn-delete" onclick="deleteOrder('${o.id}')" title="Soft Delete"><i class="fas fa-trash"></i> Delete</button>` : ''}
                        ${o.status === 'deleted' ? `<button class="btn-action btn-permanent-delete" onclick="permanentDeleteOrder('${o.id}')" title="Permanent Delete" style="background: linear-gradient(135deg, #d63031 0%, #eb2f06 100%);"><i class="fas fa-times-circle"></i> Permanent</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Update Order Status (Mark as Done / Processing)
async function updateOrderStatus(orderId, status) {
    try {
        if (!confirm(`Are you sure you want to mark this order as ${status}?`)) {
            return;
        }

        const response = await fetch(`/api/orders/${orderId}/update-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status })
        });

        const data = await response.json();

        if (data.success) {
            console.log(`✅ Order ${orderId} marked as ${status}`);
            showNotification(`✅ Order marked as ${status}`, 'success');
            
            // Refresh orders immediately to show updated status
            await loadOrdersNew();
        } else {
            // ✅ NEW: Handle missing order case
            if (data.error && data.error.includes('not found') && data.error.includes('will be recovered')) {
                console.warn(`⚠️ Order ${orderId} not currently in admin panel`);
                showNotification(`⚠️ Order will be recovered from WhatsApp history as Missing Order...`, 'warning');
                showNotification(`✅ System will detect and add it as Processing order`, 'info');
                
                // Refresh after a delay to show the recovered order
                setTimeout(async () => {
                    await loadOrdersNew();
                }, 2000);
            } else {
                showNotification(`❌ Error: ${data.error}`, 'error');
            }
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification(`❌ Error updating order: ${error.message}`, 'error');
    }
}

// Approve Order (Direct approval from admin panel - no countdown)
async function approveOrder(orderId) {
    await updateOrderStatus(orderId, 'approved');
}

// Delete Order
async function deleteOrder(orderId) {
    try {
        if (!confirm('🗑️ Soft Delete: Order will be marked as deleted but can be restored. Continue?')) {
            return;
        }

        const response = await fetch(`/api/orders/${orderId}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            console.log(`✅ Order ${orderId} deleted (soft)`);
            showNotification(`✅ Order deleted (can be restored)`, 'success');
            await loadOrdersNew();
        } else {
            showNotification(`❌ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        showNotification(`❌ Error deleting order: ${error.message}`, 'error');
    }
}

// Permanent Delete Order (Completely remove from database)
async function permanentDeleteOrder(orderId) {
    try {
        if (!confirm('⚠️ PERMANENT DELETE: This will completely remove the order from database!\n\n❌ This action CANNOT be undone!\n✅ Missing order detection will trigger if this is a recent order.\n\nAre you absolutely sure?')) {
            return;
        }

        const response = await fetch(`/api/orders/${orderId}/permanent-delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            console.log(`✅ Order ${orderId} permanently deleted`);
            showNotification(`✅ Order permanently deleted from database`, 'warning');
            await loadOrdersNew();
        } else {
            showNotification(`❌ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error permanently deleting order:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    }
}

// Restore Order (Undo deletion)
async function restoreOrder(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            console.log(`✅ Order ${orderId} restored`);
            showNotification(`✅ Order restored`, 'success');
            await loadOrdersNew();
        } else {
            showNotification(`❌ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error restoring order:', error);
        showNotification(`❌ Error restoring order: ${error.message}`, 'error');
    }
}

// ✅ NEW: Recover Missing Orders from WhatsApp
async function recoverMissingOrders() {
    try {
        // Get current group from the selected tab or use first group
        let groupId = currentGroupId || (allGroups && allGroups.length > 0 ? allGroups[0].id : null);
        
        if (!groupId) {
            showNotification(`⚠️ No group selected. Please select a group first.`, 'warning');
            return;
        }
        
        console.log(`[MISSING ORDER RECOVERY] 🔄 Triggering recovery for group ${groupId}`);
        showNotification(`🔄 Scanning WhatsApp history for missing orders...`, 'info');
        
        const response = await fetch(`/api/recover-missing-orders/${groupId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Missing order recovery triggered`);
            console.log(`[MISSING ORDER RECOVERY] 📊 Recovered ${data.recoveredCount} orders`);
            
            if (data.recoveredCount > 0) {
                showNotification(`✅ Found ${data.recoveredCount} missing order(s)!`, 'success');
                showNotification(`📌 Orders added as "Processing" - will auto-approve in 2 minutes`, 'info');
                
                // Refresh orders to show recovered ones
                setTimeout(async () => {
                    await loadOrdersNew();
                }, 1500);
            } else {
                showNotification(`✅ No missing orders found. All orders are up to date.`, 'success');
            }
        } else {
            showNotification(`❌ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error recovering missing orders:', error);
        showNotification(`❌ Error: ${error.message}`, 'error');
    }
}

// ============================================
// ALL ORDERS VIEW FUNCTIONS
// ============================================

// Show orders for a specific group
async function showGroupOrders(groupId, groupName) {
    try {
        // Clear any previous filters immediately
        window.filteredAllOrders = null;
        window.currentGroupId = groupId;
        window.currentGroupName = groupName;
        
        console.log(`📍 showGroupOrders STARTED with groupId=${groupId}, groupName=${groupName}`);
        
        // Get the group from already-loaded allGroups array
        const group = allGroups.find(g => g.id === groupId);
        
        console.log(`🔍 Searching in allGroups (${allGroups.length} groups) for id: ${groupId}`);
        console.log(`✓ Found group: ${group ? group.name : 'NOT FOUND'}`);
        
        if (!group || !group.entries) {
            console.error(`❌ Group not found or no entries for id: ${groupId}`);
            showNotification('❌ Group not found', 'error');
            return;
        }

        console.log(`📦 Group "${group.name}" has ${group.entries.length} entries`);

        // Update view header with group name
        const viewHeader = document.querySelector('#allOrdersView .view-header h1');
        if (viewHeader) {
            viewHeader.innerHTML = `<i class="fas fa-list"></i> Orders from ${groupName}`;
        }

        // Store ONLY this group's orders - brand new array
        let groupOrders = [];
        for (const order of group.entries) {
            const orderWithGroup = {
                ...order,
                groupId: group.id,
                groupName: group.name,
                rate: group.rate  // 🔧 Add group rate for amount calculation
            };
            groupOrders.push(orderWithGroup);
            console.log(`  Added order #${order.id} to groupOrders`);
        }

        // Sort by date (newest first)
        groupOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log(`✅ FINAL: Created groupOrders array with ${groupOrders.length} orders ONLY`);

        // Store globally - THIS WILL BE THE ONLY SOURCE OF TRUTH
        window.allGroupOrders = groupOrders;
        window.currentGroupId = groupId;
        window.currentGroupName = groupName;
        
        console.log(`💾 STORED: window.allGroupOrders.length = ${window.allGroupOrders.length}`);
        console.log(`💾 STORED: window.currentGroupId = "${window.currentGroupId}"`);
        console.log(`💾 STORED: window.currentGroupName = "${window.currentGroupName}"`);

        if (groupOrders.length === 0) {
            const tbody = document.getElementById('allOrdersTableBody');
            tbody.innerHTML = `<tr><td colspan="8" style="padding: 20px; text-align: center; color: var(--text-secondary);"><i class="fas fa-inbox"></i> No orders found in this group</td></tr>`;
            document.getElementById('allOrdersPagination').innerHTML = '';
        } else {
            // Display first page - this will use window.allGroupOrders which has only this group's orders
            displayAllOrdersPage(1);
            updateAllOrdersPagination(groupOrders);
        }

        // Switch to view
        showView('allOrdersView');
        console.log(`🎉 SUCCESS: Displayed ${groupOrders.length} orders from group: ${groupName}`);
    } catch (error) {
        console.error('❌ Error loading group orders:', error);
        showNotification('❌ Error loading orders', 'error');
    }
}

// Load all orders from all groups
async function loadAllGroupOrders() {
    try {
        const tbody = document.getElementById('allOrdersTableBody');
        if (!tbody) return;

        // 🔒 IMPORTANT: If we're in a group-specific view, DON'T override it!
        if (window.currentGroupId) {
            console.log(`🔒 In group-specific view (${window.currentGroupName}), ignoring loadAllGroupOrders() call`);
            return; // Don't load all orders if we're viewing a specific group
        }

        // Clear group-specific filter
        window.currentGroupId = null;
        window.filteredAllOrders = null;

        // Reset header
        const viewHeader = document.querySelector('#allOrdersView .view-header h1');
        if (viewHeader) {
            viewHeader.innerHTML = `<i class="fas fa-list"></i> All Orders`;
        }

        // Initialize items per page to default 10
        window.itemsPerPage = 10;
        window.currentAllOrdersPage = 1;

        tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading all orders...</td></tr>';

        const response = await fetch('/api/groups');
        const groups = await response.json();

        let allOrders = [];

        // Collect all orders from all groups
        for (const group of groups) {
            if (group.entries && group.entries.length > 0) {
                for (const order of group.entries) {
                    allOrders.push({
                        ...order,
                        groupId: group.id,
                        groupName: group.name,
                        rate: group.rate  // 🔧 Add group rate for amount calculation
                    });
                }
            }
        }

        // Sort by date (newest first)
        allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Clear group filter
        window.currentGroupId = null;
        window.currentGroupName = null;

        // Store all orders globally
        window.allGroupOrders = allOrders;

        if (allOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="padding: 20px; text-align: center; color: var(--text-secondary);"><i class="fas fa-inbox"></i> No orders found</td></tr>';
            document.getElementById('allOrdersPagination').innerHTML = '';
            return;
        }

        // Display first page
        displayAllOrdersPage(1);
        updateAllOrdersPagination(allOrders);

        console.log(`✅ Loaded ${allOrders.length} orders from ${groups.length} groups`);
    } catch (error) {
        console.error('Error loading all orders:', error);
        showNotification('❌ Error loading orders', 'error');
    }
}

// Display orders on a specific page
function displayAllOrdersPage(page) {
    const tbody = document.getElementById('allOrdersTableBody');
    if (!tbody) return;

    // Use filtered orders if searching, otherwise use all orders
    // NOTE: window.allGroupOrders may contain only current group if viewed via showGroupOrders()
    let ordersToUse = window.filteredAllOrders || window.allGroupOrders || [];
    
    if (ordersToUse.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding: 20px; text-align: center; color: var(--text-secondary);"><i class="fas fa-inbox"></i> No orders found</td></tr>';
        document.getElementById('allOrdersPagination').innerHTML = '';
        return;
    }

    // Get items per page from window variable (default 10)
    const itemsPerPage = window.itemsPerPage || 10;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const ordersToDisplay = ordersToUse.slice(startIndex, endIndex);

    tbody.innerHTML = ordersToDisplay.map(order => {
        const date = new Date(order.createdAt);
        const formattedDate = date.toLocaleString();

        const statusColors = {
            'approved': '#10b981',
            'pending': '#f59e0b',
            'processing': '#3b82f6',
            'rejected': '#ef4444'
        };

        const statusBg = {
            'approved': '#10b98133',
            'pending': '#f59e0b33',
            'processing': '#3b82f633',
            'rejected': '#ef444433'
        };

        const statusColor = statusColors[order.status] || '#4facfe';
        const statusBgColor = statusBg[order.status] || '#4facfe33';

        // 🎮 DISPLAY PLAYER ID: Use playerIdNumber, playerId, or fallback
        const displayPlayerId = (order.playerIdNumber || order.playerId || order.userPhone || order.userId || 'N/A').toString().split('\n')[0];

        return `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td><span style="background: rgba(102, 126, 234, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">${order.groupName || order.groupId}</span></td>
                <td>${order.userName || order.userId}</td>
                <td><span style="font-family: monospace; font-size: 0.85em; color: var(--info-color);">${displayPlayerId}</span></td>
                <td><strong>${order.diamonds} 💎</strong></td>
                <td>৳${(order.amount || Math.round(order.diamonds * (order.rate || 2.13))).toLocaleString()}</td>
                <td>
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;
                        background: ${statusBgColor};
                        color: ${statusColor};">
                        ${order.status.toUpperCase()}
                    </span>
                </td>
                <td>${formattedDate}</td>
            </tr>
        `;
    }).join('');

    // Update pagination
    updateAllOrdersPagination(ordersToUse);

    // Store current page
    window.currentAllOrdersPage = page;
}

// Update pagination for all orders
function updateAllOrdersPagination(orders) {
    const container = document.getElementById('allOrdersPagination');
    if (!container || !orders) return;

    // Get items per page from window variable (default 10)
    const itemsPerPage = window.itemsPerPage || 10;
    
    // If "All" is selected, don't show pagination
    if (itemsPerPage === 'all') {
        container.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(orders.length / itemsPerPage);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const currentPage = window.currentAllOrdersPage || 1;
    let html = '<div class="pagination-buttons-container">';

    // Previous button
    if (currentPage > 1) {
        html += `<button class="pagination-btn" onclick="displayAllOrdersPage(${currentPage - 1})">← Previous</button>`;
    }

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="displayAllOrdersPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="pagination-dots">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<button class="pagination-btn active">${i}</button>`;
        } else {
            html += `<button class="pagination-btn" onclick="displayAllOrdersPage(${i})">${i}</button>`;
        }
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="pagination-dots">...</span>`;
        html += `<button class="pagination-btn" onclick="displayAllOrdersPage(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    if (currentPage < totalPages) {
        html += `<button class="pagination-btn" onclick="displayAllOrdersPage(${currentPage + 1})">Next →</button>`;
    }

    html += '</div>';
    container.innerHTML = html;

    // Store current page
    window.currentAllOrdersPage = currentPage;
}

// Switch between all orders tabs
function switchAllOrdersTab(tabName) {
    // Filter orders by status
    let filteredOrders = window.allGroupOrders || [];

    if (tabName !== 'all') {
        filteredOrders = filteredOrders.filter(o => o.status === tabName);
    }

    // Update global variable
    window.filteredAllOrders = filteredOrders;

    // Update tab buttons
    document.querySelectorAll('.tab-order').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.tab-order').classList.add('active');

    // Display filtered orders
    displayAllOrdersPage(1);
    updateAllOrdersPagination(filteredOrders);
}

// Filter all orders by search
function filterAllOrders() {
    const searchInput = document.getElementById('allOrdersSearch');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();
    
    // Use allGroupOrders which contains only the current group's orders
    const allOrders = window.allGroupOrders || [];
    
    // If we have a currentGroupId, ensure we only filter orders from that group
    const ordersToFilter = window.currentGroupId 
        ? allOrders.filter(order => order.groupId === window.currentGroupId)
        : allOrders;

    let filteredOrders = ordersToFilter.filter(order => 
        order.id.toString().includes(searchTerm) ||
        (order.groupName && order.groupName.toLowerCase().includes(searchTerm)) ||
        (order.userName && order.userName.toLowerCase().includes(searchTerm)) ||
        (order.userPhone && order.userPhone.includes(searchTerm)) ||
        (order.playerId && order.playerId.toString().includes(searchTerm)) ||
        order.diamonds.toString().includes(searchTerm)
    );

    window.filteredAllOrders = filteredOrders;
    displayAllOrdersPage(1);
    updateAllOrdersPagination(filteredOrders);
}

// Change items per page for all orders
function changeAllOrdersItemsPerPage(pageSize) {
    // Convert to number or string 'all'
    if (pageSize === 'all') {
        window.itemsPerPage = 'all';
    } else {
        window.itemsPerPage = parseInt(pageSize);
    }

    // Reset to page 1 and refresh display
    window.currentAllOrdersPage = 1;
    displayAllOrdersPage(1);

    // Update dropdown selection
    const select = document.getElementById('allOrdersPageSizeSelect');
    if (select) {
        select.value = pageSize;
    }
}

// Modal Functions
function showUsersModal() {
    fetch('/api/users')
        .then(res => {
            console.log('User API Response Status:', res.status);
            return res.json();
        })
        .then(users => {
            console.log('Users received:', users);
            console.log('Users count:', users.length);
            
            const modal = `
                <div class="modal" onclick="closeModal(event)">
                    <div class="modal-content large-modal" onclick="event.stopPropagation()">
                        <div class="modal-header">
                            <h2><i class="fas fa-users"></i> User Management (${users.length})</h2>
                            <button class="modal-close" onclick="closeModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="search-bar">
                                <i class="fas fa-search"></i>
                                <input type="text" id="userSearch" placeholder="Search by name or phone..." onkeyup="filterUserCards()">
                            </div>
                            <div class="users-grid-container" id="usersGridContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-top: 20px;">
                                ${users.length > 0 ? users.map(u => `
                                    <div class="user-card" data-phone="${u.phone}" data-name="${u.name || 'N/A'}">
                                        <div class="user-card-header">
                                            <div class="user-info">
                                                <h3 class="user-name">${u.name || 'Unknown'}</h3>
                                                <span class="user-phone">${u.phone}</span>
                                            </div>
                                            <button class="user-block-btn ${u.status === 'blocked' ? 'blocked' : ''}" 
                                                    onclick="event.stopPropagation(); toggleUserBlock('${u.phone}')" 
                                                    title="${u.status === 'active' ? 'Block user' : 'Unblock user'}">
                                                <i class="fas fa-${u.status === 'active' ? 'lock-open' : 'lock'}"></i>
                                            </button>
                                        </div>
                                        <div class="user-card-body">
                                            <div class="user-stat">
                                                <span class="stat-label">Main Balance</span>
                                                <span class="stat-value">৳${(u.balance || 0).toLocaleString()}</span>
                                            </div>
                                            <div class="user-stat">
                                                <span class="stat-label">Due Balance</span>
                                                <span class="stat-value ${(u.dueBalance || 0) > 0 ? 'danger' : ''}">৳${(u.dueBalance || 0).toLocaleString()}</span>
                                            </div>
                                            <div class="user-stat">
                                                <span class="stat-label">Total Orders</span>
                                                <span class="stat-value">${u.totalOrders || 0}</span>
                                            </div>
                                        </div>
                                        <div class="user-card-footer">
                                            <button class="btn-edit-user" onclick="showEditUserModal('${u.phone}')">
                                                <i class="fas fa-edit"></i> Edit Details
                                            </button>
                                        </div>
                                    </div>
                                `).join('') : '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">No users found</div>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('modalContainer').innerHTML = modal;

        })
        .catch(error => {
            console.error('Error fetching users:', error);
            alert('Error loading users. Check console for details.');
        });
}

function showEditUserModal(phone) {
    Promise.all([
        fetch(`/api/users/${phone}`).then(res => res.json()),
        fetch('/api/groups').then(res => res.json())
    ])
    .then(([user, groups]) => {
        // Find which group(s) this user belongs to
        const userGroups = [];
        if (Array.isArray(groups)) {
            groups.forEach(group => {
                if (group.entries) {
                    const hasUser = group.entries.some(entry => 
                        entry.userId === phone || 
                        entry.phone === phone || 
                        entry.userName === phone
                    );
                    if (hasUser) {
                        userGroups.push({
                            id: group.id,
                            name: group.name
                        });
                    }
                }
            });
        }

        // If phone is found in modal context (editing from group view), use that
        const currentGroupId = window.editingFromGroupId || (userGroups.length > 0 ? userGroups[0].id : null);

        const modal = `
            <div class="modal" onclick="closeModal(event)">
                <div class="modal-content edit-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2><i class="fas fa-user-edit"></i> Edit User - ${user.name || 'Unknown'}</h2>
                        <button class="modal-close" onclick="closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Phone:</label>
                            <input type="text" value="${phone}" disabled class="form-input">
                        </div>

                        <div class="form-group">
                            <label>Name:</label>
                            <input type="text" id="editUserName" value="${user.name || ''}" placeholder="User name" class="form-input">
                        </div>

                        ${userGroups.length > 0 ? `
                        <div class="form-group">
                            <label>Group:</label>
                            <select id="editUserGroup" class="form-input" style="cursor: pointer;">
                                ${userGroups.map(g => `<option value="${g.id}" ${g.id === currentGroupId ? 'selected' : ''}>${g.name}</option>`).join('')}
                            </select>
                            <small style="color: var(--text-secondary); margin-top: 5px; display: block;">This user belongs to: ${userGroups.map(g => g.name).join(', ')}</small>
                        </div>
                        ` : ''}

                        <div class="form-group">
                            <label>Main Balance:</label>
                            <div class="input-button-group">
                                <input type="number" id="editUserBalance" value="${user.balance || 0}" placeholder="0" class="form-input">
                                <button onclick="addMainBalance('${phone}', 100)" class="btn-add">+100</button>
                                <button onclick="addMainBalance('${phone}', 500)" class="btn-add">+500</button>
                                <button onclick="addMainBalance('${phone}', 1000)" class="btn-add">+1K</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Due Balance:</label>
                            <div class="input-button-group">
                                <input type="number" id="editUserDue" value="${user.dueBalance || 0}" placeholder="0" class="form-input">
                                <button onclick="addDueBalance('${phone}', 100)" class="btn-add">+100</button>
                                <button onclick="addDueBalance('${phone}', 500)" class="btn-add">+500</button>
                                <button onclick="addDueBalance('${phone}', 1000)" class="btn-add">+1K</button>
                            </div>
                        </div>

                        <div class="form-group button-group">
                            <button onclick="saveUserChanges('${phone}', '${currentGroupId || ''}')" class="btn-save">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                            <button onclick="closeModal()" class="btn-cancel">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modalContainer').innerHTML = modal;
        window.editingFromGroupId = null; // Clear after use
    })
    .catch(err => alert('Error loading user: ' + err.message));
}

function addMainBalance(phone, amount) {
    const currentValue = parseInt(document.getElementById('editUserBalance').value) || 0;
    document.getElementById('editUserBalance').value = currentValue + amount;
}

function addDueBalance(phone, amount) {
    const currentValue = parseInt(document.getElementById('editUserDue').value) || 0;
    document.getElementById('editUserDue').value = currentValue + amount;
}

function saveUserChanges(phone, groupId) {
    const name = document.getElementById('editUserName').value.trim();
    const balance = parseInt(document.getElementById('editUserBalance').value) || 0;
    const due = parseInt(document.getElementById('editUserDue').value) || 0;

    if (!name) {
        alert('Please enter user name');
        return;
    }

    fetch(`/api/users/${phone}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, balance, dueBalance: due, groupId: groupId || null })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('User updated successfully!');
            closeModal();
            // Wait a moment for DOM to update then refresh modal
            setTimeout(() => {
                showUsersModal();
            }, 300);
        } else {
            alert('Error: ' + (data.error || 'Failed to update user'));
        }
    })
    .catch(err => alert('Error: ' + err.message));
}

async function toggleUserBlock(phone) {
    try {
        const response = await fetch(`/api/users/${phone}/toggle-block`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
            showToast('User status updated', 'success');
            showUsersModal(); // Refresh modal
        }
    } catch (error) {
        showToast('Error updating user status', 'error');
    }
}

function showPaymentNumbersModal() {
    // Fetch payment system status from server
    fetch('/api/payment-system/status', {
        headers: {
            'Authorization': localStorage.getItem('authToken') || ''
        }
    })
    .then(res => res.json())
    .then(statusData => {
        // Update localStorage with server status
        localStorage.setItem('paymentSystemEnabled', statusData.enabled);
        
        // Now fetch payment numbers
        return fetch('/api/payment-numbers', {
            headers: {
                'Authorization': localStorage.getItem('authToken') || ''
            }
        }).then(res => res.json());
    })
    .then(data => {
        // Get current payment system status from server sync
        const isEnabled = localStorage.getItem('paymentSystemEnabled') !== 'false';
        
        const modal = `
            <div class="modal" onclick="closeModal(event)">
                <div class="modal-content large-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                            <h2><i class="fas fa-credit-card"></i> Payment Numbers</h2>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <button class="btn-toggle-payment" onclick="togglePaymentSystem()" style="padding: 8px 16px; border: none; border-radius: 6px; background: ${isEnabled ? '#43e97b' : '#666'}; color: white; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.3s ease;">
                                    <i class="fas fa-${isEnabled ? 'toggle-on' : 'toggle-off'}"></i> ${isEnabled ? 'ON' : 'OFF'}
                                </button>
                                <button class="modal-close" onclick="closeModal()">&times;</button>
                            </div>
                        </div>
                        <div class="modal-body">
                            ${isEnabled ? `
                            <div style="margin-bottom: 20px;">
                                <button onclick="showAddPaymentModal()" class="btn-primary" style="padding: 10px 20px; border: none; border-radius: 8px; background: #667eea; color: white; cursor: pointer; font-weight: 600;">
                                    <i class="fas fa-plus"></i> Add New Payment Number
                                </button>
                            </div>
                            
                            <div style="display: grid; gap: 20px;">
                                ${data.paymentNumbers && data.paymentNumbers.length > 0 ? data.paymentNumbers.map((payment, idx) => `
                                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; border-left: 4px solid #667eea;">
                                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                                            <div>
                                                <h4 style="margin: 0 0 5px 0; color: #4facfe;">${payment.method}</h4>
                                                <p style="margin: 0; color: #aaa; font-size: 0.9rem;">
                                                    ${payment.isBank ? `<strong>Bank Account</strong>` : '<strong>Mobile Payment</strong>'}
                                                </p>
                                            </div>
                                            <div style="display: flex; gap: 8px;">
                                                <button onclick="deletePaymentNumber(${idx})" style="padding: 6px 12px; background: #f5576c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                                                    <i class="fas fa-trash"></i> Delete
                                                </button>
                                            </div>
                                        </div>
                                        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.95rem; margin-top: 10px;">
                                            ${payment.isBank ? `
                                                <div style="margin-bottom: 8px;">
                                                    <strong>Account Number:</strong> <span style="color: #43e97b;">${payment.accountNumber}</span>
                                                </div>
                                                <div style="margin-bottom: 8px;">
                                                    <strong>Account Name:</strong> <span>${payment.accountName}</span>
                                                </div>
                                                <div style="margin-bottom: 8px;">
                                                    <strong>Branch:</strong> <span>${payment.branch}</span>
                                                </div>
                                                <div>
                                                    <strong>Type:</strong> <span>${payment.type}</span>
                                                </div>
                                            ` : `
                                                <div>
                                                    <strong>Number:</strong> <span style="color: #43e97b;">${payment.number}</span>
                                                </div>
                                                <div style="margin-top: 5px;">
                                                    <strong>Type:</strong> <span>${payment.type}</span>
                                                </div>
                                            `}
                                        </div>
                                    </div>
                                `).join('') : '<p style="color: #aaa; text-align: center; padding: 20px;">No payment numbers added yet</p>'}
                            </div>
                            ` : `
                            <div style="text-align: center; padding: 40px 20px; color: #aaa;">
                                <i class="fas fa-toggle-off" style="font-size: 3rem; margin-bottom: 20px; display: block; color: #666;"></i>
                                <h3 style="color: #eee; margin-bottom: 10px;">Payment System is OFF</h3>
                                <p>The payment numbers section is currently disabled.</p>
                                <p style="margin-top: 20px; font-size: 0.9rem;">Click the <strong>ON</strong> button above to enable it.</p>
                            </div>
                            `}
                    </div>
                </div>
            `;
            document.getElementById('modalContainer').innerHTML = modal;
        });
}

// Toggle Payment System ON/OFF
function togglePaymentSystem() {
    const isEnabled = localStorage.getItem('paymentSystemEnabled') !== 'false';
    const newState = !isEnabled;
    
    // Update localStorage
    localStorage.setItem('paymentSystemEnabled', newState);
    
    // Call API to persist on server side (bot will check this)
    fetch('/api/payment-system/toggle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('authToken') || ''
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('[PAYMENT-TOGGLE] ✅', data.message);
        } else {
            console.error('[PAYMENT-TOGGLE] ❌ Failed:', data.error);
        }
        // Refresh the modal to show updated state
        showPaymentNumbersModal();
    })
    .catch(error => {
        console.error('[PAYMENT-TOGGLE] Error:', error);
        // Still refresh even if API fails
        showPaymentNumbersModal();
    });
}

function showAddPaymentModal() {
    const modal = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-plus-circle"></i> Add Payment Number</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Payment Type:</label>
                        <select id="paymentType" onchange="updatePaymentForm()" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #2d3561; background: #16213e; color: #eee; font-size: 1rem;">
                            <option value="mobile">Mobile Payment (Bkash, Nagad, Rocket)</option>
                            <option value="bank">Bank Account</option>
                        </select>
                    </div>
                    
                    <div id="mobileForm">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Payment Method:</label>
                            <select id="method" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #2d3561; background: #16213e; color: #eee; font-size: 1rem;">
                                <option value="Bkash">Bkash</option>
                                <option value="Nagad">Nagad</option>
                                <option value="Rocket">Rocket</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Phone Number:</label>
                            <input type="text" id="number" placeholder="01700000000" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #2d3561; background: #16213e; color: #eee; font-size: 1rem; box-sizing: border-box;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Account Type:</label>
                            <select id="type" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #2d3561; background: #16213e; color: #eee; font-size: 1rem;">
                                <option value="Personal">Personal</option>
                                <option value="Agent">Agent</option>
                                <option value="Merchant">Merchant</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="bankForm" style="display: none;">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Bank Name:</label>
                            <input type="text" id="bankMethod" placeholder="e.g., Islami Bank" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #2d3561; background: #16213e; color: #eee; font-size: 1rem; box-sizing: border-box;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Account Number:</label>
                            <input type="text" id="accountNumber" placeholder="123456789" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #2d3561; background: #16213e; color: #eee; font-size: 1rem; box-sizing: border-box;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Account Name:</label>
                            <input type="text" id="accountName" placeholder="e.g., MD Rubel Mia" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #2d3561; background: #16213e; color: #eee; font-size: 1rem; box-sizing: border-box;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Branch:</label>
                            <input type="text" id="branch" placeholder="e.g., Mymensingh" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #2d3561; background: #16213e; color: #eee; font-size: 1rem; box-sizing: border-box;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Account Type:</label>
                            <select id="bankType" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #2d3561; background: #16213e; color: #eee; font-size: 1rem;">
                                <option value="Savings">Savings</option>
                                <option value="Current">Current</option>
                                <option value="Business">Business</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button onclick="savePaymentNumber()" style="flex: 1; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                            Save Payment Number
                        </button>
                        <button onclick="closeModal()" style="flex: 1; padding: 12px; background: #2d3561; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
}

function updatePaymentForm() {
    const type = document.getElementById('paymentType').value;
    document.getElementById('mobileForm').style.display = type === 'mobile' ? 'block' : 'none';
    document.getElementById('bankForm').style.display = type === 'bank' ? 'block' : 'none';
}

function savePaymentNumber() {
    const type = document.getElementById('paymentType').value;
    
    let payload;
    if (type === 'mobile') {
        payload = {
            method: document.getElementById('method').value,
            number: document.getElementById('number').value,
            type: document.getElementById('type').value,
            isBank: false
        };
    } else {
        payload = {
            method: document.getElementById('bankMethod').value,
            number: document.getElementById('accountNumber').value,
            accountNumber: document.getElementById('accountNumber').value,
            accountName: document.getElementById('accountName').value,
            branch: document.getElementById('branch').value,
            type: document.getElementById('bankType').value,
            isBank: true
        };
    }
    
    fetch('/api/payment-numbers/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Payment number added successfully!');
            closeModal();
            showPaymentNumbersModal();
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(err => alert('Error: ' + err.message));
}

function deletePaymentNumber(idx) {
    if (confirm('Are you sure you want to delete this payment number?')) {
        fetch(`/api/payment-numbers/delete/${idx}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showPaymentNumbersModal();
                } else {
                    alert('Error deleting payment number');
                }
            });
    }
}

function showWhatsAppAdminModal() {
    // Fetch only active admins - simple and fast
    fetch('/api/whatsapp-admins').then(res => res.json())
    .then(data => {
        const admins = data.whatsappAdmins || [];
        
        const modal = `
            <div class="modal" onclick="closeModal(event)">
                <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2><i class="fab fa-whatsapp"></i> WhatsApp Admins (${admins.length})</h2>
                        <button class="modal-close" onclick="closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 20px;">
                            <button onclick="showAddWhatsAppAdminModal()" class="btn-primary" style="padding: 10px 20px; border: none; border-radius: 8px; background: #25d366; color: white; cursor: pointer; font-weight: 600; width: 100%;">
                                <i class="fas fa-plus"></i> Add New Admin
                            </button>
                        </div>
                        
                        <div style="display: grid; gap: 12px; max-height: 400px; overflow-y: auto;">
                            ${admins && admins.length > 0 ? admins.map((admin, idx) => `
                                <div style="background: rgba(37, 211, 102, 0.1); padding: 12px; border-radius: 8px; border-left: 3px solid #25d366; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-weight: 600; color: #25d366;">📱 ${admin.phone}</div>
                                        <p style="margin: 3px 0 0 0; color: #aaa; font-size: 0.85rem;">Added: ${new Date(admin.addedAt).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'})}</p>
                                    </div>
                                    <button onclick="deleteWhatsAppAdmin(${idx})" style="padding: 5px 10px; background: #f5576c; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem;">
                                        <i class="fas fa-trash"></i> Remove
                                    </button>
                                </div>
                            `).join('') : '<p style="color: #aaa; text-align: center; padding: 30px;">No admins yet</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modalContainer').innerHTML = modal;
    })
    .catch(err => {
        alert('Error loading WhatsApp admins: ' + err.message);
    });
}

function showAddWhatsAppAdminModal() {
    const modal = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fab fa-whatsapp"></i> Add WhatsApp Admin</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Country Code:</label>
                        <select id="countryCode" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #2d3561; background: #16213e; color: #eee; font-size: 1rem; box-sizing: border-box;">
                            <option value="880">🇧🇩 Bangladesh (+880)</option>
                            <option value="91">🇮🇳 India (+91)</option>
                            <option value="92">🇵🇰 Pakistan (+92)</option>
                            <option value="886">🇹🇼 Taiwan (+886)</option>
                            <option value="1">🇺🇸 USA/Canada (+1)</option>
                            <option value="44">🇬🇧 UK (+44)</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Phone Number:</label>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span style="background: #2d3561; padding: 10px 12px; border-radius: 6px; border: 1px solid #2d3561; color: #aaa; font-weight: 600; min-width: 60px;">
                                +<span id="selectedCountryCode">880</span>
                            </span>
                            <input type="text" id="adminPhone" placeholder="e.g., 1700000000 or 17-0000-0000" style="flex: 1; padding: 10px; border-radius: 6px; border: 1px solid #2d3561; background: #16213e; color: #eee; font-size: 1rem; box-sizing: border-box;">
                        </div>
                        <p style="color: #aaa; font-size: 0.85rem; margin-top: 5px;">Enter number without country code (e.g., 1700000000)</p>
                    </div>
                    
                    <div style="background: rgba(37, 211, 102, 0.1); padding: 12px; border-radius: 6px; border-left: 3px solid #25d366; margin-bottom: 20px;">
                        <p style="margin: 0; color: #aaa; font-size: 0.9rem;">
                            <i class="fas fa-info-circle"></i> This admin will have special WhatsApp permissions for managing orders and group notifications.
                        </p>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button onclick="saveWhatsAppAdmin()" style="flex: 1; padding: 12px; background: #25d366; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                            Add Admin
                        </button>
                        <button onclick="closeModal()" style="flex: 1; padding: 12px; background: #2d3561; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
    
    // Update country code display when changed
    document.getElementById('countryCode').addEventListener('change', function() {
        document.getElementById('selectedCountryCode').textContent = this.value;
    });
}

function saveWhatsAppAdmin() {
    const countryCode = document.getElementById('countryCode').value.trim();
    const phoneNumber = document.getElementById('adminPhone').value.trim();
    
    if (!phoneNumber) {
        alert('Please enter a phone number');
        return;
    }
    
    // Remove any special characters or spaces from phone number
    const cleanedPhone = phoneNumber.replace(/[-\s]/g, '');
    
    // Combine country code and phone number
    const fullPhone = countryCode + cleanedPhone;
    
    fetch('/api/whatsapp-admins/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('WhatsApp admin added successfully!');
            closeModal();
            showWhatsAppAdminModal();
        } else {
            alert('Error: ' + (data.error || 'Failed to add admin'));
        }
    })
    .catch(err => alert('Error: ' + err.message));
}

function deleteWhatsAppAdmin(idx) {
    if (confirm('Are you sure you want to remove this WhatsApp admin?')) {
        fetch(`/api/whatsapp-admins/delete/${idx}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showWhatsAppAdminModal();
                } else {
                    alert('Error deleting admin');
                }
            })
            .catch(err => alert('Error: ' + err.message));
    }
}

function blockWhatsAppAdmin(phone) {
    if (confirm(`Block admin ${phone} from approving orders?`)) {
        fetch('/api/whatsapp-admins/block', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Admin blocked successfully');
                showWhatsAppAdminModal();
            } else {
                alert('Error blocking admin: ' + data.error);
            }
        })
        .catch(err => alert('Error: ' + err.message));
    }
}

function unblockWhatsAppAdmin(phone) {
    if (confirm(`Unblock admin ${phone}?`)) {
        fetch('/api/whatsapp-admins/unblock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Admin unblocked successfully');
                showWhatsAppAdminModal();
            } else {
                alert('Error unblocking admin: ' + data.error);
            }
        })
        .catch(err => alert('Error: ' + err.message));
    }
}

function showAdminLogsModal() {
    fetch('/api/admin-logs')
        .then(res => res.json())
        .then(logs => {
            const modal = `
                <div class="modal" onclick="closeModal(event)">
                    <div class="modal-content" onclick="event.stopPropagation()">
                        <div class="modal-header">
                            <h2><i class="fas fa-clipboard-list"></i> Admin Logs</h2>
                            <button class="modal-close" onclick="closeModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div style="max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 0.9rem;">
                                ${logs.map(log => `<div style="margin-bottom: 5px;">${log}</div>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('modalContainer').innerHTML = modal;
        });
}

function showAnalyticsModal() {
    fetch('/api/analytics')
        .then(res => res.json())
        .then(data => {
            const modal = `
                <div class="modal" onclick="closeModal(event)">
                    <div class="modal-content" onclick="event.stopPropagation()">
                        <div class="modal-header">
                            <h2><i class="fas fa-chart-pie"></i> Advanced Analytics</h2>
                            <button class="modal-close" onclick="closeModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <h3>Last 7 Days Performance</h3>
                            <div class="chart-container" style="height: 300px;">
                                <canvas id="modalAnalyticsChart"></canvas>
                            </div>
                            <div style="margin-top: 20px;">
                                <h4>Summary</h4>
                                <p>Total Deposits: ৳${data.last7Days.reduce((sum, d) => sum + d.deposits, 0).toLocaleString()}</p>
                                <p>Total Orders: ${data.last7Days.reduce((sum, d) => sum + d.orders, 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('modalContainer').innerHTML = modal;
            
            // Render chart in modal
            const ctx = document.getElementById('modalAnalyticsChart');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.last7Days.map(d => new Date(d.date).toLocaleDateString('bn-BD')),
                    datasets: [
                        {
                            label: 'Deposits',
                            data: data.last7Days.map(d => d.deposits),
                            backgroundColor: 'rgba(102, 126, 234, 0.5)',
                        },
                        {
                            label: 'Orders',
                            data: data.last7Days.map(d => d.orders),
                            backgroundColor: 'rgba(67, 233, 123, 0.5)',
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        });
}

function showSettingsModal() {
    const modal = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-cog"></i> Settings</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <h3>Appearance</h3>
                    <div style="margin: 15px 0;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" ${currentTheme === 'light' ? 'checked' : ''} 
                                   onchange="toggleThemeFromSettings()" id="themeCheckbox">
                            <span>Light Mode</span>
                        </label>
                    </div>
                    
                    <h3 style="margin-top: 25px;">Language</h3>
                    <div style="margin: 15px 0;">
                        <select onchange="changeLanguage(this.value)" style="width: 100%; padding: 10px; border-radius: 8px; background: var(--dark-bg); color: var(--text-primary); border: 1px solid var(--border-color);">
                            <option value="bn" ${currentLang === 'bn' ? 'selected' : ''}>Bangla</option>
                            <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
                        </select>
                    </div>
                    
                    <h3 style="margin-top: 25px;"><i class="fas fa-bell"></i> Notification Sound</h3>
                    <div style="margin: 15px 0;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; margin-bottom: 10px;">
                            <input type="checkbox" id="notificationEnabledCheckbox" 
                                   ${localStorage.getItem('notificationEnabled') !== 'false' ? 'checked' : ''}>
                            <span>Enable Order Notifications</span>
                        </label>
                        
                        <div style="margin: 15px 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-secondary);">
                                <i class="fas fa-music"></i> Select Sound:
                            </label>
                            <select id="notificationSoundSelect" 
                                    style="width: 100%; padding: 10px; border-radius: 8px; background: var(--dark-bg); color: var(--text-primary); border: 1px solid var(--border-color);">
                                <option value="">-- No Sound --</option>
                                <option value="mixkit-bell-notification-933.wav" ${localStorage.getItem('notificationSound') === 'mixkit-bell-notification-933.wav' ? 'selected' : ''}>Bell Notification</option>
                                <option value="mixkit-correct-answer-tone-2870.wav" ${localStorage.getItem('notificationSound') === 'mixkit-correct-answer-tone-2870.wav' ? 'selected' : ''}>Correct Answer Tone</option>
                                <option value="mixkit-digital-quick-tone-2866.wav" ${localStorage.getItem('notificationSound') === 'mixkit-digital-quick-tone-2866.wav' ? 'selected' : ''}>Digital Quick Tone</option>
                                <option value="mixkit-doorbell-tone-2864.wav" ${localStorage.getItem('notificationSound') === 'mixkit-doorbell-tone-2864.wav' ? 'selected' : ''}>Doorbell Tone</option>
                                <option value="mixkit-happy-bells-notification-937.wav" ${localStorage.getItem('notificationSound') === 'mixkit-happy-bells-notification-937.wav' ? 'selected' : ''}>Happy Bells</option>
                                <option value="mixkit-magic-notification-ring-2344.wav" ${localStorage.getItem('notificationSound') === 'mixkit-magic-notification-ring-2344.wav' ? 'selected' : ''}>Magic Notification Ring</option>
                                <option value="mixkit-message-pop-alert-2354.mp3" ${localStorage.getItem('notificationSound') === 'mixkit-message-pop-alert-2354.mp3' ? 'selected' : ''}>Message Pop Alert</option>
                                <option value="mixkit-bubble-pop-up-alert-notification-2357.wav" ${localStorage.getItem('notificationSound') === 'mixkit-bubble-pop-up-alert-notification-2357.wav' ? 'selected' : ''}>Bubble Pop Alert</option>
                                <option value="mixkit-game-notification-wave-alarm-987.wav" ${localStorage.getItem('notificationSound') === 'mixkit-game-notification-wave-alarm-987.wav' ? 'selected' : ''}>Wave Alarm</option>
                                <option value="mixkit-interface-hint-notification-911.wav" ${localStorage.getItem('notificationSound') === 'mixkit-interface-hint-notification-911.wav' ? 'selected' : ''}>Interface Hint</option>
                            </select>
                        </div>
                        
                        <button class="btn-primary" onclick="reviewNotificationSound()" 
                                style="width: 100%; margin-top: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <i class="fas fa-volume-up"></i> Review Sound
                        </button>
                    </div>
                    
                    <h3 style="margin-top: 25px;">Auto-Refresh</h3>
                    <div style="margin: 15px 0;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" checked>
                            <span>Auto-refresh every 30 seconds</span>
                        </label>
                    </div>
                    
                    <h3 style="margin-top: 25px; color: #4facfe;"><i class="fas fa-shield-alt"></i> Order Protection</h3>
                    <div style="margin: 15px 0; background: rgba(79, 172, 254, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #4facfe;">
                        <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600; margin-bottom: 3px;">🚫 Duplicate Order Detection</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Block same order within 5 minutes</div>
                            </div>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="duplicateDetectionToggle" onchange="toggleFeature('duplicateDetection')">
                                <span class="toggle-indicator" id="duplicateDetectionIndicator">✓</span>
                            </label>
                        </div>
                        <div style="border-top: 1px solid rgba(79, 172, 254, 0.2); padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600; margin-bottom: 3px;">📡 Offline Order Detection</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Detect & track offline orders</div>
                            </div>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="offlineDetectionToggle" onchange="toggleFeature('offlineDetection')">
                                <span class="toggle-indicator" id="offlineDetectionIndicator">✓</span>
                            </label>
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 25px; color: #f5576c;"><i class="fas fa-lock"></i> Security</h3>
                    <div style="margin: 15px 0; display: grid; gap: 10px;">
                        <button class="btn-primary" onclick="showChangeUsernameModal()" style="width: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <i class="fas fa-user-edit"></i> Change Username
                        </button>
                        <button class="btn-primary" onclick="showChangePasswordModal()" style="width: 100%; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                            <i class="fas fa-key"></i> Change Password
                        </button>
                    </div>
                    
                    <button class="btn-primary" onclick="closeModal()" style="width: 100%; margin-top: 20px;">
                        <i class="fas fa-save"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
}

// Save Notification Settings to LocalStorage
function saveNotificationSettings() {
    const enabled = document.getElementById('notificationEnabledCheckbox').checked;
    const sound = document.getElementById('notificationSoundSelect').value;
    
    localStorage.setItem('notificationEnabled', enabled ? 'true' : 'false');
    localStorage.setItem('notificationSound', sound);
    
    showToast('✅ Notification settings saved! Sound will play when order arrives.', 'success');
}

// Review Notification Sound (play once to check)
function reviewNotificationSound() {
    const sound = document.getElementById('notificationSoundSelect').value;
    
    if (!sound) {
        showToast('Please select a sound first', 'info');
        return;
    }
    
    // Stop any currently playing review sound
    if (window.reviewAudio) {
        window.reviewAudio.pause();
        window.reviewAudio.currentTime = 0;
    }
    
    // Create and play new review sound (only once)
    window.reviewAudio = new Audio(`/sounds/${sound}`);
    window.reviewAudio.volume = 0.8; // Same volume as notification
    window.reviewAudio.play().catch(err => {
        console.error('Error playing sound:', err);
        showToast('Could not play sound', 'error');
    });
}

// Play Notification Sound (called when order arrives)
function playNotificationSound() {
    const enabled = localStorage.getItem('notificationEnabled') !== 'false';
    const sound = localStorage.getItem('notificationSound');
    
    if (!enabled || !sound) {
        return;
    }
    
    try {
        // Stop any currently playing notification sound
        if (window.notificationAudio) {
            window.notificationAudio.pause();
            window.notificationAudio.currentTime = 0;
        }
        
        // Create and play notification sound (only once per order)
        window.notificationAudio = new Audio(`/sounds/${sound}`);
        window.notificationAudio.volume = 0.8;
        window.notificationAudio.play().catch(err => {
            console.error('Error playing notification sound:', err);
        });
        
        // Prevent multiple plays for same order
        window.lastNotificationTime = Date.now();
    } catch (error) {
        console.error('Error creating audio element:', error);
    }
}

// Combined Change Credentials Modal (for More menu)
function showChangeCredentialsModal() {
    const modal = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content large-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-lock"></i> Change Credentials</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">
                        Manage your admin account security. Choose what you want to change below.
                    </p>

                    <!-- Tabs -->
                    <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color);">
                        <button type="button" class="tab-btn active" onclick="switchCredentialTab('username')" style="padding: 10px 20px; border: none; background: transparent; color: var(--text-primary); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.3s ease;" id="usernameTab">
                            <i class="fas fa-user-edit"></i> Username
                        </button>
                        <button type="button" class="tab-btn" onclick="switchCredentialTab('password')" style="padding: 10px 20px; border: none; background: transparent; color: var(--text-secondary); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.3s ease;" id="passwordTab">
                            <i class="fas fa-key"></i> Password
                        </button>
                    </div>

                    <!-- Username Tab Content -->
                    <div id="credentialUsernameContent" style="display: block;">
                        <div style="background: rgba(102, 126, 234, 0.1); padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                            <p style="font-size: 0.9rem; color: #667eea;">
                                <i class="fas fa-info-circle"></i> Enter your current password and choose a new username.
                            </p>
                        </div>

                        <form onsubmit="handleChangeUsername(event)">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-lock"></i> Current Password
                                </label>
                                <input type="password" id="credChangeUsernamePassword" class="form-input" 
                                       placeholder="Enter your current password" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-user"></i> New Username
                                </label>
                                <input type="text" id="credNewUsername" class="form-input" 
                                       placeholder="Enter new username (min 3 characters)" required>
                                <small style="color: var(--text-secondary); margin-top: 5px; display: block;">
                                    Must be at least 3 characters long
                                </small>
                            </div>

                            <button type="submit" class="btn-primary" style="width: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                <i class="fas fa-save"></i> Change Username
                            </button>
                        </form>
                    </div>

                    <!-- Password Tab Content -->
                    <div id="credentialPasswordContent" style="display: none;">
                        <div style="background: rgba(245, 87, 108, 0.1); padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f5576c;">
                            <p style="font-size: 0.9rem; color: #f5576c;">
                                <i class="fas fa-shield-alt"></i> Choose a strong password for better security.
                            </p>
                        </div>

                        <form onsubmit="handleChangePassword(event)">
                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-lock"></i> Current Password
                                </label>
                                <input type="password" id="credChangePasswordCurrent" class="form-input" 
                                       placeholder="Enter your current password" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-key"></i> New Password
                                </label>
                                <input type="password" id="credNewPassword" class="form-input" 
                                       placeholder="Enter new password (min 4 characters)" required>
                                <small style="color: var(--text-secondary); margin-top: 5px; display: block;">
                                    Must be at least 4 characters long
                                </small>
                            </div>

                            <div class="form-group">
                                <label class="form-label">
                                    <i class="fas fa-check-circle"></i> Confirm Password
                                </label>
                                <input type="password" id="credConfirmPassword" class="form-input" 
                                       placeholder="Confirm your new password" required>
                            </div>

                            <button type="submit" class="btn-primary" style="width: 100%; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                                <i class="fas fa-save"></i> Change Password
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
}

// Switch between username and password tabs in credentials modal
function switchCredentialTab(tab) {
    // Update content visibility
    document.getElementById('credentialUsernameContent').style.display = tab === 'username' ? 'block' : 'none';
    document.getElementById('credentialPasswordContent').style.display = tab === 'password' ? 'block' : 'none';

    // Update tab styling
    const usernameTab = document.getElementById('usernameTab');
    const passwordTab = document.getElementById('passwordTab');

    if (tab === 'username') {
        usernameTab.style.color = 'var(--text-primary)';
        usernameTab.style.borderBottomColor = '#667eea';
        passwordTab.style.color = 'var(--text-secondary)';
        passwordTab.style.borderBottomColor = 'transparent';
    } else {
        passwordTab.style.color = 'var(--text-primary)';
        passwordTab.style.borderBottomColor = '#f5576c';
        usernameTab.style.color = 'var(--text-secondary)';
        usernameTab.style.borderBottomColor = 'transparent';
    }
}

// Change Username Modal
function showChangeUsernameModal() {
    const modal = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 450px;">
                <div class="modal-header">
                    <h2><i class="fas fa-user-edit"></i> Change Username</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: rgba(102, 126, 234, 0.1); padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                        <p style="font-size: 0.9rem; color: #667eea;">
                            <i class="fas fa-info-circle"></i> 
                            You must verify your current password to change your username.
                        </p>
                    </div>

                    <form onsubmit="handleChangeUsername(event)">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-lock"></i> Current Password
                            </label>
                            <input type="password" id="changeUsernameCurrentPassword" class="form-input" 
                                   placeholder="Enter your current password" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-user"></i> New Username
                            </label>
                            <input type="text" id="newUsername" class="form-input" 
                                   placeholder="Enter new username (min 3 characters)" required>
                            <small style="color: var(--text-secondary); margin-top: 5px; display: block;">
                                Must be at least 3 characters long
                            </small>
                        </div>

                        <div style="display: flex; gap: 10px; margin-top: 25px;">
                            <button type="button" class="btn-secondary" onclick="closeModal()" style="flex: 1;">
                                Cancel
                            </button>
                            <button type="submit" class="btn-primary" style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                <i class="fas fa-save"></i> Change Username
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
    document.getElementById('changeUsernameCurrentPassword').focus();
}

// Change Password Modal
function showChangePasswordModal() {
    const modal = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 450px;">
                <div class="modal-header">
                    <h2><i class="fas fa-key"></i> Change Password</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: rgba(245, 87, 108, 0.1); padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f5576c;">
                        <p style="font-size: 0.9rem; color: #f5576c;">
                            <i class="fas fa-shield-alt"></i> 
                            Choose a strong password for better security.
                        </p>
                    </div>

                    <form onsubmit="handleChangePassword(event)">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-lock"></i> Current Password
                            </label>
                            <input type="password" id="changePasswordCurrentPassword" class="form-input" 
                                   placeholder="Enter your current password" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-key"></i> New Password
                            </label>
                            <input type="password" id="newPassword" class="form-input" 
                                   placeholder="Enter new password (min 4 characters)" required>
                            <small style="color: var(--text-secondary); margin-top: 5px; display: block;">
                                Must be at least 4 characters long
                            </small>
                        </div>

                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-check-circle"></i> Confirm Password
                            </label>
                            <input type="password" id="confirmPassword" class="form-input" 
                                   placeholder="Confirm your new password" required>
                        </div>

                        <div style="display: flex; gap: 10px; margin-top: 25px;">
                            <button type="button" class="btn-secondary" onclick="closeModal()" style="flex: 1;">
                                Cancel
                            </button>
                            <button type="submit" class="btn-primary" style="flex: 1; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                                <i class="fas fa-save"></i> Change Password
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
    document.getElementById('changePasswordCurrentPassword').focus();
}

// Handle Change Username
async function handleChangeUsername(event) {
    event.preventDefault();

    // Support both Settings modal and Combined Credentials modal input IDs
    let currentPassword = document.getElementById('changeUsernameCurrentPassword')?.value;
    let newUsername = document.getElementById('newUsername')?.value?.trim();

    // Fallback to Combined Credentials modal IDs
    if (!currentPassword) {
        currentPassword = document.getElementById('credChangeUsernamePassword')?.value;
    }
    if (!newUsername) {
        newUsername = document.getElementById('credNewUsername')?.value?.trim();
    }

    if (!currentPassword) {
        showToast('Current password is required', 'error');
        return;
    }

    if (!newUsername || newUsername.length < 3) {
        showToast('Username must be at least 3 characters', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/change-username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('adminToken')
            },
            body: JSON.stringify({
                currentPassword,
                newUsername
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Username changed successfully! Please log in again with your new username.', 'success');
            setTimeout(() => {
                // Log out after successful username change
                logout();
            }, 2000);
        } else {
            showToast(data.message || 'Failed to change username', 'error');
        }
    } catch (error) {
        console.error('Error changing username:', error);
        showToast('Error changing username', 'error');
    }
}

// Handle Change Password
async function handleChangePassword(event) {
    event.preventDefault();

    // Support both Settings modal and Combined Credentials modal input IDs
    let currentPassword = document.getElementById('changePasswordCurrentPassword')?.value;
    let newPassword = document.getElementById('newPassword')?.value;
    let confirmPassword = document.getElementById('confirmPassword')?.value;

    // Fallback to Combined Credentials modal IDs
    if (!currentPassword) {
        currentPassword = document.getElementById('credChangePasswordCurrent')?.value;
    }
    if (!newPassword) {
        newPassword = document.getElementById('credNewPassword')?.value;
    }
    if (!confirmPassword) {
        confirmPassword = document.getElementById('credConfirmPassword')?.value;
    }

    if (!currentPassword) {
        showToast('Current password is required', 'error');
        return;
    }

    if (!newPassword || newPassword.length < 4) {
        showToast('New password must be at least 4 characters', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    if (newPassword === currentPassword) {
        showToast('New password must be different from current password', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('adminToken')
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Password changed successfully! Please log in again with your new password.', 'success');
            setTimeout(() => {
                // Log out after successful password change
                logout();
            }, 2000);
        } else {
            showToast(data.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showToast('Error changing password', 'error');
    }
}

// Approve Message Modal
async function showApproveMessageModal() {
    try {
        const response = await fetch('/api/diamond-status');
        const status = await response.json();
        const isEnabled = status.approveMessageEnabled !== false;
        
        const modal = `
            <div class="modal" onclick="closeModal(event)">
                <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-bell"></i> Approve Messages</h2>
                        <button class="modal-close" onclick="closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 20px; color: var(--text-secondary);">
                            When enabled, approval messages will be sent to WhatsApp groups. When disabled, orders will be processed silently without notifications.
                        </p>
                        
                        <div style="background: var(--card-bg); padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
                            <div style="font-size: 48px; margin-bottom: 10px;">
                                ${isEnabled ? '🔔' : '🔇'}
                            </div>
                            <h3 style="margin: 10px 0;">
                                ${isEnabled ? 'Messages: ON' : 'Messages: OFF'}
                            </h3>
                            <p style="color: var(--text-secondary); font-size: 12px;">
                                ${isEnabled ? 'Approval notifications are being sent' : 'Approval notifications are silenced'}
                            </p>
                        </div>
                        
                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            <button class="btn-primary" onclick="toggleApproveMessage()" style="flex: 1;">
                                <i class="fas fa-${isEnabled ? 'volume-mute' : 'volume-up'}"></i>
                                ${isEnabled ? 'Turn OFF' : 'Turn ON'}
                            </button>
                        </div>
                        
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--border-color);">
                        
                        <div style="background: rgba(79, 172, 254, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #4facfe;">
                            <p style="font-size: 12px; color: var(--text-secondary);">
                                <i class="fas fa-info-circle"></i> 
                                <strong>Note:</strong> Users can always see deductions via /d command regardless of this setting.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modalContainer').innerHTML = modal;
    } catch (error) {
        console.error('Error loading approve message status:', error);
        showToast('Error loading settings', 'error');
    }
}

// Toggle approve message
async function toggleApproveMessage() {
    try {
        const response = await fetch('/api/diamond-status');
        const status = await response.json();
        const newState = !status.approveMessageEnabled;
        
        const toggleResponse = await fetch('/api/approve-message/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approveMessageEnabled: newState })
        });
        
        const result = await toggleResponse.json();
        if (result.success) {
            showToast(`Approve messages turned ${newState ? 'ON' : 'OFF'}`, 'success');
            showApproveMessageModal();
        }
    } catch (error) {
        console.error('Error toggling approve message:', error);
        showToast('Error updating setting', 'error');
    }
}

function toggleThemeFromSettings() {
    document.getElementById('themeToggle').click();
}

function changeLanguage(lang) {
    currentLang = lang;
    updatePageLanguage();
    showToast(currentLang === 'bn' ? '🇧🇩 বাংলা' : '🇬🇧 English', 'success');
}

function showBackupModal() {
    const modal = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-database"></i> Backup & Restore</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <h3>Database Backup</h3>
                    <p>Current backup options:</p>
                    <div style="margin: 20px 0;">
                        <button class="btn-primary" onclick="createBackup()" style="width: 100%; margin-bottom: 10px;">
                            <i class="fas fa-download"></i> Download Database Backup
                        </button>
                        <button class="btn-primary" onclick="downloadLogs()" style="width: 100%; background: #4facfe;">
                            <i class="fas fa-file-download"></i> Download Logs
                        </button>
                    </div>
                    <div style="padding: 15px; background: var(--border-color); border-radius: 8px;">
                        <p style="margin: 0; font-size: 0.9rem;">
                            <i class="fas fa-info-circle"></i> Backups include all users, transactions, and group data.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
}

function createBackup() {
    fetch('/api/backup')
        .then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            showToast('Backup downloaded successfully!', 'success');
        })
        .catch(err => {
            showToast('Error creating backup', 'error');
        });
}

function downloadLogs() {
    fetch('/api/admin-logs')
        .then(res => res.json())
        .then(logs => {
            const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            showToast('Logs downloaded successfully!', 'success');
        });
}

function showClearDataModal() {
    const modal = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-exclamation-triangle" style="color: #f5576c;"></i> Clear All Data</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: rgba(245, 87, 108, 0.15); border-left: 4px solid #f5576c; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="color: #f5576c; margin: 0 0 10px 0;">⚠️ Warning</h4>
                        <p style="margin: 0; color: #aaa;">
                            এই অ্যাকশন সব ডাটা (ইউজার, ট্রানজ্যাকশন, অর্ডার, ইত্যাদি) ডিলিট করবে। এটি শুধুমাত্র সঠিক PIN দিয়ে করা যায়।
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Admin PIN:</label>
                        <input type="password" id="clearDataPin" placeholder="Enter your admin PIN" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #2d3561; background: #16213e; color: #eee; font-size: 1rem; box-sizing: border-box; letter-spacing: 2px;">
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button onclick="clearAllData()" style="flex: 1; padding: 12px; background: #f5576c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                            <i class="fas fa-trash-alt"></i> Clear All Data
                        </button>
                        <button onclick="closeModal()" style="flex: 1; padding: 12px; background: #2d3561; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
    document.getElementById('clearDataPin').focus();
}

function clearAllData() {
    const pin = document.getElementById('clearDataPin').value;
    
    if (!pin) {
        alert('Please enter PIN');
        return;
    }
    
    if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.\n\nPlease enter PIN to confirm.')) {
        return;
    }
    
    fetch('/api/clear-all-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Clear localStorage and global variables
            localStorage.clear();
            allGroups = [];
            allTransactions = [];
            allOrders = [];
            allUsers = [];
            expandedGroups.clear();
            selectedGroups.clear();
            groupsMarkedForDueReminder.clear();
            
            // Clear all DOM elements that display data
            const autoDeductList = document.getElementById('autoDeductList');
            if (autoDeductList) autoDeductList.innerHTML = '<div class="auto-deduct-placeholder"><i class="fas fa-inbox"></i><p>No auto-deductions yet</p></div>';
            
            const groupsContainer = document.getElementById('groupsContainer');
            if (groupsContainer) groupsContainer.innerHTML = '<p style="text-align: center; color: #aaa;">Loading groups...</p>';
            
            const dashboardStatsTop = document.querySelector('.dashboard-stats-top');
            if (dashboardStatsTop) {
                dashboardStatsTop.querySelectorAll('.stat-card').forEach(card => {
                    card.querySelector('.stat-value').textContent = '৳0';
                    card.querySelector('.stat-change').textContent = '+0%';
                });
            }
            
            alert('✅ All data cleared successfully! Page will reload...');
            closeModal();
            setTimeout(() => location.reload(), 1000);
        } else {
            alert('❌ Error: ' + data.error);
        }
    })
    .catch(err => alert('Error: ' + err.message));
}

function showBotConnectionModal() {
    const modal = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-robot"></i> WhatsApp Bot Connection</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 20px;">
                        <div id="botStatusDiv" style="text-align: center; padding: 20px; border-radius: 10px; background: rgba(79, 172, 254, 0.1); border: 2px solid #4facfe; margin-bottom: 20px;">
                            <div id="botStatus" style="font-size: 1.5rem; font-weight: 600; color: #4facfe; margin-bottom: 10px;">
                                ⏳ Checking...
                            </div>
                        </div>
                    </div>
                    
                    <div id="qrCodeContainer" style="text-align: center; margin-bottom: 20px; display: none;">
                        <h4 style="margin-bottom: 15px; color: #aaa;">Scan with WhatsApp to Connect:</h4>
                        <div id="qrCode" style="background: white; padding: 20px; border-radius: 10px; display: inline-block;">
                            <img src="" id="qrCodeImage" style="width: 300px; height: 300px; display: none;">
                            <div id="qrLoadingText" style="color: #666; font-weight: 600;">Loading QR Code...</div>
                        </div>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #4facfe; margin-top: 20px;">
                        <h4 style="margin-bottom: 10px; color: #4facfe;">📱 Connection Instructions:</h4>
                        <ol style="margin-left: 20px; color: #aaa; line-height: 1.8;">
                            <li>If disconnected, a QR code will appear above</li>
                            <li>Open WhatsApp on your phone</li>
                            <li>Go to Settings → Linked Devices</li>
                            <li>Tap "Link a device"</li>
                            <li>Scan the QR code shown above</li>
                            <li>Wait for the connection to establish</li>
                        </ol>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button onclick="checkBotStatus()" style="flex: 1; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-refresh"></i> Check Status
                        </button>
                        <button onclick="closeModal()" style="flex: 1; padding: 12px; background: #2d3561; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
    checkBotStatus();
}

function checkBotStatus() {
    fetch('http://localhost:3001/api/bot-status')
        .then(res => res.json())
        .then(data => {
            console.log('Bot Status Response:', data);
            const statusDiv = document.getElementById('botStatusDiv');
            const statusText = document.getElementById('botStatus');
            const qrContainer = document.getElementById('qrCodeContainer');
            
            if (data.isConnected) {
                // Connected
                statusDiv.style.background = 'rgba(67, 233, 123, 0.1)';
                statusDiv.style.borderColor = '#43e97b';
                statusText.innerHTML = '✅ <span style="color: #43e97b;">CONNECTED</span><br><span style="font-size: 0.8rem; color: #aaa; margin-top: 5px; display: block;">Bot is ready to receive messages</span>';
                qrContainer.style.display = 'none';
            } else {
                // Disconnected
                statusDiv.style.background = 'rgba(245, 87, 108, 0.1)';
                statusDiv.style.borderColor = '#f5576c';
                statusText.innerHTML = '❌ <span style="color: #f5576c;">DISCONNECTED</span><br><span style="font-size: 0.8rem; color: #aaa; margin-top: 5px; display: block;">Please connect by scanning QR code below</span>';
                
                qrContainer.style.display = 'block';
                const qrImg = document.getElementById('qrCodeImage');
                const qrLoading = document.getElementById('qrLoadingText');
                
                // Fetch and show QR code
                if (data.qrCode) {
                    console.log('QR Code received');
                    qrImg.src = data.qrCode;
                    qrImg.style.display = 'block';
                    qrLoading.style.display = 'none';
                } else {
                    console.log('No QR code data');
                    qrLoading.textContent = 'Waiting for QR code... Please wait a moment';
                    // Auto-refresh every 2 seconds when disconnected
                    setTimeout(() => {
                        const checkBtn = document.querySelector('button[onclick="checkBotStatus()"]');
                        if (checkBtn && qrContainer.style.display !== 'none') {
                            checkBotStatus();
                        }
                    }, 2000);
                }
            }
        })
        .catch(err => {
            console.error('Bot Status Error:', err);
            const statusDiv = document.getElementById('botStatusDiv');
            const statusText = document.getElementById('botStatus');
            statusDiv.style.background = 'rgba(254, 202, 87, 0.1)';
            statusDiv.style.borderColor = '#feca57';
            statusText.innerHTML = '⚠️ <span style="color: #feca57;">ERROR</span><br><span style="font-size: 0.8rem; color: #aaa; margin-top: 5px; display: block;">Could not connect to bot API</span>';
        });
}

// Store selected payment methods for each group
const groupPaymentMethods = new Map();

// Store items per page for each group (default: 10)
const groupItemsPerPage = new Map();

function showDueReminderModal() {
    // Get groups with due > 0 using totalDue from API
    const groupsWithDue = allGroups.filter(group => {
        return group.totalDue > 0;
    });
    
    if (groupsWithDue.length === 0) {
        showToast('No groups with due amount found', 'warning');
        return;
    }
    
    const modal = `
        <div class="modal" onclick="closeModal(event)" style="padding: 10px;">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 95%; width: 100%; max-height: 90vh;">
                <div class="modal-header" style="padding: 15px 10px;">
                    <h2 style="font-size: clamp(1rem, 4vw, 1.5rem);"><i class="fas fa-bell"></i> Send Due Reminders</h2>
                    <button class="modal-close" onclick="closeModal()" style="font-size: 1.5rem; padding: 5px 10px;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 15px 10px;">
                    <div style="background: rgba(67, 233, 123, 0.1); border-left: 4px solid #43e97b; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                        <h4 style="color: #43e97b; margin: 0 0 8px 0; font-size: clamp(0.9rem, 3.5vw, 1.1rem);">📢 Due Reminder Service</h4>
                        <p style="margin: 0; color: #aaa; font-size: clamp(0.8rem, 3vw, 0.95rem); line-height: 1.4;">
                            Send WhatsApp reminders to selected groups about their pending dues. Only groups with outstanding dues will receive messages.
                        </p>
                    </div>
                    
                    <div style="max-height: 50vh; overflow-y: auto; margin-bottom: 15px; background: rgba(255,255,255,0.02); padding: 8px; border-radius: 8px;">
                        ${groupsWithDue.map(group => `
                            <div style="padding: 10px; background: rgba(255,255,255,0.05); margin-bottom: 12px; border-radius: 8px; border-left: 3px solid #43e97b;">
                                <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
                                    <input type="checkbox" 
                                           class="reminder-checkbox" 
                                           value="${group.id}" 
                                           ${groupsMarkedForDueReminder.has(group.id) ? 'checked' : ''} 
                                           style="width: 18px; height: 18px; cursor: pointer; margin-top: 2px; flex-shrink: 0;">
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 600; color: #eee; margin-bottom: 4px; font-size: clamp(0.85rem, 3.5vw, 1rem); word-break: break-word;">${group.name}</div>
                                        <div style="font-size: clamp(0.75rem, 2.8vw, 0.85rem); color: #aaa; display: flex; flex-wrap: wrap; gap: 8px;">
                                            <span>💰 Due: ৳${group.totalDue.toLocaleString()}</span>
                                            <span>| Members: ${group.totalUsers}</span>
                                        </div>
                                    </div>
                                    ${groupsMarkedForDueReminder.has(group.id) ? '<i class="fas fa-check-circle" style="color: #43e97b; font-size: clamp(1rem, 4vw, 1.2rem); flex-shrink: 0;"></i>' : ''}
                                </div>
                                <div style="margin-left: 0; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px; margin-top: 10px;">
                                    <div style="font-size: clamp(0.75rem, 3vw, 0.85rem); color: #4facfe; margin-bottom: 8px; font-weight: 600;">
                                        <i class="fas fa-credit-card"></i> Select Payment Methods:
                                    </div>
                                    <div id="payment-methods-${group.id}" style="display: flex; flex-wrap: wrap; gap: 6px;">
                                        <!-- Payment methods will be loaded here -->
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border-left: 4px solid #4facfe; margin-bottom: 15px;">
                        <h4 style="margin: 0 0 8px 0; color: #4facfe; font-size: clamp(0.9rem, 3.5vw, 1.1rem);">📝 Message Preview:</h4>
                        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; font-size: clamp(0.7rem, 2.8vw, 0.85rem); color: #bbb; font-family: monospace; line-height: 1.5; white-space: pre-wrap; overflow-x: auto;">
🔔 *দয়া করে মনোযোগ দিন* 🔔

📅 *তারিখ:* [Date]

[Group Name] গ্রুপের জন্য বকেয়া টাকা পরিশোধের অনুরোধ।

💰 *বকেয়া পরিমাণ:* ৳[Amount]

📱 *পেমেন্ট নম্বর:*

🏦 Bkash (Personal): 01721016186
🏦 Nagad (Agent): 01721016186
🏦 Rocket (Personal): 01721016186
🏦 Islamic Bank: 324623894746
   (md rubel mia - Mymensingh)

✅ পেমেন্ট করার পর স্ক্রিনশট পাঠান।

অনুগ্রহ করে যত তাড়াতাড়ি সম্ভব পরিশোধ করুন।

ধন্যবাদ!
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button onclick="sendDueReminders()" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #43e97b 0%, #38ada9 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: clamp(0.9rem, 3.5vw, 1rem); transition: all 0.3s ease; touch-action: manipulation;"
                                ontouchstart="this.style.transform='scale(0.98)'" 
                                ontouchend="this.style.transform='scale(1)'"
                                onmouseover="this.style.transform='scale(1.02)'" 
                                onmouseout="this.style.transform='scale(1)'">
                            <i class="fas fa-send"></i> Send Reminders
                        </button>
                        <button onclick="closeModal()" style="width: 100%; padding: 14px; background: #2d3561; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: clamp(0.9rem, 3.5vw, 1rem); touch-action: manipulation;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modal;
    
    // Load payment methods for all groups
    loadPaymentMethodsForReminder(groupsWithDue);
    
    // Add event listeners to checkboxes
    document.querySelectorAll('.reminder-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                groupsMarkedForDueReminder.add(e.target.value);
            } else {
                groupsMarkedForDueReminder.delete(e.target.value);
            }
        });
    });
}

// Load payment methods and create checkboxes for each group
async function loadPaymentMethodsForReminder(groups) {
    try {
        // Request payment numbers with admin_view flag to always get them
        const response = await fetch('/api/payment-numbers?admin_view=true');
        const data = await response.json();
        const paymentNumbers = data.paymentNumbers || [];
        const isEnabled = data.isEnabled !== false;
        
        groups.forEach(group => {
            const container = document.getElementById(`payment-methods-${group.id}`);
            if (!container) return;
            
            // If no payment methods available, show message
            if (!paymentNumbers || paymentNumbers.length === 0) {
                container.innerHTML = '<span style="color: #999; font-size: 0.85rem;">ℹ️ No payment methods configured</span>';
                return;
            }
            
            // Initialize with all methods selected by default
            if (!groupPaymentMethods.has(group.id)) {
                groupPaymentMethods.set(group.id, new Set(paymentNumbers.map((_, idx) => idx)));
            }
            
            const selectedMethods = groupPaymentMethods.get(group.id);
            
            // Build warning message if payment system is disabled
            const warningHTML = !isEnabled ? `
                <div style="padding: 8px; background: rgba(255, 165, 0, 0.2); border: 1px solid #f59e0b; border-radius: 6px; margin-bottom: 8px; font-size: 0.8rem; color: #fbbf24; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-exclamation-triangle" style="flex-shrink: 0;"></i>
                    <span>⚠️ Payment system is OFF - methods shown for admin use only</span>
                </div>
            ` : '';
            
            const methodsHTML = paymentNumbers.map((payment, index) => {
                const isChecked = selectedMethods.has(index);
                const label = payment.isBank 
                    ? `${payment.method} - ${payment.accountNumber}` 
                    : `${payment.method} - ${payment.number}`;
                
                return `
                    <label style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 10px; background: ${isChecked ? 'rgba(67, 233, 123, 0.2)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${isChecked ? '#43e97b' : 'rgba(255,255,255,0.1)'}; border-radius: 6px; cursor: pointer; font-size: clamp(0.75rem, 2.8vw, 0.85rem); color: ${isChecked ? '#43e97b' : '#aaa'}; transition: all 0.2s; min-height: 36px; touch-action: manipulation;">
                        <input type="checkbox" 
                               class="payment-method-checkbox"
                               data-group-id="${group.id}"
                               data-payment-index="${index}"
                               ${isChecked ? 'checked' : ''}
                               style="cursor: pointer; width: 16px; height: 16px; flex-shrink: 0;"
                               onchange="togglePaymentMethod('${group.id}', ${index}, this)">
                        <span style="word-break: break-word; line-height: 1.3;">${label}</span>
                    </label>
                `;
            }).join('');
            
            container.innerHTML = warningHTML + methodsHTML;
        });
    } catch (error) {
        console.error('Error loading payment methods:', error);
    }
}

// Toggle payment method selection for a group
function togglePaymentMethod(groupId, paymentIndex, checkbox) {
    if (!groupPaymentMethods.has(groupId)) {
        groupPaymentMethods.set(groupId, new Set());
    }
    
    const methods = groupPaymentMethods.get(groupId);
    
    if (checkbox.checked) {
        methods.add(paymentIndex);
        checkbox.parentElement.style.background = 'rgba(67, 233, 123, 0.2)';
        checkbox.parentElement.style.borderColor = '#43e97b';
        checkbox.parentElement.style.color = '#43e97b';
    } else {
        methods.delete(paymentIndex);
        checkbox.parentElement.style.background = 'rgba(255,255,255,0.05)';
        checkbox.parentElement.style.borderColor = 'rgba(255,255,255,0.1)';
        checkbox.parentElement.style.color = '#aaa';
    }
}

function sendDueReminders() {
    if (groupsMarkedForDueReminder.size === 0) {
        alert('Please select at least one group to send reminders');
        return;
    }
    
    if (!confirm(`Send due reminders to ${groupsMarkedForDueReminder.size} group(s)? Messages will be sent via WhatsApp.`)) {
        return;
    }
    
    // Show loading state
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    button.disabled = true;
    
    // Prepare data with selected payment methods for each group
    const reminderData = Array.from(groupsMarkedForDueReminder).map(groupId => ({
        groupId: groupId,
        paymentMethodIndices: Array.from(groupPaymentMethods.get(groupId) || [])
    }));
    
    fetch('/api/send-due-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            groups: reminderData
        })
    })
    .then(res => res.json())
    .then(data => {
        button.innerHTML = originalText;
        button.disabled = false;
        
        if (data.success) {
            const results = data.results;
            const successCount = results.filter(r => r.success).length;
            const failedCount = results.filter(r => !r.success).length;
            
            let message = `✅ Reminders Sent!\n\n`;
            message += `Successfully sent: ${successCount}\n`;
            if (failedCount > 0) {
                message += `Failed: ${failedCount}\n`;
                results.filter(r => !r.success).forEach(r => {
                    message += `  • ${r.groupName || r.groupId}: ${r.reason}\n`;
                });
            }
            
            alert(message);
            showToast('Due reminders sent successfully!', 'success');
            closeModal();
        } else {
            alert('Error: ' + data.error);
            showToast('Failed to send reminders', 'error');
        }
    })
    .catch(err => {
        button.innerHTML = originalText;
        button.disabled = false;
        alert('Error: ' + err.message);
        showToast('Error sending reminders', 'error');
    });
}

function showAboutModal() {
    const modal = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-info-circle"></i> About</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <h3>Diamond Bot Admin Panel</h3>
                    <p>Version: 1.0.0</p>
                    <p>Professional WhatsApp Bot Management System</p>
                    <p>Real-time monitoring and control</p>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modal;
}

function filterModalTable() {
    const search = document.getElementById('userSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#modalTableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
}

function filterUserCards() {
    const search = document.getElementById('userSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.user-card');

    cards.forEach(card => {
        const name = card.getAttribute('data-name').toLowerCase();
        const phone = card.getAttribute('data-phone').toLowerCase();
        
        const matches = name.includes(search) || phone.includes(search);
        card.style.display = matches ? '' : 'none';
    });
}

function closeModal(event) {
    if (!event || event.target.classList.contains('modal')) {
        document.getElementById('modalContainer').innerHTML = '';
    }
}

// Export Functions
function exportData() {
    const currentView = document.querySelector('.view.active').id;
    let data = [];
    let filename = 'export';
    
    if (currentView === 'transactionsView') {
        data = allTransactions;
        filename = 'transactions';
    } else if (currentView === 'groupsView') {
        data = allGroups;
        filename = 'groups';
    } else if (currentView === 'dashboardView') {
        data = allTransactions.slice(0, 10);
        filename = 'recent-transactions';
    }
    
    if (data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }
    
    // Convert to CSV
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showToast('Data exported successfully!', 'success');
}

function exportAllData() {
    const allData = {
        groups: allGroups,
        transactions: allTransactions,
        orders: allOrders,
        users: allUsers,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complete-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    showToast('All data exported successfully!', 'success');
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.getElementById('toastContainer').appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Load Dashboard Data
async function loadDashboardData() {
    await Promise.all([
        loadStats(),
        loadLastAutoDeduction(),
        loadTransactions(),
        loadAnalytics()
    ]);
    
    // Initialize group details table with 'today' data
    setTimeout(() => {
        initializeGroupDetails();
    }, 500);
}

// Auto-refresh stats every 1 second for real-time updates
setInterval(() => {
    loadStats(); // Real-time stats update (pending orders, badges, etc.)
}, 1000);

// Auto-refresh full data every 30 seconds (silent)
setInterval(() => {
    silentRefreshData(); // Silent refresh without toast
}, 30000);

// Due Reminder Toggle - Toggle mark for due reminder
function toggleDueReminder(groupId) {
    if (groupsMarkedForDueReminder.has(groupId)) {
        groupsMarkedForDueReminder.delete(groupId);
    } else {
        groupsMarkedForDueReminder.add(groupId);
    }
    
    // Update the visual indicator
    const reminderBtn = document.querySelector(`[data-group-id="${groupId}"] .reminder-toggle-btn`);
    if (reminderBtn) {
        if (groupsMarkedForDueReminder.has(groupId)) {
            reminderBtn.classList.add('active');
            reminderBtn.style.color = '#ff6b6b';
        } else {
            reminderBtn.classList.remove('active');
            reminderBtn.style.color = '#666';
        }
    }
}

// Command Management Modal
function showCommandsModal() {
    const modalHTML = `
        <div id="commandsModal" class="modal" onclick="if(event.target === this) closeModal()">
            <div class="modal-content">
                <h2><i class="fas fa-terminal"></i> Command Management</h2>
                <p style="color: #aaa; margin-top: 20px;">Commands feature coming soon...</p>
                <button onclick="closeModal()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modalHTML;
    document.getElementById('commandsModal').style.display = 'flex';
}

// Payment Keywords Modal
function showPaymentKeywordsModal() {
    const modalHTML = `
        <div id="paymentKeywordsModal" class="modal" onclick="if(event.target === this) closeModal()">
            <div class="modal-content">
                <h2><i class="fas fa-credit-card"></i> Payment Keywords</h2>
                <p style="color: #aaa; margin-top: 20px;">Payment keywords feature coming soon...</p>
                <button onclick="closeModal()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modalHTML;
    document.getElementById('paymentKeywordsModal').style.display = 'flex';
}

// Command Management Modal
async function showCommandsModal() {
    try {
        const response = await fetch('/api/commands');
        const commands = await response.json();
        
        let commandsHTML = `
            <div id="commandsModal" class="modal" onclick="if(event.target === this) closeModal()">
                <div class="modal-content">
                    <h2><i class="fas fa-terminal"></i> Command Management</h2>
                    
                    <div style="margin-top: 20px;">
                        <h3>User Commands</h3>
                        <div id="userCommandsList" style="max-height: 300px; overflow-y: auto;">
        `;
        
        if (commands.userCommands && commands.userCommands.length > 0) {
            commands.userCommands.forEach((cmd, idx) => {
                commandsHTML += `
                    <div style="background: #1a1a2e; padding: 10px; margin: 10px 0; border-radius: 8px; border-left: 3px solid #667eea;">
                        <div><strong>${cmd.command}</strong> - ${cmd.description}</div>
                        <div style="color: #aaa; font-size: 0.9em; margin-top: 5px;">Response: ${cmd.response}</div>
                        <button onclick="editCommand(${idx}, 'user')" style="margin-top: 5px; padding: 5px 10px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">Edit</button>
                        <button onclick="deleteCommand(${idx}, 'user')" style="margin-left: 5px; padding: 5px 10px; background: #f5576c; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">Delete</button>
                    </div>
                `;
            });
        } else {
            commandsHTML += '<p style="color: #aaa;">No user commands</p>';
        }
        
        commandsHTML += `
                        </div>
                        
                        <h3 style="margin-top: 20px;">Admin Commands</h3>
                        <div id="adminCommandsList" style="max-height: 300px; overflow-y: auto;">
        `;
        
        if (commands.adminCommands && commands.adminCommands.length > 0) {
            commands.adminCommands.forEach((cmd, idx) => {
                commandsHTML += `
                    <div style="background: #1a1a2e; padding: 10px; margin: 10px 0; border-radius: 8px; border-left: 3px solid #43e97b;">
                        <div><strong>${cmd.command}</strong> - ${cmd.description}</div>
                        <div style="color: #aaa; font-size: 0.9em; margin-top: 5px;">Response: ${cmd.response}</div>
                        <button onclick="editCommand(${idx}, 'admin')" style="margin-top: 5px; padding: 5px 10px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">Edit</button>
                        <button onclick="deleteCommand(${idx}, 'admin')" style="margin-left: 5px; padding: 5px 10px; background: #f5576c; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85em;">Delete</button>
                    </div>
                `;
            });
        } else {
            commandsHTML += '<p style="color: #aaa;">No admin commands</p>';
        }
        
        commandsHTML += `
                        </div>
                        
                        <div style="margin-top: 20px;">
                            <h3>Add New Command</h3>
                            <input type="text" id="newCommand" placeholder="Command (e.g., !help)" style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #2d3561; border-radius: 5px; background: #16213e; color: white;">
                            <input type="text" id="newCommandDesc" placeholder="Description" style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #2d3561; border-radius: 5px; background: #16213e; color: white;">
                            <input type="text" id="newCommandResponse" placeholder="Response" style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #2d3561; border-radius: 5px; background: #16213e; color: white;">
                            <select id="newCommandType" style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #2d3561; border-radius: 5px; background: #16213e; color: white;">
                                <option value="user">User Command</option>
                                <option value="admin">Admin Command</option>
                            </select>
                            <button onclick="addNewCommand()" style="width: 100%; padding: 10px; background: #43e97b; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; font-weight: 600;">Add Command</button>
                        </div>
                    </div>
                    
                    <button onclick="closeModal()" style="width: 100%; margin-top: 20px; padding: 10px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
                </div>
            </div>
        `;
        
        document.getElementById('modalContainer').innerHTML = commandsHTML;
        document.getElementById('commandsModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading commands:', error);
        showToast('Failed to load commands', 'error');
    }
}

async function addNewCommand() {
    const cmd = document.getElementById('newCommand').value;
    const desc = document.getElementById('newCommandDesc').value;
    const resp = document.getElementById('newCommandResponse').value;
    const type = document.getElementById('newCommandType').value;
    
    if (!cmd || !desc || !resp) {
        showToast('All fields required', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/commands/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd, description: desc, response: resp, type })
        });
        
        if (response.ok) {
            showToast('Command added successfully', 'success');
            showCommandsModal(); // Refresh modal
        } else {
            showToast('Failed to add command', 'error');
        }
    } catch (error) {
        console.error('Error adding command:', error);
        showToast('Error adding command', 'error');
    }
}

function editCommand(index, type) {
    showToast('Edit feature coming soon', 'info');
}

async function deleteCommand(index, type) {
    if (!confirm('Delete this command?')) return;
    
    try {
        const response = await fetch('/api/commands/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index, type })
        });
        
        if (response.ok) {
            showToast('Command deleted', 'success');
            showCommandsModal(); // Refresh modal
        } else {
            showToast('Failed to delete command', 'error');
        }
    } catch (error) {
        console.error('Error deleting command:', error);
        showToast('Error deleting command', 'error');
    }
}

// Payment Keywords Modal
async function showPaymentKeywordsModal() {
    try {
        const response = await fetch('/api/payment-keywords');
        const data = await response.json();
        const methods = data.methods || {};
        
        let modalHTML = `
            <div class="modal" onclick="closeModal(event)">
                <div class="modal-content large-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2><i class="fas fa-credit-card"></i> Payment Keywords Management</h2>
                        <button class="modal-close" onclick="closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 20px; background: rgba(102, 126, 234, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                            <p style="margin: 0; color: #aaa; font-size: 0.95rem;">
                                <i class="fas fa-info-circle"></i> <strong>কীভাবে কাজ করে:</strong> ইউজার যখন কোন কীওয়ার্ড পাঠায়, বট সেই পেমেন্ট মেথডের নম্বর পাঠায়।
                            </p>
                        </div>
                        
                        <div style="display: grid; gap: 20px;">
        `;
        
        Object.entries(methods).forEach(([methodName, config]) => {
            const keywords = config.keywords || [];
            const enabled = config.enabled !== false;
            
            modalHTML += `
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; border-left: 4px solid #667eea;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div>
                            <h3 style="margin: 0 0 5px 0; color: #4facfe; font-size: 1.1rem;">${methodName}</h3>
                            <p style="margin: 0; color: #aaa; font-size: 0.9rem;">
                                <strong>${keywords.length}</strong> কীওয়ার্ড সেট করা আছে
                            </p>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="editPaymentKeyword('${methodName}')" style="padding: 8px 15px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; margin-bottom: 12px;">
                        <strong style="color: #43e97b; font-size: 0.95rem;">📝 কীওয়ার্ড:</strong>
                        <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">
                            ${keywords.map(kw => `
                                <span style="background: #667eea; color: white; padding: 5px 12px; border-radius: 20px; font-size: 0.85rem;">
                                    ${kw}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        });
        
        modalHTML += `
                        </div>
                        
                        <div style="margin-top: 30px;">
                            <h3><i class="fas fa-plus-circle"></i> নতুন পেমেন্ট মেথড যোগ করুন</h3>
                            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; margin-top: 15px;">
                                <div class="form-group">
                                    <label>পেমেন্ট মেথড নাম:</label>
                                    <input type="text" id="newMethodName" placeholder="e.g., Bkash, Nagad, Rocket" class="form-input" style="margin-bottom: 15px;">
                                </div>
                                
                                <div class="form-group">
                                    <label>কীওয়ার্ড (কমা দিয়ে আলাদা করুন):</label>
                                    <input type="text" id="newMethodKeywords" placeholder="e.g., bkash, বিকাশ, bk" class="form-input" style="margin-bottom: 15px;">
                                </div>
                                
                                <div class="form-group">
                                    <label>রেসপন্স মেসেজ:</label>
                                    <textarea id="newMethodResponse" placeholder="পেমেন্ট মেথড সিলেক্ট করলে এই মেসেজ পাঠানো হবে" class="form-input" style="resize: vertical; min-height: 80px; margin-bottom: 15px;"></textarea>
                                </div>
                                
                                <button onclick="addPaymentKeywordMethod()" style="width: 100%; padding: 12px; background: #43e97b; color: #1a1a2e; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                                    <i class="fas fa-plus"></i> মেথড যোগ করুন
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modalContainer').innerHTML = modalHTML;
    } catch (error) {
        console.error('Error loading payment keywords:', error);
        showToast('ডেটা লোড করতে ব্যর্থ', 'error');
    }
}

async function editPaymentKeyword(methodName) {
    try {
        const response = await fetch('/api/payment-keywords');
        const data = await response.json();
        const config = data.methods[methodName];
        
        if (!config) {
            showToast('মেথড খুঁজে পাওয়া যায়নি', 'error');
            return;
        }
        
        const keywords = config.keywords.join(', ');
        const responseMsg = config.response || '';
        
        const modalHTML = `
            <div class="modal" onclick="closeModal(event)">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2><i class="fas fa-edit"></i> ${methodName} এডিট করুন</h2>
                        <button class="modal-close" onclick="closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>কীওয়ার্ড (কমা দিয়ে আলাদা করুন):</label>
                            <input type="text" id="editKeywords" value="${keywords}" class="form-input">
                        </div>
                        
                        <div class="form-group">
                            <label>রেসপন্স মেসেজ:</label>
                            <textarea id="editResponse" class="form-input" style="resize: vertical; min-height: 100px;">${responseMsg}</textarea>
                        </div>
                        
                        <div style="background: rgba(67, 233, 123, 0.1); padding: 12px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #43e97b;">
                            <p style="margin: 0; color: #aaa; font-size: 0.9rem;">
                                <i class="fas fa-lightbulb"></i> ইউজার যখন এই কীওয়ার্ড গুলোর মধ্যে কোন একটি পাঠায়, বট এই মেসেজ এবং পেমেন্ট নম্বর পাঠাবে।
                            </p>
                        </div>
                        
                        <div class="button-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button onclick="savePaymentKeyword('${methodName}')" class="btn-save">
                                <i class="fas fa-save"></i> সংরক্ষণ করুন
                            </button>
                            <button onclick="deletePaymentKeywordMethod('${methodName}')" class="btn-delete">
                                <i class="fas fa-trash"></i> মুছে ফেলুন
                            </button>
                        </div>
                        
                        <button onclick="closeModal()" class="btn-cancel" style="width: 100%; margin-top: 10px;">বাতিল</button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modalContainer').innerHTML = modalHTML;
    } catch (error) {
        console.error('Error editing payment keyword:', error);
        showToast('এডিট লোড করতে ব্যর্থ', 'error');
    }
}

async function savePaymentKeyword(methodName) {
    try {
        const keywordsText = document.getElementById('editKeywords').value.trim();
        const responseMsg = document.getElementById('editResponse').value.trim();
        
        if (!keywordsText || !responseMsg) {
            showToast('সব ফিল্ড পূরণ করুন', 'warning');
            return;
        }
        
        const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);
        
        if (keywords.length === 0) {
            showToast('কমপক্ষে একটি কীওয়ার্ড প্রয়োজন', 'warning');
            return;
        }
        
        const response = await fetch('/api/payment-keywords');
        const data = await response.json();
        const methods = data.methods || {};
        
        methods[methodName] = {
            keywords,
            response: responseMsg,
            enabled: true
        };
        
        const updateResponse = await fetch('/api/payment-keywords/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ methods })
        });
        
        if (updateResponse.ok) {
            showToast(`${methodName} আপডেট হয়েছে`, 'success');
            closeModal();
            showPaymentKeywordsModal();
        } else {
            showToast('আপডেট ব্যর্থ', 'error');
        }
    } catch (error) {
        console.error('Error saving payment keyword:', error);
        showToast('সংরক্ষণ করতে ব্যর্থ', 'error');
    }
}

async function addPaymentKeywordMethod() {
    try {
        const methodName = document.getElementById('newMethodName').value.trim();
        const keywordsText = document.getElementById('newMethodKeywords').value.trim();
        const responseMsg = document.getElementById('newMethodResponse').value.trim();
        
        if (!methodName || !keywordsText || !responseMsg) {
            showToast('সব ফিল্ড পূরণ করুন', 'warning');
            return;
        }
        
        const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);
        
        if (keywords.length === 0) {
            showToast('কমপক্ষে একটি কীওয়ার্ড প্রয়োজন', 'warning');
            return;
        }
        
        const response = await fetch('/api/payment-keywords');
        const data = await response.json();
        const methods = data.methods || {};
        
        if (methods[methodName]) {
            showToast('এই মেথড ইতিমধ্যে আছে', 'warning');
            return;
        }
        
        methods[methodName] = {
            keywords,
            response: responseMsg,
            enabled: true
        };
        
        const updateResponse = await fetch('/api/payment-keywords/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ methods })
        });
        
        if (updateResponse.ok) {
            showToast(`${methodName} যোগ করা হয়েছে`, 'success');
            closeModal();
            showPaymentKeywordsModal();
        } else {
            showToast('যোগ করা ব্যর্থ', 'error');
        }
    } catch (error) {
        console.error('Error adding payment method:', error);
        showToast('যোগ করতে ব্যর্থ', 'error');
    }
}

async function deletePaymentKeywordMethod(methodName) {
    if (!confirm(`${methodName} মেথড মুছে ফেলতে চান? এটি বাতিল করা যাবে না।`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/payment-keywords');
        const data = await response.json();
        const methods = data.methods || {};
        
        delete methods[methodName];
        
        const updateResponse = await fetch('/api/payment-keywords/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ methods })
        });
        
        if (updateResponse.ok) {
            showToast(`${methodName} মুছে ফেলা হয়েছে`, 'success');
            closeModal();
            showPaymentKeywordsModal();
        } else {
            showToast('মুছে ফেলা ব্যর্থ', 'error');
        }
    } catch (error) {
        console.error('Error deleting payment method:', error);
        showToast('মুছে ফেলতে ব্যর্থ', 'error');
    }
}

// Edit Message Settings Modal
function showEditMessageModal() {
    const modalHTML = `
        <div id="editMessageModal" class="modal" onclick="if(event.target === this) closeModal()">
            <div class="modal-content" style="max-width: 600px;">
                <h2><i class="fas fa-edit"></i> Delete Message Settings</h2>
                <div style="margin-top: 20px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid var(--border-color);">
                        <input type="checkbox" id="disableDeleteMessageCheckbox" style="width: 20px; height: 20px; cursor: pointer;">
                        <span style="flex: 1;">
                            <strong>Disable Delete Message Edit</strong>
                            <p style="color: #aaa; font-size: 12px; margin-top: 5px;">যখন অর্ডার delete হয়, বট যে message পাঠায় সেটা edit করা যাবে না</p>
                        </span>
                    </label>
                    
                    <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; display: none;" id="deleteMessagePreview">
                        <p style="color: #aaa; margin-bottom: 10px;">Delete Message:</p>
                        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; font-size: 13px; font-family: monospace; color: #43e97b;">
                            <pre style="margin: 0; white-space: pre-wrap;">✅ *Order Cancelled*

🗑️ Order ID: [ID]
💎 Diamonds: [Amount]💎
👤 User: [Name]

📝 Admin Reason: [Message]
⏹️ Status: DELETED (Correction applied)</pre>
                        </div>
                    </div>
                </div>
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="closeModal()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
                    <button onclick="saveDeleteMessageSettings()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">Save Settings</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalContainer').innerHTML = modalHTML;
    
    // Load current settings
    fetch('/api/diamond-status')
        .then(r => r.json())
        .then(data => {
            if (data.disableDeleteMessageEdit) {
                document.getElementById('disableDeleteMessageCheckbox').checked = true;
                document.getElementById('deleteMessagePreview').style.display = 'block';
            }
        })
        .catch(e => console.log('Error loading settings:', e));
    
    // Show preview when toggle changes
    document.getElementById('disableDeleteMessageCheckbox').addEventListener('change', (e) => {
        document.getElementById('deleteMessagePreview').style.display = e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('editMessageModal').style.display = 'flex';
}

// Save delete message settings
async function saveDeleteMessageSettings() {
    const isDisabled = document.getElementById('disableDeleteMessageCheckbox').checked;
    
    try {
        const response = await fetch('/api/diamond-status/delete-message-setting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disableDeleteMessageEdit: isDisabled })
        });
        
        if (response.ok) {
            showNotification('✅ Settings saved successfully!', 'success');
            closeModal();
            updateDeleteMessageToggleUI(); // Update the toggle button
        } else {
            showNotification('❌ Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// Toggle Delete Message Mode - ON/OFF Quick Switch
async function toggleDeleteMessageMode() {
    try {
        // Get current status
        const response = await fetch('/api/diamond-status');
        const data = await response.json();
        const currentState = data.disableDeleteMessageEdit;
        
        // Toggle to opposite
        const newState = !currentState;
        
        // Save new state
        const saveResponse = await fetch('/api/diamond-status/delete-message-setting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disableDeleteMessageEdit: newState })
        });
        
        if (saveResponse.ok) {
            updateDeleteMessageToggleUI();
            const message = newState ? 
                '🔇 Delete Message: OFF - Orders will be deleted SILENTLY' : 
                '🔔 Delete Message: ON - Confirmation message will be sent';
            showNotification(message, 'success');
        } else {
            showNotification('❌ Failed to toggle setting', 'error');
        }
    } catch (error) {
        console.error('Error toggling delete message mode:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// Update Delete Message Toggle UI
async function updateDeleteMessageToggleUI() {
    try {
        const response = await fetch('/api/diamond-status');
        const data = await response.json();
        const isDisabled = data.disableDeleteMessageEdit;
        
        const toggleElement = document.getElementById('deleteMessageToggleText');
        const toggleIcon = document.getElementById('deleteMessageToggleMenu').querySelector('i');
        const toggleMenu = document.getElementById('deleteMessageToggleMenu');
        
        if (isDisabled) {
            // OFF mode - delete message disabled (silent)
            toggleElement.textContent = '🔇 Delete Message: OFF';
            toggleElement.style.color = '#f5576c'; // Red for OFF
            toggleIcon.className = 'fas fa-toggle-off';
            toggleIcon.style.color = '#f5576c';
            toggleMenu.style.borderColor = '#f5576c';
            toggleMenu.style.background = 'rgba(245, 87, 108, 0.05)';
        } else {
            // ON mode - delete message enabled
            toggleElement.textContent = '✅ Delete Message: ON';
            toggleElement.style.color = '#43e97b'; // Green for ON
            toggleIcon.className = 'fas fa-toggle-on';
            toggleIcon.style.color = '#43e97b';
            toggleMenu.style.borderColor = '#43e97b';
            toggleMenu.style.background = 'rgba(67, 233, 123, 0.05)';
        }
    } catch (error) {
        console.error('Error updating toggle UI:', error);
    }
}

// Initialize Delete Message Toggle on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for DOM to fully load
    setTimeout(updateDeleteMessageToggleUI, 500);
    setTimeout(updateAutoApprovalMessageToggleUI, 500);
});

// Toggle Auto-Approval Message Mode - ON/OFF Quick Switch
async function toggleAutoApprovalMessage() {
    try {
        // Get current status
        const response = await fetch('/api/diamond-status');
        const data = await response.json();
        const currentState = data.disableAutoApprovalMessage;
        
        // Toggle to opposite
        const newState = !currentState;
        
        // Save new state
        const saveResponse = await fetch('/api/diamond-status/auto-approval-message-setting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disableAutoApprovalMessage: newState })
        });
        
        if (saveResponse.ok) {
            updateAutoApprovalMessageToggleUI();
            const message = newState ? 
                '🔇 Auto-Approve Message: OFF - No message when auto-approved' : 
                '🔔 Auto-Approve Message: ON - Message sent when auto-approved';
            showNotification(message, 'success');
        } else {
            showNotification('❌ Failed to toggle setting', 'error');
        }
    } catch (error) {
        console.error('Error toggling auto-approval message mode:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// Update Auto-Approval Message Toggle UI
async function updateAutoApprovalMessageToggleUI() {
    try {
        const response = await fetch('/api/diamond-status');
        const data = await response.json();
        const isDisabled = data.disableAutoApprovalMessage;
        
        const toggleElement = document.getElementById('autoApprovalMessageToggleText');
        const toggleIcon = document.getElementById('autoApprovalMessageToggleMenu').querySelector('i');
        const toggleMenu = document.getElementById('autoApprovalMessageToggleMenu');
        
        if (isDisabled) {
            // OFF mode - auto-approval message disabled (silent)
            toggleElement.textContent = '🔇 Auto-Approve Message: OFF';
            toggleElement.style.color = '#f5576c'; // Red for OFF
            toggleIcon.className = 'fas fa-toggle-off';
            toggleIcon.style.color = '#f5576c';
            toggleMenu.style.borderColor = '#f5576c';
            toggleMenu.style.background = 'rgba(245, 87, 108, 0.05)';
        } else {
            // ON mode - auto-approval message enabled
            toggleElement.textContent = '✅ Auto-Approve Message: ON';
            toggleElement.style.color = '#43e97b'; // Green for ON
            toggleIcon.className = 'fas fa-toggle-on';
            toggleIcon.style.color = '#43e97b';
            toggleMenu.style.borderColor = '#43e97b';
            toggleMenu.style.background = 'rgba(67, 233, 123, 0.05)';
        }
    } catch (error) {
        console.error('Error updating auto-approval toggle UI:', error);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// 🔄 REAL-TIME ORDER UPDATE SYSTEM - Advanced Page-Without-Move Updates
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Update order status in real-time without full page reload
 * @param {string} orderId - Order ID to update
 * @param {string} newStatus - New status (approved, cancelled, deleted, etc.)
 * @param {object} data - Additional data from socket event
 */
function updateOrderStatusRealTime(orderId, newStatus, data = {}) {
    try {
        console.log(`[RT-UPDATE] 🔄 Updating order ${orderId} to ${newStatus}`);
        
        // Find the order in the allOrders array
        const orderIndex = allOrders.findIndex(o => o.id == orderId);
        
        if (orderIndex === -1) {
            console.log(`[RT-UPDATE] ⚠️ Order ${orderId} not found - cannot update`);
            return;
        }
        
        // Update the order object with new status ONLY
        const oldStatus = allOrders[orderIndex].status;
        allOrders[orderIndex].status = newStatus;
        
        // Update additional properties if provided
        if (data.processingStartedAt) {
            allOrders[orderIndex].processingStartedAt = data.processingStartedAt;
        }
        
        console.log(`[RT-UPDATE] ✅ Order ${orderId}: ${oldStatus} → ${newStatus}`);
        
        // 🚫 DO NOT CALL loadOrdersNew() - it causes full page refresh
        // Instead, just re-render the current page with updated data
        displayOrdersPage(currentOrderPage);
        
        // Highlight the updated row with animation
        setTimeout(() => {
            highlightOrderRow(orderId, newStatus);
        }, 100);
        
    } catch (error) {
        console.error(`[RT-UPDATE] ❌ Error updating order:`, error);
    }
}

/**
 * Add a new order to the table in real-time
 * @param {object} order - New order object
 */
function addNewOrderToTable(order) {
    try {
        console.log(`[NEW ORDER] ➕ Adding new order to table:`, order);
        
        if (!order || !order.id) {
            console.warn('[NEW ORDER] Invalid order object');
            return;
        }
        
        // Check if order already exists
        const exists = allOrders.find(o => o.id === order.id);
        if (exists) {
            console.log('[NEW ORDER] Order already exists, updating instead');
            updateOrderStatusRealTime(order.id, order.status, order);
            return;
        }
        
        // Add new order to the beginning of the array
        allOrders.unshift(order);
        console.log(`[NEW ORDER] ✅ Order added. Total orders: ${allOrders.length}`);
        
        // 🚫 DO NOT CALL loadOrdersNew() - it causes full page refresh
        // Just re-render the current page with updated data
        currentOrderPage = 1;
        displayOrdersPage(1);
        renderOrdersPagination(allOrders.length);
        
        // Highlight the new row
        setTimeout(() => {
            highlightOrderRow(order.id, 'new');
        }, 100);
        
    } catch (error) {
        console.error('[NEW ORDER] Error adding order:', error);
    }
}

/**
 * Remove an order from the table in real-time with fade-out effect
 * @param {string} orderId - Order ID to remove
 */
function removeOrderFromTable(orderId) {
    try {
        console.log(`[REMOVE ORDER] 🗑️ Removing order ${orderId} from table`);
        
        // Find the order row in DOM
        const rows = document.querySelectorAll('#ordersTableNew tr');
        let rowElement = null;
        
        for (let row of rows) {
            const cells = row.querySelectorAll('td');
            // Check if this is our order (comparing with playerId column)
            if (cells.length > 0) {
                // We'll search by finding the order in the table that matches our order ID
                const ordersInPage = allOrders.filter(o => {
                    const start = (currentOrderPage - 1) * ordersPerPage;
                    const end = start + ordersPerPage;
                    const idx = allOrders.indexOf(o);
                    return idx >= start && idx < end;
                });
                
                // Just do a full refresh since we can match easily in array
                break;
            }
        }
        
        // Remove from allOrders array
        const orderIndex = allOrders.findIndex(o => o.id == orderId);
        if (orderIndex !== -1) {
            const removedOrder = allOrders.splice(orderIndex, 1)[0];
            console.log(`[REMOVE ORDER] ✅ Removed from array. Total: ${allOrders.length}`);
            
            // Re-render the table
            displayOrdersPage(currentOrderPage);
            renderOrdersPagination(allOrders.length);
        } else {
            console.log('[REMOVE ORDER] Order not found in array');
        }
        
    } catch (error) {
        console.error('[REMOVE ORDER] Error removing order:', error);
    }
}

/**
 * Highlight/animate an order row to draw attention
 * @param {string} orderId - Order ID to highlight
 * @param {string} type - Type of highlight: 'success', 'warning', 'error', 'new'
 */
function highlightOrderRow(orderId, type = 'success') {
    try {
        console.log(`[HIGHLIGHT] ✨ Highlighting order ${orderId} (type: ${type})`);
        
        // Find the row in the current page
        const allRows = document.querySelectorAll('#ordersTableNew tr');
        let targetRow = null;
        
        for (let row of allRows) {
            // Check if this row contains our order
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                // Search in allOrders for current page
                const pageStart = (currentOrderPage - 1) * ordersPerPage;
                const pageEnd = pageStart + ordersPerPage;
                const pageOrders = allOrders.slice(pageStart, pageEnd);
                
                for (let i = 0; i < pageOrders.length; i++) {
                    if (pageOrders[i].id == orderId) {
                        targetRow = allRows[i]; // nth row on page
                        break;
                    }
                }
            }
            if (targetRow) break;
        }
        
        if (!targetRow) {
            console.log('[HIGHLIGHT] Row not found on current page');
            return;
        }
        
        // Apply highlight animation
        const highlightColor = 
            type === 'success' ? 'rgba(67, 233, 123, 0.3)' :
            type === 'warning' ? 'rgba(254, 202, 87, 0.3)' :
            type === 'error' ? 'rgba(245, 87, 108, 0.3)' :
            'rgba(79, 172, 254, 0.3)'; // new
        
        // Add animation class
        targetRow.style.transition = 'background-color 0.3s ease';
        targetRow.style.backgroundColor = highlightColor;
        
        // Remove highlight after animation
        setTimeout(() => {
            targetRow.style.backgroundColor = '';
            targetRow.style.transition = '';
        }, 2000);
        
        console.log(`[HIGHLIGHT] ✅ Applied ${type} highlight`);
        
    } catch (error) {
        console.error('[HIGHLIGHT] Error highlighting row:', error);
    }
}

/**
 * Update processing timer for orders with processing status
 * This function updates the countdown timer in real-time
 */
function updateProcessingTimers() {
    try {
        const rows = document.querySelectorAll('#ordersTableNew tr');
        
        rows.forEach((row, index) => {
            const statusCell = row.querySelector('[data-label="Status"]');
            if (!statusCell) return;
            
            const statusBadge = statusCell.querySelector('.status-badge.status-processing');
            if (!statusBadge) return;
            
            const orderId = statusBadge.getAttribute('data-order-id');
            const startTime = parseInt(statusBadge.getAttribute('data-start-time'));
            
            if (!orderId || !startTime) return;
            
            // Calculate remaining time
            const elapsedMs = Date.now() - startTime;
            const remainingMs = (2 * 60 * 1000) - elapsedMs; // 2 minutes
            
            if (remainingMs <= 0) {
                // Time's up - order should auto-approve
                // Update will come from server via socket event
                statusBadge.textContent = '0:00';
                return;
            }
            
            // Update timer display
            const totalSeconds = Math.ceil(remainingMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Update badge text without changing the HTML structure
            const icon = statusBadge.innerHTML.match(/<[^>]+>/)?.[0] || '';
            statusBadge.textContent = `⏳ ${timeDisplay}`;
        });
        
    } catch (error) {
        console.error('[TIMER] Error updating timers:', error);
    }
}

// Start timer update interval when Orders page is visible
function startOrdersTimerUpdate() {
    const ordersView = document.getElementById('ordersView');
    if (!ordersView) return;
    
    // Clear any existing interval
    if (window.ordersTimerInterval) {
        clearInterval(window.ordersTimerInterval);
    }
    
    // Update timers every second
    window.ordersTimerInterval = setInterval(() => {
        const ordersView = document.getElementById('ordersView');
        if (ordersView && ordersView.classList.contains('active')) {
            updateProcessingTimers();
        } else {
            // Stop timer updates when orders view is not active
            if (window.ordersTimerInterval) {
                clearInterval(window.ordersTimerInterval);
                window.ordersTimerInterval = null;
            }
        }
    }, 1000); // Update every second
}

// Stop timer updates when view changes
function stopOrdersTimerUpdate() {
    if (window.ordersTimerInterval) {
        clearInterval(window.ordersTimerInterval);
        window.ordersTimerInterval = null;
    }
}

// Hook into view navigation to manage timer updates and polling
const originalShowView = window.showView;
window.showView = function(viewId) {
    originalShowView.call(this, viewId);
    
    if (viewId === 'ordersView') {
        startOrdersTimerUpdate();
        enableOrdersPolling(); // Start real-time polling
    } else {
        stopOrdersTimerUpdate();
        disableOrdersPolling(); // Stop polling when leaving Orders view
    }
};

console.log('[REAL-TIME SYSTEM] ✅ Real-time order update system initialized');

// ═══════════════════════════════════════════════════════════════════════════════════
// 🔄 BACKGROUND AUTO-REFRESH INDICATOR - Visual feedback for silent updates
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Show background refresh indicator (when data is updating silently)
 */
function showBgRefreshIndicator() {
    try {
        const indicator = document.getElementById('bgRefreshIndicator');
        if (!indicator) return;
        
        // Remove any existing 'done' animation
        indicator.classList.remove('done');
        
        // Show the indicator
        indicator.classList.add('active');
        
        console.log('[BG REFRESH] 🔄 Indicator shown');
    } catch (error) {
        console.error('[BG REFRESH] Error showing indicator:', error);
    }
}

/**
 * Hide background refresh indicator with completion animation
 */
function hideBgRefreshIndicator() {
    try {
        const indicator = document.getElementById('bgRefreshIndicator');
        if (!indicator) return;
        
        // Add completion animation
        indicator.classList.add('done');
        
        // Remove active state
        setTimeout(() => {
            indicator.classList.remove('active');
            indicator.classList.remove('done');
        }, 2500); // Wait for animation to complete
        
        console.log('[BG REFRESH] ✅ Indicator hidden');
    } catch (error) {
        console.error('[BG REFRESH] Error hiding indicator:', error);
    }
}

/**
 * Wrap silent refresh with indicator
 */
async function silentRefreshDataWithIndicator() {
    try {
        // Show indicator that data is updating
        showBgRefreshIndicator();
        
        // Perform silent refresh
        await silentRefreshData();
        
        // Hide indicator after update completes
        hideBgRefreshIndicator();
    } catch (error) {
        console.error('[BG REFRESH WITH INDICATOR] Error:', error);
        hideBgRefreshIndicator();
    }
}

// Load Sales Statistics
// Toggle Group Selection
function toggleGroupSelection(groupId) {
    if (selectedGroups.has(groupId)) {
        selectedGroups.delete(groupId);
    } else {
        selectedGroups.add(groupId);
    }
    
    // Update checkbox
    const checkbox = document.querySelector(`input[value="${groupId}"]`);
    if (checkbox) {
        checkbox.checked = selectedGroups.has(groupId);
    }
}

// Select All Groups
// Toggle Select/Deselect All Groups
function toggleSelectAll() {
    const btn = document.getElementById('toggleSelectBtn');
    const icon = btn.querySelector('i');
    
    // Check if all groups are currently selected
    const allSelected = selectedGroups.size === allGroups.length;
    
    if (allSelected) {
        // Deselect all
        selectedGroups.clear();
        document.querySelectorAll('input.checkbox-select').forEach(checkbox => {
            checkbox.checked = false;
        });
        document.getElementById('calculationResult').style.display = 'none';
        
        // Update button to "Select All"
        btn.classList.remove('btn-deselect');
        icon.className = 'fas fa-check-square';
        btn.innerHTML = '<i class="fas fa-check-square"></i> Select All';
        
        showToast('All groups deselected!', 'info');
    } else {
        // Select all
        allGroups.forEach(group => {
            selectedGroups.add(group.id);
            const checkbox = document.querySelector(`input[value="${group.id}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        
        // Update button to "Deselect All"
        btn.classList.add('btn-deselect');
        icon.className = 'fas fa-times-square';
        btn.innerHTML = '<i class="fas fa-times-square"></i> Deselect All';
        
        showToast(`All ${allGroups.length} groups selected!`, 'success');
    }
}

// Legacy functions for compatibility
function selectAllGroups() {
    toggleSelectAll();
}

function deselectAllGroups() {
    const btn = document.getElementById('toggleSelectBtn');
    if (btn.classList.contains('btn-deselect')) {
        toggleSelectAll();
    }
}

// Calculate Selected Diamonds
function calculateSelectedDiamonds() {
    if (selectedGroups.size === 0) {
        showToast('Please select at least one group!', 'warning');
        return;
    }
    
    let totalDiamonds = 0;
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;
    
    selectedGroups.forEach(groupId => {
        const group = allGroups.find(g => g.id === groupId);
        if (group) {
            totalDiamonds += group.totalDiamonds;
            totalAmount += group.totalAmount;
            totalPaid += (group.totalAmount - group.totalDue);
            totalDue += group.totalDue;
        }
    });
    
    // Update UI
    document.getElementById('selectedGroupCount').textContent = selectedGroups.size;
    document.getElementById('totalDiamondsSelected').textContent = `💎 ${totalDiamonds.toLocaleString()}`;
    document.getElementById('totalAmountSelected').textContent = `৳${totalAmount.toLocaleString()}`;
    document.getElementById('totalPaidSelected').textContent = `৳${totalPaid.toLocaleString()}`;
    document.getElementById('totalDueSelected').textContent = `৳${totalDue.toLocaleString()}`;
    
    // Show result
    document.getElementById('calculationResult').style.display = 'block';
    
    // Load group details for default tab (today)
    loadGroupDetails('today');
    
    // Scroll to result
    setTimeout(() => {
        document.getElementById('calculationResult').scrollIntoView({ behavior: 'smooth' });
    }, 100);
    
    console.log('📊 Calculation:', {
        selectedGroups: selectedGroups.size,
        totalDiamonds,
        totalAmount,
        totalPaid,
        totalDue
    });
}

// Switch Group Detail Tab
function switchGroupDetailTab(period) {
    // Update active button
    document.querySelectorAll('.tab-detail').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load data for selected period
    loadGroupDetails(period);
}

// Initialize group details on page load
function initializeGroupDetails() {
    // Load 'today' data by default
    loadGroupDetails('today');
}

// Load Group Details for specific period
async function loadGroupDetails(period) {
    const tableBody = document.getElementById('groupDetailsTableBody');
    
    if (!tableBody) {
        console.warn('[GROUP DETAILS] Table body element not found');
        return;
    }
    
    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="5" class="loading"><i class="fas fa-spinner fa-spin"></i> Loading data...</td></tr>';
    
    // Get selected groups - if none selected, use all groups
    let selectedGroupsArray = Array.from(selectedGroups)
        .map(groupId => allGroups.find(g => g.id === groupId))
        .filter(g => g);
    
    // If no groups selected, use all available groups
    if (selectedGroupsArray.length === 0 && allGroups.length > 0) {
        selectedGroupsArray = allGroups;
    }
    
    if (selectedGroupsArray.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="loading">No groups available</td></tr>';
        return;
    }
    
    try {
        // Fetch period-wise data from backend
        const response = await fetch(`/api/group-details/${period}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const allGroupDetails = await response.json();
        
        // Filter to only show selected groups
        const selectedDetails = allGroupDetails.filter(gd => 
            selectedGroupsArray.some(g => g.id === gd.id)
        );
        
        // Calculate totals
        let totalDiamonds = 0;
        let totalAmount = 0;
        let totalOrders = 0;
        
        // Display group details for this period
        const rows = selectedDetails.map(detail => {
            totalDiamonds += detail.diamonds;
            totalAmount += detail.amount;
            totalOrders += detail.orders;
            
            const status = detail.due === 0 ? '✅ Clear' : '⚠️ Due';
            const statusColor = detail.due === 0 ? '#43e97b' : '#f5576c';
            
            // Show period indicator
            let periodLabel = 'Overall';
            if (period === 'today') periodLabel = 'Today';
            else if (period === 'yesterday') periodLabel = 'Yesterday';
            else if (period === 'weekly') periodLabel = 'This Week';
            else if (period === 'monthly') periodLabel = 'This Month';
            
            return `
                <tr>
                    <td data-label="Group Name"><strong>${detail.name}</strong><br><small style="color: #999;">📊 ${periodLabel}</small></td>
                    <td data-label="💎 Diamonds" style="color: #43e97b; font-weight: bold;">${detail.diamonds.toLocaleString()}</td>
                    <td data-label="💰 Amount" style="color: #667eea; font-weight: bold;">৳${detail.amount.toLocaleString()}</td>
                    <td data-label="📊 Sales">${detail.orders} Orders</td>
                    <td data-label="📈 Status" style="color: ${statusColor}; font-weight: bold;">${status}</td>
                </tr>
            `;
        }).join('');
        
        // Add Total row
        const totalRow = `
            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-weight: bold; border-top: 2px solid #667eea;">
                <td data-label="Total" style="color: #fff;">📊 TOTAL (${selectedDetails.length} Groups)</td>
                <td data-label="💎 Diamonds" style="color: #ffff00; font-weight: bold; font-size: 1.1em;">${totalDiamonds.toLocaleString()}</td>
                <td data-label="💰 Amount" style="color: #fff; font-weight: bold; font-size: 1.1em;">৳${totalAmount.toLocaleString()}</td>
                <td data-label="📊 Sales" style="color: #fff;">${totalOrders} Orders</td>
                <td data-label="📈 Status" style="color: #fff;">✨ Summary</td>
            </tr>
        `;
        
        if (rows) {
            tableBody.innerHTML = rows + totalRow;
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="loading">No orders in this period</td></tr>';
        }
        
        console.log(`[GROUP DETAILS] ✅ Loaded ${selectedDetails.length} groups for period: ${period} | Total: ${totalOrders} orders, ৳${totalAmount}`);
        
    } catch (error) {
        console.error('[GROUP DETAILS] ❌ Error loading group details:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="loading" style="color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</td></tr>`;
    }
}

// ⚙️ FEATURE TOGGLE MANAGEMENT

// Load feature toggle status when settings modal opens
async function loadFeatureToggles() {
    try {
        const response = await fetch('/api/feature-toggles', {
            headers: {
                'Authorization': sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
            }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        if (!data.success) return;
        
        const toggles = data.toggles || {};
        
        // Update UI checkboxes
        if (toggles.duplicateDetection) {
            const elem = document.getElementById('duplicateDetectionToggle');
            if (elem) {
                elem.checked = toggles.duplicateDetection.enabled;
                updateToggleIndicator('duplicateDetectionIndicator', toggles.duplicateDetection.enabled);
            }
        }
        
        // Offline detection is now disabled - skip UI update
        // if (toggles.offlineDetection) {
        //     const elem = document.getElementById('offlineDetectionToggle');
        //     if (elem) {
        //         elem.checked = toggles.offlineDetection.enabled;
        //         updateToggleIndicator('offlineDetectionIndicator', toggles.offlineDetection.enabled);
        //     }
        // }
    } catch (error) {
        console.error('Error loading feature toggles:', error);
    }
}

// Toggle feature on/off
async function toggleFeature(featureName) {
    try {
        const toggleElem = document.getElementById(featureName + 'Toggle');
        if (!toggleElem) return;
        
        const enabled = toggleElem.checked;
        
        // Show loading state
        const oldText = toggleElem.parentElement.textContent;
        
        const response = await fetch(`/api/feature-toggle/${featureName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': sessionStorage.getItem('authToken') || localStorage.getItem('authToken'),
                'x-admin-name': sessionStorage.getItem('adminUsername') || 'admin'
            },
            body: JSON.stringify({ enabled: enabled })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update indicator
            updateToggleIndicator(featureName + 'Indicator', enabled);
            
            // Show toast notification
            const featureName_map = {
                'duplicateDetection': '🚫 Duplicate Order Detection',
                'offlineDetection': '📡 Offline Order Detection'
            };
            
            const featureLabel = featureName_map[featureName] || featureName;
            const status = enabled ? '✅ TURNED ON' : '❌ TURNED OFF';
            
            showToast(`${featureLabel} ${status}`, enabled ? 'success' : 'warning');
            
            // Log the action
            console.log(`[FEATURE TOGGLE] ${featureName} toggled to ${enabled}`);
        } else {
            // Revert checkbox on error
            toggleElem.checked = !enabled;
            showToast(`❌ Error: ${data.message || 'Failed to toggle feature'}`, 'error');
        }
    } catch (error) {
        console.error('Error toggling feature:', error);
        showToast('❌ Error toggling feature', 'error');
    }
}

// Update visual indicator for toggle
function updateToggleIndicator(indicatorId, enabled) {
    const indicator = document.getElementById(indicatorId);
    if (indicator) {
        if (enabled) {
            indicator.textContent = '✓';
            indicator.style.color = '#43e97b';
            indicator.style.fontWeight = 'bold';
        } else {
            indicator.textContent = '✕';
            indicator.style.color = '#f5576c';
            indicator.style.fontWeight = 'bold';
        }
    }
}

// Load toggles when settings modal is shown
const originalShowSettingsModal = showSettingsModal;
const newShowSettingsModal = function() {
    originalShowSettingsModal.call(this);
    loadFeatureToggles();
};
// Override the function after it's defined
setTimeout(() => {
    window.showSettingsModal = function() {
        const modal = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-cog"></i> Settings</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <h3>Appearance</h3>
                    <div style="margin: 15px 0;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" ${currentTheme === 'light' ? 'checked' : ''} 
                                   onchange="toggleThemeFromSettings()" id="themeCheckbox">
                            <span>Light Mode</span>
                        </label>
                    </div>
                    
                    <h3 style="margin-top: 25px;">Language</h3>
                    <div style="margin: 15px 0;">
                        <select onchange="changeLanguage(this.value)" style="width: 100%; padding: 10px; border-radius: 8px; background: var(--dark-bg); color: var(--text-primary); border: 1px solid var(--border-color);">
                            <option value="bn" ${currentLang === 'bn' ? 'selected' : ''}>Bangla</option>
                            <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
                        </select>
                    </div>
                    
                    <h3 style="margin-top: 25px;"><i class="fas fa-bell"></i> Notification Sound</h3>
                    <div style="margin: 15px 0;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; margin-bottom: 10px;">
                            <input type="checkbox" id="notificationEnabledCheckbox" 
                                   ${localStorage.getItem('notificationEnabled') !== 'false' ? 'checked' : ''}>
                            <span>Enable Order Notifications</span>
                        </label>
                        
                        <div style="margin: 15px 0;">
                            <label style="display: block; margin-bottom: 8px; color: var(--text-secondary);">
                                <i class="fas fa-music"></i> Select Sound:
                            </label>
                            <select id="notificationSoundSelect" 
                                    style="width: 100%; padding: 10px; border-radius: 8px; background: var(--dark-bg); color: var(--text-primary); border: 1px solid var(--border-color);">
                                <option value="">-- No Sound --</option>
                                <option value="mixkit-bell-notification-933.wav" ${localStorage.getItem('notificationSound') === 'mixkit-bell-notification-933.wav' ? 'selected' : ''}>Bell Notification</option>
                                <option value="mixkit-correct-answer-tone-2870.wav" ${localStorage.getItem('notificationSound') === 'mixkit-correct-answer-tone-2870.wav' ? 'selected' : ''}>Correct Answer Tone</option>
                                <option value="mixkit-digital-quick-tone-2866.wav" ${localStorage.getItem('notificationSound') === 'mixkit-digital-quick-tone-2866.wav' ? 'selected' : ''}>Digital Quick Tone</option>
                                <option value="mixkit-doorbell-tone-2864.wav" ${localStorage.getItem('notificationSound') === 'mixkit-doorbell-tone-2864.wav' ? 'selected' : ''}>Doorbell Tone</option>
                                <option value="mixkit-happy-bells-notification-937.wav" ${localStorage.getItem('notificationSound') === 'mixkit-happy-bells-notification-937.wav' ? 'selected' : ''}>Happy Bells</option>
                                <option value="mixkit-magic-notification-ring-2344.wav" ${localStorage.getItem('notificationSound') === 'mixkit-magic-notification-ring-2344.wav' ? 'selected' : ''}>Magic Notification Ring</option>
                                <option value="mixkit-message-pop-alert-2354.mp3" ${localStorage.getItem('notificationSound') === 'mixkit-message-pop-alert-2354.mp3' ? 'selected' : ''}>Message Pop Alert</option>
                                <option value="mixkit-bubble-pop-up-alert-notification-2357.wav" ${localStorage.getItem('notificationSound') === 'mixkit-bubble-pop-up-alert-notification-2357.wav' ? 'selected' : ''}>Bubble Pop Alert</option>
                                <option value="mixkit-game-notification-wave-alarm-987.wav" ${localStorage.getItem('notificationSound') === 'mixkit-game-notification-wave-alarm-987.wav' ? 'selected' : ''}>Wave Alarm</option>
                                <option value="mixkit-interface-hint-notification-911.wav" ${localStorage.getItem('notificationSound') === 'mixkit-interface-hint-notification-911.wav' ? 'selected' : ''}>Interface Hint</option>
                            </select>
                        </div>
                        
                        <button class="btn-primary" onclick="reviewNotificationSound()" 
                                style="width: 100%; margin-top: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <i class="fas fa-volume-up"></i> Review Sound
                        </button>
                    </div>
                    
                    <h3 style="margin-top: 25px;">Auto-Refresh</h3>
                    <div style="margin: 15px 0;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" checked>
                            <span>Auto-refresh every 30 seconds</span>
                        </label>
                    </div>
                    
                    <h3 style="margin-top: 25px; color: #4facfe;"><i class="fas fa-shield-alt"></i> Order Protection</h3>
                    <div style="margin: 15px 0; background: rgba(79, 172, 254, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #4facfe;">
                        <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600; margin-bottom: 3px;">🚫 Duplicate Order Detection</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Block same order within 5 minutes</div>
                            </div>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="duplicateDetectionToggle" onchange="toggleFeature('duplicateDetection')">
                                <span class="toggle-indicator" id="duplicateDetectionIndicator">✓</span>
                            </label>
                        </div>
                        <div style="border-top: 1px solid rgba(79, 172, 254, 0.2); padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600; margin-bottom: 3px;">📡 Offline Order Detection</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Detect & track offline orders</div>
                            </div>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="offlineDetectionToggle" onchange="toggleFeature('offlineDetection')">
                                <span class="toggle-indicator" id="offlineDetectionIndicator">✓</span>
                            </label>
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 25px; color: #f5576c;"><i class="fas fa-lock"></i> Security</h3>
                    <div style="margin: 15px 0; display: grid; gap: 10px;">
                        <button class="btn-primary" onclick="showChangeUsernameModal()" style="width: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <i class="fas fa-user-edit"></i> Change Username
                        </button>
                        <button class="btn-primary" onclick="showChangePasswordModal()" style="width: 100%; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                            <i class="fas fa-key"></i> Change Password
                        </button>
                    </div>
                    
                    <button class="btn-primary" onclick="closeModal()" style="width: 100%; margin-top: 20px;">
                        <i class="fas fa-save"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;
        document.getElementById('modalContainer').innerHTML = modal;
        loadFeatureToggles();
    };
}, 100);


console.log('[BG REFRESH INDICATOR] ✅ Background refresh indicator system initialized');
console.log('[FEATURE TOGGLE] ✅ Feature toggle management system initialized');

/**
 * 🔌 CONNECTION STATUS MONITORING
 * Show/hide connection warning banner
 */
function showConnectionWarning(message) {
    let warningBanner = document.getElementById('connectionWarningBanner');
    if (!warningBanner) {
        warningBanner = document.createElement('div');
        warningBanner.id = 'connectionWarningBanner';
        warningBanner.style.cssText = `
            position: fixed;
            top: 60px;
            right: 0;
            left: 0;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
            color: white;
            padding: 12px 20px;
            font-weight: 500;
            text-align: center;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
            animation: slideDown 0.3s ease-out;
        `;
        document.body.insertBefore(warningBanner, document.body.firstChild);
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    transform: translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    warningBanner.textContent = message || '⚠️ সংযোগ হারিয়েছি, পুনরায় সংযোগ করছি...';
    warningBanner.style.display = 'block';
}

function hideConnectionWarning() {
    const warningBanner = document.getElementById('connectionWarningBanner');
    if (warningBanner) {
        warningBanner.style.display = 'none';
    }
}

/**
 * ✅ SYNC PENDING ORDERS ON RECONNECT
 * When connection drops and reconnects, resync pending orders
 */
function syncPendingOrdersOnReconnect() {
    console.log('[RECONNECT] 🔄 Syncing pending orders after reconnect...');
    // Trigger a fresh load of pending orders
    loadOrdersNew();
    loadStats();
    console.log('[RECONNECT] ✅ Sync triggered');
}

