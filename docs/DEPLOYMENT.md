# SwordNex AI CRM — Complete Production Deployment & Operations Guide

**Target Environment:** Linux (Ubuntu 22.04 / 24.04 LTS or Debian 12) / Docker Compose / Host Nginx / PostgreSQL 16  
**Architecture:** 3-Tier Multi-Container Topology (Isolated Database, REST API Server, Client SPA)  
**Security Standard:** Strict Least-Privilege, Non-Root Containers, Private Network Isolation, Cryptographic Timing-Safe Checks  

---

## 1. System Architecture & Topology

```
                  Internet Traffic (HTTPS :443 / HTTP :80)
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────────┐
       │                Host Reverse Proxy (Nginx)                   │
       │  - Let's Encrypt TLS Termination (Certbot)                  │
       │  - Security Headers (HSTS, CSP, XSS, Sniff)                 │
       │  - Rate Limiting & 15MB Request Body Buffer                 │
       └──────────────┬──────────────────────────────┬───────────────┘
                      │                              │
         Proxy to 127.0.0.1:8080        Proxy /api & /uploads to 127.0.0.1:5000
                      │                              │
                      ▼                              ▼
       ┌──────────────────────────────┐┌──────────────────────────────┐
       │     swordnex_prod_frontend   ││     swordnex_prod_backend    │
       │   - Nginx 1.27 Alpine (SPA)  ││   - Node 20 Alpine (Express) │
       │   - Port 80 internal         ││   - Non-root 'node' user     │
       │                              ││   - Port 5000 internal       │
       └──────────────┬───────────────┘└──────────────┬───────────────┘
                      │                               │
                      └────── crm_app_network ────────┘
                                      │
                      ┌───────────────┴───────────────┐
                      │    crm_db_network (INTERNAL)  │
                      │  (STRICT: ZERO PUBLIC ACCESS) │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    swordnex_prod_database     │
                      │   - PostgreSQL 16 Alpine      │
                      │   - Port 5432 (Internal only) │
                      │   - WAL Archiving for PITR    │
                      └───────────────────────────────┘
```

---

## 2. Server Prerequisites & Firewall Hardening

### 2.1 Hardware Requirements
- **CPU:** 2 vCPUs minimum (4 vCPUs recommended)
- **RAM:** 4 GB RAM minimum (8 GB recommended for enterprise tenants)
- **Disk:** 40 GB SSD / NVMe minimum (with scalable volume for backups and WAL archives)

### 2.2 UFW Firewall Rules
```bash
# Allow SSH, HTTP, and HTTPS only
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP Let’s Encrypt verification'
sudo ufw allow 443/tcp comment 'HTTPS Production Traffic'

# Explicitly ensure internal ports are blocked from public interface
sudo ufw deny 5432/tcp
sudo ufw deny 5000/tcp
sudo ufw deny 8080/tcp

sudo ufw enable
sudo ufw status verbose
```

---

## 3. Step-by-Step Production Deployment

### Step 1: Clone Repository
```bash
git clone https://github.com/SwordNex/SwordNex-AI-CRM.git /var/www/swordnex-crm
cd /var/www/swordnex-crm
```

### Step 2: Generate Cryptographic Production Secrets
```bash
# On Linux / macOS:
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh

# On Windows PowerShell:
.\scripts\generate-secrets.ps1
```

### Step 3: Populate Provider Credentials in `./secrets/`
- `secrets/razorpay_key_secret.txt`: Live Razorpay Key Secret.
- `secrets/razorpay_webhook_secret.txt`: Webhook secret.
- `secrets/smtp_password.txt`: SMTP provider password.
```bash
chmod 600 secrets/*.txt
chmod 700 secrets
```

### Step 4: Configure Production `.env`
```bash
cp .env.example .env
```
Ensure key production variables are populated:
```ini
NODE_ENV=production
CLIENT_URL=https://crm.yourdomain.com
CORS_ALLOWED_ORIGINS=https://crm.yourdomain.com
TRUSTED_PROXY=loopback,linklocal,uniquelocal

RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_FROM="SwordNex AI CRM <no-reply@yourdomain.com>"
```

### Step 5: Obtain SSL/TLS Certificate
```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx nginx
sudo systemctl stop nginx
sudo certbot certonly --standalone -d crm.yourdomain.com --agree-tos --email admin@yourdomain.com
```

### Step 6: Deploy Edge Nginx Configuration
```bash
sudo cp nginx/swordnex-crm.conf /etc/nginx/sites-available/swordnex-crm.conf
sudo sed -i 's/crm.yourdomain.com/crm.yourdomain.com/g' /etc/nginx/sites-available/swordnex-crm.conf
sudo ln -sf /etc/nginx/sites-available/swordnex-crm.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 7: Build & Launch Containers
```bash
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Step 8: Verify Health & Startup
```bash
docker compose -f docker-compose.prod.yml ps
curl -I http://127.0.0.1:5000/health
curl -I https://crm.yourdomain.com/health
```

---

## 4. Operational Runbook & Maintenance

### 4.1 Health Check Endpoints
- Backend API Health: `GET http://127.0.0.1:5000/health`
- Version Health: `GET http://127.0.0.1:5000/api/v1/health`

### 4.2 Zero-Downtime Rolling Updates
```bash
git pull origin main
docker compose -f docker-compose.prod.yml build server client
docker compose -f docker-compose.prod.yml up -d --no-deps server client
```

### 4.3 Container Logs
```bash
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f database
docker compose -f docker-compose.prod.yml logs -f client
```

### 4.4 Database Backups & PITR
Refer to [`docs/DATABASE.md`](DATABASE.md) for scheduled physical base backups (`database/scripts/backup-base.sh`) and point-in-time recovery (`database/scripts/restore-pitr.sh`).
