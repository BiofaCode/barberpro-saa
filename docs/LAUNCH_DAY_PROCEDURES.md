# Launch Day Procedures - Kreno SaaS Platform

**Target Launch Date:** April 22, 2026  
**Time of Day:** 10:00 AM UTC (2:00 PM CEST)  

---

## Pre-Launch Phase (48-72 Hours Before)

### Final Verification (72 hours before)
1. **Code Review**
   - [ ] Verify all latest commits are merged to main
   - [ ] Confirm all tests still passing: `npm test`
   - [ ] Review git log for any unexpected changes
   - [ ] Verify no uncommitted work

2. **Environment Verification**
   - [ ] Confirm all production env vars are set in Render dashboard
   - [ ] Test that health endpoint is responding: `curl https://kreno.ch/api/health`
   - [ ] Verify DNS records point to Render (kreno.ch, pro.kreno.ch, admin.kreno.ch)
   - [ ] Test SSL certificate validity (should show secure in browser)

3. **Database Backup**
   - [ ] MongoDB Atlas: trigger manual backup
   - [ ] Verify backup completes successfully
   - [ ] Document backup ID in deployment notes
   - [ ] Test restore procedure (dry run on test database)

4. **Communication**
   - [ ] Notify all team members of launch schedule
   - [ ] Confirm on-call team is available during launch
   - [ ] Share launch day checklist with team
   - [ ] Prepare post-launch standup meeting schedule

### Final Testing (24 hours before)
1. **End-to-End Testing**
   - [ ] Complete booking flow on website
   - [ ] Login to pro portal and verify dashboard
   - [ ] Login to admin portal and check system
   - [ ] Test mobile app login and navigation
   - [ ] Verify email notifications are being sent
   - [ ] Check SMS functionality (if enabled)

2. **Load Testing (Optional)**
   - [ ] Verify server handles expected traffic
   - [ ] Monitor response times under load
   - [ ] Check database performance under load
   - [ ] Verify rate limiting still works

3. **Security Check**
   - [ ] Verify all security headers are present
   - [ ] Confirm CORS restrictions are in place
   - [ ] Check that no debug endpoints are exposed
   - [ ] Verify all authentication is working correctly

4. **Documentation**
   - [ ] Verify rollback plan is accessible to team
   - [ ] Review post-launch monitoring procedures
   - [ ] Ensure runbooks are clear and up-to-date
   - [ ] Confirm escalation contacts are listed

---

## Launch Day (T-Zero to T+4 Hours)

### T-1 Hour: Final Preparation

1. **Server Status Check**
   ```bash
   curl -s https://kreno.ch/api/health | jq .
   # Expected: {"status":"ok","ts":<timestamp>}
   ```
   - [ ] Health check responds
   - [ ] Response time < 500ms
   - [ ] No errors in logs

2. **Database Connectivity**
   - [ ] MongoDB connection test: check logs for "✅ Connected to MongoDB"
   - [ ] Run a simple query (e.g., count salons)
   - [ ] Verify indexes are present
   - [ ] Check database performance metrics

3. **Email System**
   - [ ] Send test email from pro portal
   - [ ] Verify email arrives within 2 minutes
   - [ ] Check that all template variables render correctly
   - [ ] Confirm sender email is correct (no-reply@kreno.ch or configured address)

4. **Payment System**
   - [ ] Verify Stripe API connectivity
   - [ ] Check webhook endpoint status
   - [ ] Review recent webhook logs for errors
   - [ ] Confirm test keys are removed (using live keys)

5. **Team Briefing**
   - [ ] Confirm all team members are online
   - [ ] Review escalation procedures
   - [ ] Assign roles:
     - Frontend lead: monitoring booking flow
     - Backend lead: monitoring server logs and API
     - Database lead: monitoring MongoDB
     - Support lead: monitoring support email and chat
     - Product lead: monitoring user analytics and feedback
   - [ ] Open shared monitoring dashboard
   - [ ] Start Slack/Discord channel for live updates

### T-0: Go-Live Signal

1. **Announcement**
   - [ ] Post status page update: "Kreno is now live!"
   - [ ] Send email to early adopters with login link
   - [ ] Post on social media (if configured)
   - [ ] Update website homepage (if needed)

2. **Start Monitoring**
   - [ ] Open Render dashboard (monitor logs, CPU, memory)
   - [ ] Open MongoDB Atlas dashboard (monitor connections, query performance)
   - [ ] Open Stripe dashboard (monitor transaction volume)
   - [ ] Open Resend dashboard (monitor email delivery)
   - [ ] Start health check script (every 5 minutes)

3. **Initial Traffic**
   - [ ] Watch for first user signups
   - [ ] Monitor for booking requests
   - [ ] Check email confirmations are being sent
   - [ ] Verify no immediate errors in logs

### T+0-30 Minutes: First Critical Window

**Monitor every 5 minutes:**
- [ ] Health endpoint responding: `curl -s https://kreno.ch/api/health`
- [ ] Response time < 1 second
- [ ] Error rate in logs (should be near 0%)
- [ ] CPU usage on Render (< 80%)
- [ ] Memory usage on Render (< 80%)
- [ ] Database connections (< max pool)
- [ ] Email delivery success rate (> 95%)

**Take action if:**
- Health endpoint times out → INVESTIGATE (database? CPU?)
- Error rate > 5% → CHECK LOGS immediately
- CPU usage > 90% → Prepare to scale up or rollback
- Database connections maxed → SCALE database or rollback
- Email failures > 10% → Check Resend API status or ROLLBACK

### T+30-60 Minutes: Stabilization Phase

1. **Continue Monitoring**
   - [ ] Check every 10 minutes instead of 5
   - [ ] Look for trends (is traffic steady? errors decreasing?)
   - [ ] Review error logs for patterns
   - [ ] Monitor booking completion rate

2. **First Users**
   - [ ] Watch support email for issues
   - [ ] Respond to any critical bugs immediately
   - [ ] Triage issues (critical, high, medium, low)
   - [ ] Document any bugs found

3. **Performance Baseline**
   - [ ] Record current response times
   - [ ] Record database query times
   - [ ] Record email delivery times
   - [ ] Note error rate baseline
   - [ ] Take screenshots of monitoring dashboards

### T+1-4 Hours: Sustained Monitoring

1. **Hourly Reviews**
   - [ ] Check logs for any error spikes
   - [ ] Review support tickets
   - [ ] Monitor traffic trends
   - [ ] Check resource usage trends
   - [ ] Verify backups are running

2. **Real User Monitoring**
   - [ ] Check analytics: how many signups?
   - [ ] Check analytics: how many bookings completed?
   - [ ] Collect user feedback from support channel
   - [ ] Note any UX issues reported
   - [ ] Track feature usage

3. **Team Debriefing**
   - [ ] Conduct quick sync call (30 min mark)
   - [ ] Share status: any issues? is everything stable?
   - [ ] Discuss any bugs found
   - [ ] Assign prioritization/fix owners
   - [ ] Plan next sync (1 hour mark)

4. **Documentation**
   - [ ] Capture any incidents in shared log
   - [ ] Document workarounds applied
   - [ ] Note feature gaps discovered
   - [ ] Track customer feedback

---

## First 24 Hours Post-Launch

### Hour 0-6: Intensive Monitoring

**Every hour:**
- [ ] Review error logs for new errors
- [ ] Check server resource usage
- [ ] Verify database performance
- [ ] Check email delivery metrics
- [ ] Review support tickets
- [ ] Monitor payment processing

**Thresholds to trigger action:**
- Error rate > 1% → Investigate and document
- Response time > 2 seconds → Check database or server load
- CPU usage > 85% → Prepare scaling or rollback
- Memory usage > 85% → Prepare scaling or rollback
- Email failures > 5% → Check Resend status or rollback

### Hour 6-24: Regular Monitoring

**Every 4 hours:**
- [ ] Comprehensive log review
- [ ] Performance trend analysis
- [ ] Support ticket summary
- [ ] Resource usage review
- [ ] Error rate analysis
- [ ] User feedback synthesis

**Do NOT go offline for 24 hours. Have team members in rotating shifts if needed.**

### End of Day Summary

1. **Incident Report**
   - [ ] Document all issues encountered
   - [ ] Document all workarounds applied
   - [ ] List all bugs found
   - [ ] Categorize by severity

2. **Success Metrics**
   - [ ] Total uptime: should be 99%+
   - [ ] Total errors: document count and types
   - [ ] Total successful bookings: record number
   - [ ] Total emails sent: record delivery rate
   - [ ] No database issues: confirm stability

3. **Go/No-Go for Extended Launch**
   - [ ] Decision: Can we continue to next phase (week 1)?
   - [ ] Decision: Do we need to rollback?
   - [ ] Decision: Are there critical hotfixes needed before continuing?

4. **Team Debrief**
   - [ ] Conduct full debrief meeting
   - [ ] Discuss what went well
   - [ ] Discuss what could improve
   - [ ] Assign hotfixes for critical issues
   - [ ] Plan for week 1

---

## First Week (Post-Launch Week 1)

### Daily Procedure (9 AM UTC)

1. **Morning Log Review**
   - [ ] Check overnight error logs
   - [ ] Review database performance
   - [ ] Review email delivery metrics
   - [ ] Check error rate trends
   - [ ] Review support tickets

2. **Standup Meeting**
   - [ ] Share overnight status
   - [ ] Discuss any issues
   - [ ] Assign priorities for day
   - [ ] Plan hotfixes if needed
   - [ ] Estimate impact on users

3. **Throughout Day**
   - [ ] Monitor logs continuously
   - [ ] Respond to support issues
   - [ ] Fix critical bugs same-day
   - [ ] Document all changes
   - [ ] Test all fixes on staging first

4. **Hotfix Deployment (if needed)**
   - [ ] Write fix locally
   - [ ] Run full test suite: `npm test`
   - [ ] Test on staging environment if available
   - [ ] Commit to main branch
   - [ ] Wait for Render auto-deploy (2-5 min)
   - [ ] Verify fix with health check
   - [ ] Monitor for 30 min after deployment

### Weekly Metrics Review

**By end of week 1, review:**
- [ ] Uptime: target 99.5%+
- [ ] Error rate: should be < 0.5%
- [ ] Response time: should be consistent, < 1s
- [ ] User feedback: summarize themes
- [ ] Critical bugs: are they addressed?
- [ ] Performance: is scaling needed?

---

## Rollback Procedures (During Launch)

### When to Rollback

Immediate rollback if:
- [ ] Server is completely down (not responding to health check for > 5 min)
- [ ] Database connection lost (can't write to database)
- [ ] Emails not being sent (> 50% failure rate)
- [ ] Authentication broken (users can't login)
- [ ] Data corruption suspected
- [ ] Security breach suspected

### How to Rollback (Immediate Action)

1. **Stop the Bleeding**
   - [ ] If needed, pause new deployments
   - [ ] Notify team immediately
   - [ ] Open incident channel in Slack/Discord

2. **Rollback Steps**
   ```bash
   # Option 1: Git Revert (preferred, creates new commit)
   git log --oneline -n 5  # See recent commits
   git revert HEAD  # Revert last commit
   git push origin main  # Trigger auto-deploy

   # Option 2: Manual Restart (if minor issue)
   # Go to Render dashboard > salonpro service > Manual Deploy
   # This redeploys current commit
   ```

3. **Verify Rollback**
   - [ ] Wait 2-5 minutes for Render to deploy
   - [ ] Check health endpoint: `curl https://kreno.ch/api/health`
   - [ ] Verify error logs clearing
   - [ ] Confirm service is responding
   - [ ] Test critical user flow (booking)

4. **Post-Rollback Analysis**
   - [ ] Identify root cause of failure
   - [ ] Document what went wrong
   - [ ] Plan fix for problematic code
   - [ ] Add test case to prevent regression
   - [ ] Re-deploy fix to main once verified

### Rollback Decision Tree

```
Is health endpoint responding?
├─ NO → Server is down
│  ├─ Check Render logs for startup error
│  ├─ If OOM: Restart service from Render dashboard
│  └─ If won't start: Git revert and redeploy
│
└─ YES → Server is running
   ├─ Is error rate > 10%?
   │  ├─ YES: Check logs for specific error
   │  │  ├─ If authentication broken: Revert (likely JWT_SECRET issue)
   │  │  ├─ If database issue: Check MongoDB, then revert if needed
   │  │  └─ If email issue: Check Resend, continue if API is up
   │  │
   │  └─ NO: Continue monitoring, don't rollback
   │
   └─ Are critical business functions working?
      ├─ User signup: YES/NO
      ├─ Booking creation: YES/NO
      ├─ Payment processing: YES/NO
      └─ Email delivery: YES/NO
         If any NO: Rollback immediately
```

---

## Post-Launch Support

### Support Email: support@kreno.ch
- [ ] Check every 30 minutes during first week
- [ ] Respond to critical issues within 1 hour
- [ ] Respond to non-critical within 4 hours
- [ ] Document all issues in shared spreadsheet

### Support Channels
- [ ] Email: support@kreno.ch
- [ ] Internal Slack: #kreno-support or #kreno-launch
- [ ] Known issues: document in shared spreadsheet
- [ ] FAQ: prepare FAQ document by end of week 1

### Escalation
- [ ] Critical bug: notify product lead immediately
- [ ] Security issue: notify security lead immediately
- [ ] Database issue: notify database lead immediately
- [ ] Deployment needed: notify DevOps lead

---

## Success Criteria for Launch

Launch is considered **successful** if:
- [ ] Zero unplanned downtime in first 24 hours
- [ ] Zero critical bugs with workarounds in place
- [ ] No data loss or corruption
- [ ] No security incidents
- [ ] Users can complete end-to-end booking flow
- [ ] Emails are delivered to users
- [ ] Payments are processing
- [ ] Mobile app can connect and authenticate
- [ ] Performance is acceptable (< 1s response time)

Launch is considered **problematic** but **acceptable** if:
- [ ] < 1 hour total downtime
- [ ] < 5 critical bugs requiring hotfixes
- [ ] Minor performance issues that are being addressed
- [ ] No data loss or security incidents

Launch is considered **failed** if:
- [ ] > 1 hour unplanned downtime
- [ ] Critical business functions broken
- [ ] Data loss or corruption
- [ ] Security breach
- [ ] Users cannot complete bookings

---

## Document Version
**Version:** 1.0  
**Created:** April 16, 2026  
**Target Launch:** April 22, 2026  
**Next Review:** April 20, 2026
