#!/bin/sh
set -e

# ==============================================================================
# SwordNex AI CRM — Cryptographic Production Secrets Generator
# Generates independent, cryptographically secure secrets in ./secrets/
# Sets strict file permissions (chmod 600)
# ==============================================================================

SECRETS_DIR="./secrets"
mkdir -p "${SECRETS_DIR}"
chmod 700 "${SECRETS_DIR}"

gen_secret() {
  local filename="$1"
  local bytes="$2"
  local target="${SECRETS_DIR}/${filename}"

  if [ -f "${target}" ] && [ -s "${target}" ]; then
    echo "[KEEP] ${target} already exists. Preserving existing secret."
  else
    openssl rand -hex "${bytes}" > "${target}"
    chmod 600 "${target}"
    echo "[CREATE] Generated new secret in ${target}"
  fi
}

echo "Generating SwordNex Production Secrets..."

# 1. Independent JWT Access & Refresh Token Secrets (64 bytes = 512 bits)
gen_secret "jwt_secret.txt" 64
gen_secret "jwt_refresh_secret.txt" 64

# 2. Database Password (32 bytes = 256 bits)
gen_secret "db_password.txt" 32

# 3. Assemble DATABASE_URL using generated password
DB_PASS=$(cat "${SECRETS_DIR}/db_password.txt" | tr -d '\r\n')
DB_USER="${POSTGRES_USER:-swordnex_admin}"
DB_NAME="${POSTGRES_DB:-swordnex_crm}"
DB_URL="postgresql://${DB_USER}:${DB_PASS}@database:5432/${DB_NAME}?schema=public"

if [ ! -f "${SECRETS_DIR}/database_url.txt" ] || [ ! -s "${SECRETS_DIR}/database_url.txt" ]; then
  printf "%s" "${DB_URL}" > "${SECRETS_DIR}/database_url.txt"
  chmod 600 "${SECRETS_DIR}/database_url.txt"
  echo "[CREATE] Generated database_url.txt from database credentials"
fi

# 4. Templates for external provider credentials (Razorpay, SMTP)
for external_file in razorpay_key_secret.txt razorpay_webhook_secret.txt smtp_password.txt; do
  target="${SECRETS_DIR}/${external_file}"
  if [ ! -f "${target}" ]; then
    touch "${target}"
    chmod 600 "${target}"
    echo "[TEMPLATE] Created placeholder ${target} (populate with provider credentials)"
  fi
done

echo "================================================================================"
echo "Production secrets initialized in ${SECRETS_DIR} with mode 0600."
echo "SECURITY NOTICE: Never commit the ./secrets directory to version control."
echo "================================================================================"
