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

## 1. Authentication & Session Security (`/auth`)

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register a new organization workspace, seed default pipeline and custom roles, auto-activate 15-Day Free Trial, and provision the initial Customer Admin. |
| `POST` | `/auth/login` | Public | Authenticate email and password, check trial/grace status, record login audit entry, and return access token (`15m` / `1d`) and refresh token (`7d`). |
| `POST` | `/auth/refresh` | Public | Rotate expired access token using a valid cryptographic refresh token. |
| `POST` | `/auth/logout` | Authenticated | Terminate active user session and record security audit log. |
| `GET` | `/auth/me` | Authenticated | Fetch current user profile, active tenant membership, and assigned roles. |
| `POST` | `/auth/forgot-password` | Public | Request a secure 32-byte password reset link. Returns constant-time anti-enumeration response. |
| `POST` | `/auth/reset-password` | Public | Reset password using a valid SHA-256 hashed one-time token. |

---

## 2. Organization Management (`/organizations`)

| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/organizations/my-workspaces` | Authenticated | List all organization workspaces the authenticated user belongs to. |
| `GET` | `/organizations/current` | Member | Fetch current workspace metadata, subscription status, and record counts. |
| `PATCH` | `/organizations/current` | `ADMIN` | Update workspace settings, company domain, currency, or branding. |
| `GET` | `/organizations/members` | Member | List all team members, assigned titles, roles, and last login timestamps. |
| `POST` | `/organizations/members/invite` | `ADMIN` | Invite an employee. Enforces plan seat limits and prevents platform privilege escalation. |

---

## 3. Dynamic Custom Roles & RBAC Matrix (`/roles`)

| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/roles/metadata` | Member | Retrieve available modules and permission actions (`VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `EXPORT`, `ASSIGN`, `MANAGE`). |
| `GET` | `/roles` | Member | Query organization custom roles with permission lists and member counts. |
| `POST` | `/roles` | `ADMIN` | Create a custom organizational role with assigned permission matrix. |
| `PATCH` | `/roles/assign-member` | `ADMIN` | Bind a team member to an existing custom role. |
| `PATCH` | `/roles/:id` | `ADMIN` | Update role name, description, or department. |
| `DELETE` | `/roles/:id` | `ADMIN` | Delete custom role (clears role binding from affected members). |

---

## 4. Lead Management & Custom Layouts (`/leads`)

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/leads` | `LEADS:VIEW` | Query leads with search, stage filters, pagination, and sorting. |
| `GET` | `/leads/:id` | `LEADS:VIEW` | Fetch detailed lead profile, contact info, AI score factors, and timeline. |
| `POST` | `/leads` | `LEADS:CREATE` | Create a lead. Enforces plan lead capacity quotas. |
| `PATCH` | `/leads/:id` | `LEADS:EDIT` | Update lead fields, stage, status, or owner. |
| `DELETE` | `/leads/:id` | `LEADS:DELETE` | Delete a lead record. |
| `POST` | `/leads/:id/convert` | `LEADS:EDIT` | Atomically convert a lead into a Contact, Company, and Deal. |
| `GET` | `/leads/layout` | `LEADS:VIEW` | Fetch tenant-customized lead page layout configuration. |
| `PUT` | `/leads/layout` | `ADMIN` | Save customized lead page layout (visible fields, section order, custom fields). |
| `POST` | `/leads/upload-image` | `LEADS:EDIT` | Upload avatar/business card image for lead. |

---

## 5. Lead Import & Export Engine (`/leads`)

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/leads/import/upload` | `LEADS:CREATE` | Upload CSV/Excel file for parsing, header extraction, and sample preview. |
| `POST` | `/leads/import/execute` | `LEADS:CREATE` | Process parsed leads with field mapping, duplicate detection, and validation. |
| `GET` | `/leads/import/history` | `LEADS:VIEW` | List tenant lead import batch logs with error summaries. |
| `POST` | `/leads/export` | `LEADS:EXPORT` | Export filtered leads to CSV or Excel with audit logging. |

---

## 6. Deal Pipeline & Commercial Modules

### Deals (`/deals`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/deals` | Query deals with stage groupings for Kanban presentation. |
| `POST` | `/deals` | Create a deal with stage, value, close date, and pipeline assignment. |
| `PATCH` | `/deals/:id` | Update deal fields. |
| `PATCH` | `/deals/:id/stage` | Update deal stage with drag-and-drop Kanban support. |
| `GET` | `/deals/stats/summary` | Pipeline metrics (total value, weighted pipeline, win rates). |

### Contacts & Companies (`/contacts`, `/companies`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` / `POST` | `/contacts` | Query and create contacts with account relationships. |
| `GET` / `PATCH` | `/contacts/:id` | Inspect and edit contact details. |
| `GET` / `POST` | `/companies` | Query and create companies with industry, revenue, and domain. |
| `GET` / `PATCH` | `/companies/:id` | Inspect and edit company accounts. |

### CPQ: Products, Quotes & Customer Invoices (`/products`, `/quotes`, `/customer-invoices`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` / `POST` | `/products` | Product catalog with SKU, pricing, and active status. |
| `GET` / `POST` | `/quotes` | Create CPQ quotes with line items, tax rates, and discount calculations. |
| `GET` / `POST` | `/customer-invoices` | Create and track customer invoices with payment status and PDF/receipt views. |

---

## 7. Tasks, Tickets & Communications

| Route | Methods | Description |
| :--- | :--- | :--- |
| `/tasks` | `GET`, `POST`, `PATCH`, `DELETE` | Task tracking, priorities, due dates, and assignee workflows. |
| `/tickets` | `GET`, `POST`, `PATCH`, `DELETE` | Customer service tickets, SLA priorities, and resolution tracking. |
| `/comms` | `GET`, `POST` | Multi-channel communication timelines (Email, SMS, WhatsApp) and inbound webhooks. |
| `/campaigns` | `GET`, `POST`, `PATCH` | Marketing and sales outreach campaigns with audience segmentation. |
| `/workflows` | `GET`, `POST`, `PATCH`, `DELETE` | Visual event-driven automation rules (`Trigger → Condition → Action`). |

---

## 8. AI Center & Predictive Intelligence (`/ai`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/ai/score-lead` | Calculate multi-factor predictive score and explainable reasons for a lead. |
| `POST` | `/ai/copilot-chat` | Context-aware sales copilot assistant answering CRM queries from tenant data. |
| `POST` | `/ai/next-best-action` | Recommend prioritized next action for a deal or lead. |
| `POST` | `/ai/draft-email` | Draft sales correspondence tailored to tone, objective, and deal stage. |
| `POST` | `/ai/summarize-transcript`| Extract key insights, sentiment, and action items from call transcripts. |

---

## 9. SaaS Subscription & Razorpay Checkout (`/subscriptions`, `/payments`, `/plans`)

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/plans` | Public / Member | List dynamic INR subscription plans (Free Trial, Standard, Premium). |
| `GET` | `/subscriptions/current` | Member | Inspect active tenant plan, trial days remaining, and quota meters. |
| `POST` | `/payments/create-order` | `ADMIN` | Initiate Razorpay order with server-calculated pricing in INR. |
| `POST` | `/payments/verify` | `ADMIN` | Verify Razorpay HMAC SHA-256 signature, activate subscription, and issue 18% GST invoice. |
| `POST` | `/payments/webhook` | Public | Asynchronous Razorpay webhook receiver (`payment.captured`, `order.paid`, `payment.failed`). |
| `GET` | `/subscriptions/invoices` | Member | List organization SaaS subscription tax invoices (`INV-YYYY-XXXXX`). |

---

## 10. Super Admin Platform Master Head Office (`/swordnex-master`)

| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/swordnex-master/auth/login` | Public | Authenticate Super Admin with `globalRole = 'SUPER_ADMIN'`. |
| `GET` | `/swordnex-master/dashboard` | `SUPER_ADMIN` | Global platform analytics: MRR/ARR in INR, conversion rates, tenant counts. |
| `GET` | `/swordnex-master/organizations` | `SUPER_ADMIN` | Cross-tenant workspace directory with subscription status and seat usage. |
| `PATCH` | `/swordnex-master/organizations/:id/status` | `SUPER_ADMIN` | Suspend or reactivate tenant workspace with mandatory justification. |
| `PATCH` | `/swordnex-master/subscriptions/:id/extend` | `SUPER_ADMIN` | Manually extend tenant subscription or trial days with audit trail. |
| `GET` | `/swordnex-master/plans` | `SUPER_ADMIN` | Manage dynamic platform pricing and resource entitlements. |
| `GET` | `/swordnex-master/audit-logs` | `SUPER_ADMIN` | Platform-wide immutable security audit log stream. |
