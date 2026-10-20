# SwordNex AI CRM

> **“Understand Customers. Predict Opportunities. Accelerate Growth.”**  
> Developed for **SwordNex Technologies Private Limited**

SwordNex AI CRM is a futuristic, AI-powered enterprise Customer Relationship Management SaaS platform. Built on modern multi-tenant principles, it integrates customer data, explainable predictive scoring, autonomous sales agents, and automated workflow triggers into a unified cockpit.

---

## 1. System Architecture & Tech Stack

```
Frontend:     React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Recharts
Backend:      Node.js + Express 4 + TypeScript (Modular Service Architecture)
Database:     PostgreSQL 16 + Prisma ORM (26 Normalized Models)
AI Gateway:   Provider-Agnostic Gateway (Gemini, OpenAI, Claude & Intelligent Heuristics)
Security:     JWT Auth, RBAC, Multi-Tenant Boundary Middleware, Immutable Audit Trail
Deployments:  Multi-stage Docker containers + docker-compose orchestration
```

---

## 2. Core Modules & Capabilities

1. **Multi-Tenant Workspace & RBAC**:
   - Organization switching, custom roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `AGENT`, `READ_ONLY`).
   - Tenant isolation enforced on every server-side query.

2. **Executive AI Cockpit & Dashboard**:
   - Total leads, qualified pipeline, revenue velocity, win rates, and overdue follow-ups.
   - Interactive charts for Stage Volume and Acquisition Channel Attribution.

3. **Lead Management & Explainable AI Scoring**:
   - Ingest leads from webhooks, forms, and CSV imports.
   - Multi-factor explainable predictive scoring (0–100) with confidence metrics.
   - One-click atomic conversion into Contact, Company, and Deal records.

4. **Interactive Kanban Deal Pipeline**:
   - Visual drag-and-drop stage transitions (New → Qualified → Discovery → Proposal → Negotiation → Won/Lost).
   - Real-time AI Deal Health diagnosis, stalled-deal detection, and risk mitigations.

5. **Customer 360 & Accounts**:
   - Stakeholder relationships, technographic profiling, account health scores, and churn risk indexing.

6. **Unified Communication Hub**:
   - Consolidated timeline for Email, WhatsApp, and SMS with real-time delivery statuses.
   - Honest provider limitation reporting when external credentials are unconfigured.

7. **Visual Automation Workflow Builder**:
   - Event-driven `Trigger → Conditions → Actions → Execution Log` engine.
   - Supports auto-routing, task creation, and AI scoring on lifecycle events.

8. **AI Center & Autonomous Agent System**:
   - Explainable Lead Scoring Simulator.
   - Context-aware Sales Copilot (answering revenue queries from tenant data).
   - Prescriptive Next Best Action generator.
   - Sales Email Drafter with tone and objective selection.
   - Meeting Transcript Summarizer with task extraction.
   - Autonomous Sales Agents with Human-in-the-Loop approval queues for sensitive operations.

9. **SaaS Subscription, Trial & 18% GST Invoicing Engine** (`/settings/subscription`):
   - 15-day automated Free Trial with 3-day grace period enforcement.
   - Configurable Indian SaaS tiers (Free Trial, Standard @ ₹2,499/mo, Premium @ ₹7,499/mo).
   - Real-time resource quota meters: Seat utilization, lead capacity, AI token consumption, cloud storage.
   - Razorpay / Cashfree order checkout simulation with cryptographic HMAC signature verification.
   - Prorated instant upgrades and scheduled zero-data-loss renewals/downgrades.
   - Automated Indian GST-compliant (18%) tax invoices (`INV-YYYY-XXXXX`) with printable receipts.

10. **Super Admin Platform Master Portal** (`/swordnex-master`):
    - Platform-wide executive intelligence: Global MRR/ARR in INR, trial conversion metrics, plan distribution.
    - Tenant subscription management: Search, filter, manual trial/subscription day extensions with mandatory audit logging.
    - Organization status management: Suspend or reactivate workspaces with security justifications.
    - Financial Ledgers: Master payment records and platform-wide tax invoices.
    - Dynamic SaaS plan configurator for real-time pricing and entitlement updates.

---

## 3. Decoupled 3-Tier Quickstart & Architecture

SwordNex AI CRM is built as a **strictly decoupled 3-tier system**:
1. **Database Tier (`database/`)**: PostgreSQL 16 transactional store with extensions (`uuid-ossp`, `pgcrypto`, `vector`).
2. **Backend Server Tier (`server/`)**: Express + TypeScript REST API microservice (`/api/v1`) with AI Gateway.
3. **Frontend Client Tier (`client/`)**: React 18 + Vite + Tailwind CSS Single Page Application.

For in-depth architectural diagrams and deployment models, read [docs/decoupled-architecture.md](docs/decoupled-architecture.md).

### Independent Tier Commands

```bash
# ==============================================================================
# TIER 1: DATABASE
# ==============================================================================
npm run db:up           # Start standalone PostgreSQL container
npm run db:push         # Sync schema to database
npm run db:seed         # Seed realistic enterprise data
npm run db:studio       # Launch visual database GUI at http://localhost:5555
npm run db:down         # Stop database container

# ==============================================================================
# TIER 2: BACKEND REST API SERVER
# ==============================================================================
npm run backend:dev     # Start backend in development mode (port 5000)
npm run backend:build   # Compile TypeScript to dist/
npm run backend:start   # Run compiled production backend
npm run backend:test    # Run automated test suites

# ==============================================================================
# TIER 3: FRONTEND CLIENT
# ==============================================================================
npm run frontend:dev    # Start Vite development client (port 5173)
npm run frontend:build  # Compile minified production assets into dist/
npm run frontend:preview# Preview production build locally

# ==============================================================================
# CONCURRENT FULL-STACK RUNNER
# ==============================================================================
npm run dev             # Runs backend server and frontend client concurrently
```

---

## 4. Preloaded Demo Seed Credentials

| Portal | Role | Name | Email | Password | Organization | Status |
|---|---|---|---|---|---|---|
| **Master Platform** (`/swordnex-master/login`) | **SUPER_ADMIN** | **Kaja Najbudeen** | `admin@swordnex.com` / `kaja@swordnex.com` | `SwordNex2026!` | SwordNex Platform HQ | Full Master Authority |
| **Tenant CRM** (`/login`) | **ADMIN** | **Aneee** | `aneee@swordnex.com` / `sarah.lead@swordnex.com` | `SwordNex2026!` | SwordNex Technologies Global | Active (Premium Plan) |
| **Tenant CRM** (`/login`) | **USER / AGENT** | **Venkat** | `venkat@swordnex.com` / `alex.rep@swordnex.com` | `SwordNex2026!` | SwordNex Technologies Global | Active (Standard Seat) |
| **Tenant CRM** (`/login`) | **ADMIN** | **Rahul Nexus** | `rahul.nexus@example.com` | `SwordNex2026!` | Nexus Innovations | 15-Day Free Trial (Active) |
| **Tenant CRM** (`/login`) | **ADMIN** | **Kavita Media** | `kavita.media@example.com` | `SwordNex2026!` | Starlight Media | Suspended Org (Write Locked) |

---

## 5. Running Automated Tests

Run the complete 33-test automated unit, integration, and security test suite:
```bash
npm run test
```

### Test Suite Execution Summary (100% Passing):
```
 ✓ tests/ai.test.ts (2 tests)
 ✓ tests/auth.test.ts (3 tests)
 ✓ tests/subscription-engine.test.ts (12 tests)
 ✓ tests/rbac-subscription.test.ts (15 tests)
 ✓ tests/tenant.test.ts (1 test)

 Test Files  5 passed (5)
      Tests  33 passed (33)
   Duration  7.59s
```

Test coverage includes:
- **JWT & Auth**: Token signing, role validation, invalid credentials, and CSRF protection.
- **Tenant Isolation**: Multi-tenancy boundary guard, preventing cross-tenant data leaks.
- **Dynamic RBAC**: Module permissions (`VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `EXPORT`, `ASSIGN`, `MANAGE`).
- **Subscription Engine**: 15-day trial arithmetic, 3-day grace period enforcement, instant upgrade proration, zero-data-loss scheduled downgrade, Razorpay HMAC signature validation, duplicate payment rejection (`HTTP 409`), and 18% GST invoice generation.
- **AI Gateway & Scoring**: Multi-factor explainable predictive scoring (0–100) and Deal Health risk detection.

---

## 6. Project Documentation Index

Comprehensive documentation is organized under the [`docs/`](docs/) directory:

- 📘 [System Master Documentation](docs/system-master-documentation.md): Comprehensive system specification, architecture, role matrix, subscription rules, data models, and verification.
- 📡 [REST API Reference](docs/api-reference.md): Detailed endpoint inventory for all 14 API modules with parameters and status codes.
- 🏛️ [Decoupled 3-Tier Architecture Guide](docs/decoupled-architecture.md): Independent build, deploy, environment, and scaling topology for Frontend, Backend, and Database.

## 7. Docker Deployment

Deploy the complete multi-container stack (PostgreSQL + API Server + Nginx Frontend):
```bash
docker-compose up -d --build
```
- Client accessible on: `http://localhost:80`
- API Server accessible on: `http://localhost:5000/api/v1`
- Database accessible on: `localhost:5432`

---

## 8. AI Provider Setup Guide

SwordNex AI CRM features a provider-agnostic AI Gateway. You can toggle between providers in `server/.env`:

```ini
# Choose provider: gemini | openai | anthropic | mock
AI_PROVIDER=gemini

# For Google Gemini
GEMINI_API_KEY="your-gemini-api-key"
DEFAULT_AI_MODEL="gemini-1.5-pro"

# For OpenAI
OPENAI_API_KEY="your-openai-api-key"

# For Anthropic Claude
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

*Note: When `AI_PROVIDER=mock` is selected, the built-in Intelligent Heuristic Engine runs locally with zero external API requirements.*

---

## 9. External Communication Adapters Setup

To enable live delivery in the Communication Hub, supply credentials in `server/.env` or configure them in the CRM Integrations UI:

### 1. Corporate Email (SMTP)
```ini
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT=587
SMTP_USER="postmaster@yourdomain.com"
SMTP_PASS="your-smtp-password"
SMTP_FROM="SwordNex CRM <sales@yourdomain.com>"
```

### 2. Twilio SMS Gateway
```ini
TWILIO_ACCOUNT_SID="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+15551234567"
```

### 3. WhatsApp Business API
```ini
WHATSAPP_API_TOKEN="EAAG..."
WHATSAPP_PHONE_NUMBER_ID="10982347..."
```

---

## 10. Security & Production Checklist

- [x] Multi-tenant boundary isolation enforced on all queries
- [x] Argon2 / bcrypt hashing for all stored credentials
- [x] Rate limiting & abuse prevention on all `/api` endpoints
- [x] Helmet security headers & CORS policy restrictions
- [x] Immutable audit trail for all sensitive operations
- [x] AI Prompt injection filters and strict tool permissions
- [x] Human-in-the-loop approval gates for autonomous agent actions
- [x] No secrets or credentials exposed to frontend code

---

© 2026 **SwordNex Technologies Private Limited**. All Rights Reserved.
