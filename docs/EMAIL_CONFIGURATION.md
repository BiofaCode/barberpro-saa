# Email Configuration & Deliverability Guide

## Overview

Kreno uses **Resend API** for all transactional emails. Resend is a modern email delivery platform optimized for transactional emails with excellent deliverability rates.

---

## 1. Email Service Setup

### Provider
- **Service:** Resend API
- **Documentation:** https://resend.com/docs
- **API Key Environment Variable:** `RESEND_API_KEY`
- **Sender Email:** `noreply@kreno.ch`

### Configuration in Code

Email configuration is managed in `/email.js`. The sender email is set via environment variable:

```javascript
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
```

**File:** `email.js` (lines 9, 122, 146, 181, 311, 368, 437, 495, 563, 612, 650, 725)

---

## 2. Critical: DNS Configuration Required

### Why DNS Records Matter

For emails from `noreply@kreno.ch` to be delivered reliably and not marked as spam, you must configure DNS records that prove Kreno has permission to send emails on behalf of the kreno.ch domain.

Without these records:
- Emails may be rejected by recipient servers
- Emails may go to spam folders
- Recipients may see "This message seems unsafe" warnings

### Required DNS Records

#### SPF (Sender Policy Framework)

**Purpose:** Tells email servers which IP addresses are authorized to send emails for your domain.

**Record to Add:**
- **Name/Host:** `kreno.ch` (or `@`)
- **Type:** TXT
- **Value:** `v=spf1 include:resend.com ~all`
- **TTL:** 3600 (1 hour)

**Note:** If you already have an SPF record, add `include:resend.com` to the existing record instead of replacing it. Example:
```
v=spf1 include:sendgrid.net include:resend.com ~all
```

#### DKIM (DomainKeys Identified Mail)

**Purpose:** Signs emails with cryptographic keys so recipients can verify emails really came from you.

**Setup:**
1. Log into Resend Dashboard: https://resend.com/domains
2. Add domain: `kreno.ch`
3. Resend generates 3 DKIM records (CNAME records)
4. Copy each CNAME record to your domain registrar's DNS settings
5. Wait for records to propagate (may take 15-60 minutes)
6. Resend will automatically verify when ready

**Example DKIM records from Resend:**
```
Name: default._domainkey.kreno.ch
Type: CNAME
Value: default.resend.com

Name: resend._domainkey.kreno.ch
Type: CNAME
Value: resend.resend.com

(Additional verification record may be provided)
```

#### DMARC (Domain-based Message Authentication, Reporting & Conformance)

**Purpose:** Sets policy for what happens when emails fail SPF/DKIM checks. Optional but recommended for production.

**Recommended Record:**
- **Name/Host:** `_dmarc.kreno.ch`
- **Type:** TXT
- **Value:** `v=DMARC1; p=quarantine; rua=mailto:noreply@kreno.ch`
- **TTL:** 3600

**Options:**
- `p=reject` — Reject any emails that fail SPF/DKIM (strictest)
- `p=quarantine` — Move to spam folder (recommended for testing)
- `p=none` — Monitor only, don't enforce (for initial testing)

### DNS Configuration Steps

1. **Log into your domain registrar** (Ionos, GoDaddy, Namecheap, etc.)
2. **Navigate to DNS settings** for kreno.ch
3. **Add SPF record:**
   - Host: `@` or `kreno.ch`
   - Type: TXT
   - Value: `v=spf1 include:resend.com ~all`
4. **Add DKIM records** from Resend dashboard:
   - Log into Resend
   - Go to Domains
   - Add `kreno.ch`
   - Copy CNAME records provided by Resend
   - Add each CNAME to your DNS
5. **Add DMARC record** (optional but recommended):
   - Host: `_dmarc.kreno.ch`
   - Type: TXT
   - Value: `v=DMARC1; p=quarantine; rua=mailto:noreply@kreno.ch`
6. **Wait for propagation:**
   - SPF/DMARC usually propagate within 15-30 minutes
   - DKIM may take 30-60 minutes
   - Use `nslookup` to verify:
     ```bash
     nslookup -type=txt kreno.ch
     ```

### DNS Verification Tools

- **MXToolbox:** https://mxtoolbox.com/spf.aspx
- **DKIM Validator:** https://www.mail-tester.com/
- **Mail Tester:** https://www.mail-tester.com/ (full report)

---

## 3. Email Templates

All email templates are defined in `/email.js`. The following functions send emails:

### 1. Booking Confirmation Email
**Function:** `sendBookingConfirmation(booking, salon, cancelUrl, receiptUrl)`
**Trigger:** When a customer books an appointment
**Recipient:** Customer email
**Variables Used:**
- `booking.clientName` — Customer name
- `booking.clientEmail` — Customer email
- `booking.serviceName` — Service (e.g., "Haircut")
- `booking.serviceIcon` — Emoji icon (e.g., "✂️")
- `booking.date` — Appointment date (YYYY-MM-DD)
- `booking.time` — Appointment time (HH:MM)
- `booking.duration` — Duration in minutes
- `booking.price` — Price in CHF
- `booking.employeeName` — Staff member name (if applicable)
- `salon.branding.primaryColor` — Brand color
- `salon.name` — Salon name
- `salon.address` — Salon address
- `salon.phone` — Salon phone

**Template Style:** Professional card layout with salon branding color, appointment recap, cancellation link

### 2. OTP (One-Time Password) Email
**Function:** `sendOTPEmail(email, code, salonName)`
**Trigger:** When customer requests access to "My Appointments"
**Recipient:** Customer email
**Variables Used:**
- `email` — Recipient email
- `code` — 6-digit OTP code
- `salonName` — Salon name

**Template Style:** Simple, security-focused with large code display
**Code Validity:** 10 minutes

### 3. Welcome Email (Salon Owner)
**Function:** `sendWelcomeEmail(email, ownerName, salonName, plan, baseUrl)`
**Trigger:** When a new salon owner signs up
**Recipient:** Salon owner email
**Variables Used:**
- `email` — Owner email
- `ownerName` — Owner name
- `salonName` — Salon name
- `plan` — Subscription plan (starter/pro/premium)
- `baseUrl` — Application URL
- Trial period — 14 days for pro/premium plans

**Template Style:** Welcoming, with setup steps and next actions

### 4. Password Reset Email
**Function:** `sendPasswordResetEmail(email, ownerName, resetUrl)`
**Trigger:** When owner requests password reset
**Recipient:** Salon owner email
**Variables Used:**
- `email` — Owner email
- `ownerName` — Owner name
- `resetUrl` — Password reset link
- **Link Validity:** 1 hour

**Template Style:** Security-focused with single action button

### 5. Appointment Reminder Email
**Function:** `sendReminderEmail(booking, salon)`
**Trigger:** 24 hours before appointment (via background job)
**Recipient:** Customer email
**Variables Used:**
- All booking fields (see Booking Confirmation)
- `salon.branding.primaryColor` — Brand color

**Template Style:** Simple reminder with cancellation option
**Subject:** `⏰ Rappel RDV demain — {service} à {time}`

### 6. Booking Cancellation Confirmation
**Function:** `sendCancellationConfirmation(booking, salon)`
**Trigger:** When customer cancels via email link
**Recipient:** Customer email
**Variables Used:**
- Customer name, service name, date, time
- Booking details recap

**Template Style:** Concise confirmation of cancellation

### 7. Cancellation Alert to Salon Owner
**Function:** `sendCancellationAlertToOwner(booking, salon, ownerEmail)`
**Trigger:** When customer cancels via email link
**Recipient:** Salon owner email
**Variables Used:**
- Customer name, email, phone
- Service name, date, time
- Note: "This slot is now available"

**Template Style:** Alert format with action-oriented info

### 8. Admin Notification (New Subscription)
**Function:** `sendAdminNewSubscriptionEmail(adminEmail, { salonName, ownerEmail, plan, salonId, baseUrl })`
**Trigger:** When a new paid subscription is created
**Recipient:** Admin email
**Variables Used:**
- Salon name, owner email, plan, salon ID
- Timestamp, admin dashboard link

**Template Style:** Business alert with verification info

### 9. Employee Booking Notification
**Function:** `sendEmployeeBookingNotification(booking, salon, employeeEmail)`
**Trigger:** When a booking is created and assigned to staff
**Recipient:** Staff member email
**Variables Used:**
- Client name, service, date, time, duration
- Client phone, notes (if provided)

**Template Style:** Professional notification with booking recap

### 10. Review Request Email
**Function:** `sendReviewRequestEmail(booking, salon, reviewUrl)`
**Trigger:** ~2 hours after appointment ends
**Recipient:** Customer email
**Variables Used:**
- Customer name, service, date
- Salon name, primary color
- Review link

**Template Style:** Friendly, star-focused, minimal CTAs
**Note:** Uses incorrect variable at line 821 — see Troubleshooting

### 11. Referral Reward Email
**Function:** `sendReferralRewardEmail(parrainEmail, parrainName, filleulSalonName)`
**Trigger:** When referred salon makes first payment
**Recipient:** Referrer email
**Variables Used:**
- Referrer name, referred salon name
- Reward description (1 month free)

**Template Style:** Celebratory with reward highlight

### 12. Payment Failed Email
**Function:** `sendPaymentFailedEmail(ownerEmail, ownerName, salonName, proUrl)`
**Trigger:** When Stripe payment fails
**Recipient:** Salon owner email
**Variables Used:**
- Owner name, salon name, settings URL

**Template Style:** Alert with action button for payment update

---

## 4. Email Deliverability Testing

### Before Launch Testing

#### Test 1: Send Test Booking Confirmation
1. Create a test booking in the admin dashboard
2. Verify email arrives in inbox (not spam)
3. Check email formatting and colors
4. Verify cancellation link works
5. Test with multiple email providers: Gmail, Outlook, Yahoo

#### Test 2: Check DKIM/SPF/DMARC
1. Use **Mail Tester:** https://www.mail-tester.com/
   - Get a test email address from Mail Tester
   - Send test email from Kreno to that address
   - Mail Tester shows DKIM/SPF/DMARC status
   - Goal: 10/10 score (all records passing)
2. Use **MXToolbox:** https://mxtoolbox.com/spf.aspx
   - Verify SPF record is correct
   - Check for conflicts with existing records

#### Test 3: OTP Email Delivery
1. Go to "My Appointments" (customer flow)
2. Request OTP for an email
3. Verify code arrives within seconds
4. Verify code works for access
5. Test OTP expiration (10 minutes)

#### Test 4: Spam Filter Testing
1. Send test email to Gmail account
2. Check it doesn't go to Promotions/Spam tabs
3. If it does, check mail-tester score and review SPF/DKIM/DMARC
4. Send to Outlook, Yahoo to verify

#### Test 5: Reminder Email
1. Create booking for tomorrow
2. Manually trigger reminder email (or wait 24h)
3. Verify email arrives
4. Verify cancellation link works

---

## 5. Environment Variables

Required for email functionality:

```bash
# Resend API Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx  # Your Resend API key
RESEND_FROM_EMAIL=noreply@kreno.ch            # Sender email address

# Optional (defaults to "Kreno" if not set)
SMTP_FROM_NAME=Kreno                          # Display name in "From" field
```

### Getting Resend API Key

1. Go to https://resend.com
2. Sign up / Log in
3. Navigate to API Keys
4. Create new API key (or copy existing)
5. Copy the full key (starts with `re_`)
6. Store in Render.com dashboard under Settings → Environment

### Setting in Render.com

1. Go to https://dashboard.render.com
2. Select service: **salonpro**
3. Navigate to **Settings → Environment**
4. Click **Add Environment Variable**
5. Add:
   - Name: `RESEND_API_KEY`
   - Value: `re_xxxxx...` (from Resend dashboard)
6. Click **Save**

---

## 6. Troubleshooting

### Email Not Received

**Checklist:**
1. Is `RESEND_API_KEY` set in Render dashboard?
2. Are DNS records configured? (SPF, DKIM, DMARC)
3. Did the API call succeed? Check logs:
   ```bash
   # In Render logs, look for:
   # ✓ "📧 Email de confirmation envoyé à..."
   # ✗ "❌ Erreur Resend:..."
   ```
4. Is the recipient email valid? (no typos, not catch-all)

**Fix:**
- Verify DNS records with MXToolbox
- Check Resend API status: https://status.resend.com
- Test API key directly (see Resend docs)

### Email Goes to Spam

**Likely Causes:**
- SPF record not configured → Add `v=spf1 include:resend.com ~all`
- DKIM not configured → Add CNAME records from Resend
- DMARC not configured → Add DMARC policy

**How to Check:**
1. Send test email to https://www.mail-tester.com/
2. Check score and specific failures
3. Fix indicated issues in DNS

**Prevention:**
- Configure SPF, DKIM, DMARC before launch
- Test with Mail Tester (aim for 10/10)
- Monitor spam reports in Resend dashboard

### Resend API Errors

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid API key` | Key is wrong or expired | Get new key from Resend |
| `Rate limited` | Too many requests (100+/sec) | Resend has rate limits; queue requests |
| `Domain not verified` | Domain in `from:` is not verified in Resend | Verify domain in Resend → Domains |
| `Missing required field` | Email template is missing data | Check all required fields are provided |

**Debug Steps:**
1. Check Resend logs: https://resend.com/logs
2. Verify API key is active (not revoked)
3. Verify domain is verified in Resend dashboard
4. Test with curl:
   ```bash
   curl -X POST "https://api.resend.com/emails" \
     -H "Authorization: Bearer re_YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"from":"noreply@kreno.ch","to":"test@gmail.com","subject":"Test","html":"<p>Test</p>"}'
   ```

### Email Template Issues

**Subject Lines in French:**
All subject lines and templates use French (as per app locale). Verify translations are accurate.

**Formatting Issues:**
If email looks broken in certain clients:
1. Check email.js HTML — ensure inline styles (no CSS classes)
2. Test in multiple clients: Gmail, Outlook, Apple Mail
3. Use Email on Acid or Litmus for compatibility testing

### Known Issues

**Issue at Line 821 in email.js:**
The `sendReviewRequestEmail()` function uses `process.env.RESEND_FROM` instead of `process.env.RESEND_FROM_EMAIL`:
```javascript
// Line 821 - INCORRECT
from: process.env.RESEND_FROM || `${salonName} <noreply@barberpro.ch>`
```

**Should be:**
```javascript
from: process.env.RESEND_FROM_EMAIL || `${salonName} <noreply@kreno.ch>`
```

**Impact:** Review request emails will fail to send unless `RESEND_FROM` env var is set.

**Fix:** This should be corrected in a patch commit.

---

## 7. Monitoring & Analytics

### Resend Dashboard

Monitor all emails sent:
1. Go to https://resend.com/logs
2. View delivery status, bounces, complaints
3. Set up alerts for failures

### Kreno Application Logs

Check Render logs for email operations:
```bash
# Look for these patterns:
# ✓ "📧 Email de confirmation envoyé à..."
# ✓ "📧 Rappel J-1 envoyé à..."
# ✗ "❌ Erreur Resend:..."
```

### Email Sending Volume

- **Estimated daily sends:**
  - Booking confirmations: ~50-200 per day (depends on bookings)
  - Reminders: ~10-50 per day (24h before appointments)
  - Other transactional: ~5-20 per day
  - **Total:** ~200-500 emails/day at launch
- **Resend limits:** 100,000+ emails/day (well above needs)

---

## 8. Production Deployment Checklist

Before going live, verify:

- [ ] DNS SPF record added: `v=spf1 include:resend.com ~all`
- [ ] DNS DKIM records added (3 CNAME records from Resend)
- [ ] DNS DMARC record added (optional, recommended)
- [ ] `RESEND_API_KEY` set in Render dashboard environment
- [ ] `RESEND_FROM_EMAIL` set to `noreply@kreno.ch`
- [ ] Test email sends successfully from production
- [ ] Emails do NOT go to spam (check with mail-tester.com)
- [ ] All templates use correct sender domain (`kreno.ch`)
- [ ] OTP emails work and expire correctly
- [ ] Reminder emails send 24h before appointment
- [ ] No hardcoded test emails in production code
- [ ] Resend dashboard is accessible and monitored
- [ ] Support email set up for customer replies

---

## 9. Support & Resources

### External Documentation
- **Resend:** https://resend.com/docs
- **SPF Guide:** https://mxtoolbox.com/spf.aspx
- **DKIM Explained:** https://www.cloudflare.com/learning/dns/dns-records/dns-dkim-record/
- **DMARC Policy:** https://dmarc.org/

### Internal Documentation
- See `docs/EMAIL_TEMPLATES.md` for template details
- See `docs/RENDER_DEPLOYMENT.md` for environment setup
- See `CLAUDE.md` for code architecture overview

### Getting Help

If emails aren't delivering:
1. Check Render logs for errors
2. Check Resend logs for bounces
3. Use Mail Tester to verify DNS records
4. Verify `RESEND_API_KEY` is set correctly
5. Test with test Resend API key first

---

**Last Updated:** 2026-04-16
**Status:** Production Ready
