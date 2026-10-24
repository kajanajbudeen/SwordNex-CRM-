# SwordNex AI CRM — PostgreSQL 16 Point-in-Time Recovery (PITR) Runbook

This runbook defines the disaster recovery and continuous data protection architecture for **SwordNex AI CRM** using PostgreSQL 16 Physical Base Backups and continuous Write-Ahead Log (WAL) archiving.

---

## 1. Recovery Objectives & Design

| Metric | Target | Technical Justification |
| :--- | :---: | :--- |
| **Recovery Point Objective (RPO)** | **$\le$ 5 minutes** | `archive_timeout = 300` in `postgresql.conf` forces a WAL segment switch every 300 seconds, guaranteeing at most 5 minutes of potential transaction loss in case of sudden total hardware failure. |
| **Recovery Time Objective (RTO)** | **$\le$ 15 minutes** | Fast tarball decompression of base backups combined with continuous replay of delta WAL segments. |
| **Integrity Assurance** | **SHA-256 Verified** | All base backups generate companion `.sha256` checksums to detect bitrot or storage corruption before replay begins. |

---

## 2. PostgreSQL 16 WAL Archiving Configuration

In `database/postgresql.conf`:
```ini
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'
archive_timeout = 300 # Forces segment rotation every 5 minutes
```

### Dedicated Volumes in `docker-compose.prod.yml`:
- `swordnex_pgdata`: Persistent primary database storage (`/var/lib/postgresql/data`).
- `swordnex_wal_archive`: Continuous WAL archive store (`/var/lib/postgresql/wal_archive`).
- `swordnex_backups`: Compressed physical base backups (`/var/lib/postgresql/backups`).

---

## 3. Scheduled Base Backup Execution

Base backups are orchestrated using `database/scripts/backup-base.sh`. It invokes `pg_basebackup` with `-X stream` (streaming concurrent WAL logs during the backup window) and creates compressed `base.tar.gz`.

### 3.1 Manual Execution
```bash
docker compose -f docker-compose.prod.yml exec database \
  /var/lib/postgresql/scripts/backup-base.sh
```

### 3.2 Automated Nightly Cron Job (Host Server)
Set up a daily cron job on the host server to execute base backups at 02:00 UTC:
```bash
# Add to host crontab (sudo crontab -e)
0 2 * * * docker exec swordnex_prod_database /var/lib/postgresql/scripts/backup-base.sh >> /var/log/swordnex-backup.log 2>&1
```

### 3.3 Off-Server Replication (Recommended: AWS S3 / Cloudflare R2 / Backblaze B2)
To safeguard against catastrophic datacenter failure, sync both `swordnex_backups` and `swordnex_wal_archive` to off-site object storage using `rclone`:

```bash
# Install rclone
sudo apt install -y rclone

# Synchronize WAL archives every 15 minutes to encrypted S3 bucket
*/15 * * * * rclone sync /var/lib/docker/volumes/swordnex_wal_archive/_data s3:swordnex-cold-storage/wal_archive/ --fast-list

# Synchronize base backups daily
30 2 * * * rclone sync /var/lib/docker/volumes/swordnex_backups/_data s3:swordnex-cold-storage/base_backups/ --fast-list
```

---

## 4. Point-in-Time Recovery (PITR) Execution Procedure

> [!CAUTION]
> Never restore directly into the running production container. Always perform PITR into an isolated scratch container or separate staging server to verify data integrity before promoting.

### Step 1: Identify Target Timestamp & Base Backup
Determine the exact UTC timestamp you need to restore to (e.g. 5 minutes before an accidental drop or corruption incident):
- Incident Time: `2026-10-22 14:15:00 UTC`
- Target Recovery Time: `'2026-10-22 14:10:00 UTC'`

List available base backups:
```bash
docker compose -f docker-compose.prod.yml exec database ls -lah /var/lib/postgresql/backups
# base_20261022_020000
```
Select the latest base backup created **prior** to the target recovery timestamp.

### Step 2: Execute `restore-pitr.sh`
Run the automated PITR restoration script inside the database container or on the recovery host:

```bash
docker compose -f docker-compose.prod.yml exec database \
  /var/lib/postgresql/scripts/restore-pitr.sh \
  /var/lib/postgresql/backups/base_20261022_020000 \
  "2026-10-22 14:10:00 UTC" \
  /var/lib/postgresql/restored_data
```

The script performs the following actions:
1. Verifies SHA-256 checksum of `base.tar.gz`.
2. Extracts base backup into `/var/lib/postgresql/restored_data`.
3. Creates `recovery.signal` file.
4. Configures `postgresql.auto.conf` with:
   ```ini
   restore_command = 'cp /var/lib/postgresql/wal_archive/%f "%p"'
   recovery_target_time = '2026-10-22 14:10:00 UTC'
   recovery_target_action = 'promote'
   ```

### Step 3: Launch Recovery Verification Instance
Start a temporary PostgreSQL container mounting the restored directory to verify WAL replay:

```bash
docker run --rm --name swordnex_recovery_verify \
  -v swordnex_wal_archive:/var/lib/postgresql/wal_archive:ro \
  -v /var/lib/docker/volumes/swordnex_pgdata/_data/../restored_data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD_FILE=/run/secrets/db_password \
  postgres:16-alpine
```

Monitor logs to confirm:
```
LOG: starting point-in-time recovery to 2026-10-22 14:10:00+00
LOG: restored log file "000000010000000000000002" from archive
...
LOG: recovery stopping before commit of transaction ... at 2026-10-22 14:10:00.123456+00
LOG: recovery target reached
LOG: database system is ready to accept connections
```

### Step 4: Promote and Cutover
Once data integrity is verified:
1. Stop production backend: `docker compose -f docker-compose.prod.yml stop server client`.
2. Backup the corrupted `swordnex_pgdata` volume: `cp -a /var/lib/docker/volumes/swordnex_pgdata/_data /var/lib/docker/volumes/swordnex_pgdata_corrupted`.
3. Replace `swordnex_pgdata/_data` with the verified `/var/lib/postgresql/restored_data`.
4. Restart the full production stack: `docker compose -f docker-compose.prod.yml up -d`.
5. Run health check: `curl -I https://crm.yourdomain.com/health`.
