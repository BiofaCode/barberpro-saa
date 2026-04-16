# MongoDB Database Configuration & Backup Strategy

## Overview

Kreno uses **MongoDB Atlas** as its production database. This document provides setup instructions, backup procedures, restoration processes, and security best practices for managing the Kreno database.

- **Database Name:** `salonpro` / `salonpro_prod`
- **Provider:** MongoDB Atlas (cloud-hosted)
- **Cluster:** salonpro.kpketkg.mongodb.net
- **Environment:** Production

---

## Connection Configuration

### Connection String Format

The MongoDB URI follows this pattern:

```
mongodb+srv://USERNAME:PASSWORD@CLUSTER_NAME/DATABASE_NAME
```

**Example (sanitized):**
```
mongodb+srv://info_db_user:****@salonpro.kpketkg.mongodb.net/salonpro_prod
```

### Connection Parameters

The application connects with these recommended settings:

```javascript
const client = new MongoClient(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,  // 10s timeout for server selection
  connectTimeoutMS: 10000,          // 10s timeout for initial connection
});
```

### Setting the Connection String

The `MONGODB_URI` environment variable is required for the application to start:

**Development (.env):**
```bash
MONGODB_URI=mongodb+srv://info_db_user:PASSWORD@salonpro.kpketkg.mongodb.net/salonpro_prod
```

**Production (Render Dashboard):**
1. Go to Render.com Dashboard → Environment
2. Set `MONGODB_URI` with the production credentials
3. Never commit credentials to version control
4. Restart the service for changes to take effect

### Connection Verification

To verify the connection works:

```bash
# Start the server with ADMIN_PASSWORD set
ADMIN_PASSWORD=test npm start

# In another terminal, check the health endpoint
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "ts": 1776372780911
}
```

---

## Database Schema & Collections

Kreno uses the following MongoDB collections:

### Core Collections

| Collection | Purpose | Key Indexes |
|-----------|---------|------------|
| `salons` | Salon/business profiles | `slug` (unique), `referral.code` |
| `owners` | Salon owner accounts | `email`, `salon` |
| `employees` | Staff members | `email`, `salon` |
| `clients` | Customer profiles | `salon` |
| `bookings` | Appointments | `salon`, `date` |
| `blocks` | Availability blocks | `salon` |
| `subscriptions` | Salon subscription records | `salon` |

### Automatic Index Creation

On first connection, the application creates these indexes for performance:

```javascript
// Owners
db.collection('owners').createIndex({ email: 1 });
db.collection('owners').createIndex({ salon: 1 });

// Employees
db.collection('employees').createIndex({ email: 1 });
db.collection('employees').createIndex({ salon: 1 });

// Salons (unique slug)
db.collection('salons').createIndex({ slug: 1 }, { unique: true });
db.collection('salons').createIndex({ 'referral.code': 1 }, { sparse: true });

// Clients
db.collection('clients').createIndex({ salon: 1 });

// Bookings (for date range queries)
db.collection('bookings').createIndex({ salon: 1, date: -1 });
```

---

## Backup Strategy

### MongoDB Atlas Automatic Backups

MongoDB Atlas provides **automatic daily backups** at no additional cost:

**Backup Schedule:**
- **Frequency:** Daily snapshots
- **Retention Period:** 7 days (default)
- **Backup Window:** Automatically determined by Atlas (typically off-peak hours)
- **Backup Format:** Sharded snapshots (full database consistency guaranteed)

**Features:**
- Automatic scheduling (no manual intervention required)
- Compressed storage (minimal storage overhead)
- Stored in AWS S3 (same region as cluster)
- Can be restored to any point within the 7-day window

### Enabling/Verifying Backups in MongoDB Atlas

1. **Log in to MongoDB Atlas:** https://cloud.mongodb.com
2. **Select Organization/Project:** Choose "Kreno"
3. **Navigate to Cluster:** Select "salonpro"
4. **Go to Backup Tab:**
   - Click "Backup" in the left sidebar
   - Verify "Continuous Backup" is enabled
   - Check retention policy (default: 7 days)
5. **View Backup History:**
   - List of recent snapshots with timestamps
   - Download option for each backup

### Backup Retention Policy

| Tier | Retention | Frequency |
|------|-----------|-----------|
| Free | 7 days | Daily |
| Pro | 30 days | Daily + hourly |
| Premium | 90+ days | Custom |

**Current Configuration:** Free tier (7-day retention, daily snapshots)

### Best Practices for Backups

1. **Manual Backups Before Major Changes**
   - Before data migrations
   - Before schema changes
   - Before security patches
   - Keep notes about what changed and why

2. **Backup Verification**
   - Periodically test restoration in staging environment
   - Document any discrepancies
   - Verify backup completeness

3. **Backup Documentation**
   - Log backup schedule and retention policy
   - Track any custom backup points
   - Document restoration procedures

---

## Data Restoration Procedures

### Scenario 1: Restore from Recent Snapshot (within 7 days)

**Steps:**

1. **Identify the target backup:**
   ```
   - Go to MongoDB Atlas → Backup
   - Find the desired snapshot timestamp
   - Note the exact date/time
   ```

2. **Create a restore job:**
   ```
   - Click on the snapshot
   - Select "Restore" button
   - Choose destination: "Create New Cluster" or "Restore to Cluster"
   ```

3. **Select restore target:**
   - **Option A:** Restore to same cluster (overwrites current data)
   - **Option B:** Restore to new cluster (safe testing option)
   - **Recommended:** Use Option B for verification first

4. **Complete restoration:**
   - Atlas creates restore job (takes 5-30 minutes depending on size)
   - Monitor progress in Atlas dashboard
   - Once complete, verify data integrity

5. **Verify restored data:**
   ```bash
   # Connect to restored database
   mongo "mongodb+srv://user:pass@cluster/database"
   
   # Check collection counts
   db.salons.countDocuments()
   db.bookings.countDocuments()
   db.owners.countDocuments()
   
   # Spot check some records
   db.salons.findOne()
   db.bookings.findOne()
   ```

### Scenario 2: Restore to Different Environment (Staging/Testing)

**Steps:**

1. **Clone to Staging Cluster:**
   - From MongoDB Atlas, create new cluster "salonpro-staging"
   - Apply same network/security settings
   - Restore latest backup to staging cluster

2. **Update staging environment variables:**
   ```bash
   MONGODB_URI=mongodb+srv://user:pass@staging-cluster/salonpro_staging
   ```

3. **Test restoration in staging:**
   - Verify data integrity
   - Run application against restored data
   - Test specific features/workflows
   - Document any issues

4. **Promote to production if verified:**
   - Only if testing confirms data integrity
   - Follow the "Promote to Production" checklist below

### Scenario 3: Point-in-Time Recovery (Advanced)

If using **MongoDB Atlas Continuous Backup** (Premium tier):

1. **Log into MongoDB Atlas**
2. **Go to Backup → Continuous Backup**
3. **Select specific timestamp** (any point within retention period)
4. **Create restore job** with chosen timestamp
5. **Verify and promote** following Scenario 2

---

## Disaster Recovery Procedures

### Complete Data Loss Scenario

**Recovery Priority:** Restore from most recent backup within acceptable RPO

**Steps:**

1. **Assess damage:**
   - Is data corrupted or completely lost?
   - Check cluster status in MongoDB Atlas
   - Review recent activity logs

2. **Restore from backup:**
   - Follow "Scenario 1: Restore from Recent Snapshot" above
   - If backup is older than expected, assess business impact
   - Create restore job to new cluster

3. **Verify integrity:**
   - Run data integrity checks (script provided below)
   - Verify no gaps in critical data (bookings, payments, users)
   - Test application functionality

4. **Communication:**
   - Notify affected salon owners if data is stale
   - Document recovery time and impact
   - Create incident report

5. **Post-recovery:**
   - Enable enhanced monitoring
   - Review what caused the loss
   - Implement additional safeguards

### Data Integrity Check Script

```javascript
// MongoDB Shell script to verify restored data
async function verifyDataIntegrity() {
  const db = require('mongoose').connection.db;
  
  const checks = {
    salons: await db.collection('salons').countDocuments(),
    owners: await db.collection('owners').countDocuments(),
    employees: await db.collection('employees').countDocuments(),
    bookings: await db.collection('bookings').countDocuments(),
    clients: await db.collection('clients').countDocuments(),
  };
  
  console.log('Data Integrity Check:');
  console.log(checks);
  
  // Verify no orphaned records
  const bookingsWithoutSalons = await db.collection('bookings').aggregate([
    { $lookup: { from: 'salons', localField: 'salon', foreignField: '_id', as: 'salon_match' } },
    { $match: { salon_match: { $eq: [] } } },
  ]).toArray();
  
  if (bookingsWithoutSalons.length > 0) {
    console.warn('⚠️ Found orphaned bookings:', bookingsWithoutSalons.length);
  }
  
  return checks;
}
```

---

## Credentials & Access Management

### User Roles in MongoDB Atlas

| Role | Responsibility | Access Level |
|------|---|---|
| **Organization Owner** | Full platform access, billing | Create/delete clusters, manage users |
| **Project Owner** | Database management | Modify cluster, manage backups |
| **Database Admin** | Application maintenance | Connect to database, CRUD operations |
| **Read-Only** | Monitoring/audits | View-only access |

### Current Database Users

| Username | Purpose | Permissions |
|----------|---------|------------|
| `info_db_user` | Application connection | Full read/write (salonpro database) |
| `admin` | Infrastructure team | Full admin access |

### Creating New Database Users

**In MongoDB Atlas:**

1. **Go to Database Access** → Create Database User
2. **Set username and strong password:**
   - Use 16+ character password
   - Include uppercase, lowercase, numbers, special characters
3. **Select authentication method:** Password
4. **Configure Database User Privileges:**
   - Select "Built-in Role": `readWrite` (for app users)
   - Select "Database": `salonpro`
5. **Click "Create Database User"**
6. **Update IP whitelist** (if needed)
7. **Store credentials securely** (use password manager)

### Password Rotation

**Recommended:** Every 90 days

**Steps:**

1. **Create new database user** with rotated password
2. **Update application `.env`** with new `MONGODB_URI`
3. **Test application** against new user
4. **Disable old user** in MongoDB Atlas
5. **Delete old user** after 30-day safety period

---

## Network Security

### IP Whitelist (Atlas Network Access)

**Current Configuration:**

```
0.0.0.0/0 (allows any IP)
```

⚠️ **Note:** This is permissive for development. Consider restricting to:
- Render.com deployment region(s)
- Admin office IP(s) for direct access
- CI/CD infrastructure

**To Update IP Whitelist:**

1. **Go to MongoDB Atlas** → Network Access
2. **Click "Add IP Address"**
3. **Enter IP or CIDR range:**
   - Single IP: `203.0.113.42/32`
   - Range: `203.0.113.0/24`
   - Allow all: `0.0.0.0/0`
4. **Add comment** (e.g., "Render deployment")
5. **Confirm**

### VPC Peering (Advanced)

For enhanced security in production:

1. **Enable VPC Peering** in MongoDB Atlas
2. **Configure AWS VPC peering** to Render.com infrastructure
3. **Update connection string** to private endpoint
4. **Test connectivity** before cutover

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Connection Health**
   - Active connections count
   - Connection errors rate
   - Reconnection attempts

2. **Database Performance**
   - Query latency (p50, p99)
   - Read/write throughput
   - Index usage

3. **Storage**
   - Database size growth
   - Backup size
   - Free space available

4. **Replication**
   - Replica lag (if multi-region)
   - Sync state

### Setting Up Alerts in MongoDB Atlas

1. **Go to Alerts** → Create Alert Policy
2. **Select metric:**
   - Database CPU Usage > 80%
   - Replication Lag > 10s
   - Connection Count > 1000
3. **Set threshold and duration**
4. **Choose notification:** Email, Slack, PagerDuty
5. **Save policy**

### Health Check Endpoint

Application provides health status:

```bash
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "ts": 1776372780911,
  "database": "connected"
}
```

---

## Troubleshooting

### Connection Failures

**Error:** `ECONNREFUSED` or `Server selection timed out`

**Solutions:**

1. **Verify MONGODB_URI is set:**
   ```bash
   echo $MONGODB_URI
   ```

2. **Check Atlas IP whitelist:**
   - Is your IP in the whitelist?
   - Is `0.0.0.0/0` enabled or your IP specifically allowed?

3. **Verify credentials:**
   - Is the username/password correct?
   - Has the user been created in MongoDB Atlas?
   - Are special characters URL-encoded?

4. **Check network:**
   ```bash
   # Test connectivity to cluster
   nslookup salonpro.kpketkg.mongodb.net
   ```

5. **Increase timeout:**
   ```javascript
   // In db.js, increase serverSelectionTimeoutMS
   serverSelectionTimeoutMS: 30000  // 30 seconds
   ```

### Authentication Failures

**Error:** `authentication failed`

**Solutions:**

1. **Verify credentials:**
   - Username and password are correct?
   - Password doesn't contain special chars that need URL encoding

2. **Check user role:**
   - Does user have access to `salonpro` database?
   - Is the user account active (not deleted)?

3. **Reset password:**
   - Go to MongoDB Atlas → Database Access
   - Click user → Edit
   - Reset password and update application

### Slow Queries

**Error:** Query performance degradation

**Solutions:**

1. **Check indexes:**
   ```bash
   # In MongoDB shell
   db.collection.getIndexes()
   ```

2. **Analyze query plan:**
   ```bash
   db.collection.find(query).explain("executionStats")
   ```

3. **Add missing index:**
   ```javascript
   // In db.js connectDB()
   await db.collection('collection_name').createIndex({ field: 1 });
   ```

### Backup Issues

**Error:** Backup failed or cannot restore

**Solutions:**

1. **Check backup status:**
   - Go to MongoDB Atlas → Backup
   - Verify backup completed successfully
   - Check storage quota isn't exceeded

2. **Verify restore permissions:**
   - User has admin role in project
   - Project quota allows new cluster creation

3. **Contact MongoDB support:**
   - MongoDB Atlas Support Portal
   - Provide error message and backup ID

---

## Operations Checklist

### Daily Operations

- [ ] Monitor MongoDB Atlas dashboard for alerts
- [ ] Verify application health check endpoint
- [ ] Check for backup completion

### Weekly Operations

- [ ] Review connection logs for errors
- [ ] Verify backup retention policy
- [ ] Spot check production data integrity

### Monthly Operations

- [ ] Full backup restoration test in staging
- [ ] Review access logs and IP whitelist
- [ ] Update database user password (if > 30 days)
- [ ] Document any changes or incidents

### Quarterly Operations

- [ ] Full disaster recovery drill
- [ ] Review and update backup strategy
- [ ] Performance optimization review
- [ ] Security assessment

---

## Support & Resources

### MongoDB Atlas Documentation
- [Backup & Restore](https://docs.mongodb.com/atlas/backup/backup-overview/)
- [Network Access](https://docs.mongodb.com/atlas/security/ip-access-list/)
- [User Management](https://docs.mongodb.com/atlas/security/add-mongodb-users/)
- [Monitoring](https://docs.mongodb.com/atlas/monitoring/)

### Kreno Application Files
- Database adapter: `/db.js`
- Server health check: `/server.js` (GET /api/health)
- Connection configuration: `/.env` (MONGODB_URI)

### Escalation Contacts
- MongoDB Support: https://cloud.mongodb.com/v2/support
- Render.com Support: https://render.com/docs
- Kreno Team: [internal contact list]

---

**Last Updated:** 2026-04-16
**Next Review:** 2026-07-16
**Version:** 1.0
