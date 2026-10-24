# SwordNex AI CRM — Complete Production Deployment Guide

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
       │             Host Nginx Reverse Proxy (SSL Termination)      │
       │    - Let's Encrypt / Certbot TLS v1.2 / TLS v1.3             │
       │    - Security Headers (HSTS, CSP, X-Frame-Options)          │
       │    - client_max_body_size 15M (CSV Imports & Attachments)   │
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
Ensure public access is restricted strictly to SSH, HTTP, and HTTPS. Never open PostgreSQL port `5432` or backend port `5000` to the internet.

```bash
# Allow SSH, HTTP, and HTTPS only
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

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
git clone https://github.com/kajanajbudeen/SwordNex-CRM-.git /opt/swordnex-crm
cd /opt/swordnex-crm
```

### Step 2: Generate Cryptographic Production Secrets
Run the local cryptographic secrets generator. This creates 64-byte JWT secrets and a 32-byte database password with strict `0600` permissions in `./secrets/`:

```bash
# On Linux / macOS:
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh

# On Windows PowerShell:
.\scripts\generate-secrets.ps1
```

### Step 3: Populate Provider Credentials in `./secrets/`
Fill in the template secret files with your live provider keys:
- `secrets/razorpay_key_secret.txt`: Your live Razorpay Key Secret.
- `secrets/razorpay_webhook_secret.txt`: Secret defined when adding webhook in Razorpay Dashboard.
- `secrets/smtp_password.txt`: Your SMTP provider API key or password.

Verify permissions:
```bash
chmod 600 secrets/*.txt
chmod 700 secrets
```

### Step 4: Configure Production `.env`
Create `.env` based on `.env.example`:
```bash
cp .env.example .env
```
Ensure the following variables match your production domain and provider IDs:
```ini
NODE_ENV=production
CLIENT_URL=https://crm.yourdomain.com
CORS_ALLOWED_ORIGINS=https://crm.yourdomain.com
TRUSTED_PROXY=loopback,linklocal,uniquelocal

# Razorpay Live Key ID (Public, matching your live dashboard)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx

# SMTP Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_FROM="SwordNex AI CRM <no-reply@yourdomain.com>"
```

### Step 5: Issue SSL/TLS Certificates via Certbot
Before routing HTTPS, obtain a certificate from Let's Encrypt:
```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx nginx

# Stop temporary nginx if running
sudo systemctl stop nginx

# Issue certificate for your domain
sudo certbot certonly --standalone -d crm.yourdomain.com --agree-tos --email admin@yourdomain.com
```

### Step 6: Deploy Edge Nginx Configuration
Copy the production Nginx reverse proxy template:
```bash
sudo cp nginx/swordnex-crm.conf /etc/nginx/sites-available/swordnex-crm.conf

# Replace crm.yourdomain.com with your actual domain
sudo sed -i 's/crm.yourdomain.com/crm.yourdomain.com/g' /etc/nginx/sites-available/swordnex-crm.conf

# Enable site and test configuration
sudo ln -s /etc/nginx/sites-available/swordnex-crm.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 7: Build and Launch Production Docker Containers
Use `docker-compose.prod.yml` to orchestrate the migration container, database, backend API, and frontend client:

```bash
# Build production images
docker compose -f docker-compose.prod.yml build --no-cache

# Start the stack in detached mode
docker compose -f docker-compose.prod.yml up -d
```

### Step 8: Verify Startup & Healthchecks
Monitor the migration container execution and check container health:

```bash
# Check status of all containers
docker compose -f docker-compose.prod.yml ps

# Expected output:
# swordnex_prod_database   postgres:16-alpine    Up (healthy)
# swordnex_prod_migration  (run once)            Exited (0)
# swordnex_prod_backend    (server)              Up (healthy)    127.0.0.1:5000->5000/tcp
# swordnex_prod_frontend   (client)              Up (healthy)    127.0.0.1:8080->80/tcp

# Verify health endpoint via curl
curl -I http://127.0.0.1:5000/health
# HTTP/1.1 200 OK
# Content-Type: application/json; charset=utf-8
# {"status":"ok","timestamp":"...","uptime":...}
```

---

## 4. External Provider Configurations

### 4.1 Razorpay Live Dashboard Setup
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Switch toggle to **Live Mode**.
3. Navigate to **Settings > API Keys** and generate **Key ID** & **Key Secret**.
4. Navigate to **Settings > Webhooks > Add New Webhook**:
   - **Webhook URL:** `https://crm.yourdomain.com/api/v1/payments/webhook`
   - **Secret:** Generate a high-entropy string and paste into `secrets/razorpay_webhook_secret.txt`.
   - **Active Events:**
     - `payment.captured`
     - `payment.failed`
     - `order.paid`
     - `subscription.charged`

### 4.2 SMTP Verification
Ensure your sending domain `yourdomain.com` has active **SPF**, **DKIM**, and **DMARC** DNS records registered in your DNS management console to guarantee 100% inbox delivery for password reset emails.

---

## 5. Zero-Downtime Rollback & Maintenance Commands

### Rolling Restart
```bash
docker compose -f docker-compose.prod.yml restart server client
```

### Safe Application Update
```bash
git pull origin main
docker compose -f docker-compose.prod.yml build server client
docker compose -f docker-compose.prod.yml up -d --no-deps server client
```

### Safe Rollback
```bash
# Revert to previous git commit or container tag
git checkout <PREVIOUS_STABLE_COMMIT>
docker compose -f docker-compose.prod.yml build server client
docker compose -f docker-compose.prod.yml up -d
```
