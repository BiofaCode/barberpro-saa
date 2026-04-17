# Incident Response Plan

## Overview

This document defines the incident response procedures for Kreno, our multi-tenant SaaS platform for barber salon management. Response times and escalation procedures vary by severity level.

## Severity Levels

### SEV-1: Critical Issues (< 5 minute response)

Issues that make the platform completely unusable or expose user data.

#### 1. Server Down / 5xx Errors

**Impact:** Platform unavailable for all users

**Response Procedure:**
1. Immediately check [Render dashboard](https://dashboard.render.com) → Logs tab
2. Look for error messages or deployment failures
3. Verify MongoDB connection string and Atlas status
4. Check if service is crashing or in crashed state
5. If unhealthy: Trigger restart from Render dashboard
6. Wait 2-3 minutes for service to recover
7. Test health endpoint: `curl https://kreno.ch/api/health`
8. If still failing after 5 minutes, escalate to CTO immediately

**Escalation:** CTO / Technical Lead after 5 minutes

#### 2. Database Connection Lost

**Impact:** No data operations possible, booking/staff management broken

**Response Procedure:**
1. Check [MongoDB Atlas status page](https://status.mongodb.com)
2. Verify MONGODB_URI environment variable in Render settings
3. Test connection: Run `node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('OK')).catch(e => console.error(e))"`
4. Check MongoDB Atlas firewall rules - verify Render IP is whitelisted
5. If IP issues: Add Render IP to Atlas whitelist (0.0.0.0/0 for testing only)
6. Attempt service restart if connection string is correct
7. If issue persists: Check database backup and prepare for restore
8. Notify affected salons of outage immediately

**Escalation:** CTO after 5 minutes, CEO if restore needed

#### 3. Security Incident (Unauthorized Access)

**Impact:** User data potentially exposed or accounts compromised

**Response Procedure:**
1. **Immediately** disable affected accounts/API keys in MongoDB
2. Rotate all sensitive API keys:
   - Generate new `JWT_SECRET`
   - Generate new Stripe API keys
   - Generate new RESEND/Twilio API keys
3. Review recent access logs in Render dashboard:
   - Check for suspicious IP addresses
   - Look for unauthorized API calls
   - Document any data access patterns
4. Determine scope of exposure:
   - Which user accounts/data were accessed?
   - Were passwords/payment info compromised?
5. If user data exposed:
   - Notify affected users immediately via email
   - Document in security log
   - Contact legal/security team
   - Prepare public incident statement
6. Deploy updated keys to production immediately
7. Monitor logs intensively for 24 hours

**Escalation:** CTO immediately, CEO within 1 hour, Legal if data exposed

**Post-Incident:**
- Full security audit of affected areas
- Review access logs for 30 days prior
- Implementation of additional monitoring
- Post-mortem meeting with team

---

### SEV-2: High Priority Issues (< 1 hour response)

Issues that severely degrade functionality but don't make platform completely unusable.

#### Examples:
- **Payment Processing Failures** - Salons cannot purchase SMS credits or manage subscriptions
- **Email Delivery Failures** - Confirmation/reminder emails not sending (>100 users affected)
- **Authentication Broken** - Users cannot log in (>500 users affected) but API partially works
- **Data Loss** - Records deleted or corrupted
- **Performance Degradation** - Response times exceed 5 seconds for critical endpoints

**Response Procedure:**
1. Assess scope: How many users affected? How long since issue started?
2. Check recent logs and deployments - did something change?
3. Identify root cause (database, API, configuration, external service)
4. If recent deployment caused it: Consider rollback
5. Implement fix and deploy within 30-45 minutes
6. Verify fix works with manual testing
7. Monitor closely for 24 hours for regression
8. Document issue and resolution in incident log

**Escalation:** Development team lead after 30 minutes, CTO if not resolved after 1 hour

---

### SEV-3: Medium Priority Issues (< 4 hours)

Issues that impact some user workflows but have workarounds.

#### Examples:
- **UI bugs preventing booking** - Specific edge case or browser
- **Search/filtering broken** - Users cannot find bookings by date/time
- **Non-critical features down** - Staff notes, scheduling rules, SMS templates
- **Performance slow** - Response times 2-5 seconds, but functional
- **Report generation errors** - Analytics/export features not working

**Response Procedure:**
1. Confirm issue is reproducible
2. Identify affected users/salons
3. Document workaround if available (communicate to support team)
4. Plan fix for next deployment or current sprint
5. Update support contacts with workaround instructions
6. Schedule fix review with team

**Escalation:** Development team lead within 2 hours if affecting >50 users or critical workflow

---

### SEV-4: Low Priority Issues (< 1 day)

Issues that don't significantly impact user experience.

#### Examples:
- **UI layout issues** - Spacing, alignment, minor visual glitches
- **Enhancement requests** - User-requested features
- **Documentation requests** - Help text, API docs
- **Low-impact bugs** - Features that rarely used or non-critical paths

**Response Procedure:**
1. Log issue in tracking system
2. Prioritize with next sprint planning
3. Schedule for regular deployment cycle
4. No urgent action needed

**Escalation:** None, standard development process

---

## Escalation Path

1. **Level 1 (Initial Response):** On-duty support engineer
   - Gather information
   - Assess severity
   - Implement immediate mitigations if available

2. **Level 2 (Investigation):** Development team lead
   - Investigate root cause
   - Coordinate fix
   - Communicate with users

3. **Level 3 (Authority):** CTO / Technical Lead
   - Make critical decisions (rollback, restore)
   - Authorize emergency changes
   - Handle technical escalations

4. **Level 4 (Executive):** CEO
   - Critical issues only
   - Data loss/corruption
   - Major security incidents
   - Public incident communications

---

## Communication During Incidents

### To Users (Salons/Customers)
- Email affected salons immediately if outage > 15 minutes
- Post status update on status page if available
- Include: What's down, ETA for fix, workaround if any
- Follow up email when resolved

### To Team
- Slack #kreno-incidents if channel exists
- Email engineering team for critical issues
- Mention on daily standup if ongoing

### Post-Incident
- Email summary to all users affected
- Document lessons learned
- Plan preventive measures
- Schedule post-mortem if SEV-1

---

## Runbooks

### Health Check Procedure

```bash
# 1. Check service status
curl https://kreno.ch/api/health

# Response should be:
# {"status":"ok","uptime":12345,"memory":"250MB","requests":1000}

# 2. Check logs
# Visit: https://dashboard.render.com → salonpro → Logs

# 3. Test core functionality
curl -X POST https://kreno.ch/api/test \
  -H "Content-Type: application/json" \
  -d '{"test":"ping"}'
```

### Database Failover Checklist

1. Confirm MongoDB Atlas status
2. Check connection string in Render env vars
3. Test local connection with node script
4. Review backup status in MongoDB Atlas
5. If restore needed: Contact CTO immediately
6. Restore from most recent backup
7. Verify data integrity
8. Resume operations

### Quick Restart Procedure

1. Go to https://dashboard.render.com
2. Select "salonpro" service
3. Click three dots → "Restart Service"
4. Wait for status to show "Running"
5. Run health check: `curl https://kreno.ch/api/health`
6. If still failing, check logs

---

## Prevention

To minimize incidents:

- **Code Review:** All changes reviewed before merge
- **Testing:** Run full test suite before deployment
- **Staging:** Test in staging environment first
- **Monitoring:** Check logs daily, especially first week
- **Backups:** Daily automated database backups
- **Updates:** Keep dependencies updated monthly
- **Documentation:** This incident response plan
