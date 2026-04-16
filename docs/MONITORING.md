# Performance Monitoring Setup - Kreno

This document describes the monitoring infrastructure for the Kreno SaaS platform.

## Overview

Kreno includes built-in server-side monitoring with request logging and metrics collection. The platform is hosted on Render.com, which provides additional monitoring capabilities.

## Server-Side Monitoring

### Request Logging

The Node.js server logs all requests in production with the following format:

```
[ISO_TIMESTAMP] METHOD PATH - STATUS_CODE (DURATIONms)
```

**Example:**
```
[2026-04-16T10:30:45.123Z] POST /api/bookings - 201 (234ms)
[2026-04-16T10:30:46.456Z] GET /api/salon/example-salon/bookings - 200 (45ms)
```

**Configuration:**
- Logging only runs in production (NODE_ENV === 'production')
- In development, logging is disabled to reduce console noise
- Logs are sent to stdout and captured by the hosting platform

**File:** `server.js` (lines 52-70)

### Metrics Endpoint

The `/api/metrics` endpoint returns real-time server performance metrics.

**Endpoint:** `GET /api/metrics`

**Response Format:**
```json
{
  "uptime": 86400,
  "memory": {
    "rss": 52428800,
    "heapTotal": 31457280,
    "heapUsed": 15728640,
    "external": 1048576
  },
  "timestamp": "2026-04-16T10:30:45.123Z",
  "environment": "production",
  "requests": {
    "total": 12345,
    "byStatus": {
      "200": 10234,
      "201": 1890,
      "400": 120,
      "404": 80,
      "500": 21
    },
    "avgDuration": 142
  }
}
```

**Metrics Explained:**
- `uptime` - Server uptime in seconds (since process start)
- `memory` - Node.js process memory usage (see Node.js docs for breakdown)
  - `rss` - Resident set size (physical memory allocated)
  - `heapTotal` - Total heap memory available to JS
  - `heapUsed` - Actual heap memory in use
  - `external` - Memory used by native objects
- `timestamp` - ISO 8601 timestamp of the metrics snapshot
- `environment` - Current deployment environment (production/development)
- `requests` - Request statistics since server start
  - `total` - Total requests processed
  - `byStatus` - Count of requests by HTTP status code
  - `avgDuration` - Average request duration in milliseconds

**Usage:**
```bash
curl https://kreno.ch/api/metrics
```

**File:** `server.js` (lines 425-438)

## Render.com Dashboard

Kreno is hosted on Render.com. The platform provides built-in monitoring at no additional cost.

### Accessing the Dashboard

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Sign in with your account
3. Select the Kreno service from the list

### Key Dashboard Sections

#### Logs

**Location:** Service page → "Logs" tab

- Real-time access to all server output
- Can search and filter by timestamp
- Shows both app logs (request logs) and system events
- Production logs show request timing and status codes

**View request logs:**
```
[2026-04-16T10:30:45.123Z] POST /api/bookings - 201 (234ms)
```

#### Metrics

**Location:** Service page → "Metrics" tab

- CPU usage over time
- Memory usage over time
- Network I/O
- Request count
- Error rates (5xx responses)

**Key thresholds to watch:**
- CPU > 80% - Service may be under heavy load
- Memory > 90% - Risk of OOM (out of memory) errors
- Error rate > 1% - Check recent logs for issues

#### Notifications and Alerts

**Location:** Account Settings → "Notifications"

**Set up email alerts for:**

1. **Service Down** (auto-configured)
   - Receives alert if health check fails (GET /api/health)
   - Alert sent to team email

2. **Custom Alerts** (optional)
   - Set CPU threshold (e.g., > 80% for 5 minutes)
   - Set memory threshold (e.g., > 85% for 5 minutes)
   - Set error rate threshold (e.g., > 5% 5xx responses)

### Health Check Endpoint

Render.com automatically checks the `/api/health` endpoint:

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "ts": 1713268245123
}
```

- Health check runs every 30 seconds
- If endpoint doesn't respond with 2xx status, service is marked as unhealthy
- Render.com will automatically restart the service if unhealthy

## Performance Monitoring Workflow

### Daily Monitoring

1. **Check Render Dashboard:**
   - Visit [https://dashboard.render.com](https://dashboard.render.com)
   - Review metrics for the past 24 hours
   - Look for CPU/memory spikes or unusual patterns

2. **Check Error Rates:**
   - In Metrics tab, look for 5xx errors
   - If error rate > 1%, check the Logs tab for recent errors

3. **Review Request Logs:**
   - Check Logs tab for slow requests (> 1000ms)
   - Look for recurring errors or patterns

### When Issues Occur

**High CPU Usage:**
1. Check Logs for heavy requests (queries, file uploads)
2. Look for specific route causing the load
3. Consider adding database indexes or optimizing slow queries

**High Memory Usage:**
1. Check for memory leaks (memory keeps growing over time)
2. Review recent code changes
3. Check for requests with large payloads
4. Consider increasing Render.com RAM allocation

**High Error Rate:**
1. Check Logs for error messages
2. Look for specific errors (database connection, email service, etc.)
3. Check environment variables are set correctly
4. Review recent deployments

**Slow Requests:**
1. Check which routes are slow in Logs
2. Typical slow routes: file uploads, database queries, email sends
3. Consider adding caching or rate limiting

## Monitoring Checklist

Use this checklist for production monitoring:

- [ ] Uptime status is green (no "service down" alerts)
- [ ] CPU average < 60% over past 24 hours
- [ ] Memory average < 70% over past 24 hours
- [ ] Error rate (5xx) < 0.5%
- [ ] P95 response time < 500ms (if visible in dashboard)
- [ ] No recurring error patterns in logs
- [ ] Database connection pool is healthy
- [ ] Email service is delivering (check Resend dashboard)
- [ ] SMS service is functioning (check Twilio console)

## Future Enhancements

### Sentry Integration (Optional)

For enhanced error tracking, Sentry can be integrated:

```bash
npm install @sentry/node
```

Then in `server.js`:
```javascript
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

Benefits:
- Automatic error grouping
- Stack traces and context
- Trend analysis
- Source map support

### DataDog/New Relic (Optional)

For more advanced monitoring (APM, distributed tracing, etc.), services like DataDog or New Relic can be integrated. However, for alpha launch, Render.com's built-in monitoring is sufficient.

## Related Documentation

- [Database Setup](./DATABASE_SETUP.md) - Database configuration and backup procedures
- [Security Verification](./SECURITY_VERIFICATION.md) - Security implementation details
- [Render.com Deployment](../render.yaml) - Infrastructure as code configuration

## Support

For Render.com support:
- [Render Documentation](https://render.com/docs)
- [Render Support](https://support.render.com)

For Node.js/server issues:
- Check `server.js` error handling in relevant route
- Review environment variables in `.env`
- Check logs for specific error messages
