# SwordNex AI CRM — Comprehensive Codebase Audit & Repository Inventory

> **Auditor Role:** Principal SaaS Architect & Senior Full-Stack Security Engineer  
> **Repository:** `SwordNex-AI-CRM` (`e:\SNCRM`)  
> **Audit Baseline:** 15 Test Files | 155 Passing Automated Tests | Cleaned Monorepo  
> **Target Date:** October 2026  

---

## 1. Executive Summary

This codebase audit presents an exhaustive, line-by-line inspection of the **SwordNex AI CRM** repository. Every documented module, route, controller, middleware, service, database model, and frontend page has been verified by inspecting active TypeScript code, database schema relations, and automated test execution. 

### Core Architectural Findings:
1. **True Decoupled 3-Tier Multi-Tenant SaaS**: Clean separation between the React 18 Single Page Application (`client/`), Node.js 20 LTS Express REST API (`server/`), and PostgreSQL 16 database tier (`database/`).
2. **Robust Multi-Tenant Security Core**: Strict server-enforced tenant isolation via `x-organization-id` header validation and database `Membership` lookups. JWT authentication features double-secret algorithm pinning (`HS256`), salted SHA-256 password reset tokens with constant-time responses, and database-enforced session revocation via `tokenVersion`.
3. **Database Architecture**: 48 normalized relational models in PostgreSQL managed through Prisma ORM with indexing, compound keys, and cascade/restrict deletion constraints.
4. **Implementation Gaps Discovered**: External communication channels (Twilio SMS, WhatsApp Cloud API, Google Calendar OAuth2) are configured as local database records without live outbound HTTP dispatch adapters. Multi-factor authentication (MFA/2FA) is completely absent. User invitation creates accounts with random passwords but lacks automated invitation email delivery.

---

## 2. Comprehensive Module Inventory

### 1. Authentication & Session Security
- **Frontend Files:** [`client/src/pages/auth/LoginPage.tsx`](../client/src/pages/auth/LoginPage.tsx), [`RegisterPage.tsx`](../client/src/pages/auth/RegisterPage.tsx), [`ForgotPasswordPage.tsx`](../client/src/pages/auth/ForgotPasswordPage.tsx), [`ResetPasswordPage.tsx`](../client/src/pages/auth/ResetPasswordPage.tsx), [`client/src/context/AuthContext.tsx`](../client/src/context/AuthContext.tsx).
- **Backend Routes & Controllers:** [`server/src/routes/auth.routes.ts`](../server/src/routes/auth.routes.ts), [`server/src/controllers/auth.controller.ts`](../server/src/controllers/auth.controller.ts).
- **Middleware & Services:** [`server/src/middleware/auth.middleware.ts`](../server/src/middleware/auth.middleware.ts), [`server/src/middleware/rateLimiter.middleware.ts`](../server/src/middleware/rateLimiter.middleware.ts), [`server/src/utils/jwt.ts`](../server/src/utils/jwt.ts), [`server/src/services/email.service.ts`](../server/src/services/email.service.ts).
- **Database Models:** `User`, `LoginSession`, `PasswordResetToken`, `Membership`, `Organization`.
- **UI Entry Points:** `/login`, `/register`, `/forgot-password`, `/reset-password`.
- **Automated Tests:** [`server/tests/auth.test.ts`](../server/tests/auth.test.ts), [`server/tests/security-phase2.test.ts`](../server/tests/security-phase2.test.ts), [`server/tests/security-razorpay-password.test.ts`](../server/tests/security-razorpay-password.test.ts), [`server/tests/production-deployment-verification.test.ts`](../server/tests/production-deployment-verification.test.ts).
- **External Dependencies:** `bcryptjs`, `jsonwebtoken`, `nodemailer`.
- **Status:** **Implemented & Verified** (Core login, register, token rotation, password reset, session revocation). *Gap: MFA/2FA is missing.*

### 2. Multi-Tenancy & Workspace Isolation
- **Frontend Files:** [`client/src/context/AuthContext.tsx`](../client/src/context/AuthContext.tsx), [`client/src/components/layout/Header.tsx`](../client/src/components/layout/Header.tsx) (workspace switcher).
- **Backend Routes & Controllers:** [`server/src/routes/organization.routes.ts`](../server/src/routes/organization.routes.ts), [`server/src/controllers/organization.controller.ts`](../server/src/controllers/organization.controller.ts).
- **Middleware:** [`server/src/middleware/tenant.middleware.ts`](../server/src/middleware/tenant.middleware.ts) (`resolveTenant`).
- **Database Models:** `Organization`, `Membership`, `User`.
- **UI Entry Points:** Header workspace selector, Settings organization profile, `/team`.
- **Automated Tests:** [`server/tests/tenant.test.ts`](../server/tests/tenant.test.ts), [`server/tests/security-entitlements.test.ts`](../server/tests/security-entitlements.test.ts).
- **Status:** **Implemented & Verified**. Server prevents foreign tenant access and cross-tenant IDOR attacks. *Gap: Inviting new users does not dispatch an automated onboarding email.*

### 3. Dynamic Custom Roles & RBAC Matrix
- **Frontend Files:** [`client/src/pages/settings/RolesPermissionsPage.tsx`](../client/src/pages/settings/RolesPermissionsPage.tsx).
- **Backend Routes & Controllers:** [`server/src/routes/role.routes.ts`](../server/src/routes/role.routes.ts), [`server/src/controllers/role.controller.ts`](../server/src/controllers/role.controller.ts).
- **Middleware:** [`server/src/middleware/rbac.middleware.ts`](../server/src/middleware/rbac.middleware.ts), [`server/src/middleware/permission.middleware.ts`](../server/src/middleware/permission.middleware.ts).
- **Database Models:** `Role`, `RolePermission`, `Membership`.
- **UI Entry Points:** `/settings/roles-permissions`.
- **Automated Tests:** [`server/tests/rbac-subscription.test.ts`](../server/tests/rbac-subscription.test.ts), [`server/tests/security-entitlements.test.ts`](../server/tests/security-entitlements.test.ts).
- **Status:** **Implemented & Verified**. Granular 8-action matrix across 12 modules.

### 4. Lead Management & Custom Layouts
- **Frontend Files:** [`client/src/pages/leads/LeadsPage.tsx`](../client/src/pages/leads/LeadsPage.tsx), [`LeadDetailPage.tsx`](../client/src/pages/leads/LeadDetailPage.tsx), [`LeadFormPage.tsx`](../client/src/pages/leads/LeadFormPage.tsx), [`client/src/pages/leads/components/EditPageLayoutModal.tsx`](../client/src/pages/leads/components/EditPageLayoutModal.tsx), [`LeadImageUpload.tsx`](../client/src/pages/leads/components/LeadImageUpload.tsx).
- **Backend Routes & Controllers:** [`server/src/routes/lead.routes.ts`](../server/src/routes/lead.routes.ts), [`server/src/controllers/lead.controller.ts`](../server/src/controllers/lead.controller.ts).
- **Database Models:** `Lead`, `Activity`, `Task`, `Organization.settings`.
- **UI Entry Points:** `/leads`, `/leads/new`, `/leads/:id`, `/leads/:id/edit`.
- **Automated Tests:** [`server/tests/lead-layout.test.ts`](../server/tests/lead-layout.test.ts).
- **Status:** **Implemented & Verified**. Full CRUD, layout customizer, 5MB magic-byte validated image uploads, atomic lead-to-deal conversion.

### 5. Lead Import & Export Engine
- **Frontend Files:** [`client/src/pages/leads/components/ImportLeadsWizard.tsx`](../client/src/pages/leads/components/ImportLeadsWizard.tsx), [`ExportLeadsModal.tsx`](../client/src/pages/leads/components/ExportLeadsModal.tsx), [`ImportHistoryModal.tsx`](../client/src/pages/leads/components/ImportHistoryModal.tsx).
- **Backend Routes & Controllers:** Mounted on `lead.routes.ts`, handled by [`server/src/controllers/lead-import-export.controller.ts`](../server/src/controllers/lead-import-export.controller.ts).
- **Services:** [`server/src/services/lead-import-export.service.ts`](../server/src/services/lead-import-export.service.ts).
- **Database Models:** `Lead`, `ImportJob`.
- **UI Entry Points:** Leads toolbar ("Import Leads", "Export Leads", "Import History").
- **Automated Tests:** [`server/tests/lead-import-export.test.ts`](../server/tests/lead-import-export.test.ts) (20 tests).
- **External Dependencies:** `xlsx`, `multer`.
- **Status:** **Implemented & Verified**. Multi-step wizard, CSV/XLSX header parsing, field mapping, duplicate strategies (`SKIP`, `OVERWRITE`, `CLONE`), and background job tracking.

### 6. Deal Pipeline & Interactive Kanban
- **Frontend Files:** [`client/src/pages/deals/DealsKanbanPage.tsx`](../client/src/pages/deals/DealsKanbanPage.tsx).
- **Backend Routes & Controllers:** [`server/src/routes/deal.routes.ts`](../server/src/routes/deal.routes.ts), [`server/src/controllers/deal.controller.ts`](../server/src/controllers/deal.controller.ts).
- **Services:** [`server/src/services/ai/ai.gateway.ts`](../server/src/services/ai/ai.gateway.ts) (`evaluateDealHealth`), [`server/src/services/automation/workflow.engine.ts`](../server/src/services/automation/workflow.engine.ts).
- **Database Models:** `Deal`, `Pipeline`, `PipelineStage`, `Activity`, `Task`.
- **UI Entry Points:** `/deals`.
- **Automated Tests:** [`server/tests/tickets-sales-phase1.test.ts`](../server/tests/tickets-sales-phase1.test.ts).
- **Status:** **Implemented & Verified**. Drag-and-drop Kanban, stage win probabilities, deal health scoring, and win/loss root cause analytics.

### 7. Customer 360: Contacts & Companies
- **Frontend Files:** [`client/src/pages/contacts/ContactsPage.tsx`](../client/src/pages/contacts/ContactsPage.tsx), [`client/src/pages/companies/CompaniesPage.tsx`](../client/src/pages/companies/CompaniesPage.tsx).
- **Backend Routes & Controllers:** [`server/src/routes/contact.routes.ts`](../server/src/routes/contact.routes.ts), [`server/src/routes/company.routes.ts`](../server/src/routes/company.routes.ts), `contact.controller.ts`, `company.controller.ts`.
- **Database Models:** `Contact`, `Company`, `Deal`, `Activity`, `Task`.
- **UI Entry Points:** `/contacts`, `/companies`.
- **Status:** **Implemented & Verified**. Full relational CRUD, search, filtering, and cross-linking to deals and accounts.

### 8. CPQ & Commercial Billing (Products, Quotes, Customer Invoices)
- **Frontend Files:** [`client/src/pages/products/ProductsPage.tsx`](../client/src/pages/products/ProductsPage.tsx), [`client/src/pages/quotes/QuotesPage.tsx`](../client/src/pages/quotes/QuotesPage.tsx), [`QuoteDetailPage.tsx`](../client/src/pages/quotes/QuoteDetailPage.tsx), [`client/src/pages/customer-invoices/CustomerInvoicesPage.tsx`](../client/src/pages/customer-invoices/CustomerInvoicesPage.tsx).
- **Backend Routes & Controllers:** `product.routes.ts`, `quote.routes.ts`, `customer-invoice.routes.ts`, and corresponding controllers.
- **Database Models:** `Product`, `Quote`, `QuoteItem`, `SalesOrder`, `SalesOrderItem`, `CustomerInvoice`, `CustomerInvoiceItem`, `CustomerPayment`, `CreditNote`.
- **UI Entry Points:** `/products`, `/quotes`, `/quotes/:id`, `/customer-invoices`.
- **Automated Tests:** [`server/tests/commercial-cpq-finance.test.ts`](../server/tests/commercial-cpq-finance.test.ts) (12 tests).
- **Status:** **Implemented & Verified**. SKU catalog, multi-item quoting with percentage discounts and tax rates, 1-click quote-to-sales-order and quote-to-invoice conversions, and partial payment recording.

### 9. Customer Support Tickets & SLA Management
- **Frontend Files:** [`client/src/pages/tickets/TicketsPage.tsx`](../client/src/pages/tickets/TicketsPage.tsx), [`TicketDetailPage.tsx`](../client/src/pages/tickets/TicketDetailPage.tsx), [`client/src/pages/tickets/components/CreateTicketModal.tsx`](../client/src/pages/tickets/components/CreateTicketModal.tsx).
- **Backend Routes & Controllers:** [`server/src/routes/ticket.routes.ts`](../server/src/routes/ticket.routes.ts), [`server/src/controllers/ticket.controller.ts`](../server/src/controllers/ticket.controller.ts).
- **Services:** [`server/src/services/ai/ai.gateway.ts`](../server/src/services/ai/ai.gateway.ts) (`draftSupportReply`).
- **Database Models:** `Ticket`, `TicketComment`.
- **UI Entry Points:** `/tickets`, `/tickets/:id`.
- **Automated Tests:** [`server/tests/tickets-sales-phase1.test.ts`](../server/tests/tickets-sales-phase1.test.ts) (14 tests).
- **Status:** **Implemented & Verified**. Priority SLAs (`URGENT` 2h/8h, `HIGH` 4h/24h), CSAT 1–5 star ratings, internal notes vs. public replies, and AI-assisted reply drafting.

### 10. Multi-Channel Communications & Inbound Webhooks
- **Frontend Files:** [`client/src/pages/inbox/InboxPage.tsx`](../client/src/pages/inbox/InboxPage.tsx).
- **Backend Routes & Controllers:** [`server/src/routes/comms.routes.ts`](../server/src/routes/comms.routes.ts), [`server/src/controllers/comms.controller.ts`](../server/src/controllers/comms.controller.ts).
- **Database Models:** `Conversation`, `Message`, `UsageRecord`.
- **UI Entry Points:** `/inbox`.
- **Status:** **Partially Implemented / Simulated**. Database conversations and messages are persisted; status receipts via webhook are supported. However, outgoing Twilio and WhatsApp messages do not execute live external HTTP API requests.

### 11. Marketing Campaigns
- **Frontend Files:** [`client/src/pages/campaigns/CampaignsPage.tsx`](../client/src/pages/campaigns/CampaignsPage.tsx).
- **Backend Routes & Controllers:** [`server/src/routes/campaign.routes.ts`](../server/src/routes/campaign.routes.ts), `campaign.controller.ts`.
- **Database Models:** `Campaign`.
- **UI Entry Points:** `/campaigns`.
- **Status:** **Implemented & Verified** (Campaign metadata CRUD, target metrics, audience budgeting). *Gap: Does not execute real mass email or SMS sending campaigns.*

### 12. Visual Workflow Automation Engine
- **Frontend Files:** [`client/src/pages/workflows/WorkflowsPage.tsx`](../client/src/pages/workflows/WorkflowsPage.tsx).
- **Backend Routes & Controllers:** [`server/src/routes/workflow.routes.ts`](../server/src/routes/workflow.routes.ts), `workflow.controller.ts`.
- **Services:** [`server/src/services/automation/workflow.engine.ts`](../server/src/services/automation/workflow.engine.ts).
- **Database Models:** `AutomationWorkflow`, `WorkflowRun`.
- **UI Entry Points:** `/workflows`.
- **Status:** **Implemented & Verified**. Triggers on entity lifecycle events (`LEAD_CREATED`, `DEAL_STAGE_CHANGED`), evaluates field conditions, executes 4 action types (`CALCULATE_AI_SCORE`, `CREATE_TASK`, `UPDATE_STATUS`, `ADD_ACTIVITY_NOTE`), and logs execution history. *Gap: Lacks multi-branching, webhooks, and delay timers.*

### 13. AI Center & Provider Gateway
- **Frontend Files:** [`client/src/pages/ai-center/AiCenterPage.tsx`](../client/src/pages/ai-center/AiCenterPage.tsx), [`client/src/components/ai/CopilotDrawer.tsx`](../client/src/components/ai/CopilotDrawer.tsx), [`client/src/context/CopilotContext.tsx`](../client/src/context/CopilotContext.tsx).
- **Backend Routes & Controllers:** [`server/src/routes/ai.routes.ts`](../server/src/routes/ai.routes.ts), `ai.controller.ts`.
- **Services:** [`server/src/services/ai/ai.gateway.ts`](../server/src/services/ai/ai.gateway.ts).
- **Database Models:** `AiInsight`, `AiAgentRun`.
- **UI Entry Points:** `/ai-center`, Header Copilot icon (drawer).
- **Automated Tests:** [`server/tests/ai.test.ts`](../server/tests/ai.test.ts), [`server/tests/phase3-modules-ai.test.ts`](../server/tests/phase3-modules-ai.test.ts).
- **Status:** **Implemented & Verified**. Supports Google Gemini and OpenAI with deterministic heuristic fallback mode (`mock`). Features prompt injection filter, lead scoring (0–100), deal health analyzer, meeting transcript summarizer, and sales email drafter.

### 14. SaaS Subscription, Razorpay Checkout & Indian 18% GST Invoicing
- **Frontend Files:** [`client/src/pages/billing/BillingPage.tsx`](../client/src/pages/billing/BillingPage.tsx).
- **Backend Routes & Controllers:** [`server/src/routes/subscription.routes.ts`](../server/src/routes/subscription.routes.ts), [`server/src/controllers/subscription.controller.ts`](../server/src/controllers/subscription.controller.ts).
- **Services:** [`server/src/services/entitlement.service.ts`](../server/src/services/entitlement.service.ts).
- **Database Models:** `SubscriptionPlanConfig`, `Subscription`, `Payment`, `Invoice`, `PaymentWebhookEvent`.
- **UI Entry Points:** `/billing`, `/settings/subscription`.
- **Automated Tests:** [`server/tests/subscription-engine.test.ts`](../server/tests/subscription-engine.test.ts), [`server/tests/rbac-subscription.test.ts`](../server/tests/rbac-subscription.test.ts), [`server/tests/production-deployment-verification.test.ts`](../server/tests/production-deployment-verification.test.ts).
- **Status:** **Implemented & Verified**. Dynamic INR tiers, 15-day trial, 3-day grace period, server-side pricing order creation, timing-safe HMAC SHA-256 signature verification, raw buffer webhook verification, duplicate payment rejection, and automated serial 18% GST tax invoices (`INV-YYYY-XXXXX`).

### 15. Super Admin Platform Master Head Office
- **Frontend Files:** [`client/src/pages/master/MasterLoginPage.tsx`](../client/src/pages/master/MasterLoginPage.tsx), [`MasterLayout.tsx`](../client/src/pages/master/MasterLayout.tsx), [`MasterDashboardPage.tsx`](../client/src/pages/master/MasterDashboardPage.tsx), [`MasterOrganizationsPage.tsx`](../client/src/pages/master/MasterOrganizationsPage.tsx), [`MasterPlansPage.tsx`](../client/src/pages/master/MasterPlansPage.tsx), [`MasterSubscriptionsPage.tsx`](../client/src/pages/master/MasterSubscriptionsPage.tsx), [`MasterAuditLogsPage.tsx`](../client/src/pages/master/MasterAuditLogsPage.tsx).
- **Backend Routes & Controllers:** [`server/src/routes/superAdmin.routes.ts`](../server/src/routes/superAdmin.routes.ts), [`server/src/controllers/superAdmin.controller.ts`](../server/src/controllers/superAdmin.controller.ts).
- **Database Models:** All platform models.
- **UI Entry Points:** `/swordnex-master/login`, `/swordnex-master/*`.
- **Status:** **Implemented & Verified**. Restricted strictly to users with `globalRole = 'SUPER_ADMIN'`. Cross-tenant search, workspace suspension with justification, subscription day extensions, and platform MRR/ARR financial ledgers.

---

## 3. Codebase Metrics & File Inventory

- **Frontend Client:** 26 pages, 13 layout/common components, 2 React Context providers, 1 custom API client.
- **Backend Server:** 23 REST controllers, 23 route definitions, 8 security/tenant middlewares, 6 domain services.
- **Database Tier:** 48 models, 1 initial SQL migration, 1 realistic seed script (`seed.ts`).
- **Test Automation:** 15 test suites, 155 automated assertions (100% passing).
- **Production Packages:** Pruned 216 unneeded transitive packages; 0 vulnerabilities reported in core backend dependencies.
