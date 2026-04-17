# Rollback Plan - Kreno SaaS Platform

**Purpose:** Provide step-by-step procedures to quickly recover from critical production issues.  
**Audience:** DevOps team, On-call engineers, Product team  
**Update Frequency:** After each major release

---

## Overview

This document outlines procedures to rollback Kreno from a broken production state to the last known good state. Rollback must be executable in < 10 minutes.

### Definitions

- **Rollback**: Reverting code to a previous commit
- **Data Rollback**: Restoring database from backup
- **Service Restart**: Restarting the service without code changes
- **RTO** (Recovery Time Objective): < 10 minutes
- **RPO** (Recovery Point Objective): < 5 minutes of data loss acceptable

### Critical Services

| Service | RTO | Failure Impact | Rollback Method |
|---------|-----|----------------|-----------------|
| API Server | 10 min | Users can't book | Git revert + redeploy |
| Database | 30 min | Data access lost | MongoDB restore |
| Email (Resend) | 60 min | No confirmations | Switch provider or manual |
| Stripe | 60 min | No payments | Manual intervention |
| Auth (JWT) | 10 min | Can't login | Git revert + redeploy |

---

## Scenario 1: Server Crashes or Won't Start

### Symptoms
- Health check `/api/health` returns 5xx error or times out
- Render dashboard shows "Runtime error" or "Failed to start"
- Users report "Connection refused" errors
- Server logs show startup error

### Investigation (First 2 Minutes)

1. **Check Render Logs**
   ```bash
   # In browser: go to render.com > salonpro service > Logs
   # Look for:
   # - "Error: Cannot find module..."
   # - "SyntaxError in server.js"
   # - "MONGODB_URI not defined"
   # - "FATAL: Out of Memory"
   ```

2. **Check Environment Variables**
   - Verify all required env vars are set in Render dashboard:
     - MONGODB_URI
     - JWT_SECRET
     - ADMIN_PASSWORD
     - RESEND_API_KEY
     - RESEND_FROM_EMAIL
     - STRIPE_SECRET_KEY
   - If missing, add to Render dashboard and restart

3. **Check MongoDB Connection**
   - Visit MongoDB Atlas dashboard
   - Verify cluster is running (not paused)
   - Check IP whitelist includes Render IP
   - Verify MONGODB_URI is correct

### Decision: Is It a Code Issue or Infrastructure Issue?

#### Infrastructure Issue? (Do NOT Rollback)
- Error: "Cannot connect to MongoDB"
  - **Action:** Check MongoDB Atlas; restart if needed
  - **Recover:** Add Render IP to whitelist, restart service
  
- Error: "MONGODB_URI undefined"
  - **Action:** Add to Render dashboard
  - **Recover:** Restart service from Render dashboard

- Error: "Out of Memory"
  - **Action:** Service is consuming too much memory
  - **Option 1:** Restart service (clears memory) from Render dashboard
  - **Option 2:** Upgrade plan (starter → standard)
  - **If still fails after restart:** Rollback code

#### Code Issue? (DO Rollback)
- Error: "SyntaxError in server.js"
- Error: "Cannot find module..."
- Error: "ReferenceError" or "TypeError"
- Service starts but immediately exits with code error

### Rollback Procedure

**Estimated Time:** 5-7 minutes

1. **Identify Last Good Commit**
   ```bash
   cd /path/to/barber-salon/.worktrees/production-launch
   git log --oneline -n 10
   # Look for most recent known-good commit
   # Usually the one before the failing deployment
   ```
   
   Example output:
   ```
   a1b2c3d fix: prevent race condition in booking
   d4e5f6g feat: add color picker to mobile (← CURRENT, BROKEN)
   h7i8j9k fix: security headers
   l0m1n2o feat: branding updates
   ```

2. **Check What Changed Since Last Good**
   ```bash
   git diff HEAD~1 HEAD server.js
   # Review the changes that broke things
   ```

3. **Create Revert Commit**
   ```bash
   git revert HEAD --no-edit
   # This creates a NEW commit that undoes the last one
   # (safer than git reset --hard, preserves history)
   ```

4. **Push to Trigger Redeploy**
   ```bash
   git push origin main
   # Render will automatically redeploy
   # Wait 2-5 minutes
   ```

5. **Verify Rollback**
   ```bash
   # Wait 2 minutes, then check:
   curl -s https://kreno.ch/api/health | jq .
   # Should return: {"status":"ok","ts":<timestamp>}
   
   # Check logs in Render dashboard:
   # Should see "✅ Connected to MongoDB"
   ```

6. **Communicate Status**
   - [ ] Post in #kreno-launch: "Rollback to commit [hash] completed, service recovering"
   - [ ] Monitor logs for next 10 minutes
   - [ ] Confirm user access restored

### Post-Rollback Analysis

1. **Identify Root Cause**
   ```bash
   # Review the commit that failed
   git show d4e5f6g  # (use actual hash)
   # Look for: new dependencies, env var usage, database changes
   ```

2. **Test Locally**
   ```bash
   npm install
   npm test  # Should have caught this!
   npm start  # Start locally and verify
   ```

3. **Create Fix**
   - Fix the bug that caused the crash
   - Add test case to catch it next time
   - Commit to main
   - Monitor deployment

---

## Scenario 2: High Error Rate (> 10%)

### Symptoms
- Users report errors when trying to book
- Monitoring shows 10%+ of requests failing
- Render logs show recurring error pattern
- `/api/health` responds but errors on other endpoints

### Investigation (First 5 Minutes)

1. **Check Error Logs**
   ```
   Render Dashboard > Logs > Filter by "ERROR" or "500"
   Look for patterns:
   - "MongoError: duplicate key error"
   - "SyntaxError in email template"
   - "Stripe API error"
   - "Rate limit exceeded"
   - "JWT verification failed"
   ```

2. **Identify Affected Endpoint**
   ```
   Is it all endpoints or specific ones?
   - All endpoints 500: Server-level issue (rollback immediately)
   - Only booking endpoint: Logic error (can fix without rollback)
   - Only email: Resend API issue (escalate to Resend)
   ```

3. **Check Recent Deployments**
   ```bash
   git log --oneline -n 5
   # Did we deploy in the last 30 minutes?
   # If YES → likely new code is the issue
   # If NO → check external dependencies (MongoDB, Stripe, Resend)
   ```

### Decision Tree

```
Is error in endpoint we just deployed?
├─ YES (< 30 min old)
│  └─ Likely a code bug → ROLLBACK
│
└─ NO (> 30 min old or inherited from before)
   ├─ Is it a database error? (MongoError, duplicate key, etc)
   │  └─ Check MongoDB → Restore if corrupted
   │
   ├─ Is it an external API error? (Stripe, Resend)
   │  └─ Check API status → Wait or switch provider
   │
   └─ Is it rate limiting? (429 errors)
      └─ Increase rate limit or wait for spike to pass
```

### Rollback Procedure

**If code is the issue:**

```bash
# Same as Scenario 1
git revert HEAD --no-edit
git push origin main
# Wait 3-5 minutes and verify
```

**If external service issue (do NOT rollback):**

- Stripe down? → Nothing we can do, wait for recovery
- Resend down? → Switch to nodemailer or wait
- MongoDB down? → Escalate to DB team, check backup/restore

### Post-Rollback

1. **Monitor for 30 Minutes**
   - Check every 5 minutes: `curl https://kreno.ch/api/health`
   - Error rate should drop immediately
   - If not, escalate to database/infrastructure team

2. **Fix Root Cause**
   - Identify what the buggy code was doing
   - Fix locally and test thoroughly
   - Add test case
   - Redeploy with fix

---

## Scenario 3: Database Connection Lost

### Symptoms
- All API requests return "Cannot connect to database"
- Render logs show: "MongoError: connection refused" or "connection timeout"
- `/api/health` still responds (server is running)
- No user can complete any action

### Investigation (First 3 Minutes)

1. **Check MongoDB Atlas Status**
   - Visit https://cloud.mongodb.com
   - Click on your cluster
   - Is cluster status "Active" or "Paused"?
   - If paused → Resume cluster immediately
   - Check current connections (should be < max)

2. **Check Network Connectivity**
   - Is Render IP whitelisted in MongoDB Atlas?
   - Render IP: Check Render dashboard (often shown in logs)
   - MongoDB > Network Access > IP Whitelist
   - If missing → Add "0.0.0.0/0" temporarily, then add Render IP specifically

3. **Check MONGODB_URI**
   - Is it correct in Render environment variables?
   - Should match: `mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true`
   - Did we recently change credentials?

### Resolution (5-10 Minutes)

**Priority 1: Restore Database Connection (Don't Rollback)**

```bash
# Option 1: Resume MongoDB Cluster (if paused)
# In MongoDB Atlas: Clusters > [your cluster] > Resume

# Option 2: Check Connection String
# Render Dashboard > Environment Variables > MONGODB_URI
# Copy from MongoDB Atlas > Connect > Drivers > Connection String

# Option 3: Verify Whitelist
# MongoDB Atlas > Network Access > IP Whitelist
# Add Render's IP if not present
# Get Render IP from: Render Dashboard > Log > look for "Connecting from IP..."

# Option 4: Restart Service (clears connection pool)
# Render Dashboard > [salonpro] > Manual Deploy
# This redeploys current commit, refreshes all connections
```

**Priority 2: Scale if Needed**

```bash
# If connection limit exceeded:
# MongoDB Atlas > Clusters > [your cluster] > Edit Configuration
# Increase max connections (default 100, can go to 3000)
```

### Do NOT Rollback

Database connectivity issues are almost never caused by code changes in a single commit. Rollback will not help.

**Exception:** If we just deployed code that creates infinite connections or connection leak, then rollback:
```bash
git revert HEAD --no-edit
git push origin main
```

### Post-Recovery

1. **Monitor Connection Pool**
   - MongoDB Atlas > Metrics > Current Connections
   - Should stabilize at 20-50 concurrent connections
   - If growing continuously → Code has connection leak → Debug and fix

2. **Check for Data Integrity**
   - Spot-check some recent bookings
   - Verify customer data is intact
   - If any corruption found → Restore from backup

---

## Scenario 4: Data Corruption or Data Loss

### Symptoms
- Users report missing bookings or appointments
- Data appears changed when it shouldn't be
- Duplicate entries appearing in database
- Random data deletions

### Investigation (First 5 Minutes - DO NOT MODIFY DATA)

1. **Stop All Writes**
   - If possible, put service in read-only mode
   - This prevents further corruption

2. **Verify Issue**
   ```bash
   # Connect to MongoDB
   # Query recent data
   # Compare with known backup state
   ```

3. **Identify When Corruption Started**
   - Check MongoDB oplog (operation log)
   - Identify first corrupting operation
   - Identify what code/request caused it

### Recovery (15-30 Minutes)

**Option 1: Restore from Backup** (Preferred if minor issue)

```bash
# MongoDB Atlas > Backup & Restore > Snapshots
# Find snapshot BEFORE corruption happened
# Click "Restore" and select new cluster or overwrite
# (MongoDB will let you restore to same cluster during maintenance window)
```

**Estimated time:** 10-20 minutes depending on data size

**Option 2: Code Rollback** (If corruption caused by new code)

```bash
# If the corruption was caused by buggy code that modified data:
git revert HEAD --no-edit
git push origin main
# Then manually fix corrupted records
```

**Option 3: Manual Data Repair** (If corruption is minor)

```bash
# Connect to MongoDB
# Identify affected records
# Manually correct them
# Verify against backup
```

### Post-Recovery

1. **Verify Data Integrity**
   - Run spot checks on random records
   - Verify recent bookings are complete
   - Check all customer data

2. **Identify Root Cause**
   - Was it a code bug?
   - Was it a manual operation?
   - Was it a race condition?

3. **Implement Prevention**
   - Add validation logic to prevent this corruption
   - Add tests to catch this scenario
   - Consider read-only mode during sensitive operations

4. **Communicate**
   - Notify affected users if data loss
   - Offer compensation if bookings lost
   - Explain what happened and how we fixed it

---

## Scenario 5: Critical Security Issue

### Symptoms
- Unauthorized access detected
- SQL injection or XSS attack active
- Attacker has compromised user accounts
- Sensitive data exposed

### Immediate Response (First 1 Minute)

1. **Isolate the Issue**
   - Identify which endpoint/feature is compromised
   - Note the attack vector (SQL injection? XSS? Path traversal?)

2. **Temporary Mitigation**
   - If possible, disable the vulnerable endpoint
   - (Edit server.js to return 403 Forbidden on that route, push hotfix)

3. **Escalate**
   - Notify security team immediately
   - Notify product team of potential user impact
   - Begin damage assessment

### Rollback Decision (2-5 Minutes)

**Do rollback immediately if:**
- Attack vector was introduced in recent code
- Vulnerability is in a route we just modified
- Git history shows the vulnerable code is new

**Do not rollback if:**
- Vulnerability existed before (legacy issue)
- Attack is from external data (user input in database)
- Vulnerability is in a dependency (Stripe, Resend)

### Rollback Procedure

```bash
git revert HEAD --no-edit
git push origin main
# Wait for redeploy (2-5 min)
```

### Post-Recovery

1. **Security Audit**
   - Review the vulnerable code in detail
   - Understand the attack vector
   - Check for similar issues elsewhere in codebase

2. **Fix Properly**
   - Write secure code that cannot be exploited
   - Add input validation
   - Add output escaping
   - Add security tests

3. **Report & Notification**
   - File security incident report
   - Notify affected users if data was accessed
   - Document what was exposed and how long
   - Offer credit/compensation if necessary
   - Update security documentation

---

## Scenario 6: Payment Processing Failures

### Symptoms
- Stripe webhook not being received
- Customers charged but no booking created
- Bookings created but Stripe payment failed
- Subscription status out of sync

### Investigation (First 5 Minutes)

1. **Check Stripe Webhook Logs**
   - Visit https://dashboard.stripe.com/developers/webhooks
   - Find "kreno.ch/api/stripe/webhook" endpoint
   - Check recent webhook attempts
   - Look for failures or timeouts

2. **Check Our Webhook Handler**
   ```bash
   # Render logs for webhook messages
   # Search for "stripe" or "webhook"
   # Should see incoming webhook JSON and our response
   ```

3. **Check Webhook Secret**
   - Render Dashboard > Environment Variables > STRIPE_WEBHOOK_SECRET
   - Verify it matches what's in Stripe dashboard
   - If different → Update and restart

### Resolution (5-15 Minutes)

**Option 1: Fix Webhook Secret** (Most common issue)
```bash
# In Render Dashboard:
# Environment Variables > STRIPE_WEBHOOK_SECRET
# Copy from Stripe dashboard > Developers > Webhooks > [endpoint] > Signing secret
# Update value and restart service
```

**Option 2: Manually Retry Failed Webhooks**
```bash
# In Stripe Dashboard:
# Developers > Webhooks > [endpoint] > Recent Events
# Click on failed webhook
# Click "Retry" button
# Monitor our webhook logs to ensure it succeeds
```

**Option 3: Rollback** (Only if webhook handler code changed)
```bash
# If we recently modified webhook handling code:
git revert HEAD --no-edit
git push origin main
# Then manually retry failed webhooks in Stripe
```

### Post-Recovery

1. **Reconcile Payments**
   - Check for customers charged but no booking
   - Create missing bookings in database
   - Or issue refund and ask customer to rebook

2. **Verify Going Forward**
   - Check new webhook attempts are succeeding
   - Monitor for next hour
   - Verify SMS credits purchasing still works

---

## Scenario 7: Email Delivery Failures

### Symptoms
- Users report not receiving confirmation emails
- Users report not receiving booking reminders
- Resend API returns errors

### Investigation (First 3 Minutes)

1. **Check Resend API Status**
   - Visit https://status.resend.com/
   - Is Resend operational or experiencing an outage?

2. **Check Our Email Logs**
   ```bash
   # Render logs for "email" or "resend"
   # Look for error messages
   # Check RESEND_API_KEY and RESEND_FROM_EMAIL are set
   ```

3. **Test Email Sending**
   - Create a booking in pro portal
   - Check if confirmation email is received
   - Monitor Render logs

### Resolution (5-10 Minutes)

**If Resend is Down:**
- Email delivery will resume when Resend recovers
- No action needed, this is not our problem
- Customers will eventually get emails when Resend comes back

**If Our Configuration is Wrong:**
```bash
# Check Render Environment Variables:
# - RESEND_API_KEY: should start with "re_"
# - RESEND_FROM_EMAIL: should be no-reply@kreno.ch (or configured address)
# 
# If missing or wrong:
# 1. Update in Render Dashboard
# 2. Restart service
# 3. Test email sending again
```

**If Webhook Handler is Wrong:**
```bash
# If we recently modified email code:
git revert HEAD --no-edit
git push origin main
# Then test email sending
```

### Workaround (If Rollback Didn't Fix)

Since Resend provides an API, we can manually send critical emails:
```bash
# As a temporary measure:
# 1. Get list of failed emails from logs
# 2. Manually send via Resend API or fallback email provider
# 3. Document workaround in support tickets
# 4. Plan proper fix for next deployment
```

### Post-Recovery

1. **Resend Recent Failed Emails**
   - Get list of emails that failed
   - Manually send or use Resend dashboard

2. **Verify Going Forward**
   - Create test booking, verify email arrives
   - Monitor email logs for next hour

---

## Quick Reference: Rollback Checklist

### When to Rollback
- [ ] Server won't start (exit code error)
- [ ] All endpoints returning 500 errors
- [ ] Authentication completely broken (can't login)
- [ ] Database connection lost (but only if code issue)
- [ ] Security vulnerability just introduced
- [ ] Recent code change clearly broke a feature

### When NOT to Rollback
- [ ] Only one endpoint affected (fix instead of rollback)
- [ ] External service is down (Stripe, Resend, MongoDB)
- [ ] Database connectivity issue (not code)
- [ ] Rate limiting triggered (not code)
- [ ] Blame is unclear (investigate first)

### Rollback Steps (Quickest Path)

```bash
# Step 1: Verify you're on main branch
git status
# Should say "On branch main"

# Step 2: Create revert commit
git revert HEAD --no-edit

# Step 3: Push to trigger redeploy
git push origin main

# Step 4: Monitor deployment
# Render will auto-deploy in 1-2 minutes
# Check: https://render.com > [salonpro] > Logs

# Step 5: Verify service is up
curl -s https://kreno.ch/api/health | jq .
```

**Total time:** 5-7 minutes

---

## Escalation

### Who to Contact When

| Scenario | Contact | Channel | Time |
|----------|---------|---------|------|
| Server won't start | DevOps Lead | Slack #kreno-launch | Immediately |
| Database down | Database Lead | Slack #kreno-database | Immediately |
| Stripe issue | Product Lead | Slack #kreno-payments | ASAP |
| Security issue | Security Lead | Slack #kreno-security | IMMEDIATELY |
| Email failures | Backend Lead | Slack #kreno-backend | Within 30 min |
| Unknown error | Whole team | Slack #kreno-launch | Immediately |

---

## Testing the Rollback Plan

This plan should be tested before launch:

1. **Dry Run** (Week before launch)
   - Create a test commit that breaks the build
   - Push to staging environment
   - Practice rolling back
   - Verify rollback works

2. **Post-Launch** (Week 1)
   - If a real rollback is needed, use this playbook
   - Document what actually happened
   - Update playbook with lessons learned

---

## Document Version
**Version:** 1.0  
**Created:** April 16, 2026  
**Test Date:** N/A (pre-launch)  
**Last Updated:** April 16, 2026  
**Next Review:** June 1, 2026
