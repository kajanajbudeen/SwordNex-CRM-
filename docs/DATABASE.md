# SwordNex AI CRM — Database Architecture, Migrations & PITR Runbook

> **Engine:** PostgreSQL 16 (Alpine)  
> **ORM & Migration Tool:** Prisma ORM  
> **Backup Strategy:** Continuous WAL Archiving + Scheduled Base Backups (Point-in-Time Recovery)  

---

## 1. Relational Schema Architecture

SwordNex AI CRM employs 35 normalized relational models partitioned across functional enterprise domains:

1. **Identity & Multi-Tenancy**: `User`, `Organization`, `Membership`, `Role`, `RolePermission`, `AuditLog`.
2. **Sales & CRM Core**: `Lead`, `Deal`, `Pipeline`, `PipelineStage`, `Contact`, `Company`, `Activity`, `Task`.
3. **CPQ & Commercial Billing**: `Product`, `Quote`, `QuoteItem`, `CustomerInvoice`, `CustomerInvoiceItem`.
4. **SaaS Subscription & Razorpay Payments**: `Plan`, `Subscription`, `Invoice`, `PaymentWebhookEvent`.
5. **Customer Support & Service**: `Ticket`, `TicketMessage`.
6. **Marketing & Communications**: `Campaign`, `CommunicationLog`.
7. **Automation & AI Intelligence**: `Workflow`, `WorkflowExecution`, `LeadLayoutConfig`, `LeadImportHistory`.

---

## 2. PostgreSQL Extensions

The database initialization script (`database/init.sql`) automatically enables required extensions:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```

---

## 3. Prisma ORM Workflow & Operations

### 3.1 Synchronize Schema (Development)
```bash
# Push schema directly to database
npm run db:push
```

### 3.2 Create & Apply Migrations (Production)
```bash
# Generate a new SQL migration from schema changes
npm --prefix server run prisma:migrate

# Apply pending migrations in production
npx --prefix server prisma migrate deploy
```

### 3.3 Database Seeding
```bash
# Seed realistic enterprise multi-tenant data, roles, and default subscription plans
npm run db:seed
```

### 3.4 Visual Database Inspection (Prisma Studio)
```bash
# Launch Prisma Studio GUI (Port 5555)
npm run db:studio
```

---

## 4. Continuous WAL Archiving & Point-in-Time Recovery (PITR)

### 4.1 Recovery Design Objectives
| Metric | Target | Technical Justification |
| :--- | :---: | :--- |
| **Recovery Point Objective (RPO)** | **$\le$ 5 minutes** | `archive_timeout = 300` in `database/postgresql.conf` forces a WAL segment switch every 300 seconds, guaranteeing at most 5 minutes of potential transaction loss in case of hardware failure. |
| **Recovery Time Objective (RTO)** | **$\le$ 15 minutes** | Fast tarball decompression of base backups combined with continuous replay of delta WAL segments. |
| **Integrity Assurance** | **SHA-256 Verified** | All base backups generate companion `.sha256` checksums to detect bitrot or storage corruption before replay begins. |

### 4.2 Automated Physical Base Backups
Executed via `database/scripts/backup-base.sh`:
```bash
chmod +x database/scripts/backup-base.sh
./database/scripts/backup-base.sh
```
- Executes non-blocking streaming backup: `pg_basebackup -h localhost -p 5432 -U postgres -D - -Ft -z -X stream`.
- Writes compressed tarball `base_<timestamp>.tar.gz` and verifies SHA-256 checksum.
- Prunes backups older than retention policy (default: 7 days).

### 4.3 Restoring to a Specific Point in Time (PITR)
Executed via `database/scripts/restore-pitr.sh`:
```bash
chmod +x database/scripts/restore-pitr.sh

# Restore database to an exact historical timestamp
./database/scripts/restore-pitr.sh "2026-10-26 14:30:00 UTC"
```
The restoration procedure:
1. Stops the PostgreSQL service.
2. Archives current data directory for safety.
3. Decompresses the latest base backup prior to the target timestamp.
4. Generates `recovery.signal` and configures `restore_command`.
5. Sets `recovery_target_time = '2026-10-26 14:30:00 UTC'` and `recovery_target_action = 'promote'`.
6. Restarts PostgreSQL to replay WAL logs up to the exact point in time.

---

## 5. Performance Tuning & Connection Limits

Key configuration parameters configured in `database/postgresql.conf`:
- `max_connections = 100`: Accommodates backend API pool and CLI migrations.
- `shared_buffers = 256MB`: Shared memory cache for index and data pages.
- `work_mem = 16MB`: Allocated per sort/hash operation.
- `maintenance_work_mem = 64MB`: Speeds up index creation and vacuuming.
- `effective_cache_size = 768MB`: Informs PostgreSQL query planner of available filesystem cache.
