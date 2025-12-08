# Admin Credentials Change System - Quick Guide

## 🔐 Where to Find It

### Step 1: Open Settings
- Click the **Settings icon** (⚙️) in the top navigation bar

### Step 2: Locate Security Section
- Scroll down in the settings modal
- Look for **"Security"** section with red color and lock icon

### Step 3: Choose Action
- **Change Username** - Update your admin username
- **Change Password** - Update your admin password

---

## 📝 Change Username

### Process:
```
Settings → Security → "Change Username" button
    ↓
Enter current password (verification)
    ↓
Enter new username (min 3 characters)
    ↓
Click "Change Username"
    ↓
Auto logout (for security)
    ↓
Login with new username
```

### Example:
```
Before:     admin / admin123
After:      admin-new / admin123
```

### Important:
- ✅ Current password is REQUIRED
- ✅ New username must be at least 3 characters
- ✅ You'll be logged out after change
- ✅ Use your new username for next login

---

## 🔑 Change Password

### Process:
```
Settings → Security → "Change Password" button
    ↓
Enter current password (verification)
    ↓
Enter new password (min 4 characters)
    ↓
Confirm new password (must match)
    ↓
Click "Change Password"
    ↓
Auto logout (for security)
    ↓
Login with new password
```

### Example:
```
Before:     admin / admin123
After:      admin / secure-password-2025
```

### Important:
- ✅ Current password is REQUIRED
- ✅ New password must be at least 4 characters
- ✅ Confirmation password must match
- ✅ Cannot reuse current password
- ✅ You'll be logged out after change

---

## 🚨 Common Errors & Solutions

### ❌ "Current password is incorrect"
**Problem:** You entered the wrong current password
**Solution:** Verify your current password and try again

### ❌ "Username must be at least 3 characters"
**Problem:** Username is too short
**Solution:** Enter a username with at least 3 characters

### ❌ "Password must be at least 4 characters"
**Problem:** Password is too short
**Solution:** Enter a password with at least 4 characters

### ❌ "Passwords do not match"
**Problem:** New password and confirmation password are different
**Solution:** Ensure both passwords are exactly the same

### ❌ "New password must be different from current password"
**Problem:** You tried to use the same password
**Solution:** Choose a different password

---

## 💡 Security Tips

1. **🔒 Change Default Credentials First**
   - Default: admin / admin123
   - Change immediately on first login

2. **🛡️ Use Strong Passwords**
   - Mix uppercase, lowercase, numbers, symbols
   - Example: `Adm1n@2025!Secure`

3. **📝 Remember New Credentials**
   - Write somewhere secure (password manager)
   - Don't share with others

4. **🔄 Change Periodically**
   - Every 30-90 days recommended
   - After security incidents

5. **🚪 Always Logout**
   - Especially on shared devices
   - Use logout button in navigation

---

## 📋 Step-by-Step Screenshots

### For Change Username:
```
┌─────────────────────────────────────┐
│  DIAMOND BOT - Settings             │
├─────────────────────────────────────┤
│                                     │
│  [Appearance] [Light Mode]          │
│  [Language] [English ▼]             │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  🔐 SECURITY                        │
│  ┌─────────────────────────────┐   │
│  │ Change Username    [BUTTON] │   │
│  │ Change Password    [BUTTON] │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Close]                            │
└─────────────────────────────────────┘
```

### For Change Password:
```
┌──────────────────────────────────────┐
│  Change Password                     │
├──────────────────────────────────────┤
│                                      │
│  ℹ️ Choose a strong password         │
│                                      │
│  Current Password: [INPUT]          │
│  New Password: [INPUT]              │
│  Confirm Password: [INPUT]          │
│                                      │
│  [Cancel]  [Change Password]        │
└──────────────────────────────────────┘
```

---

## ✅ After Successful Change

1. **Auto Logout**
   - You will be automatically logged out
   - This ensures security

2. **Return to Login**
   - Redirect to login page
   - Success message displayed

3. **Login Again**
   - Use your new username/password
   - Session will be created

---

## 📊 What Gets Logged?

All credential changes are recorded in `admin-logs.txt`:

```
[2025-11-30T10:15:30.123Z] 👤 Admin username changed from 'admin' to 'admin-new'
[2025-11-30T10:20:45.456Z] 🔑 Admin password changed
```

---

## 🎯 Troubleshooting

### Q: I forgot my current password
**A:** You'll need to have admin restart the service or reset credentials manually

### Q: Can I change both username and password at once?
**A:** No, one at a time. Change username first, then password if needed

### Q: What if I get logged out immediately?
**A:** This is normal - it happens after successful credential change for security

### Q: Can I see old passwords?
**A:** No, only the current password is stored. Previous passwords are not recoverable

### Q: How do I check when credentials were last changed?
**A:** Check admin-logs.txt for change history

---

## 🔗 Related Features

- **Admin Logs** - View all admin activities
- **Logout** - Manual logout button (top right)
- **Settings** - All admin preferences

---

**Created:** November 30, 2025
**Status:** ✅ Ready to Use
**Support:** Check ADMIN-CREDENTIALS-SYSTEM.md for detailed documentation
