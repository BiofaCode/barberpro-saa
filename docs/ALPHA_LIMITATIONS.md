# Kreno Alpha Launch - Known Limitations & Deferred Features

**Last Updated:** 2026-04-16  
**Version:** Alpha 1.0  
**Status:** Ready for Limited Release

---

## Overview

This document lists known limitations, deferred features, and workarounds for the Kreno alpha launch. These items are intentionally excluded or incomplete in v1.0 to meet launch timeline.

**Release Plan:**
- **Alpha (v1.0):** Core booking + pro portal + admin (current)
- **Beta (v1.1):** Full SMS, analytics, push notifications (2026-05 target)
- **GA (v2.0):** Offline mode, advanced reporting, marketplace (2026-H2 target)

---

## Deferred Features

### 1. SMS Notifications (Partial Implementation)

**Status:** ⚠️ Optional - Not required for alpha

**What Works:**
- SMS credit system (purchase, display, tracking)
- Twilio integration configured
- SMS API endpoints ready

**What Doesn't Work:**
- Automatic reminder SMS (24h before appointment) - Not yet triggered
- SMS on booking confirmation - Not yet enabled
- SMS on cancellation - Not yet enabled

**Workaround:**
- For alpha, use EMAIL notifications only (fully working)
- Salons should NOT purchase SMS credits yet
- SMS will be enabled in beta release

**Why Deferred:**
- Twilio API requires phone number validation per country
- SMS cost optimization needed before enabling at scale
- Limited testing infrastructure in alpha phase

**Timeline:** Beta (v1.1) - ~2026-05-15

---

### 2. Image Storage (Local File System)

**Status:** ⚠️ Limited - Functional but lossy

**Current Implementation:**
- Salon logos/branding images stored locally in `/uploads/` directory
- Images served via static file endpoint
- Images work during single deployment session

**Problem:**
- Images lost when server redeploys (not persisted across restarts)
- No backup or versioning
- No CDN caching

**Workaround:**
- For alpha: Don't upload large images yet
- Use placeholder images or text-based branding
- Accept that images may disappear after redeployment
- Salons should note this limitation

**Why Deferred:**
- Cloudinary integration requires API keys and setup
- Adds cost for production image hosting
- Not critical for alpha (booking flow works without images)

**Migration Path:**
- Beta: Migrate to Cloudinary or AWS S3
- Auto-sync existing local images to cloud storage
- Persistent image storage with CDN

**Timeline:** Beta (v1.1) - ~2026-05-15

---

### 3. Push Notifications

**Status:** ✗ Not Implemented - Mobile app notifications disabled

**What's Missing:**
- Staff notifications when new booking arrives
- Customer notifications for appointment reminders
- Real-time updates when booking status changes
- Web push notifications for pro portal users

**Current Workaround:**
- Use email notifications (100% working)
- Staff check app manually for new bookings
- No real-time alerting

**Why Deferred:**
- Firebase Cloud Messaging setup required
- Apple Push Notification certificates needed
- Requires mobile app updates and recompilation
- Testing complexity across iOS/Android

**How Staff Discovers Bookings:**
1. Open app
2. Tap "Home" → see today's bookings
3. Manually check every few minutes (or rely on email)

**Timeline:** Beta (v1.1) - ~2026-06-01

---

### 4. Offline Mode

**Status:** ✗ Not Implemented - App requires internet

**Current Behavior:**
- Mobile app requires active internet connection
- If connection drops, app freezes or shows error
- No cached data or offline queue

**Workaround:**
- Ensure WiFi/cellular coverage at salon
- Refresh app if connection restored
- Reschedule offline tasks after reconnecting

**Why Deferred:**
- Requires local SQLite database
- Conflict resolution for offline edits
- Data sync on reconnection
- Significant code complexity

**Timeline:** Future (v2.0) - Eval in 2026-H2

---

### 5. Analytics Dashboard (Minimal)

**Status:** ⚠️ Partial - Basic metrics only

**What Works:**
- Admin dashboard shows:
  - Total revenue (all salons, this month)
  - Active salons count
  - Total bookings (all time)
  - User login activity log

**What's Missing:**
- Per-salon detailed analytics
- Booking trends (line charts over time)
- Customer lifetime value
- Service popularity breakdown
- Staff performance metrics
- Cancellation rate analysis
- Geographic heatmaps
- Revenue forecasting

**Current Workaround:**
- Download raw booking data as CSV (admin portal)
- Analyze in Excel or Google Sheets
- Manual reporting

**Why Deferred:**
- Requires charting library (Chart.js, D3.js)
- Performance optimization for large datasets
- Complex aggregation queries
- Design and UX refinement needed

**Timeline:** Beta (v1.1) - ~2026-06-01

---

### 6. Advanced Booking Features

**Status:** ⚠️ Partial - Core features only

**What Works:**
- Single appointment booking
- Time slot availability
- Booking confirmation
- Reschedule
- Cancel
- OTP verification

**What's Missing:**
- Package/group bookings (6-pack, 10-pack)
- Recurring appointments (weekly haircut)
- Waitlist for fully booked times
- Customer preferences (favorite barber)
- Deposit/prepayment for bookings
- Service add-ons (beard trim + shampoo combo)
- Gift certificates
- Booking calendar sync (Google/Outlook export)

**Workaround:**
- Manual tracking of packages in pro portal notes
- Customers rebook manually each time
- No automated recurring

**Why Deferred:**
- UI complexity for multiple booking types
- Payment integration for deposits
- Database schema changes
- Staff assignment complexity

**Timeline:** Beta (v1.1+) - Eval based on feedback

---

### 7. Multi-Language Support

**Status:** ⚠️ Partial - French/English for some areas

**What Works:**
- Flutter mobile app: Set to French (fr_FR)
- Admin/Pro: English UI with some French text

**What's Missing:**
- Full translation of public website (saas/)
- Public booking page (website/) only in English
- Email templates: English only
- Customer-facing notifications: English only

**Workaround:**
- Salons in Switzerland, France: Accept English for now
- Manual translation of salon descriptions

**Why Deferred:**
- Internationalization (i18n) refactor needed
- All email templates require translation
- UI text strings need extraction
- Native speaker review for accuracy

**Timeline:** Beta (v1.1) - ~2026-06-15

---

### 8. Third-Party Integrations

**Status:** ✗ Not Implemented

**What's Missing:**
- Google Calendar sync (two-way)
- Slack notifications
- Zapier support
- QuickBooks integration
- Mailchimp sync
- Square/Toast POS integration
- Instagram booking cross-posting

**Why Deferred:**
- Each requires separate OAuth setup
- API documentation and testing
- Maintenance burden
- Not critical for MVP

**Timeline:** Future releases (v1.2+)

---

## Known Issues & Bugs

### Issue #1: Color Picker Palette Selection Reset

**Status:** ⚠️ Low Priority  
**Severity:** Low  
**Affects:** Mobile app, Pro portal

**Description:**
- After selecting color from palette, if user manually enters hex code, palette may lose selection highlight
- Colors still apply correctly, just visual feedback inconsistent

**Workaround:**
- Tap palette color again after hex entry
- Refresh page to reset

**Fix Timeline:** Beta (v1.1)

---

### Issue #2: Large Image Upload Timeout

**Status:** ⚠️ Low Priority  
**Severity:** Low  
**Affects:** Salon logo upload

**Description:**
- Image files > 5MB may timeout during upload
- Images < 5MB upload successfully

**Workaround:**
- Compress images before upload
- Use online tool: tinypng.com

**Fix Timeline:** Beta (v1.1)

---

### Issue #3: Email Delivery Delay

**Status:** ⚠️ Low Priority  
**Severity:** Low  
**Affects:** Email notifications

**Description:**
- Emails sent via Resend API sometimes delayed 30-60 seconds
- Most arrive within 2 seconds, but occasional spikes

**Root Cause:**
- Resend API queue during peak times

**Workaround:**
- Inform customers: "Check email in 2-5 minutes"
- Mark booking as "Pending Email Confirmation" until verified

**Fix Timeline:** Production optimization (v1.2)

---

### Issue #4: Mobile App Keyboard Covers Input

**Status:** ⚠️ Low Priority  
**Severity:** Low  
**Affects:** Mobile app login form

**Description:**
- On some Android devices, keyboard covers password field
- Can still type, just can't see what you're typing

**Workaround:**
- Rotate device to landscape
- Copy/paste password from password manager
- Update Flutter SDK (fix in newer versions)

**Fix Timeline:** Beta (v1.1)

---

## Platform-Specific Limitations

### iOS (Apple)

**Status:** ✓ Fully Supported

**Notes:**
- Tested on iOS 14+
- Push notifications available (requires APNS certificate)
- App store review may require additional privacy disclosures

**Known Limitation:**
- Dark mode not fully tested (light mode primary)

---

### Android

**Status:** ✓ Fully Supported

**Notes:**
- Tested on Android 8+
- APK available via Firebase App Distribution
- Google Play Store submission ready for v1.1

**Known Limitation:**
- Some Samsung devices with custom UI may have layout issues
- Keyboard behavior varies by device (Issue #4)

---

### Web (Desktop)

**Status:** ✓ Fully Supported

**Tested Browsers:**
- Chrome 120+
- Firefox 120+
- Safari 16+
- Edge 120+

**Known Issues:**
- None reported for alpha

---

### Web (Mobile/Tablet)

**Status:** ✓ Mostly Supported

**Tested Devices:**
- iPhone 12+ (Safari)
- iPad Pro (Safari)
- Pixel 6+ (Chrome)
- Samsung Tab (Chrome)

**Known Issues:**
- Tablet layout could be optimized (works but not ideal)
- Safari iOS: Some CSS grid issues (workaround: use flexbox)

---

## Performance Baselines

**Note:** These are NOT SLA targets for alpha, just baseline measurements for reference.

| Metric | Target (Beta+) | Alpha Reality | Notes |
|--------|---|---|---|
| API response | < 200ms | 150-400ms | Render.com free tier |
| Page load | < 1.5s | 2-4s | Depends on network |
| Mobile app startup | < 2s | 1.5-3s | First launch slower |
| Database query | < 100ms | 50-300ms | Depends on document count |
| Concurrent users | 100+ | 10-20 (stress limit) | Vertical scaling needed |

**Optimization Timeline:** Post-beta based on usage data

---

## Security Considerations

### What IS Protected

- ✓ Authentication (JWT tokens)
- ✓ Authorization (role-based access)
- ✓ XSS protection (input sanitization)
- ✓ SQL injection protection
- ✓ Rate limiting (login, OTP, API)
- ✓ HTTPS/TLS encryption
- ✓ CSRF protection (where applicable)
- ✓ Password hashing (bcrypt)

### What ISN'T Protected (Known Gaps)

- ⚠️ API key exposure in browser console (not an issue, API keys not exposed)
- ⚠️ No audit logging of data modifications (add in v1.1)
- ⚠️ No data encryption at rest (Render.com handles infrastructure)
- ⚠️ No two-factor authentication for admin (can add in v1.1)

---

## Data Retention & Privacy

**What Happens on Server Restart:**
- All booking data: ✓ Persisted (MongoDB)
- Salon images: ✗ Lost (local storage)
- Session tokens: Invalidated (expected behavior)
- SMS credits: ✓ Persisted

**Backup Policy:**
- MongoDB Atlas: Daily automated backups (30-day retention)
- Images: NO backup (ephemeral only)
- Email logs: 90-day retention (Resend)

**GDPR/Privacy:**
- Booking data includes customer email/phone
- Customer can request deletion (manual process in alpha)
- No explicit consent tracking (add in v1.1)
- Privacy policy: draft only, review needed

---

## Testing Limitations

**What CAN'T Be Tested in Alpha:**
- SMS messages (not enabled)
- Push notifications (not implemented)
- Offline app behavior
- At-scale performance (1000+ users)
- Production payment processing (test card: 4242 4242 4242 4242)

**What CAN Be Tested:**
- All email flows
- Booking flow end-to-end
- Pro/admin portals
- Mobile app UI/core features
- Security controls
- Performance on current scale

---

## Support & Escalation

**For Alpha Issues:**
1. Log issue with details and screenshot
2. Severity assessment: Critical / High / Medium / Low
3. Triage: Fix now / Fix in v1.1 / Defer to v2.0

**Critical Issues (Must Fix):**
- App crashes
- Booking flow breaks
- Security vulnerabilities
- Database corruption

**High Priority (Fix Before Beta):**
- Email failures
- Color picker bugs
- Authentication issues

**Medium Priority (Can Wait Until v1.1):**
- Performance optimization
- Missing features (SMS, push)
- UI polish

**Low Priority (Defer to v2.0):**
- Advanced analytics
- Offline mode
- Third-party integrations

---

## Feedback & Lessons Learned

**For Alpha Testers:**
- Document any unexpected behavior
- Note if limitations impact your use case
- Suggest workarounds that worked
- Prioritize feedback: What's blocking you?

**Feedback Template:**
```
Feature: [Name]
Status: [Missing / Broken / Slow / Other]
Impact: [Critical / High / Medium / Low]
Use Case: [Why do you need this?]
Workaround: [Current solution?]
Suggested Solution: [Your idea?]
Priority for v1.1: [Yes / No]
```

---

## Version Roadmap

### v1.0 - Alpha (Current: 2026-04-16)
- Core booking flow
- Pro/admin portals
- Email notifications
- Mobile app (basic)
- Security hardening
- Stripe integration

### v1.1 - Beta (Target: 2026-05-15)
- SMS notifications enabled
- Push notifications
- Image storage → Cloudinary
- Enhanced analytics
- Two-factor auth (admin)
- Multi-language support
- Bug fixes from alpha feedback

### v1.2 - Production Ready (Target: 2026-06-15)
- Performance optimization
- Advanced analytics
- Recurring bookings
- Package/group bookings
- API documentation (for partners)
- Mobile app store release

### v2.0 - Enhanced (Target: 2026-H2)
- Offline mode
- Third-party integrations
- Marketplace/add-ons
- Advanced business tools
- White-label capabilities

---

## Sign-Off

| Role | Name | Date | Approval |
|------|------|------|----------|
| Product Manager | | | |
| Engineering Lead | | | |
| QA Lead | | | |

---

## Last Updated

- **Date:** 2026-04-16
- **By:** Dev Team
- **Changes:** Initial alpha document
- **Next Review:** After alpha feedback (2026-05-01)
