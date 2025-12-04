// Authentication Check
function checkAuthentication() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    return true;
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

// Socket.IO Connection
const socket = io();

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
    initSocketListeners();
    loadDashboardData();
    
    // Load initial data
    refreshData();

    // Restore previous view if saved
    const savedView = localStorage.getItem('currentView');
    if (savedView && document.getElementById(savedView)) {
        // Simulate click on the corresponding nav item
        const navItem = document.querySelector(`.nav-item[onclick*="${savedView}"]`);
        if (navItem) {
            navItem.click();
        }
    }
});

// Theme Management
function initTheme() {
    if (currentTheme === 'light') {
        document.body.setAttribute('data-theme', 'light');
        document.querySelector('#themeToggle i').className = 'fas fa-sun';
    }
}

document.getElementById('themeToggle').addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
    
    if (currentTheme === 'light') {
        document.body.setAttribute('data-theme', 'light');
        document.querySelector('#themeToggle i').className = 'fas fa-sun';
    } else {
        document.body.removeAttribute('data-theme');
        document.querySelector('#themeToggle i').className = 'fas fa-moon';
    }
});

// Language Toggle
document.getElementById('langToggle').addEventListener('click', () => {
    currentLang = currentLang === 'bn' ? 'en' : 'bn';
    showToast(currentLang === 'bn' ? 'Language: Bangla' : 'Language: English', 'success');
});

// Socket.IO Listeners
function initSocketListeners() {
    socket.on('connect', () => {
        console.log('Connected to server');
        // Silent connection - no toast
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        // Silent disconnect - no toast
    });

    socket.on('dataUpdated', () => {
        console.log('Data updated event received (refresh disabled for orders page)');
        playNotificationSound(); // Play sound when data is updated (new order)
        
        // Show background refresh indicator
        showBgRefreshIndicator();
        
        // Perform silent refresh in background
        silentRefreshData().then(() => {
            // Hide indicator when done
            hideBgRefreshIndicator();
        }).catch(err => {
            console.error('Silent refresh error:', err);
            hideBgRefreshIndicator();
        });
        // DISABLED: silentRefreshData() - Removed to prevent page movement
        // Only orderEvent listener will update the orders page
    });

    socket.on('groupRateUpdated', (data) => {
        console.log(`Group ${data.groupId} rate updated to ${data.rate}`);
        if (!isInputFocused) {
            loadGroups();
        }
    });

    socket.on('bulkRateUpdated', (data) => {
        console.log(`${data.count} groups updated to rate ${data.rate}`);
        if (!isInputFocused) {
            loadGroups();
        }
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
        if (!isInputFocused) {
            // Refresh groups to show updated due amounts
            loadGroups();
            loadStats();
            // Also refresh the user list if modal is open
            const modalContainer = document.getElementById('modalContainer');
            if (modalContainer && modalContainer.innerHTML.includes('User')) {
                loadUsers(); // This will refresh the user list
            }
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

    // 📊 NEW ORDER CREATED - Real-time add to table
    socket.on('newOrderCreated', (data) => {
        console.log(`[NEW ORDER] ✨ New order created:`, data);
        if (data.order) {
            addNewOrderToTable(data.order);
            playNotificationSound();
            showToast(`🎯 New order from ${data.order.phone}`, 'success');
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
        }
    });
}

// View Navigation
function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Show selected view
    document.getElementById(viewId).classList.add('active');

    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');

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

        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('totalDeposits').textContent = `৳${stats.totalDeposits.toLocaleString()}`;
        document.getElementById('pendingDiamonds').textContent = stats.pendingDiamonds.toLocaleString();
        document.getElementById('pendingAmount').textContent = `৳${Math.round(stats.pendingAmount).toLocaleString()}`;
        document.getElementById('totalOrders').textContent = stats.totalOrders;
        document.getElementById('quickPendingCount').textContent = stats.pendingDiamonds > 0 ? stats.pendingDiamonds : '0';

        // Update notification badge
        document.getElementById('notifBadge').textContent = stats.pendingDiamonds > 0 ? stats.pendingDiamonds : '0';
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load Last Auto-Deduction
async function loadLastAutoDeduction() {
    try {
        const response = await fetch('/api/auto-deductions');
        const deductions = await response.json();
        const container = document.getElementById('autoDeductList');

        if (!Array.isArray(deductions) || deductions.length === 0) {
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
        const response = await fetch('/api/groups');
        allGroups = await response.json();

        const container = document.getElementById('groupsGrid');
        
        if (allGroups.length === 0) {
            container.innerHTML = '<div class="loading-state">No groups found</div>';
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
                    </div>
                    <div class="group-info-quick">
                        <div class="quick-info-item">
                            <span class="info-label">💎 Rate:</span>
                            <span class="info-value">${group.rate}/tk</span>
                        </div>
                        <div class="quick-info-item">
                            <span class="info-label">💰 Due:</span>
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
                            ${group.userDueBreakdown.map(user => `
                                <div class="due-item">
                                    <div class="due-user-info">
                                        <span class="due-user-name">${user.displayName}</span>
                                        <span class="due-user-phone">${user.userId}</span>
                                    </div>
                                    <div class="due-user-amount">৳${user.due.toLocaleString()}</div>
                                </div>
                            `).join('')}
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
            
            // Track input focus to prevent refresh while typing
            document.querySelectorAll('.rate-input, .due-limit-input').forEach(input => {
                input.addEventListener('focus', () => {
                    isInputFocused = true;
                    console.log('Input focused - auto-refresh paused');
                });
                input.addEventListener('blur', () => {
                    isInputFocused = false;
                    console.log('Input blurred - auto-refresh resumed');
                });
            });
        }, 100);
    } catch (error) {
        console.error('Error loading groups:', error);
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

        tbody.innerHTML = allTransactions.slice(0, 50).map(t => `
            <tr>
                <td>${t.id.substring(0, 8)}...</td>
                <td><strong>${t.groupName || t.phone || 'Unknown'}</strong></td>
                <td>৳${t.amount.toLocaleString()}</td>
                <td>${t.method}</td>
                <td><span class="status-badge status-${t.status}">${t.status}</span></td>
                <td>${new Date(t.date).toLocaleString('bn-BD')}</td>
            </tr>
        `).join('');

        // Update recent transactions on dashboard - only manual type
        const recentTbody = document.getElementById('recentTransactions');
        const manualTransactions = allTransactions.filter(t => t.type === 'manual');
        recentTbody.innerHTML = manualTransactions.slice(0, 5).map(t => `
            <tr>
                <td data-label="Group Name">${t.groupName || 'Unknown Group'}</td>
                <td data-label="Amount">৳${t.amount.toLocaleString()}</td>
                <td data-label="Type">${t.type}</td>
                <td data-label="Date">${new Date(t.date).toLocaleDateString('bn-BD')}</td>
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
            const elapsedMs = Date.now() - startTime;
            const remainingMs = (2 * 60 * 1000) - elapsedMs; // 2 minutes = 120000 ms
            
            if (remainingMs > 0) {
                const totalSeconds = Math.ceil(remainingMs / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                element.textContent = `⏳ ${timeDisplay}`;
            } else {
                element.textContent = '⏳ 0:00';
            }
        });
    }, 1000); // Update every second
}

// Initialize countdown when page loads
document.addEventListener('DOMContentLoaded', () => {
    startProcessingCountdown();
});

// Real-time polling system - refreshes orders every 3 seconds
let ordersPollingInterval = null;
let isOrdersViewActive = false;

function startOrdersPolling() {
    if (ordersPollingInterval) return; // Already polling
    
    console.log('[ORDERS POLLING] Started - updating every 3 seconds');
    isOrdersViewActive = true;
    
    // Initial load
    loadOrdersNew();
    
    // Refresh every 3 seconds while Orders view is active
    ordersPollingInterval = setInterval(() => {
        if (isOrdersViewActive) {
            silentRefreshOrders();
        }
    }, 3000);
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
        const response = await fetch('/api/orders');
        allOrders = await response.json();

        const tbody = document.getElementById('ordersTableNew');
        
        if (allOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">No orders found</td></tr>';
            document.getElementById('ordersPagination').innerHTML = '';
            return;
        }

        // Display orders for current page
        displayOrdersPage(currentOrderPage);
        
        // Render pagination controls
        renderOrdersPagination(allOrders.length);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Silent background refresh - ENABLED for polling
// This function refreshes orders silently without page reload
async function silentRefreshOrders() {
    try {
        // Save current scroll position
        const bodyScrollY = window.scrollY || document.documentElement.scrollTop;
        const mainContent = document.querySelector('.main-content');
        const mainScrollY = mainContent ? mainContent.scrollTop : 0;
        
        const response = await fetch('/api/orders');
        const newOrders = await response.json();
        
        // Only update if data has changed
        if (JSON.stringify(newOrders) !== JSON.stringify(allOrders)) {
            allOrders = newOrders;
            console.log('[SILENT REFRESH] Orders updated, rerendering table');
            
            // Update the current page display silently (NO page reload)
            displayOrdersPage(currentOrderPage);
            
            // Restore scroll position after DOM update completes
            // Use requestAnimationFrame twice to ensure all repaints are complete
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Restore main body scroll
                    if (bodyScrollY > 0) {
                        window.scrollTo({top: bodyScrollY, left: 0, behavior: 'auto'});
                    }
                    // Restore main content scroll
                    if (mainContent && mainScrollY > 0) {
                        mainContent.scrollTop = mainScrollY;
                    }
                });
            });
        }
    } catch (error) {
        console.log('[SILENT REFRESH] Error:', error.message);
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
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = pageOrders.map(o => {
        // Format date to English: MM/DD/YYYY, HH:MM:SS AM/PM
        const date = new Date(o.date);
        const formattedDate = date.toLocaleDateString('en-US') + ', ' + date.toLocaleTimeString('en-US');
        
        // Create status display with processing info and real-time countdown
        let statusDisplay = '';
        if (o.status === 'processing') {
            // Calculate remaining time from approval time (processingStartedAt - when admin said "Done")
            // Use processingStartedAt if available, otherwise fall back to order date
            const approvalTime = o.processingStartedAt ? new Date(o.processingStartedAt) : new Date(o.date);
            const elapsedMs = Date.now() - approvalTime;
            const remainingMs = (2 * 60 * 1000) - elapsedMs; // 2 minutes = 120000 ms
            
            const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            statusDisplay = `<span class="status-badge status-${o.status}" 
                                data-order-id="${o.id}" 
                                data-start-time="${approvalTime.getTime()}"
                                title="⏳ Processing - Auto-approves in 2 minutes. Delete message to cancel.">⏳ ${timeDisplay}</span>`;
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
        
        return `
            <tr>
                <td data-label="Phone">${o.phone}</td>
                <td data-label="ID/Number">${o.playerId}</td>
                <td data-label="Diamonds">${o.diamonds}</td>
                <td data-label="Amount">৳${o.amount.toLocaleString()}</td>
                <td data-label="Status">${statusDisplay}</td>
                <td data-label="Date">${formattedDate}</td>
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
                <td data-label="Phone">${o.phone}</td>
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
        const phone = o.phone.toLowerCase();
        const playerId = o.playerId.toLowerCase();
        const diamonds = o.diamonds.toString();
        const amount = o.amount.toString();
        const status = o.status.toLowerCase();
        
        return phone.includes(search) || playerId.includes(search) || 
               diamonds.includes(search) || amount.includes(search) || 
               status.includes(search);
    });

    // Display filtered results
    const tbody = document.getElementById('ordersTableNew');
    
    if (filteredOrdersCache.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No matching orders found</td></tr>';
        document.getElementById('ordersPagination').innerHTML = '';
        return;
    }

    // Show first page of filtered results
    const start = 0;
    const end = ordersPerPage;
    const pageOrders = filteredOrdersCache.slice(start, end);

    tbody.innerHTML = pageOrders.map(o => {
        const date = new Date(o.date);
        const formattedDate = date.toLocaleDateString('en-US') + ', ' + date.toLocaleTimeString('en-US');
        
        return `
            <tr>
                <td data-label="Phone">${o.phone}</td>
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

// Modal Functions
function showUsersModal() {
    fetch('/api/users')
        .then(res => res.json())
        .then(users => {
            const modal = `
                <div class="modal" onclick="closeModal(event)">
                    <div class="modal-content large-modal" onclick="event.stopPropagation()">
                        <div class="modal-header">
                            <h2><i class="fas fa-users"></i> User Management</h2>
                            <button class="modal-close" onclick="closeModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="search-bar">
                                <i class="fas fa-search"></i>
                                <input type="text" id="userSearch" placeholder="Search users..." onkeyup="filterModalTable()">
                            </div>
                            <div class="table-wrapper">
                                <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                                    <table class="data-table responsive-table">
                                        <thead>
                                            <tr>
                                                <th data-label="Phone">Phone</th>
                                                <th data-label="Name">Name</th>
                                                <th data-label="Main Balance">Main Balance</th>
                                                <th data-label="Due Balance">Due Balance</th>
                                                <th data-label="Status">Status</th>
                                                <th data-label="Action">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="modalTableBody">
                                            ${users.map(u => `
                                                <tr>
                                                    <td data-label="Phone"><span class="phone-number">${u.phone}</span></td>
                                                    <td data-label="Name">${u.name || 'N/A'}</td>
                                                    <td data-label="Main Balance"><span class="badge-balance">৳${(u.balance || 0).toLocaleString()}</span></td>
                                                    <td data-label="Due Balance"><span class="badge-due">৳${(u.dueBalance || 0).toLocaleString()}</span></td>
                                                    <td data-label="Status"><span class="status-badge status-${u.status}">${u.status}</span></td>
                                                    <td data-label="Action" class="action-cell">
                                                        <button class="btn-info" onclick="showEditUserModal('${u.phone}')" style="padding: 5px 10px; font-size: 0.85rem;">
                                                            <i class="fas fa-edit"></i> Edit
                                                        </button>
                                                        <button class="btn-${u.status === 'active' ? 'reject' : 'approve'}" 
                                                                onclick="toggleUserBlock('${u.phone}')" style="padding: 5px 10px; font-size: 0.85rem;">
                                                            ${u.status === 'active' ? 'Block' : 'Unblock'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('modalContainer').innerHTML = modal;
        });
}

function showEditUserModal(phone) {
    fetch(`/api/users/${phone}`)
        .then(res => res.json())
        .then(user => {
            const modal = `
                <div class="modal" onclick="closeModal(event)">
                    <div class="modal-content edit-modal" onclick="event.stopPropagation()">
                        <div class="modal-header">
                            <h2><i class="fas fa-user-edit"></i> Edit User - ${user.name}</h2>
                            <button class="modal-close" onclick="closeModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label>Phone:</label>
                                <input type="text" value="${user.phone}" disabled class="form-input">
                            </div>

                            <div class="form-group">
                                <label>Name:</label>
                                <input type="text" id="editUserName" value="${user.name || ''}" placeholder="User name" class="form-input">
                            </div>

                            <div class="form-group">
                                <label>Main Balance:</label>
                                <div class="input-button-group">
                                    <input type="number" id="editUserBalance" value="${user.balance || 0}" placeholder="0" class="form-input">
                                    <button onclick="addMainBalance('${phone}', 100)" class="btn-add">+100</button>
                                    <button onclick="addMainBalance('${phone}', 500)" class="btn-add">+500</button>
                                    <button onclick="addMainBalance('${phone}', 1000)" class="btn-add">+1K</button>
                                </div>
                            </div>

                            <div class="form-group button-group">
                                <button onclick="saveUserChanges('${phone}')" class="btn-save">
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
        })
        .catch(err => alert('Error loading user: ' + err.message));
}

function addMainBalance(phone, amount) {
    const currentValue = parseInt(document.getElementById('editUserBalance').value) || 0;
    document.getElementById('editUserBalance').value = currentValue + amount;
}

function saveUserChanges(phone) {
    const name = document.getElementById('editUserName').value.trim();
    const balance = parseInt(document.getElementById('editUserBalance').value) || 0;

    if (!name) {
        alert('Please enter user name');
        return;
    }

    fetch(`/api/users/${phone}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, balance })
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
    fetch('/api/payment-numbers')
        .then(res => res.json())
        .then(data => {
            const modal = `
                <div class="modal" onclick="closeModal(event)">
                    <div class="modal-content large-modal" onclick="event.stopPropagation()">
                        <div class="modal-header">
                            <h2><i class="fas fa-credit-card"></i> Payment Numbers</h2>
                            <button class="modal-close" onclick="closeModal()">&times;</button>
                        </div>
                        <div class="modal-body">
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
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('modalContainer').innerHTML = modal;
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
    showToast('Language changed', 'success');
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
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2><i class="fas fa-bell"></i> Send Due Reminders</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: rgba(67, 233, 123, 0.1); border-left: 4px solid #43e97b; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="color: #43e97b; margin: 0 0 10px 0;">📢 Due Reminder Service</h4>
                        <p style="margin: 0; color: #aaa; font-size: 0.95rem;">
                            Send WhatsApp reminders to selected groups about their pending dues. Only groups with outstanding dues will receive messages.
                        </p>
                    </div>
                    
                    <div style="max-height: 400px; overflow-y: auto; margin-bottom: 20px; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px;">
                        ${groupsWithDue.map(group => `
                            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.05); margin-bottom: 10px; border-radius: 8px; border-left: 3px solid #43e97b;">
                                <input type="checkbox" 
                                       class="reminder-checkbox" 
                                       value="${group.id}" 
                                       ${groupsMarkedForDueReminder.has(group.id) ? 'checked' : ''} 
                                       style="width: 20px; height: 20px; cursor: pointer;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: #eee; margin-bottom: 4px;">${group.name}</div>
                                    <div style="font-size: 0.85rem; color: #aaa;">
                                        💰 Due: ৳${group.totalDue.toLocaleString()} | Members: ${group.totalUsers}
                                    </div>
                                </div>
                                ${groupsMarkedForDueReminder.has(group.id) ? '<i class="fas fa-check-circle" style="color: #43e97b; font-size: 1.2rem;"></i>' : ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #4facfe; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #4facfe;">📝 Message Preview:</h4>
                        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; font-size: 0.9rem; color: #bbb; font-family: monospace; line-height: 1.6; white-space: pre-wrap;">
🔔 *দয়া করে মনোযোগ দিন* 🔔

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
                    
                    <div style="display: flex; gap: 10px;">
                        <button onclick="sendDueReminders()" style="flex: 1; padding: 14px; background: linear-gradient(135deg, #43e97b 0%, #38ada9 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.3s ease;"
                                onmouseover="this.style.transform='scale(1.02)'" 
                                onmouseout="this.style.transform='scale(1)'">
                            <i class="fas fa-send"></i> Send Reminders
                        </button>
                        <button onclick="closeModal()" style="flex: 1; padding: 14px; background: #2d3561; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modal;
    
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
    
    fetch('/api/send-due-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            groupIds: Array.from(groupsMarkedForDueReminder)
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
}

// Auto-refresh every 30 seconds (silent)
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

console.log('[BG REFRESH INDICATOR] ✅ Background refresh indicator system initialized');
