const fs = require('fs');
const path = require('path');
const db = require('../config/database');

// Paths
const CONFIG_DIR = path.join(__dirname, '..', 'config');
const USERS_FILE = path.join(CONFIG_DIR, 'users.json');
const TRANSACTIONS_FILE = path.join(CONFIG_DIR, 'payment-transactions.json');

// ---------- Safe JSON IO ----------
function safeWriteJSON(filePath, data) {
  try {
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
    return true;
  } catch (err) {
    console.error('[LEDGER] Atomic write failed for', filePath, err.message);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (e2) {
      console.error('[LEDGER] Fallback write failed for', filePath, e2.message);
      return false;
    }
  }
}

function safeReadJSON(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      safeWriteJSON(filePath, defaultValue);
      return defaultValue;
    }
    const raw = (fs.readFileSync(filePath, 'utf8') || '').trim();
    if (!raw) {
      safeWriteJSON(filePath, defaultValue);
      return defaultValue;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('[LEDGER] JSON parse failed for', filePath, e.message, '— repairing');
      safeWriteJSON(filePath, defaultValue);
      return defaultValue;
    }
  } catch (err) {
    console.error('[LEDGER] Read failed for', filePath, err.message);
    return defaultValue;
  }
}

// ---------- Core Stores ----------
function loadUsers() {
  return safeReadJSON(USERS_FILE, {});
}

function saveUsers(users) {
  return safeWriteJSON(USERS_FILE, users);
}

function loadTransactions() {
  const data = safeReadJSON(TRANSACTIONS_FILE, []);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.payments)) return data.payments;
  return [];
}

function saveTransactions(list) {
  return safeWriteJSON(TRANSACTIONS_FILE, list);
}

// ---------- Users Balance ----------
function getUserBalance(userId) {
  const users = loadUsers();
  return users[userId]?.balance || 0;
}

function updateUserBalance(userId, delta) {
  const users = loadUsers();
  if (!users[userId]) users[userId] = { balance: 0 };
  users[userId].balance = (users[userId].balance || 0) + delta;
  if (users[userId].balance < 0) users[userId].balance = 0; // prevent negative
  saveUsers(users);
  return users[userId].balance;
}

function setUserBalance(userId, newBalance) {
  const users = loadUsers();
  if (!users[userId]) users[userId] = { balance: 0 };
  users[userId].balance = Math.max(0, Number(newBalance) || 0);
  saveUsers(users);
  return users[userId].balance;
}

// ---------- Transactions ----------
function nextTransactionId(transactions) {
  const maxId = transactions.reduce((m, t) => (typeof t.id === 'number' && t.id > m ? t.id : m), 0);
  return maxId + 1;
}

function addTransaction({ userId, userName, groupId, amount, type = 'manual', status = 'approved', meta = {} }) {
  const txns = loadTransactions();
  const id = nextTransactionId(txns);
  const record = {
    id,
    userId,
    userName: userName || userId,
    groupId,
    amount: Number(amount) || 0,
    type, // 'manual' | 'auto'
    status, // 'approved'
    createdAt: new Date().toISOString(),
    ...meta,
  };
  txns.push(record);
  saveTransactions(txns);
  return record;
}

function getPaidAmount(userId, groupId) {
  const txns = loadTransactions();
  // Count auto-deduction transactions (both 'auto' and 'auto-deduction' for backward compatibility)
  // This shows how much was actually deducted from balance to pay dues
  return txns.reduce((sum, t) => {
    if (
      t.userId === userId &&
      t.groupId === groupId &&
      t.status === 'approved' &&
      (t.type === 'auto' || t.type === 'auto-deduction')
    ) {
      return sum + (Number(t.amount) || 0);
    }
    return sum;
  }, 0);
}

function getLastAutoDeduction(userId, groupId) {
  const txns = loadTransactions();
  const autos = txns.filter(
    (t) =>
      t.userId === userId &&
      t.groupId === groupId &&
      t.status === 'approved' &&
      (t.type === 'auto' || t.type === 'auto-deduction')
  );
  if (autos.length === 0) return { amount: 0, createdAt: null };
  autos.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return { amount: Number(autos[0].amount) || 0, createdAt: autos[0].createdAt || null };
}

// ---------- Due Calculations ----------
function computeGroupApprovedDue(userId, groupId) {
  // Check if user has a dueBalanceOverride set in users.json
  const users = loadUsers();
  
  // Try to find user with or without @lid suffix
  let userKey = userId;
  if (!users[userKey] && userId.includes('@lid')) {
    userKey = userId.replace('@lid', '');
  }
  if (!users[userKey] && !userId.includes('@lid')) {
    userKey = userId + '@lid';
  }
  
  if (users[userKey] && users[userKey].dueBalanceOverride !== undefined) {
    return users[userKey].dueBalanceOverride;
  }
  
  // Otherwise calculate from approved entries
  const group = db.getGroupData(groupId) || { entries: [], rate: 2.3 };
  let sum = 0;
  (group.entries || []).forEach((e) => {
    if (e.userId === userId && e.status === 'approved') {
      sum += (Number(e.diamonds) || 0) * (Number(e.rate) || group.rate || 2.3);
    }
  });
  return sum;
}

function computeRemainingDue(userId, groupId) {
  const due = computeGroupApprovedDue(userId, groupId);
  const paid = getPaidAmount(userId, groupId);
  return Math.max(0, due - paid);
}

function computeAllGroupsRemainingDue(userId) {
  const database = db.loadDatabase();
  const result = [];
  let total = 0;
  for (const [gId, group] of Object.entries(database.groups || {})) {
    const due = computeGroupApprovedDue(userId, gId);
    const paid = getPaidAmount(userId, gId);
    const remaining = Math.max(0, due - paid);
    if (remaining > 0) {
      result.push({ groupId: gId, due: remaining });
      total += remaining;
    }
  }
  // Stable order: by created groupId asc
  result.sort((a, b) => String(a.groupId).localeCompare(String(b.groupId)));
  return { groups: result, total };
}

// ---------- Auto-Deduction Logic ----------
function applyAutoDeductionFromBalance(userId, userName, amountToUse = null) {
  const balance = getUserBalance(userId);
  const { groups, total } = computeAllGroupsRemainingDue(userId);
  if (groups.length === 0 || balance <= 0) {
    return { totalDue: total, deducted: 0, newBalance: balance, perGroup: [] };
  }

  const budget = amountToUse == null ? balance : Math.max(0, Math.min(balance, Number(amountToUse)));
  const toDeduct = Math.min(budget, total);
  if (toDeduct <= 0) return { totalDue: total, deducted: 0, newBalance: balance, perGroup: [] };

  let remaining = toDeduct;
  const perGroup = [];
  for (const { groupId, due } of groups) {
    if (remaining <= 0) break;
    const pay = Math.min(remaining, due);
    if (pay > 0) {
      addTransaction({ userId, userName, groupId, amount: pay, type: 'auto', status: 'approved', meta: { reason: 'auto-deduction' } });
      perGroup.push({ groupId, amount: pay });
      remaining -= pay;
    }
  }

  const newBalance = updateUserBalance(userId, -toDeduct);
  return { totalDue: total, deducted: toDeduct, newBalance, perGroup };
}

module.exports = {
  // IO helpers
  loadUsers,
  saveUsers,
  loadTransactions,
  saveTransactions,
  // Balance
  getUserBalance,
  updateUserBalance,
  setUserBalance,
  // Transactions
  addTransaction,
  getPaidAmount,
  getLastAutoDeduction,
  // Due calculations
  computeGroupApprovedDue,
  computeRemainingDue,
  computeAllGroupsRemainingDue,
  // Auto-deduction
  applyAutoDeductionFromBalance,
};
