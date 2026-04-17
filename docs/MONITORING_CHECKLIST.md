# Monitoring Checklist

## Daily Monitoring (First Week Post-Launch)

During the first week, monitoring is intensive. Check multiple times per day to catch issues early.

### Morning Checklist (9:00 AM CET)

- [ ] **Check Render Logs**
  - Go to: https://dashboard.render.com → salonpro → Logs
  - Look for error messages, crashes, or warnings
  - Note any error patterns
  - Document findings in incident log

- [ ] **Run Health Check**
  ```bash
  curl https://kreno.ch/api/health
  ```
  - Expected: `{"status":"ok","uptime":XXXX,"memory":"XXXmb","requests":XXXX}`
  - If response is slow or error: Check Render logs immediately
  - Record response time

- [ ] **Check Uptime**
  - Review Render dashboard uptime meter
  - Should be 100% or note any downtime
  - Investigate any brief outages (>1 minute)

- [ ] **Review Support Email**
  - Check: support@kreno.ch inbox
  - Read all new issues from overnight
  - Document any bugs reported
  - Categorize by severity
  - Respond to urgent questions within 1 hour

- [ ] **Check API Metrics**
  - Endpoint: https://kreno.ch/api/metrics (if implemented)
  - Review: Request counts, error rates, average response time
  - Look for anomalies vs. previous day
  - Document any unusual patterns

- [ ] **Monitor Memory Usage**
  - Check Render dashboard → Metrics tab
  - Memory should be < 500MB
  - If trending upward: Note for investigation
  - If >700MB: Investigate for memory leak

- [ ] **Review User-Facing Issues**
  - Check reported bugs in support email
  - Verify any issues reported from yesterday
  - Prioritize fixes based on impact

### Afternoon Checklist (2:00 PM CET)

- [ ] **Quick Health Check**
  ```bash
  curl https://kreno.ch/api/health
  ```

- [ ] **Check Render Logs Again**
  - Look for any new errors since morning

- [ ] **Follow Up Support Emails**
  - Respond to users with status updates
  - Provide workarounds if needed

### Evening Checklist (5:00 PM CET / End of Day)

- [ ] **Final Health Check**
  ```bash
  curl https://kreno.ch/api/health
  ```

- [ ] **Review Full Day Log**
  - Export/review entire day's logs from Render
  - Document any issues that occurred
  - Note resolution times

- [ ] **Prepare Incident Summary**
  - If any issues: Document what happened and when
  - Prepare for team communication if needed

- [ ] **Check Tomorrow's Calendar**
  - Any planned maintenance?
  - Any expected traffic spikes?
  - Scheduled deployments?

---

## Daily Monitoring (After First Week)

Once system is stable (after 7 days), reduce to once-daily monitoring.

### Daily (9:00 AM CET)

- [ ] **Check Render Logs**
  - Look for error patterns
  - Review critical issues from overnight
  - Typical review time: 5-10 minutes

- [ ] **Health Check**
  ```bash
  curl https://kreno.ch/api/health
  ```

- [ ] **Review Support Queue**
  - Check support@kreno.ch
  - Categorize by priority
  - Escalate critical issues

- [ ] **Uptime Check**
  - Confirm no outages overnight
  - Document any issues

- [ ] **Memory Usage Check**
  - Verify still healthy
  - Look for gradual increases

---

## Weekly Monitoring

Every Monday or Friday, perform deeper analysis.

### Weekly Report (Friday 5:00 PM CET)

**Generate Uptime Report**
- [ ] Total uptime percentage for week
  - Target: 99.9% or higher
  - Document any downtime and duration
  - Note root causes
  - Typical weekly uptime: 100% or 99.5%+

**Error Pattern Review**
- [ ] Analyze all errors logged during week
  - Group similar errors
  - Identify trends
  - Document high-frequency errors
  - Plan fixes for next week

**Performance Trends**
- [ ] Average response time per endpoint
  - Booking endpoints should be <500ms
  - Admin endpoints <1s
  - Look for performance regressions
  - Compare to previous week

**User Feedback Summary**
- [ ] Review all support emails from week
  - Triage by issue type
  - Count bug reports vs. feature requests
  - Identify patterns (same issue reported multiple times?)
  - Create bug fix priority list

**Feature Usage Analysis**
- [ ] If metrics endpoint available:
  - Most used features?
  - Features with errors?
  - Unusual usage patterns?
  - User drop-off points?

**Deployment Review**
- [ ] Any deployments happened this week?
  - Were they stable?
  - Did they cause issues?
  - How was performance before/after?

**Plan Hotfixes**
- [ ] Based on issues found:
  - What needs fixing urgently?
  - What can wait for next sprint?
  - Assign to developers
  - Create tickets

---

## Monthly Monitoring

Once per month, perform comprehensive review and planning.

### Monthly Review (Last Friday of Month)

**Security Audit**
- [ ] Review access logs for suspicious activity
  - Unusual IP addresses?
  - Failed auth attempts?
  - Rate limit hits?
  - Document findings

- [ ] Check for security issues
  - Any vulnerabilities reported?
  - Are all API keys still secure?
  - Database password still secure?
  - SSL certificate expiring soon?

- [ ] Review for data access anomalies
  - Unusual query patterns?
  - Unexpected data exports?
  - Suspicious user account activity?

**Database Backup Verification**
- [ ] Confirm automated backups running
  - MongoDB Atlas backup status
  - Latest backup timestamp
  - Backup size reasonable?
  - Test restore procedure on staging

- [ ] Data Integrity Check
  - Random sample: Check data consistency
  - Verify no corrupted records
  - Count records by type, compare to expected

**Performance Deep Dive**
- [ ] Monthly performance analysis
  - Average response times per endpoint
  - Peak traffic times and load
  - Database query performance
  - Compare month-over-month if available

- [ ] Identify bottlenecks
  - Slowest endpoints
  - Most-called endpoints
  - Database operations needing optimization

**Usage Analytics**
- [ ] User activity trends
  - Total active salons
  - Total bookings processed
  - User growth rate
  - Feature adoption rates

- [ ] Business metrics (if available)
  - Revenue processed
  - SMS credits used
  - Average rating/satisfaction
  - Churn or issues causing feature disablement

**Infrastructure Review**
- [ ] Render.com service review
  - Is current instance size appropriate?
  - Consider upgrade if hitting limits
  - Review build/deploy performance
  - Check cost trends

- [ ] Third-party services
  - MongoDB: Storage usage, performance
  - Stripe: Payment processing volume, failure rates
  - Resend: Email delivery rates, bounces
  - Twilio: SMS success rates, per-salon usage
  - Cloudinary: Storage, bandwidth usage

**Planning for Next Month**
- [ ] Improvements to implement
  - Optimize slow endpoints?
  - Add monitoring/logging?
  - Infrastructure upgrades needed?
  - New features to prioritize?

- [ ] Risks to monitor
  - Security improvements needed?
  - Stability concerns?
  - Scaling needs?
  - Dependency updates available?

- [ ] Team capacity for month
  - How much time for monitoring?
  - How much time for feature dev?
  - Buffer for unexpected issues?

---

## Monitoring Dashboard (Optional Setup)

After first month, consider adding more visibility:

### Render Dashboard (Already Available)
- https://dashboard.render.com
- Check: Logs, Metrics, Events
- Set up email notifications for failures

### Custom Metrics Endpoint (Already Implemented)
- Endpoint: `GET /api/metrics`
- Returns: uptime, memory, request counts
- Could be expanded to include error rates, database metrics

### Monitoring Tool Options (Future, Month 2+)

**Sentry** (Recommended)
- npm install @sentry/node
- Error tracking and alerts
- Cost: ~$29/month
- Setup: Set `SENTRY_DSN` in Render env vars
- Benefits: Automatic error grouping, stack traces, user impact

**Datadog** (Comprehensive)
- Cost: $15-45/month for basic
- Includes: Logs, metrics, APM, alerts
- More enterprise-focused

**New Relic** (Full APM)
- Cost: Starts ~$100/month
- Includes: Performance monitoring, alerts, diagnostics
- Detailed performance data

**Simple Uptime Monitor** (Cheap)
- Services: UptimeRobot (free), StatusCake (~$10/month)
- Simple endpoint monitoring
- Email/SMS alerts when down
- Good starting point

---

## Monitoring Escalation Decision Tree

```
Issue Detected
    │
    ├─ Server returning 5xx errors?
    │  └─ YES → SEV-1: Check logs immediately, consider restart
    │
    ├─ API response time > 5 seconds?
    │  └─ YES → SEV-2: Check database, consider restart
    │
    ├─ Memory usage > 700MB?
    │  └─ YES → SEV-2: Check for memory leak, restart service
    │
    ├─ Database connection errors in logs?
    │  └─ YES → SEV-1: Check MongoDB Atlas, verify connection string
    │
    ├─ Multiple users reporting same bug?
    │  └─ YES (>5 reports) → SEV-2: Investigate, create hotfix
    │  └─ NO (1-2 reports) → SEV-3: Add to next sprint
    │
    ├─ Support email queue > 10 unresolved?
    │  └─ YES → Escalate to team lead
    │
    └─ Uptime dropped below 99%?
       └─ YES → Review incident, plan prevention
```

---

## Logging & Documentation

### Daily Log Template

Keep a simple daily log (Google Sheet or document):

```
DATE: 2026-04-17
UPTIME: 100% (no issues)
HEALTH CHECK: ✓ OK (response time: 45ms)
MEMORY: 380MB
ERRORS: None
SUPPORT TICKETS: 3 (all resolved <2 hours)
NOTES: Smooth day, no issues
NEXT DAY: Monitor as normal

---

DATE: 2026-04-18
UPTIME: 99.2% (18-minute outage 3:15 PM)
HEALTH CHECK: ✓ OK (response time: 52ms)
MEMORY: 425MB (trending up, monitor)
ERRORS: Database timeout x4, 404 on old endpoint x2
SUPPORT TICKETS: 7 (2 about outage, resolved)
INCIDENT: Brief MongoDB connection issue, resolved
NOTES: Investigate why memory trending up, check database queries
NEXT DAY: Focus on database performance, deploy hotfix
```

### Incident Log Template

For any incidents, create entry:

```
INCIDENT ID: INC-2026-04-18-001
DATE: 2026-04-18, 15:15 CET
SEVERITY: SEV-2
ISSUE: Database connection timeout
DURATION: 18 minutes
IMPACT: Bookings couldn't be created (read-only access)
DETECTED BY: Automated health check alert
ROOT CAUSE: MongoDB Atlas temporary unavailability
RESOLUTION: Waited 18 minutes for MongoDB to recover
ESCALATION: Notified team lead, no customer notification sent
FOLLOW-UP: Monitor MongoDB performance, set up alerts
LESSONS LEARNED: Need more granular error monitoring
```

---

## Monitoring Checklist Summary

**Print this and keep it visible:**

```
DAILY (Morning):
  ✓ Render logs
  ✓ Health check
  ✓ Uptime check
  ✓ Support email
  ✓ API metrics
  ✓ Memory usage

DAILY (After First Week):
  ✓ Logs (5 min)
  ✓ Health check
  ✓ Support queue
  ✓ Uptime

WEEKLY (Friday):
  ✓ Uptime report
  ✓ Error patterns
  ✓ Performance trends
  ✓ User feedback summary
  ✓ Feature usage
  ✓ Plan hotfixes

MONTHLY (Last Friday):
  ✓ Security audit
  ✓ Backup verification
  ✓ Performance deep dive
  ✓ Usage analytics
  ✓ Infrastructure review
  ✓ Planning for next month
```
