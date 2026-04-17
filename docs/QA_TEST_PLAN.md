# Kreno QA Test Plan - Alpha Launch

**Last Updated:** 2026-04-16  
**Status:** Ready for Manual E2E Testing  
**Environment:** Production (render.com)  
**Platforms:** Web (desktop/mobile), Mobile App (iOS/Android via Flutter)

---

## Overview

This QA test plan covers comprehensive manual testing of all Kreno platform components before alpha launch. The plan addresses eight critical test areas with specific acceptance criteria.

---

## 1. Public Landing Page (saas/)

**Purpose:** Verify marketing/signup funnel presents correctly

### Test Cases

| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1.1 | Visit saas.kreno.ch | Landing page loads with hero section visible | |
| 1.2 | Click "Book a Demo" CTA | Routes to booking flow or contact form | |
| 1.3 | Navigate between sections (Features, Pricing, Contact) | Smooth scrolling or page transitions | |
| 1.4 | Verify links to kreno.ch domain | All external links use correct domain | |
| 1.5 | Test on desktop (1920x1080) | Full layout, no overflow, readable text | |
| 1.6 | Test on tablet (768x1024) | Responsive design, no broken layout | |
| 1.7 | Test on mobile (375x667) | Mobile menu works, stacked layout, readable | |
| 1.8 | Open browser console | No errors (ERR_NAME_NOT_RESOLVED, 404s, CSP violations) | |
| 1.9 | Measure page load time | < 3 seconds (Core Web Vitals) | |
| 1.10 | Test form submission (if contact form) | Form submits without error, shows success message | |

---

## 2. Public Booking Flow (website/)

**Purpose:** Verify customer-facing booking works end-to-end

### Test Cases

| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 2.1 | Visit kreno.ch/book | Salon search page loads | |
| 2.2 | Search for available salons | List displays with name, location, services | |
| 2.3 | Click on salon card | Salon detail page opens with calendar/availability | |
| 2.4 | View available time slots | Calendar shows available times, booked slots greyed out | |
| 2.5 | Select available time slot | Slot highlights, booking form appears | |
| 2.6 | Fill booking form (name, email, phone) | All fields accept input | |
| 2.7 | Submit booking | Success message displays, booking ID shown | |
| 2.8 | Check email inbox for OTP | Receives email with 6-digit OTP within 2 minutes | |
| 2.9 | Enter OTP in booking app | OTP validated, booking confirmed | |
| 2.10 | Receive confirmation email | Confirmation contains appointment details (date, time, salon) | |
| 2.11 | View booking in customer dashboard | Booking appears in "My Bookings" | |
| 2.12 | Test reschedule booking | Can select new time, receives confirmation | |
| 2.13 | Test cancel booking | Can cancel, receives cancellation email | |
| 2.14 | Test with invalid email | Form rejects invalid format | |
| 2.15 | Test with invalid phone | Form rejects invalid format | |

---

## 3. Pro Portal (pro.kreno.ch)

**Purpose:** Verify salon owner management dashboard

### Test Cases

| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 3.1 | Visit pro.kreno.ch (not logged in) | Redirects to login page | |
| 3.2 | Login with valid owner email/password | Redirects to dashboard | |
| 3.3 | Login with invalid password | Error message displayed, no access granted | |
| 3.4 | View dashboard | Shows today's bookings, revenue, key metrics | |
| 3.5 | View pending bookings | List shows customer name, time, status | |
| 3.6 | Confirm pending booking | Status changes to "Confirmed", customer notified | |
| 3.7 | Reject booking | Status changes to "Rejected", cancellation email sent | |
| 3.8 | Add new staff member | Form accepts name, email, phone; staff added to list | |
| 3.9 | Edit staff member | Can update details and save | |
| 3.10 | Delete staff member | Staff removed, cannot book future appointments | |
| 3.11 | Add new service | Service appears in list with name, duration, price | |
| 3.12 | Edit service | Can update name, price, duration | |
| 3.13 | Delete service | Service removed from list and booking options | |
| 3.14 | View color palette picker | 16 color swatches visible with primary/accent labels | |
| 3.15 | Select color from palette | Color highlights with border + checkmark, hex field updates | |
| 3.16 | Manually enter hex code | Palette selection updates to match entered color | |
| 3.17 | Save branding colors | Colors persist after reload | |
| 3.18 | View SMS credits | Dashboard shows remaining SMS credits | |
| 3.19 | Purchase SMS credits | Stripe payment gateway opens, credits updated after payment | |
| 3.20 | View booking history | Can filter by date range, shows past bookings | |
| 3.21 | Export bookings | Can download CSV or PDF of appointments | |
| 3.22 | View analytics | Shows revenue, booking trends, customer growth | |

---

## 4. Admin Portal (admin.kreno.ch)

**Purpose:** Verify platform administration and salon management

### Test Cases

| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 4.1 | Visit admin.kreno.ch (not logged in) | Redirects to admin login | |
| 4.2 | Login with ADMIN_PASSWORD | Access granted, dashboard visible | |
| 4.3 | Login with wrong password | Error displayed, no access | |
| 4.4 | View all salons | List shows all salons with owner, location, status | |
| 4.5 | Search for salon by name | Filters list correctly | |
| 4.6 | Create new salon | Form accepts name, owner email, location; salon created | |
| 4.7 | Edit salon details | Can update name, location, contact info | |
| 4.8 | View salon subscription | Shows plan type, expiration date, renewal status | |
| 4.9 | Upgrade/downgrade subscription | Changes reflected in salon details | |
| 4.10 | Suspend salon | Salon no longer bookable, owner notified | |
| 4.11 | Resume salon | Salon becomes bookable again | |
| 4.12 | View SMS credits | Can see total SMS pool and per-salon usage | |
| 4.13 | Allocate SMS credits | Can add credits to specific salon | |
| 4.14 | View platform analytics | Shows total revenue, active salons, bookings this month | |
| 4.15 | View user activity log | Shows login times, actions taken, dates | |
| 4.16 | Export analytics | Can download report as CSV/PDF | |
| 4.17 | Logout | Returns to login page, session cleared | |

---

## 5. Mobile App (Kreno Staff App)

**Purpose:** Verify Flutter staff app functionality

### Test Cases

| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 5.1 | Launch app on iOS/Android device | App opens without crash, splash screen shows | |
| 5.2 | Login with employee email/password | Redirects to home screen | |
| 5.3 | Login with invalid credentials | Error message displayed | |
| 5.4 | View home/dashboard | Shows today's appointments list | |
| 5.5 | View appointment details | Shows customer name, time, service, notes | |
| 5.6 | Scroll through daily schedule | All appointments visible in chronological order | |
| 5.7 | Mark appointment complete | Status changes to "Completed" | |
| 5.8 | Add notes to appointment | Notes saved and visible next time opened | |
| 5.9 | Edit notes | Changes persist after reopening | |
| 5.10 | Navigate between screens (Home, Settings, Profile) | Bottom nav works, screens load correctly | |
| 5.11 | View settings | Shows app version, language (fr_FR), logout button | |
| 5.12 | View color palette picker | 16 color swatches visible with primary/accent labels | |
| 5.13 | Select color from palette | Color highlights, hex field updates | |
| 5.14 | Manually enter hex code | Palette selection updates to match | |
| 5.15 | Change branding colors | Colors update app theme (primary/accent text, buttons) | |
| 5.16 | Logout | Returns to login screen, credentials cleared | |
| 5.17 | App stability stress test | Use app for 5 minutes without crashes (navigation, switching screens) | |
| 5.18 | Test on low network | App handles slow connection without freezing | |
| 5.19 | Switch between light/dark mode (if supported) | UI remains readable | |

---

## 6. Email Notifications

**Purpose:** Verify all transactional emails send correctly

### Test Cases

| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 6.1 | Book appointment | Booking confirmation email received within 2 min | |
| 6.2 | OTP request | OTP email received with 6-digit code | |
| 6.3 | Verify OTP | Booking marked confirmed in system | |
| 6.4 | Owner confirms booking | Customer receives confirmation email | |
| 6.5 | Owner rejects booking | Customer receives rejection/cancellation email | |
| 6.6 | Reschedule booking | Rescheduling confirmation email sent | |
| 6.7 | 24h reminder | Reminder email sent 24 hours before appointment | |
| 6.8 | Review request | Post-appointment review request sent | |
| 6.9 | Email content | All emails contain: salon name, appointment details, contact info | |
| 6.10 | Email styling | Emails render correctly in Gmail, Outlook, mobile clients | |
| 6.11 | Unsubscribe link | Email includes unsubscribe/preferences option | |

---

## 7. Security Tests

**Purpose:** Verify authorization, injection protection, rate limiting

### Test Cases

| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 7.1 | Access /api/pro/salon/:id without auth | Returns 401 Unauthorized | |
| 7.2 | Access /api/pro/salon with expired JWT | Returns 401 Unauthorized | |
| 7.3 | Modify other salon data (different owner) | Returns 403 Forbidden or no change occurs | |
| 7.4 | XSS payload in booking name | `<script>alert('xss')</script>` is escaped/sanitized | |
| 7.5 | SQL injection in search | `'; DROP TABLE salons; --` handled safely | |
| 7.6 | Path traversal attempt | `../../etc/passwd` blocked | |
| 7.7 | Rate limit (login) | After 5 failed attempts in 15 min, requests blocked | |
| 7.8 | Rate limit (API) | Repeated requests from same IP throttled after limit | |
| 7.9 | CSRF protection | Form submissions require valid token | |
| 7.10 | Password strength | Cannot set weak passwords (< 8 chars recommended) | |

---

## 8. Performance

**Purpose:** Verify response times and load performance

### Test Cases

| # | Test | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 8.1 | GET /api/health | Response < 100ms | |
| 8.2 | GET /api/salons (search) | Response < 500ms | |
| 8.3 | POST /api/booking (create) | Response < 500ms | |
| 8.4 | GET /api/pro/salon/:id/bookings | Response < 500ms | |
| 8.5 | Page load (website/) | Full page interactive < 3 seconds | |
| 8.6 | Page load (pro/) | Dashboard renders < 3 seconds | |
| 8.7 | Page load (admin/) | Dashboard renders < 3 seconds | |
| 8.8 | Mobile app startup | App launches and ready to use < 2 seconds | |
| 8.9 | Database query (bookings list) | < 300ms even with 1000+ records | |
| 8.10 | Concurrent requests | Server handles 10 simultaneous users without errors | |

---

## Testing Environment

### Required Setup

```
- Test Salon: "Test Salon Kreno" (slug: test-salon-kreno)
- Test Owner: Email: owner@test.kreno.ch, Password: TestPass123!
- Test Employee: Email: staff@test.kreno.ch, Password: TestPass123!
- Test Customer: Email: customer@test.kreno.ch (for bookings)
- Admin Password: Set in ADMIN_PASSWORD env var
```

### Tools Needed

- Browser: Chrome, Firefox, Safari (latest versions)
- Mobile Device: iOS (12+) or Android (8+)
- Network: Test on both WiFi and cellular if possible
- Email Client: Access to test inboxes
- Performance: Browser DevTools (Network, Console tabs)

### Test Data

- Create at least 3 test salons
- Create at least 2 staff per salon
- Create at least 5 services per salon
- Set SMS credits for testing (e.g., 100 per salon)

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |

---

## Notes & Issues Found

(To be filled during testing)

```
Date: ___________
Issue: ___________
Severity: [Critical / High / Medium / Low]
Status: [Open / Resolved / Deferred]
```
