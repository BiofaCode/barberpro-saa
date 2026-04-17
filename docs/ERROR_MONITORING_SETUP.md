# Error Monitoring Setup Guide

## Overview

This document outlines the error monitoring options available for Kreno. Start with **Option 1 (Render built-in)** immediately at launch, then consider adding **Option 2 (Sentry)** after the first 2 weeks of stability.

---

## Option 1: Render.com Built-in Logs (USE IMMEDIATELY)

**Status:** Active, included with Render hosting, no additional cost

### What It Is

Render automatically captures all logs from the running Node.js application. Every console.log(), error, and crash is stored and searchable.

### How to Access

1. Go to https://dashboard.render.com
2. Select "salonpro" service
3. Click "Logs" tab at the top
4. Logs are displayed in real-time and searchable

### What to Look For

**Error Indicators:**
- Red text or "ERROR" messages
- Stack traces with file paths and line numbers
- 5xx error responses
- Database connection errors
- Timeout messages

**Example Error Messages:**
```
ERROR: MongoDB connection failed: ECONNREFUSED
MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017

ERROR: Payment processing failed
StripeError: Invalid API key

ERROR: Email delivery failed
ResendError: Rate limit exceeded

TypeError: Cannot read property 'email' of null
  at /app/server.js:1234:15
```

### Daily Monitoring Procedure

1. Open Render dashboard at 9 AM
2. Click "Logs" tab
3. Scan for any red text or ERROR keywords
4. If errors found:
   - Note the timestamp
   - Read the full error message
   - Check if issue is still occurring
   - Search for related errors
5. Document findings in incident log
6. Escalate if multiple errors or recent (within last hour)

### Setting Up Email Alerts (Recommended)

1. Go to https://dashboard.render.com
2. Click your account icon → Settings
3. Look for "Notifications" or "Email Preferences"
4. Enable alerts for:
   - Service crashes
   - Deployment failures
   - Health check failures
5. Test by stopping service briefly to confirm alert works

### Limitations of Render Logs

- Logs deleted after 24-48 hours (retention limited)
- No automatic grouping of similar errors
- No user context (who was affected?)
- Cannot set alert thresholds
- Searching can be tedious for many logs

**Workaround:** Copy important errors to incident log immediately

---

## Option 2: Sentry Integration (SETUP AFTER WEEK 2)

**Status:** Optional, recommended after first 2 weeks of stability
**Cost:** ~$29/month (or free tier for small projects)
**Setup Time:** 15-20 minutes

### What Is Sentry?

Sentry is a dedicated error tracking platform that:
- Automatically captures and groups errors
- Shows you the user impact (how many users affected?)
- Provides full stack traces with source code
- Tracks error trends over time
- Sends alerts for new error types

### When to Implement

**Recommended Timeline:**
- Day 1-7: Use Render logs only (monitor daily)
- Day 8-14: If stable, consider Sentry
- Day 15+: Implement Sentry for better visibility

**Don't wait if:**
- You notice frequent errors that are hard to track
- You need to correlate errors with user impact
- You want automatic error grouping

### Setup Steps

#### Step 1: Create Sentry Account

1. Go to https://sentry.io
2. Sign up with email
3. Create new organization (name: "Kreno")
4. Create new project → Node.js

#### Step 2: Get DSN

After creating project, you'll see:
```
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxx
```

Copy this value.

#### Step 3: Add Package to Code

```bash
npm install @sentry/node
```

(Already in devDependencies - just need to install)

#### Step 4: Initialize Sentry in server.js

At the very top of `server.js` (before other requires):

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 0.1, // 10% of requests
});
```

#### Step 5: Set Environment Variable

In Render dashboard:
1. Go to "salonpro" service
2. Click "Environment" tab
3. Add new variable:
   - Name: `SENTRY_DSN`
   - Value: (paste from Step 2)
4. Deploy (Render auto-restarts)

#### Step 6: Test Integration

After deployment:
```bash
# Test error capture (this will intentionally crash)
curl https://kreno.ch/api/test-sentry
```

Check Sentry dashboard - you should see the error appear in real-time.

### Using Sentry Dashboard

**Main Views:**

1. **Issues List** (main page)
   - Shows all errors grouped by type
   - Click on any error to see details
   - Shows: how many users affected, when first/last occurred

2. **Error Details**
   - Full stack trace
   - Breadcrumbs (user actions before error)
   - User information (if attached)
   - Server context (memory, CPU, etc.)

3. **Alerts** (top menu)
   - Create alert rules
   - Example: Alert if new error type appears
   - Example: Alert if error rate > 10 per minute

4. **Performance** (if using tracing)
   - Track slow requests
   - Identify performance bottlenecks

### Best Practices with Sentry

**1. Attach User Context**

When you know who the user is, attach their info:

```javascript
// In authenticated routes:
Sentry.setUser({
  id: userId,
  email: userEmail,
  salon_id: salonId // custom property
});
```

This helps identify which salons are affected by errors.

**2. Add Breadcrumbs**

Track user actions leading to error:

```javascript
Sentry.captureMessage('User attempted booking', 'info');
Sentry.addBreadcrumb({
  category: 'booking',
  message: `Booking created for salon ${salonId}`,
  level: 'info'
});
```

**3. Set Error Level**

```javascript
// Critical error
Sentry.captureException(error, { level: 'fatal' });

// Warning (not critical)
Sentry.captureException(error, { level: 'warning' });
```

**4. Create Alert Rules**

After a few days of data:
1. Go to Alerts in Sentry
2. Create new alert: "Alert when error rate > 10/min"
3. Add your email as recipient
4. Similar alerts for new error types

### Sentry Free vs Paid

**Free Tier:**
- 5,000 events/month
- 1 project
- Basic error tracking
- Enough for small launch

**Paid ($29/month):**
- 50,000 events/month
- Unlimited projects
- Advanced features
- Better filtering and alerts

Start free, upgrade if needed.

---

## Option 3: Custom Logging (ALREADY IMPLEMENTED)

**Status:** In place, use as foundation

### What's Already Implemented

In `server.js`, there's built-in request logging:

```javascript
// Logs format: [TIMESTAMP] METHOD PATH - STATUS (DURATIONms)
[2026-04-16 14:23:45] POST /api/salon/book - 201 (125ms)
[2026-04-16 14:23:46] GET /api/salon/abc123/schedule - 500 (45ms)
```

### Metrics Endpoint

Endpoint: `GET /api/metrics`

Returns:
```json
{
  "status": "ok",
  "uptime": 3600,
  "memory": "250MB",
  "requests": 1000,
  "errors": 5,
  "avgResponseTime": 125
}
```

### How to Use

1. Check metrics daily:
   ```bash
   curl https://kreno.ch/api/metrics
   ```

2. Look for trends:
   - Errors increasing?
   - Response time slowing?
   - Memory growing?

3. Document findings in monitoring checklist

### Enhancing Custom Logging

After first month, consider adding:

```javascript
// More detailed error logging
const logError = (error, context) => {
  console.error(`[ERROR] ${error.message}`, {
    timestamp: new Date().toISOString(),
    stack: error.stack,
    context: context
  });
  // Also send to Sentry if configured
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error);
  }
};
```

---

## Monitoring Setup Timeline

### Day 1 (Launch Day)
- Use Render logs only
- Check logs 3-4 times during day
- Document any errors found

### Days 2-7 (First Week)
- Check Render logs daily
- Set up Render email notifications
- Take notes on error patterns
- No additional tools needed yet

### Days 8-14 (Second Week)
- If system stable and running smoothly → proceed to Sentry setup
- If issues found → fix first, then Sentry
- Continue daily Render log monitoring

### Days 15+ (After 2 Weeks)
- Deploy Sentry integration
- Migrate error tracking to Sentry
- Keep Render logs as backup
- Use Sentry as primary error tracking tool

---

## Debugging Workflow with Sentry

When a user reports an error:

1. **Search for Error in Sentry**
   - Go to Sentry Issues page
   - Search for error message or user email
   - Click on issue to see details

2. **Understand the Context**
   - What was the user doing?
   - What values were they using?
   - How many users affected?
   - When did it start happening?

3. **Reproduce Locally**
   - Use breadcrumbs to understand sequence
   - Check values from error context
   - Attempt to reproduce on local machine

4. **Fix in Code**
   - Write fix
   - Add test case
   - Test locally
   - Deploy

5. **Verify in Sentry**
   - Mark issue as "resolved"
   - Deploy fix to production
   - Monitor for regression
   - Close issue if no more occurrences

---

## Error Monitoring Checklist

### Render Setup (Do Immediately)
- [ ] Verify can access https://dashboard.render.com
- [ ] Can see "salonpro" service
- [ ] Can click Logs tab
- [ ] Set up email notifications (optional but recommended)
- [ ] Bookmark: https://dashboard.render.com/services

### Daily Check (Week 1)
- [ ] Open Render logs
- [ ] Scan for RED text or ERROR keywords
- [ ] Note any errors
- [ ] Document in monitoring log

### Sentry Setup (After Day 14, if needed)
- [ ] Create Sentry account
- [ ] Create project (Node.js)
- [ ] Get DSN
- [ ] Add @sentry/node to package
- [ ] Add Sentry initialization to server.js
- [ ] Set SENTRY_DSN in Render env vars
- [ ] Deploy and test
- [ ] Configure email alerts
- [ ] Test error capture

### Monthly Review
- [ ] Are Render logs sufficient?
- [ ] Would Sentry help visibility?
- [ ] Cost/benefit of Sentry?
- [ ] Plan for next month

---

## Quick Reference

**Check Logs:**
- Render: https://dashboard.render.com → salonpro → Logs
- Sentry: https://sentry.io → Kreno project → Issues

**Check Metrics:**
- Health: `curl https://kreno.ch/api/health`
- Metrics: `curl https://kreno.ch/api/metrics`

**Common Errors and What to Do:**

| Error | What It Means | What to Do |
|-------|---------------|-----------|
| MongoServerSelectionError | Database offline | Check MongoDB Atlas status, verify IP whitelist |
| ECONNREFUSED | Service/database not responding | Check Render service status, restart if needed |
| TypeError: Cannot read property X | Code error/null pointer | Check stack trace, find line number, review code |
| StripeError: Invalid API key | API credentials wrong | Verify STRIPE_SECRET_KEY in Render env vars |
| ResendError: Rate limit | Too many emails sent | Check email queue, consider batch processing |
| ENOTFOUND: hostname | DNS/network error | Check URL, verify domain, check firewall |

---

## Support

For Sentry questions:
- Docs: https://docs.sentry.io/platforms/node/
- Support: https://sentry.io/support/

For Render issues:
- Status: https://render-status.com
- Support: https://support.render.com
