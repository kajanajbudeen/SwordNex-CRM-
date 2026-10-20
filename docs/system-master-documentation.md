# SwordNex AI CRM — System Master Documentation

> **Company:** SwordNex Technologies Private Limited  
> **Product:** SwordNex AI CRM (Enterprise Multi-Tenant SaaS Platform)  
> **Tagline:** *Your Trust, Our Mission*  
> **Version:** 1.0.0 Production Architecture  
> **Architecture:** Decoupled 3-Tier Multi-Tenant SaaS (React 18 + Node.js 18 + PostgreSQL 16)  
> **Primary API Base URL:** `http://localhost:5000/api/v1`  
> **Master Head Office API Base URL:** `http://localhost:5000/api/v1/swordnex-master`  

---

## 1. Executive Summary & System Overview

**SwordNex AI CRM** is a modern, secure, scalable, AI-powered multi-tenant Customer Relationship Management SaaS platform built to empower enterprise revenue teams to capture leads, accelerate deal velocity, automate cross-department workflows, and orchestrate customer communication from a unified cockpit.

The platform provides strict tenant isolation, dynamic role-based access control (RBAC), subscription-based resource entitlement gates, explainable predictive lead scoring, autonomous sales agents with human-in-the-loop oversight, and an Indian GST-compliant SaaS billing engine with native INR pricing.

---

## 2. Decoupled 3-Tier Enterprise Architecture

The platform follows a strictly decoupled, independently scalable 3-tier topology:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TIER 1: FRONTEND CLIENT (SPA)                            │
│        React 18 + TypeScript + Vite + Tailwind CSS + Lucide + Recharts      │
│  - Port 5173 (Dev) / Nginx Alpine Port 80 (Prod)                            │
│  - Role-aware dynamic navigation, Kanban pipeline, Real-time quota meters   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / JSON REST API (Port 5000)
                                       │ Authorization: Bearer <JWT>
                                       │ x-organization-id: <ORGANIZATION_UUID>
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              TIER 2: BACKEND REST API & AI GATEWAY APPLICATION              │
│           Node.js 18+ / Express 4 / TypeScript / Modular Services           │
│  - Authentication: JWT (1d access / 7d refresh) with rotation & revocation  │
│  - Multi-Tenant Middleware: Tenant Boundary Isolation Guard                 │
│  - Entitlement Engine: Dynamic seat limits, lead limits & live token meters │
│  - SaaS Billing Engine: Razorpay/Cashfree order checkout & HMAC validation  │
│  - AI Gateway: Gemini, OpenAI, Claude & Built-in Heuristic Fallback Engine  │
│  - AI Security: Prompt Injection Guard & Human-in-the-Loop Approval Gate    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ PostgreSQL Binary Protocol (TCP 5432)
                                       │ Connection URL via Prisma ORM Client
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TIER 3: DATABASE & PERSISTENCE                        │
│                 PostgreSQL 16 + Prisma ORM (35 Data Models)                 │
│  - Multi-tenant relational schema with indexes, foreign keys & soft-deletes │
│  - Extensions: uuid-ossp, pgcrypto, vector                                  │
│  - Dedicated volume persistence: swordnex_database_data                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Platform Portals & Access Control Separation

SwordNex CRM strictly segregates platform-wide super administration from customer tenant operations:

```
                  ┌──────────────────────────────────────────────┐
                  │          SwordNex Entry Gateways             │
                  └───────────────┬──────────────┬───────────────┘
                                  │              │
                   Super Admin    │              │  Customer Admin &
                   Credentials    │              │  Employees
                                  ▼              ▼
             ┌─────────────────────────┐    ┌─────────────────────────┐
             │   Master Head Office    │    │   Tenant CRM Cockpit    │
             │  /swordnex-master/login │    │         /login          │
             └────────────┬────────────┘    └────────────┬────────────┘
                          │                              │
                          ▼                              ▼
             ┌─────────────────────────┐    ┌─────────────────────────┐
             │ Platform Administration │    │ Isolated Organization   │
             │ - Global MRR/ARR in INR │    │ - Leads, Pipeline, Deals│
             │ - Org Suspension/Toggles│    │ - Communication Hub     │
             │ - Dynamic SaaS Plans    │    │ - Dynamic Custom Roles  │
             │ - Platform-wide Ledger  │    │ - 15-Day Free Trial/Sub │
             │ - Security Audit Logs   │    │ - Resource Quota Meters │
             └─────────────────────────┘    └─────────────────────────┘
```

### 3.1. Role Hierarchy & Boundaries

| Role Dimension | Role Identifier | Storage Model | Scope & Capabilities |
| :--- | :--- | :--- | :--- |
| **Platform Scope** | `SUPER_ADMIN` | `User.globalRole` | Full administrative control over the platform, all organizations, dynamic subscription plans, global revenue ledgers, and platform-wide audit logs. Provisioned strictly via secure server-side initialization. |
| **Platform Scope** | `USER` | `User.globalRole` | Standard user identity. Default for all customer signups and invited team members. Never permits access to Master Head Office endpoints. |
| **Tenant Scope** | `ADMIN` (Customer Admin) | `Membership.role` | Administrative authority within the tenant workspace: invite members, assign custom roles, modify organization settings, initiate upgrades/downgrades, and inspect audit logs. |
| **Tenant Scope** | `USER` (Employee) | `Membership.role` | Scoped employee within the workspace. Capabilities are governed by their assigned dynamic custom `Role` (`Membership.customRoleId`). |
| **Custom Dynamic RBAC** | Custom Role Matrix | `Role` & `RolePermission` | Custom granular module permissions across 8 distinct actions (`VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `EXPORT`, `ASSIGN`, `MANAGE`) across 12 modules. |

---

## 4. Multi-Tenancy & Security Architecture

### 4.1. Tenant Isolation
Every customer registration provisions an isolated `Organization` workspace. Every business entity contains a mandatory foreign key reference to `organizationId`.

The `tenant.middleware.ts` enforces that:
1. The authenticated user has an active membership in the requested organization.
2. The organization is active and not suspended or deactivated.
3. Every Prisma database query explicitly scopes by `where: { organizationId }`.
4. URL manipulation or cross-tenant query injections are rejected with `HTTP 403 Forbidden` or `HTTP 404 Not Found`.

### 4.2. Authentication & Session Security
- **Access Tokens**: Short-lived JWT access tokens (`1d` default, configurable down to `15m`) signed with a 32+ character secret.
- **Refresh Tokens & Rotation**: Long-lived refresh tokens (`7d`) verified at `/api/v1/auth/refresh` to issue rotated access and refresh tokens.
- **Session Revocation**: User logout at `/api/v1/auth/logout` logs security audit events and invalidates client-side tokens.
- **Registration Security**: Organization registration provisions an initial Customer Admin and assigns `globalRole: 'USER'`. Public registration **never** creates platform `SUPER_ADMIN` accounts.
- **Member Invitation Security**: Invitations via `/api/v1/organizations/members/invite` strictly permit tenant roles (`ADMIN` or `USER`), preventing unauthorized platform privilege escalation.

### 4.3. Dynamic Role-Based Access Control (RBAC)
Customer Admins can dynamically configure custom roles via `/settings/roles-permissions` without developer intervention.

#### Permission Actions Matrix:
Permissions are independently enforced per module across 8 distinct actions:
- `VIEW`: Read access to module records.
- `CREATE`: Permission to author new records.
- `EDIT`: Permission to update existing records.
- `DELETE`: Permission to remove records.
- `APPROVE`: Permission to approve sensitive actions (e.g., AI agent tasks or deal proposals).
- `EXPORT`: Permission to download CSV/PDF reports.
- `ASSIGN`: Permission to delegate records to team members.
- `MANAGE`: Complete administrative authority over the module.

#### Permitted Modules:
`LEADS` • `CONTACTS` • `COMPANIES` • `DEALS` • `TASKS` • `EMPLOYEES` • `REPORTS` • `SETTINGS` • `BILLING` • `WORKFLOWS` • `AI_CENTER` • `COMMS`

---

## 5. SaaS Subscription, Trial & Billing Engine

The SaaS billing engine provides automated trial management, resource entitlement enforcement, and Indian GST tax compliance.

### 5.1. SaaS Subscription Plans (Proposed Values in INR)

> [!NOTE]
> All commercial prices below represent **proposed values** subject to executive and business approval before formal production launch. Plan specifications are dynamically stored in the database (`SubscriptionPlanConfig`) and can be adjusted via `/swordnex-master/plans`.

| Attribute | 15-Day Free Trial | Standard Plan | Premium AI Suite |
| :--- | :--- | :--- | :--- |
| **Slug** | `FREE_TRIAL` | `STANDARD` | `PREMIUM` |
| **Monthly Price (Proposed)** | ₹0 | ₹2,499 / month | ₹7,499 / month |
| **Yearly Price (Proposed)** | ₹0 | ₹24,990 / year (~17% discount) | ₹74,990 / year (~17% discount) |
| **Included Seats** | Up to 5 User Accounts | Up to 10 User Accounts | Up to 50 User Accounts |
| **Custom Roles** | Up to 5 Roles | Up to 10 Roles | Unlimited Custom Roles |
| **Leads Database** | 15,000 Leads | 25,000 Leads | 100,000 Leads |
| **Monthly AI Tokens** | 500,000 Tokens | 1,000,000 Tokens | 5,000,000 Tokens |
| **Cloud Storage** | 1,000 MB (1 GB) | 5,000 MB (5 GB) | 25,000 MB (25 GB) |
| **Available Modules** | Core CRM + Reports | Core CRM + Comms + Workflows | All Modules + AI Center + APIs |
| **Support SLA** | Standard | Priority | Dedicated 24/7 |

### 5.2. Trial & Subscription Lifecycle State Machine

```
[Registration] ──► [15-Day Free Trial] ──► [Trial Active] ──► [Trial Expired]
                          │                                         │
                          │                                         ▼
                          │                              [3-Day Grace Period]
                          │                                         │
                          ▼                                         ▼
                   [Plan Selection]                        [Write Operations Blocked]
                          │                              (Historical Read Access Retained)
                          ▼
                   [Razorpay Order]
                          │
                          ▼
                [Verified Payment & GST] ──► [ACTIVE Subscription]
                          │                         │
                          ▼                         ▼
                [Immediate Upgrade] OR [Scheduled Downgrade at Period End]
```

- **15-Day Free Trial**: Automatically started upon organization registration. Authoritative server timestamps prevent client manipulation.
- **3-Day Grace Window**: If a trial expires, customers receive a 3-day grace banner before write operations (`POST`, `PUT`, `PATCH`, `DELETE`) return `HTTP 402 Payment Required`.
- **Zero Data Loss Guarantee**: Customer records and historical pipeline data are **never** deleted upon expiration or downgrade.
- **Immediate Upgrades**: Upgrades from Standard to Premium take effect immediately, expanding resource limits and generating a tax invoice.
- **Scheduled Downgrades**: Downgrades take effect on the customer's renewal date, preserving access through the prepaid period.
- **GST Invoicing (18%)**: Automatically generates sequential tax invoices (`INV-YYYY-XXXXX`) detailing subtotal, 18% GST, legal entity identifiers (CIN, GSTIN), and payment references. Note: Multi-state GST (CGST/SGST vs IGST) is planned for Phase 2.
- **Webhook Idempotency**: Payment webhooks from Razorpay/Cashfree are recorded in `PaymentWebhookEvent`. Duplicate webhooks return `duplicate_ignored` with zero double-billing risk.

### 5.3. Entitlement Limits Enforcement Matrix

| Resource / Gate | Enforcement Point | Method / Check | Behavior on Quota Exceeded |
| :--- | :--- | :--- | :--- |
| **User Seats** | `POST /organizations/members/invite` | `EntitlementService.checkSeatLimit` | `HTTP 402 Payment Required` (`SEAT_LIMIT_EXCEEDED`) |
| **Lead Capacity** | `POST /leads` | `EntitlementService.checkLeadLimit` | `HTTP 402 Payment Required` (`LEAD_LIMIT_EXCEEDED`) |
| **AI Token Consumption** | `POST /ai/*` | `EntitlementService.consumeAiTokens` | `HTTP 402 Payment Required` (`AI_TOKENS_EXHAUSTED` / `AI_NOT_ENABLED`) |
| **Module Gates** | Route Middleware | `EntitlementService.checkModuleAccess` | `HTTP 402 Payment Required` (`FEATURE_NOT_INCLUDED_IN_PLAN`) |
| **Trial Expiry** | CRM Data Routes | `subscription.middleware.ts` | `HTTP 402 Payment Required` (`TRIAL_EXPIRED`) on writes after grace period |

---

## 6. Super Admin Master Platform Console (`/swordnex-master`)

The Super Admin portal is an isolated platform cockpit restricted to `SUPER_ADMIN` identities:

1. **Dashboard & Analytics (`/swordnex-master/dashboard` & `/subscriptions/analytics`)**:
   - Monthly Recurring Revenue (MRR) & Annual Recurring Revenue (ARR) in INR.
   - Active paid subscriptions, active trials, and trial-to-paid conversion rates.
   - Plan distribution analytics across all organizations.
2. **Customer Subscriptions Console (`/swordnex-master/subscriptions`)**:
   - Search across all organizations by company name, slug, or domain.
   - Filter by subscription lifecycle status (`ACTIVE`, `TRIALING`, `EXPIRED`, `SUSPENDED`, `CANCELED`).
   - **Manual Extension Action**: Extend trial or subscription end dates by $N$ days with mandatory administrative justification logging.
   - **Status Transition Action**: Suspend or reactivate accounts with logged audit reasoning.
3. **Financial Ledgers**:
   - **Payments Ledger**: Real-time log of all gateway transactions (order ID, payment ID, amount, provider, status).
   - **Tax Invoices Ledger**: Centralized repository of all issued GST tax receipts with printable modal preview.
4. **Dynamic Plan Configurator (`/swordnex-master/plans`)**:
   - Real-time modification of prices, seat limits, lead capacities, token quotas, and permitted modules.
5. **Platform Security Audit Trail (`/swordnex-master/audit-logs`)**:
   - Immutable audit stream recording every privileged administrative action.

---

## 7. Core CRM Functional Modules

### 7.1. Lead Management (`/leads`)
- **Ingestion**: Webhooks, manual creation, and bulk CSV import.
- **Explainable Predictive AI Scoring (0–100)**: Multi-factor scoring analyzing buyer role seniority, domain verification, and inquiry intent.
- **One-Click Atomic Conversion**: Converts qualified leads into linked `Contact`, `Company`, and `Deal` records within an atomic database transaction.

### 7.2. Visual Kanban Deal Pipeline (`/deals`)
- Drag-and-drop opportunity cards across configured stages.
- Automated stage probability calculations and weighted revenue forecasting.
- AI Deal Health diagnostics flagging stalled opportunities and churn risks.

### 7.3. Customer 360 & Accounts (`/contacts` & `/companies`)
- Complete customer profile with contact information, department, and lifecycle stages (`LEAD`, `MQL`, `SQL`, `CUSTOMER`).
- Corporate account profiles tracking industry, annual revenue, health scores, and churn risk indexing (`LOW`, `MEDIUM`, `HIGH`).

### 7.4. Tasks & Follow-up Sequences (`/tasks`)
- Task creation linked to leads, contacts, and deals.
- Due dates, category tags (`CALL`, `EMAIL`, `MEETING`, `PREPARATION`), and priority ratings (`URGENT`, `HIGH`, `MEDIUM`, `LOW`).
- Automated past-due detection highlighting overdue follow-ups.

### 7.5. Customer Activity Timeline (`/activities`)
- Unified audit timeline of all customer interactions (`NOTE`, `CALL`, `EMAIL`, `MEETING`, `STATUS_CHANGE`).

### 7.6. Unified Communication Hub (`/inbox` & `/comms`)
- Integrated customer communication threads across **Corporate Email (SMTP)**, **Twilio SMS**, and **WhatsApp Business API**.
- Delivery status tracking (`QUEUED`, `SENT`, `DELIVERED`, `READ`, `FAILED`).
- Honest delivery reporting: dispatches return `FAILED` with explicit queue notes when external provider credentials are unconfigured.

---

## 8. AI-Powered Intelligence Suite (`/ai-center`)

SwordNex CRM features a provider-agnostic AI Gateway supporting Google Gemini, OpenAI, Anthropic Claude, and a built-in Intelligent Heuristic fallback engine:

1. **Context-Aware Sales Copilot**: Natural-language chat assistant answering pipeline velocity, overdue follow-up, and deal risk queries scoped exclusively to the requesting user's tenant data.
2. **Built-in Prompt Injection Defense**: Active regex-based guard detecting attempts to bypass safety boundaries, leak credentials, or override system instructions.
3. **Token Quota Protection**: Every AI invocation consumes budgeted tokens against the organization's monthly quota (`consumeAiTokens`).
4. **Prescriptive Next Best Actions**: Analyzes opportunity signals and recommends specific closing tactics for account executives.
5. **Sales Email Drafter**: Drafts personalized sales follow-up copy tailored by objective and tone.
6. **Meeting Transcript Summarizer**: Extracts key takeaways, client objections, and actionable follow-up tasks from transcripts.
7. **Autonomous Sales Agents with Human-in-the-Loop Gates**: Autonomous agents perform background lead qualification and outreach preparation; sensitive external operations pause in `WAITING_APPROVAL` status until a supervisor explicitly approves the action.

---

## 9. Visual Automation Workflow Builder (`/workflows`)

- Event-driven visual workflow engine supporting `Trigger → Conditions → Actions → Execution Log`.
- **Triggers**: `LEAD_CREATED`, `LEAD_UPDATED`, `DEAL_STAGE_CHANGED`, `TASK_OVERDUE`, `SCORE_THRESHOLD`.
- **Actions**: Auto-assign owner, create follow-up task, send notification, or invoke AI scoring.
- Execution run ledger (`WorkflowRun`) recording input data, step results, and error logs.

---

## 10. Database Schema Specification (35 Normalized Models)

The PostgreSQL 16 schema consists of **35 normalized models**:

1. `Organization`: Multi-tenant root entity with unique slug and status.
2. `User`: Identity model with email, bcrypt password hash, and global role (`SUPER_ADMIN` or `USER`).
3. `Membership`: Tenant-to-user linkage with role (`ADMIN` or `USER`) and custom role references.
4. `Role`: Dynamic custom organizational roles.
5. `RolePermission`: Granular module-action permissions matrix.
6. `Team`: Department and team groupings with designated leaders.
7. `TeamMember`: Team roster mapping.
8. `Lead`: Inbound prospects with explainable AI scores.
9. `Company`: Corporate accounts with technographics and health scores.
10. `Contact`: Individual stakeholder profiles.
11. `Pipeline`: Customizable sales pipelines.
12. `PipelineStage`: Ordered stages with win probability ratings.
13. `Deal`: Sales opportunities with expected close dates and values.
14. `Activity`: Customer timeline events (`CALL`, `EMAIL`, `MEETING`, `STATUS_CHANGE`, `NOTE`).
15. `Task`: Scheduled follow-ups with priority queues.
16. `Conversation`: Multi-channel communication threads.
17. `Message`: Individual messages across Email, WhatsApp, and SMS.
18. `Campaign`: Email and SMS marketing campaigns.
19. `AutomationWorkflow`: Trigger-condition-action definitions.
20. `WorkflowRun`: Step-by-step automation execution history.
21. `AiInsight`: Explainable intelligence records and risk flags.
22. `AiAgentRun`: Autonomous agent execution state and human approval flags.
23. `Integration`: External adapter credentials and connection health status.
24. `SubscriptionPlanConfig`: Dynamic SaaS pricing and quota specifications.
25. `Subscription`: Live organization subscription state and trial dates.
26. `Payment`: Cryptographic payment ledger records.
27. `Invoice`: 18% GST tax invoices.
28. `PaymentWebhookEvent`: Idempotent webhook event ledger.
29. `Notification`: In-app user notifications.
30. `LoginSession`: User session tracking and token hash revocation.
31. `PasswordResetToken`: Cryptographic single-use password reset tokens.
32. `UsageRecord`: Time-series quota consumption tracking.
33. `AuditLog`: Immutable security and privileged action log.
34. `ConsentRecord`: Data privacy and communication consent tracking.
35. `Attachment`: File attachments and uploads metadata.

---

## 11. Security Credential Provisioning Guidelines

> [!CAUTION]
> In compliance with enterprise security requirements, production-facing documentation **never** publishes shared credentials, default passwords, or reusable secrets.

### 11.1. Platform Super Administrator Provisioning
Platform Super Administrator accounts must be provisioned through secure server initialization scripts or direct database seeding:
1. Set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` in your secure deployment environment variables or secret manager.
2. Execute the dedicated administrative seeding script:
   ```bash
   npm --prefix server run prisma:seed
   ```
3. Never expose Super Admin credentials in client applications or version control repositories.

### 11.2. Customer Organization Onboarding
New customer accounts are created exclusively through the public registration interface (`/register` or `POST /api/v1/auth/register`), which establishes:
- An isolated organization workspace.
- The initial Customer Admin account with strong bcrypt password hashing.
- An automatic 15-day Free Trial with zero credit card required.

---

## 12. Implementation & Verification Status Matrix

| Module / Feature | Status | Implementation Details |
| :--- | :--- | :--- |
| **Decoupled 3-Tier Architecture** | `[IMPLEMENTED]` | Strict separation across `client/` (React 18), `server/` (Express/TS), and `database/` (PostgreSQL 16). |
| **Multi-Tenancy Isolation** | `[IMPLEMENTED]` | Verified tenant boundary guard in `tenant.middleware.ts` scoping every query by `organizationId`. |
| **Global vs. Tenant Roles** | `[IMPLEMENTED]` | Platform roles (`SUPER_ADMIN`, `USER`) separated from workspace membership roles (`ADMIN`, `USER`). |
| **Dynamic Custom RBAC** | `[IMPLEMENTED]` | Dynamic creation, duplication, deletion, and assignment of custom roles across 12 modules. |
| **15-Day Free Trial Auto-Provisioning** | `[IMPLEMENTED]` | Auto-provisions 15-day trial on registration with authoritative server timestamps. |
| **Trial Grace Period & Write Restrictions**| `[IMPLEMENTED]` | 3-day grace period; blocks write operations (`402`) while preserving historical read access. |
| **Lead Quota Enforcement** | `[IMPLEMENTED]` | `EntitlementService.checkLeadLimit` blocks creation if quota exceeded. |
| **Seat Limit Enforcement** | `[IMPLEMENTED]` | `EntitlementService.checkSeatLimit` blocks invitations if active user count reaches quota. |
| **AI Token Metering** | `[IMPLEMENTED]` | `EntitlementService.consumeAiTokens` validates token budget before AI operations. |
| **AI Prompt Injection Guard** | `[IMPLEMENTED]` | Built-in regex guard in `AiGateway` neutralizing malicious override attempts. |
| **Human-in-the-Loop Agent Gates** | `[IMPLEMENTED]` | Sensitive agent operations enter `WAITING_APPROVAL` status until supervisor approval. |
| **GST Tax Invoicing (18%)** | `[IMPLEMENTED]` | Sequential numbering `INV-YYYY-XXXXX`, itemized 18% GST, CIN, GSTIN, and company details. |
| **Webhook Idempotency** | `[IMPLEMENTED]` | `PaymentWebhookEvent` rejects duplicate webhook replays with `duplicate_ignored`. |
| **Payment Signature Verification** | `[IMPLEMENTED]` | Cryptographic HMAC SHA256 verification for Razorpay orders. |
| **Scheduled Downgrades & Zero Data Loss**| `[IMPLEMENTED]` | Downgrades take effect on renewal date; customer historical data is preserved. |
| **Super Admin Platform Console** | `[IMPLEMENTED]` | Dedicated routes (`/api/v1/swordnex-master/*`) and UI (`/swordnex-master/*`). |
| **Multi-State GST (CGST/SGST vs IGST)** | `[PLANNED]` | Dynamic state-code tax split based on customer billing address. |
| **Live SMS/WhatsApp Gateway Delivery** | `[PARTIALLY IMPLEMENTED]`| Controller structure active; reports unconfigured provider queue note unless API keys set. |
| **Multi-Factor Authentication (MFA)** | `[PLANNED]` | TOTP / Authenticator app integration scheduled for Phase 2. |
| **Automated Database Backups** | `[PLANNED]` | PostgreSQL WAL-G / pg_dump daily automated snapshot schedule. |

---

## 13. Automated Test Suite Results

The platform test suite has been executed with Vitest covering unit, integration, multi-tenancy, entitlement, and security test suites:

```
 RUN  v2.1.9 E:/SNCRM/server

 ✓ tests/subscription-engine.test.ts (12 tests)
 ✓ tests/rbac-subscription.test.ts (15 tests)
 ✓ tests/ai.test.ts (2 tests)
 ✓ tests/security-entitlements.test.ts (13 tests)
 ✓ tests/auth.test.ts (3 tests)
 ✓ tests/tenant.test.ts (1 test)

 Test Files  6 passed (6)
      Tests  46 passed (46)
   Duration  8.94s
```

- **Frontend Production Build**: `tsc && vite build` compiled 2,400 modules cleanly into `client/dist/` with zero compilation errors.
- **Backend Production Build**: `tsc` compiled server TypeScript into `server/dist/` with zero compilation errors.

---

## 14. Running and Operating the Application

```bash
# 1. Start Database Container
npm run db:up

# 2. Push Schema & Seed Initial Data
npm run db:push
npm run db:seed

# 3. Start Both Tiers Concurrently
npm run dev

# 4. Access Platform
# - Customer CRM Portal: http://localhost:5173/login
# - Super Admin Master Portal: http://localhost:5173/swordnex-master/login
# - Backend REST API: http://localhost:5000/api/v1
# - Master Head Office API: http://localhost:5000/api/v1/swordnex-master
```

---

*© 2026 SwordNex Technologies Private Limited. All Rights Reserved.*
