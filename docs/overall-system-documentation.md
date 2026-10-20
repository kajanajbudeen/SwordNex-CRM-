# SwordNex AI CRM — Overall Master System Documentation

> **Company:** SwordNex Technologies Private Limited  
> **Product:** SwordNex AI CRM (Intelligent Enterprise Multi-Tenant Cloud CRM)  
> **Tagline:** *Understand Customers. Predict Opportunities. Accelerate Growth.*  
> **Release Version:** 1.0.0 Production Architecture  
> **System Topology:** Decoupled 3-Tier Multi-Tenant SaaS (React 18 + Node.js 18 + PostgreSQL 16)  
> **API Base URL:** `http://localhost:5000/api/v1`  
> **Frontend URL:** `http://localhost:5173`  
> **Master HQ Portal:** `http://localhost:5173/swordnex-master/login`  
> **Quality Gate Status:** 64 / 64 Automated Tests Passing (100% Pass Rate across 8 Test Files)  

---

## 1. Executive Summary & Brand Overview

**SwordNex AI CRM** is a modern, high-performance, enterprise SaaS Customer Relationship Management system developed for **SwordNex Technologies Private Limited**. Engineered around a decoupled 3-tier architecture, the platform integrates customer data management, explainable predictive AI lead scoring, autonomous sales agent workflows, Indian SaaS billing with 18% GST invoicing, dynamic RBAC, and multi-tenant workspace isolation.

### Core Architectural Values:
- **100% Dynamic Full-Stack**: Zero static mock files. Every view, transaction, quota meter, and recalculation queries live PostgreSQL tables through Prisma ORM and Express REST endpoints.
- **Strict Multi-Tenant Isolation**: All organizational data is scoped by `organizationId` verified on the server side via database membership lookup. Foreign organization header overrides are strictly rejected (`HTTP 403`).
- **Instantaneous Session Revocation**: Backed by database-enforced `tokenVersion`. User logouts, password resets, and administrative revocations invalidate existing JWT access and refresh tokens immediately.
- **Cryptographic Password Recovery**: Implements secure 1-hour expiration SHA-256 hashed password reset tokens with timing-attack safe responses.
- **Explainable Predictive AI**: Mathematical multi-factor lead scoring (0–100) and AI Deal Health diagnosis with transparent risk factors and human-in-the-loop oversight queues.
- **Indian SaaS Native**: Configurable INR pricing tiers (Free Trial, Standard @ ₹2,499/mo, Premium @ ₹7,499/mo), cryptographic Razorpay HMAC SHA256 signature verification, and automated 18% GST tax invoices (`INV-YYYY-XXXXX`).

---

## 2. Decoupled 3-Tier Architecture Diagram

```mermaid
graph TD
    subgraph Tier_3_Frontend ["Tier 3: Frontend Client (Single Page App)"]
        UI["React 18 + TypeScript + Vite + Tailwind CSS"]
        Router["React Router v6 Navigation"]
        State["Auth Context + Copilot Context"]
        Assets["Brand Tab Favicons + Corporate Menu Logo"]
        APIClient["API Client (fetch with Bearer JWT + x-org-id)"]
    end

    subgraph Tier_2_Backend ["Tier 2: Backend REST API & AI Gateway"]
        Server["Express 4 + Node.js 18 + TypeScript (Port 5000)"]
        AuthMid["JWT Auth Guard with tokenVersion Session Revocation"]
        TenantMid["Server-Verified Tenant Membership Guard (x-organization-id)"]
        RBACMid["Dynamic RBAC & 8-Action Permission Gate"]
        EntitleMid["Entitlement Quota Engine (Seats, Leads, Tokens, Storage)"]
        SubMid["15-Day Trial & 3-Day Grace Period Write Guard"]
        AIGateway["AI Gateway (Gemini, Claude, OpenAI & Heuristics)"]
        BillingEng["Billing Engine (Razorpay HMAC + 18% GST Invoicing)"]
    end

    subgraph Tier_1_Database ["Tier 1: Relational Database & Persistence"]
        PG["PostgreSQL 16 Transactional Store (Port 5432)"]
        Prisma["Prisma ORM (26 Normalized Relational Models)"]
        Vol["Docker Volume: swordnex_database_data"]
    end

    UI --> Router
    Router --> State
    State --> APIClient
    APIClient -->|HTTP / JSON via Port 5000| Server
    Server --> AuthMid
    AuthMid --> TenantMid
    TenantMid --> RBACMid
    RBACMid --> EntitleMid
    EntitleMid --> SubMid
    SubMid --> AIGateway
    SubMid --> BillingEng
    Server --> Prisma
    Prisma -->|TCP Binary Protocol| PG
    PG --> Vol
```

---

## 3. Platform Portals & Security Role Boundaries

SwordNex AI CRM separates platform governance from customer tenant operations:

```mermaid
flowchart TD
    User([User Entry Gateway]) --> AuthDecision{Portal Routing}
    
    AuthDecision -->|Platform Super Admins| MasterGate["Master Head Office Portal (/swordnex-master/login)"]
    AuthDecision -->|Customer Admins & Team Members| TenantGate["Tenant CRM Cockpit (/login)"]

    MasterGate --> SuperAdminActions["Platform Super Admin Capabilities:
    • Global Platform MRR / ARR Analytics in INR
    • Dynamic Plan Configurator (Pricing, Quotas, Modules)
    • Cross-Tenant Organization Management (Suspend/Reactivate)
    • Manual Subscription & Trial Day Extensions
    • Master Payment Ledgers & Platform Tax Invoices
    • Immutable Security Audit Trail"]

    TenantGate --> TenantActions["Isolated Organization Workspace:
    • Lead Management & 1-Click Conversion
    • Visual Drag-and-Drop Kanban Deal Pipeline
    • Customer 360 (Contacts, Companies, Timeline)
    • Unified Communication Inbox (Email, SMS, WhatsApp)
    • Visual Event-Driven Automation Workflows
    • AI Sales Copilot, Email Drafter, Meeting Summarizer
    • SaaS Subscription, Resource Quota Meters & 18% GST Billing"]
```

### Role Matrix & Hierarchy

| Role Scope | Role Name | Enforcement Field | Scope & Authorities |
|---|---|---|---|
| **Platform Scope** | `SUPER_ADMIN` | `User.globalRole` | Full administrative authority across the entire platform, all customer workspaces, SaaS plan definitions, and global revenue ledgers. Strict server-side assignment. |
| **Platform Scope** | `USER` | `User.globalRole` | Standard user identity for all tenant signups and invited teammates. Access to `/swordnex-master/*` is strictly forbidden (`HTTP 403`). |
| **Tenant Scope** | `ADMIN` (Workspace Owner) | `Membership.role` | Administrative control inside the tenant workspace: manage teammates, adjust custom roles, upgrade plans, download invoices. |
| **Tenant Scope** | `AGENT` / `USER` (Employee) | `Membership.role` | Standard team seat inside the workspace. Specific abilities are determined by dynamic custom roles (`Membership.customRoleId`). |
| **Custom Dynamic RBAC** | Custom Role Matrix | `Role` & `RolePermission` | Custom granular permissions across 8 distinct actions (`VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `EXPORT`, `ASSIGN`, `MANAGE`) across 12 modules. |

---

## 4. Complete Functional Modules Breakdown (14 Modules)

### 1. Executive AI Cockpit & Dashboard (`/dashboard`)
- Real-time revenue velocity, win rates, active pipeline totals, overdue tasks, and lead volume.
- Interactive charts: Stage Volume Distribution and Acquisition Channel Attribution.
- Contextual shortcuts to ask the AI Sales Copilot questions grounded in live tenant data.

### 2. Lead Management & Predictive AI Scoring (`/leads`)
- Ingest leads from webhooks, contact forms, and CSV imports.
- Multi-factor explainable predictive scoring (0–100) analyzing role seniority, corporate domain authenticity, and interest intent.
- One-click atomic database conversion into linked `Contact`, `Company`, and `Deal` records.
- **Enterprise RFC 4180 CSV Data Export**: `GET /api/v1/leads/export/csv` protected by `requirePermission('LEADS', 'EXPORT')` with automated audit trail logging and one-click frontend export button.

### 3. Interactive Kanban Deal Pipeline (`/deals`)
- Visual drag-and-drop stage progression: `New` → `Qualified` → `Discovery` → `Proposal` → `Negotiation` → `Won` / `Lost`.
- Real-time AI Deal Health diagnosis flagging stalled opportunities, days in stage, and recommended risk mitigations.
- Multi-pipeline switcher and weighted pipeline forecasting.
- **Enterprise RFC 4180 CSV Data Export**: `GET /api/v1/deals/export/csv` protected by `requirePermission('DEALS', 'EXPORT')` exporting pipeline stage, probability weightings, and commercial totals.

### 4. Contacts Directory (`/contacts`)
- Stakeholder profiles with department, lifecycle stages (`LEAD`, `MQL`, `SQL`, `CUSTOMER`), phone, and email.
- Real-time search, filtering, and direct links to parent companies.
- **Enterprise RFC 4180 CSV Data Export**: `GET /api/v1/contacts/export/csv` protected by `requirePermission('CONTACTS', 'EXPORT')` with customer stakeholder and company attribution.

### 5. Accounts & Customer 360 (`/companies`)
- Corporate profiling: Industry, employee headcount, annual revenue, website, and technographics.
- Account Health Score (0–100) and Churn Risk Indexing (`LOW`, `MEDIUM`, `HIGH`).

### 6. Tasks & Follow-up Sequences (`/tasks`)
- Actionable task tracking categorized by `CALL`, `EMAIL`, `MEETING`, and `FOLLOW_UP`.
- Priority levels (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) and automated overdue detection.

### 7. Unified Communication Hub (`/inbox`)
- Consolidated multi-channel communication timeline for Corporate Email (SMTP), Twilio SMS, and WhatsApp Business API.
- Real-time message status tracking (`QUEUED`, `SENT`, `DELIVERED`, `READ`, `FAILED`).
- **Inbound Webhook & Callback Engine**: Public endpoint `POST /api/v1/comms/webhook/:provider` ingesting delivery receipts (`DELIVERED`, `READ`, `FAILED`) and inbound customer messages, auto-associating with tenant conversations.
- Honest limitation reporting: logs explicit simulation notes if external gateway credentials are unconfigured.

### 8. Campaigns Management (`/campaigns`)
- Omnichannel outbound campaign orchestrator across Email, SMS, and WhatsApp.
- Budget allocation, conversion tracking, recipient targeting, and ROI analytics.
- **Anti-Spam & Consent Suppression**: Automated suppression of unsubscribed contacts against `ConsentRecord` prior to dispatch (`POST /api/v1/campaigns/:id/send`).
- **One-Click Unsubscribe Endpoint**: Public `POST /api/v1/campaigns/unsubscribe` adhering to CAN-SPAM, GDPR, and DPDP Act 2023 compliance.

### 9. AI Center & Autonomous Sales Agents (`/ai-center`)
- **Explainable Lead Scoring Simulator**: Interactive simulator showing real-time score calculation breakdowns.
- **Live LLM Integration**: Multi-provider support for Google Gemini (`gemini-1.5-flash`) and OpenAI (`gpt-4o-mini`) with automatic fallback to internal reasoning engine on timeout or unconfigured keys.
- **Dynamic Meeting Transcript Summarizer**: Intelligently parses transcript text, detects speakers, extracts actionable commitments with owners and deadlines, and classifies customer sentiment (`POSITIVE`, `NEUTRAL`, `SKEPTICAL`, `CHALLENGING`).
- **Context-Aware Sales Copilot**: Dynamic prompt assistant synthesizing actionable guidance from live tenant database records.
- **Sales Email Drafter**: Multi-tone, objective-driven email generator personalized to recipient and key commercial points.
- **Autonomous Agents**: Autonomous lead research agents with Human-in-the-Loop approval queues for high-risk actions.

### 10. Visual Automation Workflow Builder (`/workflows`)
- Event-driven automation engine: `Trigger → Conditions → Actions → Execution Logs`.
- Triggers on lifecycle events (deal stage changed, lead status updated, task completed).
- Automated actions include task creation, notification dispatch, and field updates.

### 11. Reports & Forecasting (`/reports`)
- Comprehensive sales velocity charts, pipeline health analytics, lead conversion funnels, and exportable reports.

### 12. SaaS Subscription, Trial & 18% GST Invoicing (`/billing`)
- 15-day automated Free Trial with 3-day grace period enforcement.
- Real-time resource quota meters: Seat utilization, lead capacity, AI token consumption, storage.
- Razorpay / Cashfree order checkout simulation with cryptographic HMAC signature verification.
- Automated Indian GST-compliant (18%) tax invoices (`INV-YYYY-XXXXX`) with printable receipts.

### 13. Team Management & Invitations (`/team`)
- Secure teammate invitation modal assigning standard tenant roles (`ADMIN`, `AGENT`).
- Member status controls (`ACTIVE`, `PENDING`, `INACTIVE`) and team grouping.

### 14. Roles, Permissions & Security Settings (`/settings`)
- Dynamic custom role builder with 8-action permission toggles across 12 modules.
- Immutable security audit logs recording all organizational mutations.

---

## 5. Security & Authentication Architecture (Phase 2 Enhanced)

### 5.1. Session Revocation via `tokenVersion`
- Every user account maintains a `tokenVersion` integer in PostgreSQL.
- Both Access Tokens (`1d`) and Refresh Tokens (`7d`) encode `tokenVersion` inside their cryptographic payload.
- Upon calling `POST /api/v1/auth/logout` or resetting/changing password, `tokenVersion` is atomically incremented on the database record.
- [auth.middleware.ts](file:///e:/SNCRM/server/src/middleware/auth.middleware.ts) validates `payload.tokenVersion === user.tokenVersion` on every incoming API request. If mismatched, access is immediately blocked with `HTTP 401 Session revoked`.

### 5.2. Cryptographic Password Reset Flow
- **Request Endpoint**: `POST /api/v1/auth/forgot-password` generates a high-entropy random token (`crypto.randomBytes(32)`).
- **Storage**: Only the SHA-256 hash of the token is saved to the database with a strict 1-hour expiration timestamp.
- **Confirmation Endpoint**: `POST /api/v1/auth/reset-password` matches the SHA-256 hash, hashes the new password with bcrypt (10 rounds), invalidates the token, and increments `tokenVersion` to revoke all existing sessions.
- **Change Password**: `POST /api/v1/auth/change-password` requires the current password, verifies via bcrypt, updates to the new password, and increments `tokenVersion`.

### 5.3. Payment Gateway Security
- In production (`NODE_ENV === 'production'`), [subscription.controller.ts](file:///e:/SNCRM/server/src/controllers/subscription.controller.ts) strictly requires `RAZORPAY_KEY_SECRET` and validates the HMAC SHA-256 signature (`orderId|paymentId`). Tampered or unsigned requests are rejected with `HTTP 400 Cryptographic payment signature verification failed`.

---

## 6. SaaS Subscription & 18% GST Tax Invoicing Engine

### Subscription Tiers (Native INR Pricing)

| Feature / Quota | 15-Day Free Trial | Standard Plan | Premium AI Suite |
|---|---|---|---|
| **Plan Slug** | `FREE_TRIAL` | `STANDARD` | `PREMIUM` |
| **Monthly Price** | ₹0 | **₹2,499** / month | **₹7,499** / month |
| **Yearly Price** | ₹0 | **₹24,990** / year *(~17% discount)* | **₹74,990** / year *(~17% discount)* |
| **User Seats** | 5 Seats | 10 Seats | 50 Seats |
| **Custom Roles** | 5 Custom Roles | 10 Custom Roles | Unlimited |
| **Lead Capacity** | 15,000 Leads | 25,000 Leads | 100,000 Leads |
| **Monthly AI Tokens** | 500,000 Tokens | 1,000,000 Tokens | 5,000,000 Tokens |
| **Cloud Storage** | 1,000 MB (1 GB) | 5,000 MB (5 GB) | 25,000 MB (25 GB) |
| **Included Modules** | Core CRM + Reports | Core CRM + Comms + Workflows | All 14 Modules + AI Center + APIs |
| **18% GST Invoices** | Printable Confirmation | Official Tax Receipt (`INV-YYYY-XXXXX`) | Official Tax Receipt (`INV-YYYY-XXXXX`) |

### Automated Enforcement Rules:
1. **Seat Gate**: Inviting a teammate checks current seat count against plan quota before persisting. Exceeding quota returns `HTTP 402 Payment Required`.
2. **Lead Gate**: Ingesting leads verifies total database volume against plan capacity.
3. **AI Token Gate**: Every AI Copilot or scoring prompt meters token consumption in real time.
4. **15-Day Trial Expiration**: Authoritative server timestamps govern trial expiration. When expired, a 3-day grace period allows read access while blocking write operations.
5. **Zero Data Loss**: Downgrades or expirations never purge customer records. Historical data remains intact.

---

## 7. Preloaded Demo Seed Credentials

All preloaded test accounts use the universal password: **`SwordNex2026!`**

| Portal | URL | Role | Name | Email | Organization | Status |
|---|---|---|---|---|---|---|
| **Master Platform** | `/swordnex-master/login` | `SUPER_ADMIN` | **Kaja Najbudeen** | `admin@swordnex.com`<br>`kaja@swordnex.com` | SwordNex Platform HQ | Full Global Authority |
| **Tenant CRM** | `/login` | `ADMIN` | **Aneee** | `aneee@swordnex.com` | SwordNex Technologies Global | Active (Premium Plan) |
| **Tenant CRM** | `/login` | `AGENT` | **Venkat** | `venkat@swordnex.com` | SwordNex Technologies Global | Active (Standard Seat) |
| **Tenant CRM** | `/login` | `ADMIN` | **Rahul Nexus** | `rahul.nexus@example.com` | Nexus Innovations | 15-Day Free Trial (Active) |
| **Tenant CRM** | `/login` | `ADMIN` | **Kavita Media** | `kavita.media@example.com` | Starlight Media | Suspended Org (Write Locked) |

---

## 8. Brand Assets & Visual Identity

```
client/public/
├── favicon.ico                 # Standard multi-resolution Windows/browser icon
├── favicon-16x16.png           # 16x16 crisp favicon
├── favicon-32x32.png           # 32x32 standard retina favicon
├── logo192.png                 # 192x192 mobile / PWA application icon
├── tab-icon.png                # 512x512 high-res square browser tab icon
├── tab-icon-transparent.png    # 512x512 transparent background variant
├── menu-logo.png               # Official horizontal corporate logo
├── menu-logo-dark.png          # High-contrast luminous logo for dark headers
└── menu-logo-card.png          # Soft white card badge presentation
```

- **Browser Tab Favicon**: Hexagonal royal blue **S** icon loaded in `client/index.html`.
- **Sidebar Menu Logo**: The wide **SwordNex Technologies PVT. LTD** banner logo with the tagline *"Your Trust, Our Vision"* is embedded in the main navigation sidebar, Master Head Office navigation, and login portals.

---

## 9. Quality Gates & Automated Test Coverage

```
Test Files  8 passed (8)
     Tests  64 passed (64)
  Duration  11.80s
```

### Verified Test Suites:
- `tests/phase3-modules-ai.test.ts` (10 tests) — RFC 4180 CSV exports for Leads, Contacts, and Deals with RBAC checks; inbound webhook status callbacks; anti-spam opt-out suppression; and dynamic AI meeting summarization.
- `tests/security-phase2.test.ts` (8 tests) — Session revocation via `tokenVersion`, SHA-256 password reset flow, IDOR prevention, and cryptographic HMAC payment checks.
- `tests/security-entitlements.test.ts` (13 tests) — Tenant isolation, public registration safety, invite privilege checks, quota enforcement, webhook replay prevention, and prompt injection defense.
- `tests/rbac-subscription.test.ts` (15 tests) — Dynamic custom roles, module permission checks, and plan quota gates.
- `tests/subscription-engine.test.ts` (12 tests) — 15-day trial arithmetic, 3-day grace period, upgrade/downgrade lifecycles, and 18% GST calculation.
- `tests/auth.test.ts` (3 tests) — Invalid credential rejection, JWT generation, and route protection.
- `tests/ai.test.ts` (2 tests) — Multi-factor predictive lead scoring formulas.
- `tests/tenant.test.ts` (1 test) — Cross-tenant boundary enforcement.
