# Admin Credentials System - Testing Guide

## 📋 Pre-Testing Setup

### Prerequisites
1. Admin panel running on localhost:3000 or configured port
2. Access to admin account with default credentials
3. Browser developer console for debugging (F12)
4. Access to admin-logs.txt file to verify logging

### Test Environment
- **URL:** http://localhost:3000
- **Default Username:** admin
- **Default Password:** admin123

---

## 🧪 Test Cases

### Test 1: Successfully Change Username

**Objective:** Verify admin can change username with correct password

**Steps:**
1. Login with default credentials (admin/admin123)
2. Click Settings icon (⚙️) in top right
3. Scroll to Security section
4. Click "Change Username" button
5. Enter current password: `admin123`
6. Enter new username: `admin-test`
7. Click "Change Username" button

**Expected Results:**
- ✅ Success toast notification appears
- ✅ Redirect to login page
- ✅ Admin is logged out
- ✅ Entry in admin-logs.txt: "Admin username changed from 'admin' to 'admin-test'"

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 2: Login with New Username

**Objective:** Verify login works with new credentials

**Steps:**
1. On login page after Test 1
2. Enter username: `admin-test`
3. Enter password: `admin123`
4. Click Login

**Expected Results:**
- ✅ Login successful
- ✅ Redirect to dashboard
- ✅ Admin panel loads correctly

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 3: Change Username with Wrong Password

**Objective:** Verify system rejects incorrect password

**Steps:**
1. Click Settings icon (⚙️)
2. Scroll to Security section
3. Click "Change Username" button
4. Enter current password: `wrongpassword`
5. Enter new username: `admin-test2`
6. Click "Change Username" button

**Expected Results:**
- ✅ Error toast: "Current password is incorrect"
- ✅ Form remains on screen
- ✅ Username NOT changed
- ✅ User remains logged in

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 4: Change Username with Short Name

**Objective:** Verify validation of username length

**Steps:**
1. Click Settings icon (⚙️)
2. Scroll to Security section
3. Click "Change Username" button
4. Enter current password: `admin123`
5. Enter new username: `ab` (2 characters)
6. Click "Change Username" button

**Expected Results:**
- ✅ Client-side validation error OR
- ✅ Server validation error: "Username must be at least 3 characters"
- ✅ Username NOT changed

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 5: Successfully Change Password

**Objective:** Verify admin can change password

**Steps:**
1. Login with current credentials
2. Click Settings icon (⚙️)
3. Scroll to Security section
4. Click "Change Password" button
5. Enter current password: `admin123`
6. Enter new password: `newpass123`
7. Enter confirm password: `newpass123`
8. Click "Change Password" button

**Expected Results:**
- ✅ Success toast notification
- ✅ Auto logout
- ✅ Redirect to login page
- ✅ Entry in admin-logs.txt: "Admin password changed"

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 6: Login with New Password

**Objective:** Verify login works with new password

**Steps:**
1. On login page after Test 5
2. Enter username: `admin-test`
3. Enter password: `newpass123`
4. Click Login

**Expected Results:**
- ✅ Login successful
- ✅ Dashboard loads
- ✅ User is authenticated

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 7: Change Password with Wrong Current Password

**Objective:** Verify system rejects incorrect current password

**Steps:**
1. Click Settings icon (⚙️)
2. Click "Change Password" button
3. Enter current password: `wrong123`
4. Enter new password: `newer123`
5. Enter confirm password: `newer123`
6. Click "Change Password" button

**Expected Results:**
- ✅ Error message: "Current password is incorrect"
- ✅ Form stays visible
- ✅ Password NOT changed
- ✅ User remains logged in

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 8: Change Password with Mismatched Confirmation

**Objective:** Verify confirmation validation

**Steps:**
1. Click Settings icon (⚙️)
2. Click "Change Password" button
3. Enter current password: `newpass123`
4. Enter new password: `another123`
5. Enter confirm password: `different123` (mismatch)
6. Click "Change Password" button

**Expected Results:**
- ✅ Client-side validation: "Passwords do not match"
- ✅ Form remains visible
- ✅ Password NOT changed

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 9: Change Password with Same as Current

**Objective:** Verify system prevents reusing current password

**Steps:**
1. Click Settings icon (⚙️)
2. Click "Change Password" button
3. Enter current password: `newpass123`
4. Enter new password: `newpass123` (same)
5. Enter confirm password: `newpass123`
6. Click "Change Password" button

**Expected Results:**
- ✅ Error message: "New password must be different from current password"
- ✅ Form remains visible
- ✅ Password NOT changed

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 10: Change Password with Short Password

**Objective:** Verify minimum password length

**Steps:**
1. Click Settings icon (⚙️)
2. Click "Change Password" button
3. Enter current password: `newpass123`
4. Enter new password: `new` (3 chars, less than min 4)
5. Enter confirm password: `new`
6. Click "Change Password" button

**Expected Results:**
- ✅ Error message: "New password must be at least 4 characters"
- ✅ Password NOT changed

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 11: Verify Logging

**Objective:** Verify all changes are logged

**Steps:**
1. Open `admin-logs.txt` in project root
2. Scroll to bottom of file
3. Look for recent entries with timestamps

**Expected Results:**
- ✅ Entry for username change: `👤 Admin username changed from 'X' to 'Y'`
- ✅ Entry for password change: `🔑 Admin password changed`
- ✅ Timestamps match change times
- ✅ All entries have ISO format timestamps

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Sample Logs:**
```
[2025-11-30T10:15:30.123Z] 👤 Admin username changed from 'admin' to 'admin-test'
[2025-11-30T10:20:45.456Z] 🔑 Admin password changed
```

---

### Test 12: Settings Modal Integration

**Objective:** Verify buttons appear in settings and are clickable

**Steps:**
1. Click Settings icon (⚙️)
2. Verify Security section is visible
3. Verify "Change Username" button is visible and clickable
4. Click it and verify modal appears
5. Close modal (click close button or Cancel)
6. Click Settings again
7. Verify "Change Password" button is visible and clickable
8. Click it and verify modal appears

**Expected Results:**
- ✅ Both buttons visible in Settings
- ✅ Both buttons are clickable
- ✅ Correct modals open
- ✅ Modals can be closed

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 13: Mobile Responsive Design

**Objective:** Verify modals work on mobile devices

**Steps:**
1. Open browser DevTools (F12)
2. Click device toolbar (Ctrl+Shift+M)
3. Select mobile device (e.g., iPhone 12)
4. Refresh page
5. Login to admin panel
6. Click Settings
7. Click "Change Username" button
8. Verify modal is readable and usable
9. Try to fill form and submit

**Expected Results:**
- ✅ Modal fits on screen
- ✅ Form fields are readable
- ✅ Buttons are clickable
- ✅ Keyboard works properly
- ✅ No text overflow

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 14: Session Persistence After Change

**Objective:** Verify auto-logout works correctly

**Steps:**
1. Open 2 browser windows/tabs
2. Tab 1: Login as admin
3. Tab 2: Login as admin (same credentials)
4. Tab 1: Change password
5. Tab 2: Try to perform any admin action (e.g., refresh dashboard)

**Expected Results:**
- ✅ Tab 1 logs out after change
- ✅ Tab 2 is logged out (old session invalid)
- ✅ Tab 2 redirects to login page
- ✅ Cannot access protected routes with old session

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Notes:** _______________

---

### Test 15: API Error Handling

**Objective:** Verify server-side error responses are handled

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Login to admin
4. Try to change credentials
5. Watch Network tab for API responses
6. Check for proper JSON responses

**Expected Results:**
- ✅ API returns proper JSON responses
- ✅ Success responses: `{"success": true, "message": "..."}`
- ✅ Error responses: `{"success": false, "message": "..."}`
- ✅ Proper HTTP status codes
- ✅ No server errors (5xx status)

**Actual Results:**
- [ ] Pass / [ ] Fail
- **Sample API Response:**
```json
{
  "success": true,
  "message": "Username changed successfully"
}
```

---

## 📊 Test Summary

### Functionality Tests
| Test # | Name | Status | Notes |
|--------|------|--------|-------|
| 1 | Change Username Success | [ ] | |
| 2 | Login with New Username | [ ] | |
| 3 | Wrong Password Rejection | [ ] | |
| 4 | Short Username Rejection | [ ] | |
| 5 | Change Password Success | [ ] | |
| 6 | Login with New Password | [ ] | |
| 7 | Wrong Current Password | [ ] | |
| 8 | Mismatched Confirmation | [ ] | |
| 9 | Same Password Rejection | [ ] | |
| 10 | Short Password Rejection | [ ] | |

### Integration Tests
| Test # | Name | Status | Notes |
|--------|------|--------|-------|
| 11 | Logging Verification | [ ] | |
| 12 | Settings Integration | [ ] | |
| 13 | Mobile Responsive | [ ] | |
| 14 | Session Persistence | [ ] | |
| 15 | API Error Handling | [ ] | |

---

## ✅ Test Results Summary

**Total Tests:** 15
**Passed:** ___
**Failed:** ___
**Skipped:** ___

**Pass Rate:** ___% 

---

## 🐛 Bug Report Template (if issues found)

### Bug #: ___

**Title:** 

**Description:**

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**

**Actual Behavior:**

**Severity:** [ ] Critical [ ] High [ ] Medium [ ] Low

**Environment:**
- Browser: ___
- OS: ___
- URL: ___

**Screenshots/Logs:**

---

## 📝 Notes & Observations

### Positive Observations
- 

### Issues/Concerns
- 

### Recommendations
- 

---

## 🔄 Regression Testing

After each code change, run these critical tests:
1. [ ] Test 1 - Change Username Success
2. [ ] Test 2 - Login with New Username
3. [ ] Test 5 - Change Password Success
4. [ ] Test 6 - Login with New Password
5. [ ] Test 11 - Verify Logging

---

## 📞 Support & Escalation

If tests fail:
1. Check browser console for JavaScript errors (F12)
2. Check admin-logs.txt for error entries
3. Verify config/admin-credentials.json exists
4. Check file permissions on admin-logs.txt
5. Verify API endpoints are accessible

**Contact:** Check ADMIN-CREDENTIALS-SYSTEM.md for support options

---

**Testing Date:** _______________
**Tester Name:** _______________
**Overall Status:** [ ] PASS [ ] FAIL
**Sign-Off:** _______________

---

*Admin Credentials System - Testing Guide v1.0*
*Complete all tests before marking feature as production-ready*
