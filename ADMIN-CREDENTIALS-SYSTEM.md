# Admin Credentials Management System

## Overview
A complete system for admin users to change their username and password with security verification.

## Features

### 1. **Change Username**
- Located in: Settings → Security → Change Username
- Requirements:
  - Current password verification
  - New username must be at least 3 characters long
  - Username must be unique and different from current username
- After change: Admin will be logged out and must login with new username
- Logged in: admin-logs.txt with old and new username

### 2. **Change Password**
- Located in: Settings → Security → Change Password
- Requirements:
  - Current password verification
  - New password must be at least 4 characters long
  - New password must match confirmation password
  - New password must be different from current password
- After change: Admin will be logged out and must login with new password
- Logged in: admin-logs.txt

## API Endpoints

### Change Username
```
POST /api/admin/change-username
Headers: Authorization: <token>
Body: {
  "currentPassword": "string",
  "newUsername": "string"
}
Response: {
  "success": boolean,
  "message": "string"
}
```

### Change Password
```
POST /api/admin/change-password
Headers: Authorization: <token>
Body: {
  "currentPassword": "string",
  "newPassword": "string"
}
Response: {
  "success": boolean,
  "message": "string"
}
```

## UI Components

### Settings Modal
Access via: Settings icon in top navigation → Settings → Security section
- Two buttons:
  - "Change Username" (Purple gradient)
  - "Change Password" (Red/Pink gradient)

### Change Username Modal
- Current Password field (required)
- New Username field (min 3 characters, required)
- Cancel and Change Username buttons
- Info message about password verification

### Change Password Modal
- Current Password field (required)
- New Password field (min 4 characters, required)
- Confirm Password field (must match new password)
- Security info message
- Cancel and Change Password buttons

## Security Features

1. **Current Password Verification**
   - All changes require current password verification
   - Prevents unauthorized changes even if device is left unlocked

2. **Validation**
   - Username: minimum 3 characters
   - Password: minimum 4 characters
   - Password confirmation check
   - Cannot reuse current password

3. **Auto-Logout**
   - After successful credential change, admin is automatically logged out
   - Forces re-authentication with new credentials
   - Prevents concurrent sessions with different passwords

4. **Logging**
   - All credential changes logged in admin-logs.txt
   - Includes timestamp and specific action (username/password change)
   - For username changes, both old and new usernames are recorded

## File Structure

### Files Modified
1. **admin-panel/server.js**
   - Added POST /api/admin/change-username endpoint
   - Updated POST /api/admin/change-password endpoint (added validation)

2. **admin-panel/public/js/app.js**
   - Updated showSettingsModal() with Security section
   - Added showChangeUsernameModal()
   - Added showChangePasswordModal()
   - Added handleChangeUsername()
   - Added handleChangePassword()

### Configuration File
- **config/admin-credentials.json** (stores credentials)
  ```json
  {
    "username": "string",
    "password": "string",
    "lastUpdated": "ISO timestamp (optional)"
  }
  ```

## Usage Guide

### For Admin Users

#### To Change Username:
1. Click Settings (gear icon) in top navigation
2. Scroll to Security section
3. Click "Change Username" button
4. Enter current password (required for verification)
5. Enter new username (must be at least 3 characters)
6. Click "Change Username"
7. You will be logged out automatically
8. Log in again with new username

#### To Change Password:
1. Click Settings (gear icon) in top navigation
2. Scroll to Security section
3. Click "Change Password" button
4. Enter current password (required for verification)
5. Enter new password (must be at least 4 characters)
6. Confirm new password (must match)
7. Click "Change Password"
8. You will be logged out automatically
9. Log in again with new password

## Default Credentials
- **Username:** admin
- **Password:** admin123

> ⚠️ **Important:** Change default credentials immediately on first login for security!

## Error Handling

| Error | Solution |
|-------|----------|
| "Current password is incorrect" | Verify password and try again |
| "Username must be at least 3 characters" | Enter longer username |
| "Password must be at least 4 characters" | Enter longer password |
| "Passwords do not match" | Confirm password must match new password |
| "New password must be different from current password" | Choose a different password |

## Security Recommendations

1. ✅ Change default credentials on first login
2. ✅ Use strong, unique passwords
3. ✅ Never share credentials
4. ✅ Change credentials periodically
5. ✅ Use password managers to store credentials securely
6. ✅ Always log out after use, especially on shared devices

## Implementation Details

### Backend Logic
- Reads current credentials from config/admin-credentials.json
- Validates current password matches stored password
- Applies validation rules for new credentials
- Updates config file with new credentials
- Records action in admin-logs.txt
- Returns success/error response

### Frontend Logic
- Validates inputs before sending to server
- Shows appropriate error messages
- Automatically logs out on success
- Redirects to login page
- Uses secure POST requests with Authorization header

## Testing

### Test Cases
1. ✅ Change username with correct current password
2. ✅ Change username with incorrect current password (should fail)
3. ✅ Change password with correct current password
4. ✅ Change password with incorrect current password (should fail)
5. ✅ New password confirmation mismatch (should fail)
6. ✅ Reuse of current password (should fail)
7. ✅ Auto-logout after successful change
8. ✅ Login with new credentials works

### Example Test Scenario
1. Login as admin/admin123
2. Open Settings
3. Click "Change Username"
4. Enter password: admin123
5. Enter new username: admin-new
6. Click Change Username
7. Verify: Auto logout and redirect to login
8. Login with admin-new/admin123
9. Verify: Login successful

## Notes

- Changes take effect immediately
- Admin-logs.txt tracks all credential changes
- Credentials stored in plain text in JSON (consider encryption for production)
- No credential change history available (only latest credentials stored)
- Each change automatically logs out all sessions for security

---

**Status:** ✅ Complete and Ready for Use
**Last Updated:** November 30, 2025
