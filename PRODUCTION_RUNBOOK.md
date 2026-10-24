# SwordNex AI CRM — Production Operations & Incident Runbook

**Audience:** Site Reliability Engineers, DevOps Engineers, System Administrators  
**Applicability:** Production Environments

---

## 1. Routine Service Monitoring & Health Inspection

### 1.1 Core Health Check Endpoint
The backend exposes an unauthenticated, non-sensitive health check at `/health`:
```bash
curl -s http://127.0.0.1:5000/health | jq .
```
Expected output:
```json
{
  "status": "ok",
  "timestamp": "2026-10-22T14:30:00.000Z",
  "uptime": 14205.12
}
```

### 1.2 Container State Inspection
```bash
# Check container status, uptime, and health state
docker compose -f docker-compose.prod.yml ps

# Check resource consumption (CPU, Memory, Network I/O)
docker stats --no-stream

# Tail live application logs (with timestamp)
docker compose -f docker-compose.prod.yml logs -f --tail=100 server
```

---

## 2. Zero-Downtime Application Deployment

When deploying code updates to production:

```bash
# Step 1: Pull latest release tags or commits
git fetch --tags && git checkout v1.0.1

# Step 2: Build new images without taking down active containers
docker compose -f docker-compose.prod.yml build server client

# Step 3: Run database migrations safely via the isolated migration service
docker compose -f docker-compose.prod.yml run --rm migration

# Step 4: Gracefully recreate and reload the API and Frontend containers
docker compose -f docker-compose.prod.yml up -d --no-deps server client

# Step 5: Verify health check
curl -f http://127.0.0.1:5000/health || echo "DEPLOYMENT ALERT: Server health check failed!"
```

---

## 3. JWT Secret Rotation Protocol

> [!WARNING]
> Rotating `JWT_SECRET` immediately invalidates all active access tokens. Rotating `JWT_REFRESH_SECRET` prevents silent background token refresh, forcing all users across all tenants to re-authenticate with their credentials.

### Protocol for Scheduled Secret Rotation:
1. Schedule a maintenance window and notify tenant administrators.
2. Generate new 64-byte cryptographic hex secrets:
   ```bash
   openssl rand -hex 64 > ./secrets/jwt_secret_new.txt
   openssl rand -hex 64 > ./secrets/jwt_refresh_secret_new.txt
   ```
3. Atomically overwrite active secrets:
   ```bash
   mv ./secrets/jwt_secret_new.txt ./secrets/jwt_secret.txt
   mv ./secrets/jwt_refresh_secret_new.txt ./secrets/jwt_refresh_secret.txt
   chmod 600 ./secrets/jwt_secret.txt ./secrets/jwt_refresh_secret.txt
   ```
4. Restart backend API:
   ```bash
   docker compose -f docker-compose.prod.yml restart server
   ```
5. Audit log confirms server reboot with new cryptographic signature validation.

---

## 4. Disabling Demo Accounts & Rotating Initial Credentials

In development/demo mode, seed scripts might populate demo tenant accounts. In production:
1. Ensure `NODE_ENV=production` is set. The seed script `server/prisma/seed.ts` automatically aborts execution if run in production.
2. If any test tenant exists in the database, deactivate or purge it:
   ```sql
   -- Connect to PostgreSQL securely
   docker compose -f docker-compose.prod.yml exec database psql -U swordnex_admin -d swordnex_crm

   -- Review active users
   SELECT id, email, "globalRole", "isActive" FROM "User";

   -- Deactivate any non-production account
   UPDATE "User" SET "isActive" = false WHERE email LIKE '%@swordnex.demo%';
   ```

---

## 5. Razorpay Live Payment Verification & Reconciliation

### 5.1 Test-Mode Smoke Test
Before opening subscriptions to customers:
1. Temporarily place test keys in `.env` and `secrets/razorpay_key_secret.txt`:
   - `RAZORPAY_KEY_ID=rzp_test_...`
   - `RAZORPAY_KEY_SECRET=...`
2. Perform a test checkout on `/billing` using Razorpay standard test cards (e.g. `4111 1111 1111 1111`).
3. Verify that:
   - A `Payment` record is created in status `PENDING`.
   - On completion, `verifyPayment` executes and validates the HMAC SHA-256 signature.
   - `Subscription` is transitioned to `ACTIVE`.
   - A tax invoice is generated with `INV-YYYY-XXXXX` format.
4. Replace keys with live `rzp_live_...` credentials.
5. In live mode, execute a minimal ₹1 test transaction if required by your company accounting policy to verify live settlement.

### 5.2 Payment Reconciliation Query
```sql
-- Audit mismatched payments where gateway captured but subscription did not activate
SELECT p.id, p."orderId", p."paymentId", p.amount, p.status, s.status as sub_status
FROM "Payment" p
LEFT JOIN "Subscription" s ON s."organizationId" = p."organizationId"
WHERE p.status = 'SUCCESS' AND s.status != 'ACTIVE';
```

---

## 6. Incident Response Runbooks

### Incident A: Disk Space Exhaustion (WAL Archives Accumulation)
**Symptoms:** Database fails to write new transactions; error `No space left on device`.
1. Check disk utilization:
   ```bash
   df -h /var/lib/docker/volumes/swordnex_wal_archive/_data
   ```
2. Trigger the base backup cleanup script to prune WAL files older than the last confirmed base backup:
   ```bash
   docker compose -f docker-compose.prod.yml exec database /var/lib/postgresql/scripts/backup-base.sh
   ```
3. If WAL archive partition is full, synchronize to remote S3 and truncate archived segments older than 14 days.

### Incident B: High Volume / Webhook Flooding (DDoS)
**Symptoms:** High CPU on backend; response slowdown.
1. Inspect Nginx access logs:
   ```bash
   sudo tail -n 200 /var/log/nginx/access.log | grep "/api/v1/payments/webhook"
   ```
2. The built-in `webhookLimiter` restricts incoming calls to 120 requests/min per IP.
3. If an attacker is rotating IPs, temporarily block the offending subnet in UFW:
   ```bash
   sudo ufw insert 1 deny from 203.0.113.0/24 to any port 443
   ```
