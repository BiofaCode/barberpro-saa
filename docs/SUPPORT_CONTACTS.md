# Support Contacts & Escalation Procedures

## User Support

### For End Users (Salon Owners, Managers, Customers)

**Primary Support Channel:**
- Email: `support@kreno.ch`
- Expected Response Time: Within 24 hours
- Hours of Operation: Monday - Friday, 9:00 AM - 5:00 PM CET
- Status Page: https://status.kreno.ch (setup optional, implement after month 2)

**What to Submit:**
- Booking issues
- Account problems
- Feature requests
- General questions
- Bug reports with screenshots

### For Software Issues with Reproduction Steps

Email should include:
1. User account/salon name
2. Device/browser used
3. Step-by-step reproduction steps
4. What you expected vs. what happened
5. Screenshots or videos if applicable

---

## Development Team Support

### Backend Issues
- **Email:** `backend@kreno.ch`
- **Owner:** Backend Lead
- **Handles:** API errors, database issues, server crashes, payment processing
- **Escalate to:** CTO if critical (SEV-1) or unresolved after 30 minutes

### Frontend Issues (Web)
- **Email:** `frontend@kreno.ch`
- **Owner:** Frontend Lead
- **Handles:** UI bugs, styling issues, JavaScript errors, performance
- **Escalate to:** CTO if critical (SEV-1) or blocking user workflows

### Mobile Issues (Flutter App)
- **Email:** `mobile@kreno.ch`
- **Owner:** Mobile Lead
- **Handles:** App crashes, feature bugs, iOS/Android-specific issues
- **Escalate to:** CTO if critical (SEV-1) or widespread (>10% of users)

### Infrastructure & Deployment
- **Email:** `devops@kreno.ch`
- **Owner:** DevOps/Deployment Engineer
- **Handles:** Render deployment, environment variables, server restarts, monitoring setup
- **Escalate to:** CTO immediately for outages

### Urgent/Critical Issues

**Slack Channel (if configured):**
- Channel: `#kreno-incidents`
- When to use: SEV-1 issues only (server down, security breach, data loss)
- Notify: Engineering team immediately for any critical issue
- Follow up: Always send email confirmation after Slack

---

## Escalation Matrix

### Level 1: On-Duty Support Engineer
**Role:** First response, triage, gather information

**Responsibilities:**
- Acknowledge issue within 15 minutes
- Classify severity level
- Gather detailed information
- Contact appropriate development team
- Implement immediate workarounds if available
- Update support ticket with findings

**Escalate to Level 2 if:**
- Issue classified as SEV-2 or higher
- Requires development team involvement
- User impact is significant (>50 users)
- Issue unresolved after 20 minutes

---

### Level 2: Development Team Lead
**Role:** Investigation, root cause analysis, fix development

**Responsibilities:**
- Investigate root cause
- Coordinate with relevant team (backend, frontend, mobile)
- Develop and test fix
- Deploy hotfix if needed
- Communicate status to support team
- Document resolution

**Escalate to Level 3 if:**
- SEV-1 issue (server down, security, data loss)
- Cannot identify root cause after 20 minutes
- Requires critical infrastructure decision
- User-facing impact continues >30 minutes
- Needs emergency rollback or restoration

---

### Level 3: CTO / Technical Lead
**Role:** Authority on critical decisions

**Responsibilities:**
- Make decisions on rollback vs. rollforward
- Approve emergency deployments
- Authorize database restore operations
- Handle critical security incidents
- Communicate with affected customers
- Post-incident review and prevention planning

**Escalate to Level 4 if:**
- Data loss or corruption suspected
- Major security incident with user data exposed
- Platform down for >1 hour
- Needs legal/compliance notification

---

### Level 4: CEO / Founder
**Role:** Executive decisions, customer communication, legal matters

**Responsibilities:**
- Approve crisis communications
- Handle legal/compliance notifications
- Major customer outreach
- Media/PR communication if needed
- Strategic decisions on remediation
- Post-incident stakeholder communication

---

## Contact Information Template

**Copy this template and keep it accessible:**

```
KRENO SUPPORT CONTACTS
======================

USERS (Salons/Customers):
  Email: support@kreno.ch
  Response: < 24 hours
  Hours: Mon-Fri, 9-17 CET

DEVELOPMENT TEAM:
  Backend:      backend@kreno.ch
  Frontend:     frontend@kreno.ch
  Mobile:       mobile@kreno.ch
  DevOps:       devops@kreno.ch

ESCALATION:
  Level 1 (Initial):    Support Engineer
  Level 2 (Investigation): Dev Team Lead
  Level 3 (Authority):   CTO
  Level 4 (Executive):   CEO

CRITICAL ISSUES:
  Slack: #kreno-incidents (if available)
  Or email CTO immediately with SEV-1 classification

STATUS PAGE:
  https://status.kreno.ch (optional, coming soon)
```

---

## Response Time SLA

| Severity | Initial Response | Update Frequency | Target Resolution |
|----------|-----------------|-----------------|-------------------|
| SEV-1    | < 5 minutes     | Every 5 min    | < 1 hour          |
| SEV-2    | < 15 minutes    | Every 15 min   | < 4 hours         |
| SEV-3    | < 1 hour        | Every 4 hours  | < 1 day           |
| SEV-4    | < 24 hours      | Daily          | < 1 week          |

---

## External Service Contacts

### Third-Party Providers

**MongoDB Atlas (Database)**
- Status Page: https://status.mongodb.com
- Support: https://www.mongodb.com/support
- Account: [Your MongoDB account email]
- Issue: Database connection, backup/restore, performance

**Render.com (Hosting)**
- Status Page: https://render-status.com
- Dashboard: https://dashboard.render.com
- Support: https://support.render.com
- Issue: Deployment, environment variables, server restart

**Stripe (Payments)**
- Status Page: https://status.stripe.com
- Dashboard: https://dashboard.stripe.com
- Support: https://support.stripe.com
- Issue: Payment processing, webhook failures, subscription issues

**Resend (Email)**
- Status Page: https://status.resend.com
- Dashboard: https://resend.com
- Support: https://resend.com/support
- Issue: Email delivery, template issues, bounce rates

**Twilio (SMS)**
- Status Page: https://status.twilio.com
- Dashboard: https://www.twilio.com/console
- Support: https://support.twilio.com
- Issue: SMS delivery, phone number issues, account limits

**Cloudinary (Images)**
- Status Page: https://status.cloudinary.com
- Dashboard: https://cloudinary.com/console
- Support: https://support.cloudinary.com
- Issue: Image upload/delivery, transformation failures

---

## Communication Templates

### Internal Alert - SEV-1 Issue

**Subject:** [SEV-1] Kreno Platform Alert - [Issue Type]

```
CRITICAL ISSUE DETECTED

Issue: [Describe what's down/broken]
Impact: [Who is affected, how many users]
Detected: [When issue was first detected]
Status: [Initial assessment/investigation status]

Response:
- [Action 1]
- [Action 2]
- [Action 3]

Next update: [Time in 5 minutes]
Contact: [Who to escalate to if needed]
```

### User Notification - SEV-2 Issue

**Subject:** Kreno Service Update - [Issue Type]

```
Dear [Salon Name],

We've identified an issue affecting [describe impact].

What's affected:
- [Affected feature]
- [Affected feature]

Workaround (if available):
- [Workaround instructions]

Our team is actively working on a fix. We'll have updates every [time interval].

We apologize for the inconvenience.

Best regards,
Kreno Support Team
support@kreno.ch
```

### Resolution Notification

**Subject:** [RESOLVED] Kreno Issue - [Issue Type]

```
Dear [User/Team],

We've successfully resolved the issue that affected [describe issue].

What we did:
- [Action taken]
- [Why it happened]

Prevention measures:
- [How we'll prevent this in the future]

If you experience any related issues, please contact us immediately.

Thank you for your patience.

Best regards,
Kreno Support Team
```

---

## Incident Log Template

Keep an incident log (spreadsheet or document) with:

| Date/Time | Severity | Issue | Duration | Root Cause | Resolution | Lessons Learned |
|-----------|----------|-------|----------|-----------|------------|-----------------|
| 2026-04-16 10:15 | SEV-2 | Email delivery down | 45 min | Resend API throttling | Increased rate limits | Monitor email queue daily |

---

## On-Call Rotation

**Note:** Implement after first week if needed.

For 24/7 support model:
- Assign primary on-call engineer per week
- Backup on-call engineer
- One hour response time during off-hours for SEV-1
- Escalate SEV-1 to CTO if on-call can't reach within 15 minutes

Primary on-call can be reached via:
- Slack emergency channel
- Phone call (number in company directory)
- Email with [URGENT] tag
