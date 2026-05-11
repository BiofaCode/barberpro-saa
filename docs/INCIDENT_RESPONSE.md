# Incident Response Plan - Kreno Alpha

## Issue: Server Down / 5xx Errors

**Detection:**
- Render.com alert
- /api/health returns error
- Users report app not working

**Response (first 5 min):**
1. Check Render dashboard logs
2. Look for: OOM, database connection error, uncaught exception
3. Restart service: Render dashboard → Service → Restart

**If restart fails:**
1. Check MongoDB Atlas connection
2. Verify environment variables (ADMIN_PASSWORD, JWT_SECRET)
3. Check file system usage (rm -rf uploads/*)
4. Last resort: Rollback to previous deploy

**Communication:**
- Post to status page if available
- Email: "We're investigating server issues"
- ETA to fix: 30 min (under-promise, over-deliver)

---

## Issue: High Latency (> 5s response time)

**Detection:**
- Users report slowness
- Render metrics show high memory
- Database query logs show slow queries

**Response:**
1. Check Render memory usage (should be < 500MB)
2. Check MongoDB connection (query efficiency)
3. Restart service (may help temporarily)
4. Scale up Render plan if persistent

---

## Issue: Booking Email Not Sent

**Detection:**
- Customer complains no confirmation
- Resend dashboard shows failures

**Response:**
1. Check RESEND_API_KEY in env vars
2. Check email templates in email.js
3. Verify recipient email is valid
4. Check spam folder (Gmail/Outlook)
5. If still failing: fall back to SMS or in-app notification

---

## Issue: Payment Failed

**Detection:**
- User complains charge declined
- Stripe webhook errors in logs

**Response:**
1. Check Stripe test key is valid
2. For test mode: use test card 4242 4242 4242 4242
3. Check webhook endpoint /api/stripe/webhook
4. Verify STRIPE_WEBHOOK_SECRET matches Stripe dashboard
5. Resend payment link to customer

---

## Critical: Data Loss / Ransomware

**Prevention:**
- MongoDB backups enabled (auto-daily)
- No admin access to production without reason
- Rate limiting prevents brute force

**Response (if compromised):**
1. Disable all auth endpoints (set maintenance mode)
2. Restore from latest backup (MongoDB Atlas restore)
3. Change all environment variables (JWT_SECRET, ADMIN_PASSWORD)
4. Full security audit
5. Notify users if data was exposed

---

## Support Channels

- **Email:** support@kreno.ch
- **Status Page:** status.kreno.ch (optional, set up later)
- **Slack:** #kreno-incidents (internal)

**Response Times:**
- Critical (server down): 15 min
- High (features broken): 1 hour
- Medium (UI bugs): 4 hours
- Low (enhancement requests): next week
