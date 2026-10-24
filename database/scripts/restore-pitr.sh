#!/bin/sh
set -e

# ==============================================================================
# SwordNex AI CRM — PostgreSQL 16 Point-in-Time Recovery (PITR) Script
# Reconstructs database state to a specific second from base backup + WAL archives
# ==============================================================================

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <path_to_base_backup_dir> <target_timestamp_utc> [target_data_directory]"
  echo "Example: $0 /var/lib/postgresql/backups/base_20261022_120000 '2026-10-22 12:45:00 UTC' /var/lib/postgresql/restored_data"
  exit 1
fi

BASE_BACKUP_DIR="$1"
TARGET_TIME="$2"
RESTORE_DIR="${3:-/var/lib/postgresql/restored_data}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/var/lib/postgresql/wal_archive}"

echo "================================================================================"
echo "SwordNex AI CRM — Point-in-Time Recovery (PITR) Execution"
echo "================================================================================"
echo "Base Backup Directory:  ${BASE_BACKUP_DIR}"
echo "Target Recovery Time:   ${TARGET_TIME}"
echo "Restoration Data Dir:   ${RESTORE_DIR}"
echo "WAL Archive Source:     ${WAL_ARCHIVE_DIR}"
echo "================================================================================"

if [ ! -f "${BASE_BACKUP_DIR}/base.tar.gz" ]; then
  echo "ERROR: ${BASE_BACKUP_DIR}/base.tar.gz does not exist!"
  exit 1
fi

if [ -d "${RESTORE_DIR}" ] && [ "$(ls -A "${RESTORE_DIR}")" ]; then
  echo "ERROR: Target restore directory ${RESTORE_DIR} is not empty. Aborting to protect existing data."
  exit 1
fi

mkdir -p "${RESTORE_DIR}"
chmod 700 "${RESTORE_DIR}"

# Step 1: Verify Checksum if present
if [ -f "${BASE_BACKUP_DIR}/base.tar.gz.sha256" ]; then
  echo "Verifying base backup SHA256 integrity..."
  (cd "${BASE_BACKUP_DIR}" && sha256sum -c base.tar.gz.sha256)
fi

# Step 2: Unpack Base Backup
echo "Extracting base backup tarball into ${RESTORE_DIR}..."
tar -xzf "${BASE_BACKUP_DIR}/base.tar.gz" -C "${RESTORE_DIR}"

# Step 3: Unpack pg_wal if separate archive exists
if [ -f "${BASE_BACKUP_DIR}/pg_wal.tar.gz" ]; then
  echo "Extracting streamed WAL segments into ${RESTORE_DIR}/pg_wal..."
  mkdir -p "${RESTORE_DIR}/pg_wal"
  tar -xzf "${BASE_BACKUP_DIR}/pg_wal.tar.gz" -C "${RESTORE_DIR}/pg_wal"
fi

# Step 4: Signal Recovery Mode (PostgreSQL 12+)
echo "Writing recovery.signal..."
touch "${RESTORE_DIR}/recovery.signal"

# Step 5: Configure WAL replay and target recovery time
echo "Configuring recovery target parameters in postgresql.auto.conf..."
cat <<EOF >> "${RESTORE_DIR}/postgresql.auto.conf"
# PostgreSQL 16 PITR Configuration injected by SwordNex restore-pitr.sh
restore_command = 'cp ${WAL_ARCHIVE_DIR}/%f "%p"'
recovery_target_time = '${TARGET_TIME}'
recovery_target_action = 'promote'
EOF

# Ensure appropriate postgres ownership on restored files
chown -R postgres:postgres "${RESTORE_DIR}" 2>/dev/null || true

echo "================================================================================"
echo "PITR Preparation Complete!"
echo "Next Steps:"
echo "1. Run a test container mounting ${RESTORE_DIR} as /var/lib/postgresql/data."
echo "2. Monitor PostgreSQL logs to verify WAL replay reaches ${TARGET_TIME}."
echo "3. Verify data integrity and promote database to primary."
echo "================================================================================"
