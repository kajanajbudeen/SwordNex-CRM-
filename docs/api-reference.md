# SwordNex AI CRM — REST API Reference (v1)

> **API Version:** `v1`  
> **Tenant API Base URL:** `http://localhost:5000/api/v1`  
> **Master Head Office API Base URL:** `http://localhost:5000/api/v1/swordnex-master` (alias: `/api/swordnex-master`)  
> **Protocol:** HTTPS / JSON REST  
> **Standard Request Headers:**
> ```http
> Authorization: Bearer <JWT_ACCESS_TOKEN>
> x-organization-id: <ORGANIZATION_UUID>
> Content-Type: application/json
> ```

---

## 🔐 Implementation & Verification Status Legend

Every endpoint documented below reflects actual codebase inspection:

- `[IMPLEMENTED]`: Fully implemented in controllers, routes, middleware, and validated by automated test suites.
- `[PARTIALLY IMPLEMENTED]`: Core handler active; relies on fallback heuristics, mock delivery, or requires external provider credentials.
- `[PLANNED]`: Roadmapped production feature; interface planned or database model prepared.
- `[UNVERIFIED / PROTOTYPE]`: Legacy or prototype endpoint retained for backward compatibility; not recommended for production billing flows.

---

## 1. Authentication & Session Security (`/auth`)

Public and session management endpoints. Registration provisions a new tenant workspace and its initial **Customer Admin** (`Membership.role = 'ADMIN'`, `User.globalRole = 'USER'`). Platform Super Admins are **never** provisioned through public registration.

| Method | Endpoint | Auth Required | Status | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | None (Public) | `[IMPLEMENTED]` | Register an organization workspace, seed default pipeline and custom roles, auto-activate 15-Day Free Trial, and provision the initial Customer Admin. |
| `POST` | `/auth/login` | None (Public) | `[IMPLEMENTED]` | Authenticate email and password, check trial/grace status, record login audit entry, and return access token (`1d`) and refresh token (`7d`). |
| `POST` | `/auth/refresh` | None (Public) | `[IMPLEMENTED]` | Rotate expired access token using a valid cryptographic refresh token. |
| `POST` | `/auth/logout` | Authenticated | `[IMPLEMENTED]` | Terminate active user session and record security audit log. |
| `GET` | `/auth/me` | Authenticated | `[IMPLEMENTED]` | Fetch current user profile, active tenant membership, and assigned roles. |

### Registration Schema (`POST /auth/register`)
```json
{
  "email": "sarah.founder@example.com",
  "password": "Min8CharactersPassword!",
  "firstName": "Sarah",
  "lastName": "Jenkins",
  "organizationName": "Apex Technologies"
}
```
**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "sarah.founder@example.com",
      "firstName": "Sarah",
      "lastName": "Jenkins",
      "globalRole": "USER"
    },
    "organization": { "id": "uuid", "name": "Apex Technologies", "slug": "apex-technologies-1234", "plan": "FREE_TRIAL" },
    "membership": { "role": "ADMIN", "title": "Founder / Managing Director" },
    "subscription": { "plan": "FREE_TRIAL", "status": "TRIALING", "seatCount": 5, "leadLimit": 15000 },
    "trialDaysRemaining": 15,
    "dashboardView": "/dashboard",
    "token": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  },
  "message": "Organization registered with 15-Day Free Trial activated."
}
```

---

## 2. Organization Management (`/organizations`)

Tenant administration and team roster endpoints.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/organizations/my-workspaces` | Authenticated | `[IMPLEMENTED]` | List all organization workspaces the authenticated user belongs to. |
| `GET` | `/organizations/current` | Member | `[IMPLEMENTED]` | Fetch current workspace metadata, subscription status, and record counts. |
| `PATCH` | `/organizations/current` | `ADMIN` | `[IMPLEMENTED]` | Update workspace settings, company domain, currency, or branding. |
| `GET` | `/organizations/members` | Member | `[IMPLEMENTED]` | List all team members, assigned titles, roles, and last login timestamps. |
| `POST` | `/organizations/members/invite` | `ADMIN` | `[IMPLEMENTED]` | Invite an employee. Enforces plan seat limits (`checkSeatLimit`). Restricted strictly to tenant roles (`ADMIN` or `USER`), preventing platform privilege escalation. |

---

## 3. Dynamic Custom Roles & RBAC Matrix (`/roles`)

Customer Admins can dynamically configure custom roles and enforce granular module permissions without code modifications.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/roles/metadata` | Member | `[IMPLEMENTED]` | Retrieve available modules and permission actions (`VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `EXPORT`, `ASSIGN`, `MANAGE`). |
| `GET` | `/roles` | Member | `[IMPLEMENTED]` | Query organization custom roles with permission lists and member counts. |
| `POST` | `/roles` | `ADMIN` | `[IMPLEMENTED]` | Create a custom organizational role with assigned permission matrix. |
| `PATCH` | `/roles/assign-member` | `ADMIN` | `[IMPLEMENTED]` | Bind a team member to an existing custom role. |
| `PATCH` | `/roles/:id` | `ADMIN` | `[IMPLEMENTED]` | Update role name, description, or department. |
| `DELETE` | `/roles/:id` | `ADMIN` | `[IMPLEMENTED]` | Delete custom role (clears role binding from affected members). |
| `PUT` | `/roles/:id/permissions` | `ADMIN` | `[IMPLEMENTED]` | Replace the permission matrix for a custom role. |
| `POST` | `/roles/:id/duplicate` | `ADMIN` | `[IMPLEMENTED]` | Duplicate an existing role with all permissions as a new role template. |

---

## 4. Lead Management & AI Scoring (`/leads`)

Inbound prospect capture, multi-factor scoring, and atomic conversion into deals.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/leads` | Member | `[IMPLEMENTED]` | Paginated lead query with filters (`status`, `priority`, `source`, `search`, `ownerId`). Scoped strictly to active tenant. |
| `POST` | `/leads` | Member | `[IMPLEMENTED]` | Ingest lead, compute explainable AI score, enforce database lead quota (`checkLeadLimit`), and trigger automation workflows. |
| `GET` | `/leads/:id` | Member | `[IMPLEMENTED]` | Fetch 360-degree lead detail with linked tasks, timeline activities, and communication threads. |
| `PATCH` | `/leads/:id` | Member | `[IMPLEMENTED]` | Update lead properties, qualification status, or assigned owner. |
| `DELETE` | `/leads/:id` | Member / `ADMIN` | `[IMPLEMENTED]` | Delete lead record (scoped to tenant). |
| `POST` | `/leads/:id/score` | Member | `[IMPLEMENTED]` | Re-calculate predictive AI score based on enriched technographics and engagement history. |
| `POST` | `/leads/:id/convert` | Member | `[IMPLEMENTED]` | Atomically convert qualified lead into Contact, Company, and Deal records within a single transaction. |

---

## 5. Sales Pipelines & Kanban Deals (`/deals`)

Opportunity management, stage progression, and AI deal health diagnostics.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/deals/pipelines` | Member | `[IMPLEMENTED]` | Fetch all sales pipelines and their ordered stages with win probabilities. |
| `GET` | `/deals` | Member | `[IMPLEMENTED]` | Query deals with stage groupings or flat list filtered by owner and status. |
| `POST` | `/deals` | Member | `[IMPLEMENTED]` | Create sales opportunity card. |
| `GET` | `/deals/:id` | Member | `[IMPLEMENTED]` | Get full deal details, associated contacts, accounts, and timeline logs. |
| `PATCH` | `/deals/:id` | Member | `[IMPLEMENTED]` | Update deal amount or drag card to a new stage (fires `DEAL_STAGE_CHANGED` automation). |
| `DELETE` | `/deals/:id` | Member / `ADMIN` | `[IMPLEMENTED]` | Delete deal record. |
| `POST` | `/deals/:id/analyze-health` | Member | `[IMPLEMENTED]` | Run AI diagnostic flagging stalled opportunities, stage velocity, and closing recommendations. |

---

## 6. Accounts & Contacts (`/companies`, `/contacts`)

Customer 360 stakeholders and corporate accounts.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/companies` | Member | `[IMPLEMENTED]` | List corporate accounts with annual revenue, employee count, and churn risk indices (`LOW`, `MEDIUM`, `HIGH`). |
| `POST` | `/companies` | Member | `[IMPLEMENTED]` | Create corporate account record. |
| `GET` | `/contacts` | Member | `[IMPLEMENTED]` | List stakeholder contact records with search and company filter. |
| `POST` | `/contacts` | Member | `[IMPLEMENTED]` | Create contact stakeholder profile. |

---

## 7. Tasks & Follow-up Sequences (`/tasks`)

Task scheduling, reminders, and past-due queue tracking.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/tasks` | Member | `[IMPLEMENTED]` | List follow-up tasks (`category`, `priority`, `status`, `overdue=true`). |
| `POST` | `/tasks` | Member | `[IMPLEMENTED]` | Schedule follow-up task linked to lead, contact, or deal. |
| `PATCH` | `/tasks/:id` | Member | `[IMPLEMENTED]` | Update task status, reschedule due date, or toggle completion. |
| `DELETE` | `/tasks/:id` | Member | `[IMPLEMENTED]` | Delete scheduled task. |

---

## 8. Customer Timeline Activities (`/activities`)

Activity timeline logging across calls, meetings, notes, and status transitions.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/activities` | Member | `[IMPLEMENTED]` | Retrieve chronological customer timeline records. |
| `POST` | `/activities` | Member | `[IMPLEMENTED]` | Author a timeline activity entry (`NOTE`, `CALL`, `EMAIL`, `MEETING`, `STATUS_CHANGE`). |

---

## 9. Unified Communication Hub (`/comms`)

Multi-channel customer engagement across Email (SMTP), WhatsApp Business, and Twilio SMS.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/comms/conversations` | Member | `[IMPLEMENTED]` | List multi-channel conversation threads filtered by channel. |
| `POST` | `/comms/conversations` | Member | `[IMPLEMENTED]` | Initiate a new customer communication thread with initial message. |
| `GET` | `/comms/conversations/:id/messages` | Member | `[IMPLEMENTED]` | Retrieve message history for a conversation thread. |
| `POST` | `/comms/conversations/:id/messages` | Member | `[PARTIALLY IMPLEMENTED]` | Send message. Verifies provider adapter; logs honest `FAILED` status with queue note if external provider is unconfigured. |

---

## 10. AI Center Suite & Autonomous Agents (`/ai`)

Provider-agnostic intelligence engine supporting Google Gemini, OpenAI, Claude, and Intelligent Heuristic Fallback with prompt injection defense.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `POST` | `/ai/copilot` | Member | `[IMPLEMENTED]` | Context-aware sales assistant answering questions scoped strictly to authorized tenant records. Protected with Prompt Injection Guard. Consumes AI tokens. |
| `POST` | `/ai/lead-score` | Member | `[IMPLEMENTED]` | Multi-factor explainable predictive lead qualification scoring (0–100). |
| `POST` | `/ai/next-best-action` | Member | `[IMPLEMENTED]` | Prescriptive next best actions for leads and deals based on engagement velocity. |
| `POST` | `/ai/generate-email` | Member | `[IMPLEMENTED]` | Contextual sales outreach copy tailored by tone and commercial objective. |
| `POST` | `/ai/meeting-summary` | Member | `[IMPLEMENTED]` | Summarize call transcript, detect client sentiment, and extract actionable tasks. |
| `POST` | `/ai/deal-health` | Member | `[IMPLEMENTED]` | Diagnostic audit of stalled deals, probability decay, and win tactics. |
| `POST` | `/ai/search` | Member | `[IMPLEMENTED]` | Natural language query translation into structured Prisma filters scoped to tenant. |
| `POST` | `/ai/agent-run` | Member | `[IMPLEMENTED]` | Trigger autonomous sales agent. Sensitive external operations automatically pause with status `WAITING_APPROVAL`. |
| `GET` | `/ai/agent-runs` | Member | `[IMPLEMENTED]` | List historical autonomous agent runs and approval queue. |
| `POST` | `/ai/agent-runs/:id/approve` | `ADMIN` | `[IMPLEMENTED]` | Human supervisor approval gate allowing paused autonomous agent actions to execute. |

---

## 11. Visual Automation Workflows (`/workflows`)

Event-driven visual workflow engine supporting `Trigger → Conditions → Actions → Execution Log`.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/workflows` | Member | `[IMPLEMENTED]` | List configured automation workflows. |
| `POST` | `/workflows` | `ADMIN` | `[IMPLEMENTED]` | Create visual workflow (`LEAD_CREATED`, `DEAL_STAGE_CHANGED`, `SCORE_THRESHOLD`). |
| `PATCH` | `/workflows/:id` | `ADMIN` | `[IMPLEMENTED]` | Toggle active status or update trigger/action definitions. |
| `DELETE` | `/workflows/:id` | `ADMIN` | `[IMPLEMENTED]` | Delete automation workflow. |
| `GET` | `/workflows/:id/runs` | Member | `[IMPLEMENTED]` | Query historical step-by-step execution runs, logs, and error states (`WorkflowRun`). |

---

## 12. Marketing Campaigns (`/campaigns`)

Email and SMS broadcast campaigns.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/campaigns` | Member | `[IMPLEMENTED]` | List campaigns with status (`DRAFT`, `SCHEDULED`, `RUNNING`, `COMPLETED`). |
| `POST` | `/campaigns` | Member | `[IMPLEMENTED]` | Create outbound broadcast campaign. |
| `PATCH` | `/campaigns/:id` | Member | `[IMPLEMENTED]` | Update campaign properties, recipient audience, or schedule. |
| `DELETE` | `/campaigns/:id` | Member / `ADMIN` | `[IMPLEMENTED]` | Delete campaign. |

---

## 13. Reports & Executive Analytics (`/reports`)

Operational metrics, pipeline volume, and live resource meters.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/reports/dashboard-summary` | Member | `[IMPLEMENTED]` | Executive KPIs (Total Leads, Active Deals, Pipeline Value, Won Revenue, Overdue Tasks). |
| `GET` | `/reports/sales-velocity` | Member | `[IMPLEMENTED]` | Funnel stage volume, stage conversion rates, and weighted forecasting. |
| `GET` | `/reports/lead-sources` | Member | `[IMPLEMENTED]` | Channel attribution breakdown and average AI qualification score. |
| `GET` | `/reports/usage-metrics` | Member | `[IMPLEMENTED]` | Organization resource consumption: active seats, leads count, and AI token consumption. |

---

## 14. External Provider Integrations (`/integrations`)

Configuration of external adapters for communication and payment services.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/integrations` | Member | `[IMPLEMENTED]` | List integration statuses (`EMAIL_SMTP`, `TWILIO_SMS`, `WHATSAPP`, `RAZORPAY`). |
| `POST` | `/integrations` | `ADMIN` | `[IMPLEMENTED]` | Enable or update provider credentials with masked secret storage. |

---

## 15. Security & Compliance Audit Trail (`/audit`)

Immutable tenant security log recording all significant organizational actions.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/audit/logs` | `ADMIN` | `[IMPLEMENTED]` | Query immutable audit log stream with entity and action filters. |

---

## 16. Tenant Subscription, Billing & GST Invoices (`/subscriptions`)

Protected tenant endpoints for plan management, quota metering, Razorpay/Cashfree checkouts, and 18% GST tax invoices. Also mapped at `/plans` and `/payments`.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `GET` | `/subscriptions/plans` | Public / Member | `[IMPLEMENTED]` | Fetch active database-driven SaaS plans with proposed monthly/yearly INR pricing and feature entitlement limits. |
| `GET` | `/subscriptions/current` | Member | `[IMPLEMENTED]` | Get active subscription status, trial remaining days, grace period status, and quota meters. |
| `GET` | `/subscriptions/usage` | Member | `[IMPLEMENTED]` | Detailed live resource consumption meters (seats, lead capacity, AI tokens, storage). |
| `POST` | `/subscriptions/checkout` | `ADMIN` | `[IMPLEMENTED]` | Initiate order with server-calculated 18% GST tax breakdown and order ID. |
| `POST` | `/subscriptions/verify` | `ADMIN` | `[IMPLEMENTED]` | Cryptographic HMAC SHA256 signature verification, subscription activation, duplicate protection (`409 Conflict`), and sequential GST invoice generation (`INV-YYYY-XXXXX`). |
| `POST` | `/subscriptions/upgrade` | `ADMIN` | `[IMPLEMENTED]` | Instant upgrade to higher plan tier with immediate quota expansion and tax receipt. |
| `POST` | `/subscriptions/downgrade` | `ADMIN` | `[IMPLEMENTED]` | Schedule downgrade effective on next billing renewal date with Zero Customer Data Loss Guarantee. |
| `POST` | `/subscriptions/cancel` | `ADMIN` | `[IMPLEMENTED]` | Schedule cancellation at billing period end (read access retained). |
| `GET` | `/subscriptions/invoices` | Member | `[IMPLEMENTED]` | List generated GST tax invoices with payment references. |
| `GET` | `/subscriptions/invoices/:id/download`| Member | `[IMPLEMENTED]` | Retrieve printable tax invoice detailing legal corporate credentials (CIN, GSTIN, legal address). |
| `GET` | `/subscriptions/payments` | Member | `[IMPLEMENTED]` | Complete transaction history with gateway order IDs and statuses. |
| `POST` | `/subscriptions/webhook` | Public Gateway | `[IMPLEMENTED]` | Idempotent payment webhook processor with duplicate replay protection (`PaymentWebhookEvent`). |

> [!NOTE]
> The legacy `/billing` endpoint (`GET /billing/subscription`, `POST /billing/plan`) is marked as `[UNVERIFIED / PROTOTYPE]` and was superseded by `/subscriptions`. All production checkouts, GST invoices, and plan upgrades must use the `/subscriptions/*` endpoints.

---

## 17. Super Admin Master Head Office API (`/swordnex-master`)

Dedicated platform operations API restricted strictly to SwordNex platform Super Administrators (`SUPER_ADMIN`). Mounted at both `/api/swordnex-master` and `/api/v1/swordnex-master`.

| Method | Endpoint | Required Role | Status | Description |
|---|---|---|---|---|
| `POST` | `/swordnex-master/auth/login` | Public (Super Admin) | `[IMPLEMENTED]` | Authenticate platform Super Administrator with master JWT credentials. Strictly rejects non-super admins (`403 Forbidden`). |
| `GET` | `/swordnex-master/dashboard` | `SUPER_ADMIN` | `[IMPLEMENTED]` | Platform executive KPIs: total organizations, active users, global MRR/ARR in INR, total leads across platform. |
| `GET` | `/swordnex-master/subscriptions/analytics`| `SUPER_ADMIN`| `[IMPLEMENTED]` | Subscription financial analytics: MRR/ARR in INR, trial-to-paid conversion rate, and plan distribution. |
| `GET` | `/swordnex-master/organizations` | `SUPER_ADMIN` | `[IMPLEMENTED]` | Paginated search of all tenant organizations with status flags (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`). |
| `PATCH` | `/swordnex-master/organizations/:id/status`| `SUPER_ADMIN`| `[IMPLEMENTED]`| Suspend or reactivate organization workspace with mandatory audit justification logging. |
| `POST` | `/swordnex-master/organizations/:id/extend-trial`| `SUPER_ADMIN`| `[IMPLEMENTED]`| Extend organization free trial by $N$ days with mandatory audit reasoning note. |
| `GET` | `/swordnex-master/subscriptions` | `SUPER_ADMIN` | `[IMPLEMENTED]` | Search and filter all customer subscriptions across the platform by plan and status. |
| `POST` | `/swordnex-master/subscriptions/:id/extend` | `SUPER_ADMIN` | `[IMPLEMENTED]` | Manually extend subscription end date by $N$ days with mandatory administrative justification. |
| `PATCH` | `/swordnex-master/subscriptions/:id/status` | `SUPER_ADMIN` | `[IMPLEMENTED]` | Force change subscription status (`ACTIVE`, `SUSPENDED`, `EXPIRED`, `TRIALING`) with audit log note. |
| `GET` | `/swordnex-master/plans` | `SUPER_ADMIN` | `[IMPLEMENTED]` | Fetch dynamic subscription plan configurations from database (`SubscriptionPlanConfig`). |
| `PUT` | `/swordnex-master/plans/:slug` | `SUPER_ADMIN` | `[IMPLEMENTED]` | Update database-driven plan pricing in INR, seat caps, lead limits, token quotas, and permitted modules. |
| `GET` | `/swordnex-master/payments` | `SUPER_ADMIN` | `[IMPLEMENTED]` | Master financial ledger of all customer transactions across all tenant organizations. |
| `GET` | `/swordnex-master/invoices` | `SUPER_ADMIN` | `[IMPLEMENTED]` | Master tax ledger of all issued GST tax receipts with printable preview. |
| `GET` | `/swordnex-master/audit-logs` | `SUPER_ADMIN` | `[IMPLEMENTED]` | Immutable platform security audit trail recording all privileged master actions. |

---

## 18. Standard HTTP Status Codes & Error Protocol

| Status Code | Code Identifier | Description & Trigger in SwordNex AI CRM |
|---|---|---|
| `200 OK` | `SUCCESS` | Request succeeded; response payload contains requested entity. |
| `201 Created` | `CREATED` | Resource (lead, deal, custom role, invoice) was successfully created. |
| `400 Bad Request` | `VALIDATION_ERROR` | Malformed request body, Zod validation failure, or missing required parameter. |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing, expired, or invalid JWT Bearer access token; invalid refresh token. |
| `402 Payment Required` | `TRIAL_EXPIRED` / `QUOTA_EXCEEDED` | Free trial expired (past 3-day grace period), or resource quota reached (`SEAT_LIMIT_EXCEEDED`, `LEAD_LIMIT_EXCEEDED`, `AI_TOKENS_EXHAUSTED`). Write operations blocked until upgraded. |
| `403 Forbidden` | `FORBIDDEN` / `ORGANIZATION_SUSPENDED` | User role lacks permission (`RolePermission`), user attempted cross-tenant access, or organization is suspended by platform administration. |
| `404 Not Found` | `NOT_FOUND` | Requested entity does not exist within the authorized tenant scope. |
| `409 Conflict` | `DUPLICATE_ENTITY` | Resource already exists (e.g., duplicate user email or replay of verified payment ID). |
| `429 Too Many Requests` | `RATE_LIMITED` | Exceeded API rate limits (1,000 requests per 15-minute window by default). |
| `500 Server Error` | `INTERNAL_ERROR` | Unhandled server exception (sanitized in production; stack traces suppressed). |
