# Render.com Deployment Guide

## Overview

Kreno backend is deployed on Render.com. This guide covers environment setup, custom domain configuration, and deployment verification.

---

## 1. Environment Variables Setup

### Where to Set Them
1. Go to https://dashboard.render.com
2. Select the service: **salonpro** (or your chosen service name)
3. Navigate to **Settings → Environment**
4. Add or update each variable listed below

### Required Environment Variables

```
NODE_ENV=production
PORT=10000
```

### Database & Secrets
These variables must be generated/provided:

| Variable | Source | Notes |
|----------|--------|-------|
| `MONGODB_URI` | MongoDB Atlas | Full connection string with credentials |
| `JWT_SECRET` | Generate | Use `openssl rand -hex 32` to generate |
| `ADMIN_PASSWORD` | Generate | Use `openssl rand -base64 32` to generate |

### API Keys & External Services
These are pre-configured test keys (replace with production keys when ready):

```
RESEND_API_KEY=re_Jj8g9cbA_EpcvGNYNkNz3MCEEx1YxjGww
RESEND_FROM_EMAIL=noreply@kreno.ch

STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_STRIPE_TEST_ICI
STRIPE_PUBLIC_KEY=pk_test_51QX8JGFVmRiEGKmrB7hdvmdzwzezr9lDZ87gCt84m3upZYS04hq8WmhGsy4dJRy4uhKJFkWDvXdoyPTUxijEyN9T00K2euYz11
STRIPE_WEBHOOK_SECRET=<GENERATE_IN_STRIPE_DASHBOARD>
```

### Application URLs

```
BASE_URL=https://kreno.ch
```

### Optional: External Services
If using Cloudinary for image uploads:

```
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

If using Twilio for SMS (beyond prepaid credits):

```
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>
TWILIO_PHONE_NUMBER=<your-phone-number>
```

---

## 2. Generating Secrets

### JWT_SECRET
Generate a cryptographically secure random string:
```bash
openssl rand -hex 32
```
Example output: `3f7a9c2b1e8d4f6a9c7e2b5d8f1a3c6e9b2d4f7a9c1e3b5d7f9a1c3e5b7d9f`

### ADMIN_PASSWORD
Generate a strong base64-encoded secret:
```bash
openssl rand -base64 32
```
Example output: `aBc1De2FgH3iJk4Lm5No6Pq7Rs8Tu9Vw0Xy1Za2bC3dE4fG5hI6jK7lM8nO9p+Q==`

### STRIPE_WEBHOOK_SECRET
1. Go to Stripe Dashboard → Webhooks
2. Click **Add endpoint**
3. Set endpoint URL: `https://kreno.ch/api/stripe/webhook`
4. Select events: `payment_intent.succeeded`, `charge.refunded`
5. Copy the signing secret from the webhook details

---

## 3. Custom Domain Configuration

### Adding Custom Domains to Render

1. **Primary Domain** (`kreno.ch`):
   - Go to Service → Settings → Custom Domains
   - Click **Add Custom Domain**
   - Enter: `kreno.ch`
   - Render generates a target domain (e.g., `salonpro.onrender.com`)

2. **Admin Subdomain** (`admin.kreno.ch`):
   - Add another custom domain: `admin.kreno.ch`
   - Same target domain as above (both point to the same service)

3. **Pro Portal Subdomain** (`pro.kreno.ch`):
   - Add another custom domain: `pro.kreno.ch`
   - Same target domain as above

### DNS Configuration (at your domain registrar)

For each domain, add a **CNAME record**:

| Name | Type | Value | TTL |
|------|------|-------|-----|
| `kreno.ch` | CNAME | `salonpro.onrender.com` | 3600 |
| `admin.kreno.ch` | CNAME | `salonpro.onrender.com` | 3600 |
| `pro.kreno.ch` | CNAME | `salonpro.onrender.com` | 3600 |

(Replace `salonpro.onrender.com` with your actual Render service domain)

### SSL Certificate

Render automatically provisions and renews SSL certificates via Let's Encrypt. No manual action required.

**Note:** It may take 5-15 minutes for DNS propagation. Check status in Render dashboard under Custom Domains.

---

## 4. Health Check Configuration

Render automatically monitors your service using the endpoint specified in `render.yaml`:

```yaml
healthCheckPath: /api/health
```

### Health Check Details
- **Endpoint:** `GET /api/health`
- **Expected Response:** `{"status":"ok","ts":"2026-04-16T10:30:45Z"}`
- **Interval:** 30 seconds (default)
- **Timeout:** 30 seconds

If the health check fails 3 times in a row, Render will restart the service.

---

## 5. Deployment Process

### Automatic Deployment (via git push)

1. Ensure your code is on the `main` branch:
   ```bash
   git checkout main
   ```

2. Make your changes, commit, and push:
   ```bash
   git add .
   git commit -m "feature: your change"
   git push origin main
   ```

3. Render automatically detects the push and starts a new deployment.

4. **Deployment takes 2-3 minutes** (includes:
   - Building the Docker image
   - Installing dependencies
   - Running the health check)

### Manual Deployment (if needed)

1. Go to https://dashboard.render.com
2. Select service: **salonpro**
3. Click **Manual Deploy** → **Deploy latest commit**

### Monitoring Deployment Progress

1. Go to Service → **Deployments**
2. Click the active deployment to view live logs
3. Look for:
   - `npm install` output
   - `npm start` startup messages
   - `Server listening on port 10000` confirmation

---

## 6. Post-Deployment Verification

### Test 1: Health Check

```bash
curl https://kreno.ch/api/health
```

**Expected response:**
```json
{"status":"ok","ts":"2026-04-16T10:30:45Z"}
```

### Test 2: Admin Login Endpoint

```bash
curl -X POST https://kreno.ch/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_ADMIN_PASSWORD"}'
```

**Expected response:** JWT token in response body

### Test 3: Check Logs for Errors

1. Go to Service → **Logs**
2. Look for:
   - No 502/503 errors
   - Database connection successful
   - API routes initializing

---

## 7. Troubleshooting

### Service won't start (Health check failing)

**Common causes:**
- Missing or incorrect environment variables
- Database connection issue (MONGODB_URI invalid)
- Port 10000 not accessible

**How to fix:**
1. Check Render logs: Service → Logs
2. Verify all env vars in Settings → Environment
3. Test MongoDB connection string locally:
   ```bash
   mongosh "your-mongodb-uri"
   ```

### Custom domain shows "Not Found" (404)

**Common causes:**
- DNS not propagated yet (can take 15+ minutes)
- Custom domain not added in Render dashboard

**How to fix:**
1. Verify domain in Render: Settings → Custom Domains
2. Wait 15 minutes and try again
3. Clear browser cache
4. Test DNS propagation:
   ```bash
   nslookup kreno.ch
   ```

### Rate limiting or slow responses

- Check SMS/email sending volume in logs
- Verify database indexes are created (see `docs/DATABASE_SETUP.md`)
- Consider upgrading Render plan if consistently high traffic

### Memory or CPU spikes

- Review active sessions/workers
- Check for infinite loops in async operations
- Consider implementing request queuing for high-volume operations

---

## 8. Deployment Rollback

If you need to revert to a previous deployment:

1. Go to Service → **Deployments**
2. Click on a previous successful deployment
3. Click **Redeploy** at the bottom

This redeployment will use the same commit and environment variables.

---

## 9. Environment-Specific Notes

### Development
- Run locally with `.env` file (never commit sensitive keys)
- Use test Stripe/Resend keys

### Staging
- Deploy to separate Render service with staging domain
- Use same credentials as development for testing
- Useful for load testing before production

### Production
- Use production API keys for Stripe, Resend, etc.
- Enable database backups in MongoDB Atlas
- Set up monitoring alerts for errors/downtime
- Regularly review logs and metrics

---

## 10. Email Configuration Checklist

Before going live, email must be fully configured. See `docs/EMAIL_CONFIGURATION.md` for detailed setup:

- [ ] DNS SPF record added: `v=spf1 include:resend.com ~all`
- [ ] DNS DKIM records added (3 CNAME records from Resend dashboard)
- [ ] DNS DMARC record added: `v=DMARC1; p=quarantine; rua=mailto:noreply@kreno.ch`
- [ ] `RESEND_API_KEY` set in Render environment (from Resend dashboard)
- [ ] `RESEND_FROM_EMAIL` set to `noreply@kreno.ch`
- [ ] Test booking confirmation email sends without errors
- [ ] Test OTP email sends and code is correct format
- [ ] Verify emails do NOT go to spam (use mail-tester.com)
- [ ] Reminder emails send 24h before appointments
- [ ] All email templates use correct sender: `noreply@kreno.ch`
- [ ] No hardcoded test emails in production code
- [ ] Resend API status is UP (https://status.resend.com)

**Required Environment Variables:**
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@kreno.ch
```

---

## 11. Security Checklist

Before going live:

- [ ] `JWT_SECRET` is unique and stored securely in Render (not in code)
- [ ] `ADMIN_PASSWORD` is unique and shared only with authorized users
- [ ] `STRIPE_WEBHOOK_SECRET` is configured correctly
- [ ] All custom domains point to production service
- [ ] SSL certificates are active on all domains
- [ ] Database access is restricted to your app IP
- [ ] Sensitive logs are not exposed in public deployments
- [ ] Rate limiting is enabled for API endpoints
- [ ] Email/SMS templates don't expose sensitive data

---

## 12. Further Reading

- [Render.com Documentation](https://docs.render.com)
- [Node.js on Render](https://docs.render.com/deploy-node)
- [Custom Domains on Render](https://docs.render.com/custom-domains)
- [Environment Variables on Render](https://docs.render.com/environment-variables)

For questions about Kreno-specific configuration, see:
- `docs/EMAIL_CONFIGURATION.md` — Email setup, DNS records, troubleshooting
- `docs/EMAIL_TEMPLATES.md` — All email templates and variables
- `docs/SECURITY_VERIFICATION.md` — Security hardening details
- `docs/DATABASE_SETUP.md` — MongoDB setup and optimization
- `docs/MONITORING.md` — Application monitoring and logging
