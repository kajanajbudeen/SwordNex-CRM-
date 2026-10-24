#!/bin/sh
set -e

# ==============================================================================
# SwordNex AI CRM — PostgreSQL 16 Base Backup Script
# Creates a compressed, standalone physical base backup for PITR
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/var/lib/postgresql/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TARGET_DIR="${BACKUP_DIR}/base_${TIMESTAMP}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting SwordNex PostgreSQL base backup..."

mkdir -p "${BACKUP_DIR}"
mkdir -p "${TARGET_DIR}"

# Resolve database user and authentication credentials
BACKUP_USER="${PGUSER:-${POSTGRES_USER:-postgres}}"
if [ -n "$POSTGRES_PASSWORD_FILE" ] && [ -f "$POSTGRES_PASSWORD_FILE" ]; then
  export PGPASSWORD="$(cat "$POSTGRES_PASSWORD_FILE" | tr -d '\r\n')"
elif [ -n "$POSTGRES_PASSWORD" ]; then
  export PGPASSWORD="$POSTGRES_PASSWORD"
fi

# Run pg_basebackup with tar format and gzip compression (-Ft -z)
# -X stream streams WAL logs while backup is running to guarantee consistency
pg_basebackup \
  -h "${PGHOST:-localhost}" \
  -p "${PGPORT:-5432}" \
  -U "${BACKUP_USER}" \
  -D "${TARGET_DIR}" \
  -Ft \
  -z \
  -P \
  -X stream \
  -c fast

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Base backup completed successfully at: ${TARGET_DIR}"

# Calculate SHA256 checksums for backup integrity
cd "${TARGET_DIR}"
sha256sum base.tar.gz > base.tar.gz.sha256
if [ -f pg_wal.tar.gz ]; then
  sha256sum pg_wal.tar.gz > pg_wal.tar.gz.sha256
fi

# Retention policy: Prune backups older than RETENTION_DAYS
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Applying retention policy: pruning base backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -name "base_*" -mtime +"${RETENTION_DAYS}" -exec rm -rf {} +

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup workflow complete."
