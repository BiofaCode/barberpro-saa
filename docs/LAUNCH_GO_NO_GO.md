# Kreno Alpha Launch - Go/No-Go Checklist

**Last Updated:** 2026-04-16  
**Launch Target:** 2026-04-22 (Week of April 21)  
**Status:** Ready for Manual QA Testing

---

## Executive Summary

This checklist defines the critical criteria that must PASS before Kreno can proceed to alpha launch. All items are grouped by category with severity levels. A **GO** decision requires:

1. ✓ All **CRITICAL** tests pass
2. ✓ All **HIGH** severity issues resolved or deferred
3. ✓ No unresolved security vulnerabilities
4. ✓ Mobile app stability verified
5. ✓ Email notifications working

A **NO-GO** decision is triggered by any failed critical test or unresolved blocker.

---

## CRITICAL Tests (Must Pass)

These tests block launch if they fail. Each must pass on first try or issue must be fixed immediately.

### C1. Public Booking Flow Works End-to-End

**Description:** Customer can book appointment from discovery to confirmation

```
PASS CRITERIA:
[ ] User can search for salon on kreno.ch/book
[ ] User can view salon details and available times
[ ] User can select time slot
[ ] User can fill booking form (name, email, phone)
[ ] Booking submits without error
[ ] User receives OTP email within 2 minutes
[ ] User enters OTP and booking confirmed
[ ] User receives confirmation email with appointment details
[ ] Booking appears in pro portal
[ ] Email addresses are not exposed in URLs/responses
```

**Severity:** CRITICAL  
**Test Scenario:** Scenario 1 (Complete Booking Flow)  
**Time to Test:** ~15 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### C2. OTP Verification Works

**Description:** One-Time Password verification secure and functional

```
PASS CRITERIA:
[ ] OTP email received within 2 minutes of booking
[ ] OTP is 6-digit code
[ ] OTP expires after 10 minutes (or configured timeout)
[ ] Valid OTP accepted, booking confirmed
[ ] Invalid OTP rejected with error message
[ ] Cannot verify same OTP twice
[ ] Cannot use expired OTP
[ ] No OTP visible in logs/database plaintext
```

**Severity:** CRITICAL  
**Test Scenario:** Scenario 1 (Step 6-7)  
**Time to Test:** ~5 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### C3. Pro Portal Can Confirm/Reject Bookings

**Description:** Salon owner can manage bookings from pro.kreno.ch

```
PASS CRITERIA:
[ ] Owner can login with email and password
[ ] Dashboard shows today's pending bookings
[ ] Owner can click "Confirm" on booking
[ ] Status changes to "Confirmed"
[ ] Customer receives confirmation email
[ ] Owner can click "Reject" on booking
[ ] Status changes to "Rejected"
[ ] Customer receives rejection email
[ ] Changes persist after page reload
[ ] No console errors
```

**Severity:** CRITICAL  
**Test Scenario:** Scenario 2 (Pro Portal Management)  
**Time to Test:** ~10 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### C4. Admin Portal Login & Salon Management

**Description:** Platform admin can access admin.kreno.ch and manage salons

```
PASS CRITERIA:
[ ] Admin login page accessible at admin.kreno.ch
[ ] Can login with ADMIN_PASSWORD (no errors)
[ ] Dashboard loads and shows all salons
[ ] Can search for salons
[ ] Can create new salon (form accepts input)
[ ] Can edit salon details
[ ] Can view subscription status
[ ] Can suspend/resume salon
[ ] Cannot login with wrong password
[ ] Redirects to login if session expires
```

**Severity:** CRITICAL  
**Test Scenario:** Scenario 3 (Admin Dashboard)  
**Time to Test:** ~10 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### C5. Mobile App Launches & Staff Can Login

**Description:** Flutter mobile app starts without crash and staff can authenticate

```
PASS CRITERIA:
[ ] App launches on iOS device without crash
[ ] App launches on Android device without crash
[ ] Splash screen visible < 1 second
[ ] Login form loads after splash
[ ] Staff can login with email and password
[ ] Dashboard shows today's appointments
[ ] Appointments are in correct order (time ascending)
[ ] No app crashes during navigation (home → settings → home)
[ ] Logout works and returns to login screen
```

**Severity:** CRITICAL  
**Test Scenario:** Scenario 4 (Mobile App)  
**Time to Test:** ~15 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### C6. No Console Errors in Web App

**Description:** Web app (all portals) runs without JavaScript errors

```
PASS CRITERIA:
[ ] Landing page (saas.kreno.ch): F12 → Console shows no red errors
[ ] Booking page (kreno.ch/book): Console clean
[ ] Pro portal (pro.kreno.ch): Console clean after login
[ ] Admin portal (admin.kreno.ch): Console clean after login
[ ] No 404s for assets (images, CSS, JS)
[ ] No CSP violations
[ ] No CORS errors
[ ] Network tab shows healthy status codes (200, 201, 400, 401, 404)
```

**Severity:** CRITICAL  
**Test Scenario:** Scenario 1, 2, 3 (check console in each)  
**Time to Test:** ~5 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### C7. Mobile App Doesn't Crash During Use

**Description:** App remains stable during 5-minute stress test

```
PASS CRITERIA:
[ ] Open app → Login → Home (no crash)
[ ] Tap through all appointments → back to home (no crash)
[ ] Navigate: Home → Settings → Home → Profile → Home (no crash)
[ ] Scroll through long list of appointments (no crash)
[ ] Mark appointment as complete (no crash, status changes)
[ ] Add note to appointment (no crash, note persists)
[ ] Select branding color (no crash, color updates)
[ ] Logout (no crash, return to login)
[ ] No red errors in logcat (Android) or Xcode (iOS)
```

**Severity:** CRITICAL  
**Test Scenario:** Scenario 4 (Stress Test - Step 11)  
**Time to Test:** ~5 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### C8. Email Notifications Deliver

**Description:** All transactional emails arrive in customer inbox

```
PASS CRITERIA:
[ ] Booking confirmation email received within 2 minutes
[ ] Email contains: Salon name, date, time, service
[ ] OTP email received within 2 minutes
[ ] OTP email contains 6-digit code
[ ] Owner confirmation email received
[ ] Owner rejection email received
[ ] Email formatting is correct (not spam-like)
[ ] Email sender is identifiable (from kreno.ch domain)
[ ] Emails not going to spam folder (check spam tab)
[ ] No broken links in email content
```

**Severity:** CRITICAL  
**Test Scenario:** Scenario 1 (Step 7, 9) + Scenario 6 (Email)  
**Time to Test:** ~10 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### C9. Rate Limiting Blocks Repeated Attacks

**Description:** Security controls prevent brute force and DOS attempts

```
PASS CRITERIA:
[ ] After 5 failed login attempts, next request blocked
[ ] Error message: "Too many attempts, try again later"
[ ] Status code: 429 Too Many Requests
[ ] Rate limit resets after 15 minutes (or configured timeout)
[ ] Applies to login endpoint
[ ] Applies to OTP verification endpoint
[ ] Does not block legitimate traffic (normal users)
[ ] Lockout is per IP or per account (as designed)
```

**Severity:** CRITICAL  
**Test Scenario:** Scenario 5 (Security Tests - Step 6)  
**Time to Test:** ~5 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### C10. Cannot Access Other Salon's Data

**Description:** Multi-tenancy isolation enforced

```
PASS CRITERIA:
[ ] Owner A cannot view Owner B's bookings
[ ] Owner A cannot edit Owner B's staff
[ ] Owner A cannot modify Owner B's services
[ ] API returns 403 Forbidden for cross-tenant access
[ ] Cannot use URL manipulation (salonId) to access other salons
[ ] Even with valid JWT, cannot access unauthorized data
[ ] Admin can view all salons (admin access is correct)
```

**Severity:** CRITICAL  
**Test Scenario:** Scenario 5 (Security Tests - Step 3)  
**Time to Test:** ~5 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

## HIGH Priority Tests (Must Pass Before Beta)

These are important but can be deferred to beta if critical tests pass. However, test anyway to identify issues early.

### H1. Color Palette Picker Works

**Description:** Branding color selection intuitive and persistent

```
PASS CRITERIA:
[ ] Pro portal shows 16-color palette for primary color
[ ] Pro portal shows 16-color palette for accent color
[ ] Click color swatch: highlights with border/checkmark
[ ] Selected color: hex field updates automatically
[ ] Manually enter hex code: palette selection updates
[ ] Branding saves without error
[ ] After page reload: colors persist
[ ] Mobile app color picker: same functionality
[ ] Colors apply to app UI (buttons, headers, text)
```

**Severity:** HIGH  
**Test Scenario:** Scenario 2 (Step 8-11) + Scenario 4 (Step 10-11)  
**Time to Test:** ~5 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### H2. Dashboard Load Time < 3 Seconds

**Description:** Pages respond quickly on typical network

```
PASS CRITERIA:
[ ] Landing page (saas.kreno.ch) DOMContentLoaded < 2 sec
[ ] Booking page (kreno.ch/book) interactive < 3 sec
[ ] Pro portal dashboard renders < 3 sec (after login)
[ ] Admin dashboard renders < 3 sec (after login)
[ ] Mobile app home screen visible < 2 sec (after login)
[ ] No loading spinners visible > 3 seconds
[ ] DevTools Network tab: LCP < 2.5 seconds
```

**Severity:** HIGH  
**Test Scenario:** Scenario 7 (Performance)  
**Time to Test:** ~5 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### H3. Responsive Design (Mobile/Desktop)

**Description:** UI adapts to different screen sizes

```
PASS CRITERIA:
[ ] Booking page: Desktop layout (1920x1080) - no overflow
[ ] Booking page: Tablet layout (768x1024) - responsive
[ ] Booking page: Mobile layout (375x667) - mobile menu works
[ ] Pro portal: Readable on iPad (tablet optimized)
[ ] Mobile app: No layout breaks on small screens
[ ] Text is readable on all sizes (no tiny font)
[ ] Forms are usable on mobile (input fields accessible)
[ ] No horizontal scrolling required on mobile
```

**Severity:** HIGH  
**Test Scenario:** Scenario 1, 2 (test on multiple devices)  
**Time to Test:** ~5 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### H4. Stripe Payment Works

**Description:** Salons can purchase SMS credits via Stripe

```
PASS CRITERIA:
[ ] SMS credits section visible in pro portal
[ ] "Buy SMS Credits" button opens Stripe checkout
[ ] Can select package (e.g., 100 SMS for $5)
[ ] Stripe form appears (card, name, expiry, CVC fields)
[ ] Using test card (4242 4242 4242 4242) processes payment
[ ] After successful payment: SMS credits added to account
[ ] Credits are displayed in dashboard immediately
[ ] Canceling payment returns to portal (no error)
[ ] Payment history visible (if tracked)
```

**Severity:** HIGH  
**Test Scenario:** Scenario 2 (Step 13)  
**Time to Test:** ~5 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### H5. Staff/Service Management Works

**Description:** Owners can manage team and services

```
PASS CRITERIA:
[ ] Can add staff member (form works, no errors)
[ ] New staff appears in staff list
[ ] Can edit staff (phone, name, etc.)
[ ] Can delete staff
[ ] Can add service (form works)
[ ] New service appears in service list
[ ] Can edit service (price, duration)
[ ] Can delete service
[ ] Changes visible in booking flow (services available)
[ ] No console errors
```

**Severity:** HIGH  
**Test Scenario:** Scenario 2 (Step 4-7)  
**Time to Test:** ~10 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

### H6. XSS Protection Works

**Description:** App prevents script injection attacks

```
PASS CRITERIA:
[ ] Booking form with XSS payload: <script>alert('xss')</script>
[ ] Script does NOT execute in browser
[ ] Script is escaped in database (shows as &lt;script&gt;)
[ ] Admin notes field with XSS payload: also escaped
[ ] Salon description with XSS payload: escaped
[ ] No alerts or popups when entering XSS payloads
[ ] Browser console shows no errors
```

**Severity:** HIGH  
**Test Scenario:** Scenario 5 (Security Tests - Step 4)  
**Time to Test:** ~3 minutes  
**Assigned to:** ___________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Date Tested:** ___________  
**Notes:** ___________

---

## MEDIUM Priority Tests (Nice to Have)

These are good to test but won't block launch if they have minor issues.

### M1. SMS Credits Display

**Test:** [ ] PASS [ ] FAIL  
**Notes:** SMS credits visible in pro portal, even if SMS not enabled yet

### M2. Analytics Dashboard

**Test:** [ ] PASS [ ] FAIL  
**Notes:** Admin can view basic analytics (revenue, salons, bookings)

### M3. Booking History

**Test:** [ ] PASS [ ] FAIL  
**Notes:** Pro portal shows past bookings, can filter by date

### M4. Mobile App Keyboard Behavior

**Test:** [ ] PASS [ ] FAIL  
**Notes:** Keyboard doesn't obscure input fields (known issue on Android)

---

## Test Execution Plan

### Pre-Test Setup (1 day before)

```
[ ] Prepare test salon: "Test Salon Kreno"
    [ ] Add 2-3 staff members
    [ ] Add 3-5 services with pricing
    [ ] Set SMS credits to 50
    [ ] Create some test bookings
[ ] Verify test credentials work
    [ ] Owner: owner@test.kreno.ch / TestPass123!
    [ ] Staff: staff@test.kreno.ch / TestPass123!
    [ ] Admin: ADMIN_PASSWORD verified
[ ] Prepare test email: customer+test@kreno.ch
[ ] Ensure mobile devices available (iOS + Android)
[ ] Clear browser cache (Ctrl+Shift+Del)
[ ] Open DevTools on desktop browsers
```

### Test Execution (2-3 hours)

| Time | Test | Who | Status |
|------|------|-----|--------|
| 09:00 - 09:15 | C1 - Booking Flow | Dev Lead | [ ] PASS |
| 09:15 - 09:20 | C2 - OTP Verification | QA | [ ] PASS |
| 09:20 - 09:30 | C3 - Pro Portal | QA | [ ] PASS |
| 09:30 - 09:40 | C4 - Admin Portal | Dev Lead | [ ] PASS |
| 09:40 - 09:55 | C5 - Mobile App Launch | QA (Mobile) | [ ] PASS |
| 09:55 - 10:00 | C6 - Console Errors | Dev | [ ] PASS |
| 10:00 - 10:05 | C7 - Mobile Stability | QA (Mobile) | [ ] PASS |
| 10:05 - 10:15 | C8 - Email Delivery | QA | [ ] PASS |
| 10:15 - 10:20 | C9 - Rate Limiting | Dev | [ ] PASS |
| 10:20 - 10:25 | C10 - Multi-Tenancy | Dev | [ ] PASS |
| 10:25 - 10:30 | H1 - Color Picker | QA | [ ] PASS |
| 10:30 - 10:35 | H2 - Load Time | Dev | [ ] PASS |
| 10:35 - 10:45 | H3 - Responsive | QA | [ ] PASS |
| 10:45 - 10:50 | H4 - Stripe | Dev | [ ] PASS |
| 10:50 - 11:00 | H5 - Staff/Services | QA | [ ] PASS |
| 11:00 - 11:05 | H6 - XSS Protection | Dev | [ ] PASS |

---

## Pass/Fail Decision Matrix

### GO FOR ALPHA LAUNCH ✓

Proceed to launch if **ALL** of the following are true:

```
[✓] All 10 CRITICAL tests PASS
[✓] All 6 HIGH priority tests PASS
[✓] No unresolved security vulnerabilities
[✓] Mobile app stable (no crashes in stress test)
[✓] Email notifications working end-to-end
[✓] Pro and admin portals functional
[✓] No blocking console errors
[✓] Load times acceptable (< 3 sec)
```

**GO Decision:** ___________  
**Authorized By:** ___________  
**Date:** ___________  
**Time:** ___________  

**Approval Signatures:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Manager | | | |

---

### NO-GO - HOLD LAUNCH ✗

Stop launch and fix issues if **ANY** of the following:

```
[✗] C1 - Booking flow fails (critical)
[✗] C2 - OTP doesn't work (critical)
[✗] C3 - Pro portal broken (critical)
[✗] C4 - Admin portal inaccessible (critical)
[✗] C5 - Mobile app crashes on startup (critical)
[✗] C6 - Console full of errors (critical)
[✗] C7 - Mobile app unstable (critical)
[✗] C8 - Emails not delivering (critical)
[✗] C9 - Rate limiting not enforcing (security issue)
[✗] C10 - Data isolation broken (security issue)
[✗] Unresolved security vulnerability found
[✗] > 2 HIGH priority tests fail
[✗] Customer-facing crashes observed
```

**NO-GO Reason:** ___________  
**Issue Blocking:** ___________  
**Severity:** CRITICAL / HIGH / MEDIUM  
**Expected Fix Date:** ___________  
**Assigned To:** ___________  

---

## Issue Tracking Template

For any FAILED test, complete this:

```
FAILED TEST: ___________
Description: ___________
Steps to Reproduce: ___________
Expected: ___________
Actual: ___________
Severity: CRITICAL / HIGH / MEDIUM / LOW
Root Cause: ___________
Fix: ___________
Status: [ ] Open [ ] In Progress [ ] Fixed [ ] Deferred
Fix Date: ___________
Assigned to: ___________
```

---

## Post-Launch Monitoring

If GO decision is made, monitor these metrics for first 24 hours:

```
[ ] No reported booking failures
[ ] Email delivery rate > 95%
[ ] Mobile app crash rate < 1%
[ ] API error rate < 0.1%
[ ] Pro portal uptime 99.9%+
[ ] Customer support tickets < 5 (no critical issues)
```

If any metric fails, prepare rollback plan.

---

## Rollback Plan (If Needed)

**If critical issue discovered post-launch:**

1. Notify all users of issue (email + in-app message)
2. Revert to previous stable version (git rollback)
3. Restart server
4. Verify rollback successful
5. Post incident report
6. Schedule fix for v1.0.1 patch

**Rollback Contacts:**
- Engineering Lead: ___________
- Product Manager: ___________
- Hosting (Render.com): ___________

---

## Launch Readiness Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Booking API | [ ] Ready | |
| Pro Portal | [ ] Ready | |
| Admin Portal | [ ] Ready | |
| Mobile App | [ ] Ready | |
| Email Service | [ ] Ready | |
| Database | [ ] Ready | |
| Security | [ ] Ready | |
| Performance | [ ] Ready | |
| Documentation | [ ] Ready | |
| Support Team | [ ] Ready | |

---

## Final Sign-Off

**QA Completion Date:** ___________  
**All Tests Passed:** YES / NO  
**Go/No-Go Decision:** GO / NO-GO  
**Launch Approved:** YES / NO  

**Signatures:**

```
QA Lead: _________________________ Date: _________

Dev Lead: _________________________ Date: _________

Product Owner: _________________________ Date: _________

CEO/Founder: _________________________ Date: _________
```

---

## Notes & Comments

```
Final observations before launch:

___________________________________________________________

___________________________________________________________

___________________________________________________________
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-16  
**Next Review:** 2026-05-01 (post-alpha feedback)
