# SwordNex AI CRM: Decoupled 3-Tier Architecture Guide

SwordNex AI CRM employs a strictly decoupled, 3-tier enterprise architecture separating the **Frontend Client**, the **Backend REST API Server**, and the **Database Tier**.

Each tier can be developed, built, tested, scaled, and deployed completely independently.

---

## 🏛️ System Topology & Separation Boundary

```mermaid
flowchart TD
    subgraph Tier1 ["Tier 1: Frontend SPA (Client Presentation Tier)"]
        UI["React 18 + TypeScript + Vite SPA"]
        Tailwind["Tailwind CSS + Lucide Icons + Recharts"]
        State["Client Auth Context & Local Session Storage"]
        UI --> State
    end

    subgraph Tier2 ["Tier 2: Backend Application Server (API & AI Gateway)"]
        Router["Express REST Router (/api/v1 & /api/v1/swordnex-master)"]
        Auth["JWT (1d access / 7d refresh) & Tenant Boundary Guard"]
        Entitlement["Live Quota & Plan Entitlement Engine"]
        Services["Domain Services (Leads, Deals, Pipelines, Workflows)"]
        AI["AI Gateway (Scoring, Copilot, Prompt Injection Guard)"]
        PrismaClient["Prisma ORM Client"]

        Router --> Auth
        Auth --> Entitlement
        Entitlement --> Services
        Services --> AI
        Services --> PrismaClient
    end

    subgraph Tier3 ["Tier 3: Database & Persistence Tier (Data Tier)"]
        PG["PostgreSQL 16 Engine"]
        Extensions["Extensions: uuid-ossp, pgcrypto, vector"]
        Tables["35 Multi-Tenant Relational Models / Tables"]
        Volume["Persistent Disk Volume (swordnex_database_data)"]

        PG --- Extensions
        PG --- Tables
        Tables --- Volume
    end

    %% Network communication boundaries
    UI -- "HTTPS / JSON REST API\n(Port 5000 / Authorization: Bearer <JWT>\nx-organization-id: <UUID>)" --> Router
    PrismaClient -- "PostgreSQL Binary Protocol (TCP 5432)\n(DATABASE_URL connection string)" --> PG

    classDef client fill:#0369a1,stroke:#38bdf8,stroke-width:2px,color:#fff;
    classDef server fill:#4338ca,stroke:#818cf8,stroke-width:2px,color:#fff;
    classDef db fill:#065f46,stroke:#34d399,stroke-width:2px,color:#fff;

    class UI,Tailwind,State client;
    class Router,Auth,Entitlement,Services,AI,PrismaClient server;
    class PG,Extensions,Tables,Volume db;
```

---

## 📂 Directory Separation

| Directory | Tier | Primary Responsibility | Independent Runtime |
| :--- | :--- | :--- | :--- |
| **`client/`** | **Tier 1: Frontend** | Single Page Application, UI components, client-side routing, dashboards, and charts. | Node.js 18+ / Vite / Nginx Alpine / CDN |
| **`server/`** | **Tier 2: Backend Server** | REST API endpoints, RBAC authentication, business logic, background automations, AI Gateway. | Node.js 18+ / Express / TypeScript / Prisma |
| **`database/`** | **Tier 3: Database** | PostgreSQL database initialization scripts, extension setup, migrations, backups, and standalone Docker compose. | PostgreSQL 16 (Alpine) + pgvector |

---

## 🛡️ Role Architecture: Platform vs. Tenant Boundaries

SwordNex CRM strictly segregates platform-wide super administration from customer tenant operations:

| Level | Role Type | Location | Responsibilities & Scope |
| :--- | :--- | :--- | :--- |
| **Global Platform** | `SUPER_ADMIN` | `User.globalRole` | Full access to SwordNex Master Head Office (`/swordnex-master`), cross-tenant subscription management, dynamic plan pricing in INR, global MRR/ARR analytics, and immutable platform security audit logs. Must be provisioned securely via server environment, never via public registration. |
| **Global Platform** | `USER` | `User.globalRole` | Standard registered platform identity. Default for all customer signups and invited team members. Lacks access to master head office. |
| **Tenant Workspace** | `ADMIN` (Customer Admin) | `Membership.role` | Administrative authority within the specific tenant organization: invite/manage members, configure custom roles and permissions, initiate plan upgrades/downgrades, and inspect organization audit logs. |
| **Tenant Workspace** | `USER` (Employee) | `Membership.role` | Scoped team member within the organization. Permissions are dynamically governed by an assigned custom `Role` (`Membership.customRoleId`). |
| **Dynamic Custom RBAC** | Custom Role Matrix | `Role` & `RolePermission` | Custom granular module permissions across 8 distinct actions (`VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `EXPORT`, `ASSIGN`, `MANAGE`) across 12 modules (`LEADS`, `CONTACTS`, `COMPANIES`, `DEALS`, `TASKS`, `EMPLOYEES`, `REPORTS`, `SETTINGS`, `BILLING`, `WORKFLOWS`, `AI_CENTER`, `COMMS`). |

---

## 🔌 Independent Environment Variables

Each tier has its own dedicated `.env.example` template:

### 1. Frontend (`client/.env.example`)
```env
# Backend REST API endpoint (leave empty for same-domain / Vite proxy, or specify full URL for decoupled deployment)
# Example: http://localhost:5000 or https://api.crm.swordnex.com
VITE_API_URL=http://localhost:5000

# Application Metadata
VITE_APP_NAME="SwordNex AI CRM"
VITE_APP_VERSION="1.0.0"
```

### 2. Backend Server (`server/.env.example`)
```env
# Network & Host
PORT=5000
NODE_ENV=development
API_PREFIX=/api/v1
CLIENT_URL=http://localhost:5173

# Database Connection (PostgreSQL 16)
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/swordnex_crm?schema=public

# Security & Authentication (JWT Secret must be at least 32 characters in production)
JWT_SECRET=super_secret_jwt_key_for_swordnex_crm_production_needs_32_bytes_min
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_for_swordnex_crm_prod
JWT_REFRESH_EXPIRES_IN=7d

# API Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000

# Payment Gateway (Razorpay / Cashfree)
RAZORPAY_KEY_ID=rzp_test_placeholder
RAZORPAY_KEY_SECRET=placeholder_secret_min_32_chars
RAZORPAY_WEBHOOK_SECRET=placeholder_webhook_secret

# AI Gateway
AI_PROVIDER=mock
DEFAULT_AI_MODEL=gemini-1.5-pro
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# External Communication Adapters (Optional - System logs simulated dispatch if unconfigured)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="SwordNex CRM <no-reply@swordnex.com>"
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

### 3. Database Tier (`database/.env.example`)
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespassword
POSTGRES_DB=swordnex_crm
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/swordnex_crm?schema=public
```

---

## 🚀 Running Each Tier Independently

### 🌐 Tier 1: Frontend Client
```bash
# Run frontend development server (Port 5173)
npm run frontend:dev

# Build production bundle with minified CSS, tree-shaking, and code-splitting (client/dist/)
npm run frontend:build

# Preview production build locally
npm run frontend:preview
```

### ⚙️ Tier 2: Backend Server
```bash
# Run backend development server with hot-reload (Port 5000)
npm run backend:dev

# Run automated backend test suites (Vitest - Unit, Integration, Entitlement, Security)
npm run backend:test

# Build TypeScript to production bundle (server/dist/)
npm run backend:build

# Start compiled production backend
npm run backend:start
```

### 🗄️ Tier 3: Database Tier
```bash
# Start standalone PostgreSQL 16 container with persistent volume
npm run db:up

# Sync database schema (Prisma db push / migrate)
npm run db:push

# Seed initial roles, demo data, and subscription plans
npm run db:seed

# Launch visual database browser (Prisma Studio on port 5555)
npm run db:studio

# Stop database container
npm run db:down
```

---

## 🚢 Independent Production Deployment

Because all 3 tiers are decoupled:

1. **Frontend (Tier 1)**: Can be deployed to any static host or CDN (e.g. Vercel, Cloudflare Pages, Netlify, or AWS S3 + CloudFront) or as a lightweight Nginx Alpine container. Set `VITE_API_URL=https://api.yourdomain.com`.
2. **Backend Server (Tier 2)**: Can be deployed as a containerized microservice to AWS ECS, Google Cloud Run, Railway, or Render. Configure `DATABASE_URL` pointing to the managed database and configure `CLIENT_URL` pointing to the frontend domain for CORS protection.
3. **Database (Tier 3)**: Can be hosted on Amazon RDS for PostgreSQL, Supabase, Neon, or self-hosted PostgreSQL 16 cluster with automated daily snapshots and point-in-time recovery (PITR).
