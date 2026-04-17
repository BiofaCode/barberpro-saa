# Quick Deploy Reference

Fast reference for deploying Kreno to Render.com.

---

## Pre-Deployment Checklist

### 1. Code Merge
```bash
git checkout main
git merge feature/production-launch
git push origin main
```

### 2. Generate Secrets
Store these safely (password manager/vault):

**JWT_SECRET:**
```bash
openssl rand -hex 32
```

**ADMIN_PASSWORD:**
```bash
openssl rand -base64 32
```

---

## Set Environment Variables in Render Dashboard

1. Go to: https://dashboard.render.com
2. Select service: **salonpro**
3. Navigate to: **Settings → Environment**
4. Add all variables below (or see `docs/RENDER_DEPLOYMENT.md` for details)

### Minimal Required Variables
```
NODE_ENV=production
PORT=10000
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<generated-secret>
ADMIN_PASSWORD=<generated-secret>
RESEND_API_KEY=re_Jj8g9cbA_EpcvGNYNkNz3MCEEx1YxjGww
RESEND_FROM_EMAIL=noreply@kreno.ch
STRIPE_SECRET_KEY=sk_test_51QX8JGFVmRiEGKmr4VlthnPOlUC2sWpjZ7jZYNdYTsIXGM6r6ATRP46vdwXcUmxQ5Zw2TQvBgIBeCg140DMdPzra00HU7aj88D
STRIPE_PUBLIC_KEY=pk_test_51QX8JGFVmRiEGKmrB7hdvmdzwzezr9lDZ87gCt84m3upZYS04hq8WmhGsy4dJRy4uhKJFkWDvXdoyPTUxijEyN9T00K2euYz11
STRIPE_WEBHOOK_SECRET=<get-from-stripe-dashboard>
BASE_URL=https://kreno.ch
```

---

## Custom Domains Setup

### Add Domains in Render
Settings → Custom Domains:
- `kreno.ch`
- `admin.kreno.ch`
- `pro.kreno.ch`

Copy the target domain (e.g., `salonpro.onrender.com`)

### Add CNAME Records at Domain Registrar
For each domain:
```
Name: kreno.ch
Type: CNAME
Value: salonpro.onrender.com
TTL: 3600
```

Repeat for `admin.kreno.ch` and `pro.kreno.ch`

---

## Deploy

### Automatic (recommended)
```bash
git push origin main
```
Render deploys automatically (2-3 minutes)

### Manual
1. Go to: https://dashboard.render.com/services/salonpro
2. Click: **Manual Deploy** → **Deploy latest commit**

---

## Monitor Deployment

1. Dashboard: https://dashboard.render.com/services/salonpro
2. View live logs: Service → **Logs**
3. Watch for: `Server listening on port 10000`

---

## Verify Deployment

### Test 1: Health Check
```bash
curl https://kreno.ch/api/health
```
Expected: `{"status":"ok","ts":"..."}`

### Test 2: Admin Login
```bash
curl -X POST https://kreno.ch/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_ADMIN_PASSWORD"}'
```
Expected: JWT token in response

### Test 3: Check Logs
https://dashboard.render.com/services/salonpro → Logs

Look for errors, check database connection

---

## Rollback (if needed)

1. Go to: Service → **Deployments**
2. Click previous successful deployment
3. Click **Redeploy**

---

## Common Issues

| Problem | Solution |
|---------|----------|
| Health check failing | Check env vars, verify MONGODB_URI |
| 502 Bad Gateway | View logs, restart service |
| DNS not resolving | Wait 15 min, check CNAME records |
| Slow responses | Check database load, review logs |

---

## Detailed Documentation

See `docs/RENDER_DEPLOYMENT.md` for:
- Full environment variable reference
- Custom domain configuration details
- Troubleshooting guide
- Security checklist
- Rollback procedures

---

## Quick Links

- Render Dashboard: https://dashboard.render.com
- Service: https://dashboard.render.com/services/salonpro
- Logs: https://dashboard.render.com/services/salonpro (Logs tab)
- Production API: https://kreno.ch/api/health
- Stripe: https://dashboard.stripe.com
- Resend: https://resend.com/emails

---

## Git Commands Reference

```bash
# Check status
git status

# Switch to main
git checkout main

# Merge feature branch
git merge feature/production-launch

# Push to main (triggers deployment)
git push origin main

# Check git log
git log --oneline -5
```

---

## Database

For MongoDB setup and optimization, see: `docs/DATABASE_SETUP.md`

For monitoring and logging, see: `docs/MONITORING.md`

For security verification, see: `docs/SECURITY_VERIFICATION.md`
