# SwordNex AI CRM — Prioritized Product & Engineering Roadmap

> **Role:** Principal SaaS Architect & CRM Product Manager  
> **Evaluation Framework:** Enterprise Value vs. Architectural Complexity Matrix  
> **Target Horizon:** 2026–2027  

---

## 1. Roadmap Prioritization Framework

Initiatives are classified into four strict priority tiers:

- **P0: Security, Data Integrity & Production Blockers** — Immediate requirements essential for enterprise compliance, account protection, and tenant onboarding.
- **P1: Core CRM Usability & Experience** — High-impact features that eliminate operational friction and deliver immediate value to sales reps and administrators.
- **P2: Automation, Integrations & AI Expansion** — Scaling communication channels, live external adapters, and autonomous AI agents.
- **P3: Advanced Enterprise Features & Ecosystem** — Custom object extensibility, public developer APIs, and visual approval governance.

---

## 2. P0: Security, Data Integrity & Production Blockers

### P0.1 — Multi-Factor Authentication (MFA / 2FA via TOTP)
- **Problem & Evidence:** Neither backend nor frontend implements MFA. Passwords are the sole barrier to account compromise. Competitors (Salesforce, Zoho, HubSpot) strictly enforce or mandate MFA for enterprise workspaces.
- **Business Value:** Critical prerequisite for SOC2, ISO 27001, and enterprise security questionnaires.
- **User Impact:** High security assurance for administrators and sensitive customer deal records.
- **Dependencies:** `speakeasy` or `otplib` (TOTP), `qrcode` for setup modal.
- **Complexity:** **M (Medium)**
- **Acceptance Criteria:**
  1. Users can enable TOTP 2FA in `/settings` by scanning a QR code with Google Authenticator or 1Password.
  2. Submitting correct 6-digit TOTP code stores encrypted secret in `User` model and generates 10 single-use emergency backup codes.
  3. Subsequent login flows require valid TOTP verification before issuing access/refresh tokens.
- **Required Tests:** Test registration of TOTP secret, validation of 6-digit tokens, rejection of invalid tokens, and backup code single-use consumption.
- **Risks & Migration:** Must ensure existing accounts can log in smoothly and be prompted with an optional or enforced MFA enrollment banner.

---

### P0.2 — Automated Team Member Invitation & Setup Token Email Dispatch
- **Problem & Evidence:** `OrganizationController.inviteMember` creates user records with random passwords but never sends an invitation email. Invited employees cannot log in unless they guess to use the "Forgot Password" flow.
- **Business Value:** Smooth onboarding; eliminates customer support tickets regarding account activation.
- **User Impact:** Immediate, frictionless onboarding for newly invited sales team members.
- **Dependencies:** `EmailService`, `PasswordResetToken` or new `InvitationToken` schema.
- **Complexity:** **S (Small)**
- **Acceptance Criteria:**
  1. Inviting a member creates an invitation record with a 32-byte cryptographic setup token valid for 48 hours.
  2. Dispatches a professional invitation email with organization branding and an activation link (`/accept-invite?token=...`).
  3. Accessing the link allows the user to set their password and directly enter the tenant workspace.
- **Required Tests:** Test invite creation, verification of token expiration, and secure password activation.
- **Risks & Migration:** Safe non-breaking addition to `OrganizationController`.

---

## 3. P1: Core CRM Experience & Usability

### P1.1 — Deal Stage Transition Governance & Required Field Validation
- **Problem & Evidence:** In `DealsKanbanPage.tsx`, deals can be dragged into any stage without checking if critical information (e.g., expected close date, deal amount, quotation, or lost reason) is present. Zoho Blueprint and Salesforce Path enforce mandatory fields before stage exit.
- **Business Value:** Prevents dirty CRM pipeline data; ensures revenue forecasts have reliable inputs.
- **User Impact:** Guides sales reps through standardized qualification criteria without guesswork.
- **Dependencies:** `deal.controller.ts`, `PipelineStage` schema extension (`requiredFields: string[]`).
- **Complexity:** **M (Medium)**
- **Acceptance Criteria:**
  1. Each pipeline stage can configure required fields (e.g., "Proposal" stage requires `amount > 0` and attached `quoteId`).
  2. Moving a deal to "Closed Lost" triggers a required modal demanding `winLossCategory` and `winLossReason`.
  3. API rejects stage updates if required stage fields are null or empty (`HTTP 422`).
- **Required Tests:** Test valid and invalid stage transitions via `deal.routes.ts`.
- **Risks & Migration:** Existing deals must be exempt from retroactive validation until updated.

---

### P1.2 — Live Multi-Recipient Email Notifications Engine
- **Problem & Evidence:** `EmailService` currently only sends password reset emails. Team members receive no email notifications when assigned leads, deals, or high-priority support tickets.
- **Business Value:** Dramatically improves lead response time and SLA resolution speed.
- **User Impact:** Sales reps stay updated on new assignments even when away from the browser.
- **Dependencies:** `EmailService` notification templates.
- **Complexity:** **M (Medium)**
- **Acceptance Criteria:**
  1. Trigger email notification on: Lead assignment, Deal stage change to Won, Task assignment, and Ticket SLA breach warning.
  2. User notification preferences in `/settings` allow toggling individual email notification types.
- **Required Tests:** Unit tests for email template generation and mock transport dispatch.
- **Risks & Migration:** Must enforce rate limits on outgoing emails to prevent mail server throttling.

---

### P1.3 — Advanced Bulk Table Operations (Assign, Delete, Export, Update Stage)
- **Problem & Evidence:** `LeadsPage.tsx`, `ContactsPage.tsx`, and `TasksPage.tsx` currently only allow individual record operations. Managing hundreds of records requires tedious manual clicks.
- **Business Value:** Essential for sales operations teams reallocating territories or cleaning lists.
- **User Impact:** Saves hours of manual work during routine sales administration.
- **Dependencies:** Frontend table row checkboxes and backend bulk action endpoints.
- **Complexity:** **M (Medium)**
- **Acceptance Criteria:**
  1. Table headers include "Select All" checkbox with multi-page selection.
  2. Floating bulk action bar provides: "Bulk Reassign Owner", "Bulk Update Stage/Status", "Bulk Add Tags", and "Bulk Delete".
  3. Backend executes operations in an atomic transaction with audit logging.
- **Required Tests:** Test bulk updates with permission verification.
- **Risks & Migration:** Bulk deletes must require explicit confirmation and respect custom role `DELETE` permissions.

---

## 4. P2: Automation, Integrations & AI Expansion

### P2.1 — Live External Channel Adapters (Twilio SMS & Meta WhatsApp Cloud API)
- **Problem & Evidence:** `CommsController` records messages in PostgreSQL but does not dispatch real SMS or WhatsApp messages to external carrier gateways.
- **Business Value:** Enables true omnichannel customer engagement from the unified inbox.
- **User Impact:** Reps can chat directly with customers via WhatsApp and SMS without switching screens.
- **Dependencies:** Twilio REST API SDK, Meta WhatsApp Business Cloud API.
- **Complexity:** **L (Large)**
- **Acceptance Criteria:**
  1. Outbound messages in `/inbox` for WhatsApp call the official Meta Graph API (`/v20.0/{phone_number_id}/messages`).
  2. Inbound webhook verifies Meta webhook signature (`hub.signature_256`) and persists customer replies in the conversation timeline.
  3. Outbound SMS dispatches through Twilio API with live delivery status callbacks.
- **Required Tests:** Integration tests mocking Twilio and Meta API responses and webhook signature validation.
- **Risks & Migration:** Meta WhatsApp Business API requires template pre-approval for outbound initiation.

---

### P2.2 — Visual Workflow Builder Expansion (Webhooks, Delays & Branching)
- **Problem & Evidence:** `WorkflowEngine` is limited to 4 simple actions and cannot call external webhooks, execute time delays (e.g., "Wait 2 days then email"), or branch on conditions.
- **Business Value:** Replaces expensive third-party automation tools (Zapier, Make) for core sales workflows.
- **User Impact:** Allows sales managers to automate complex multi-step nurture sequences.
- **Dependencies:** BullMQ or Redis-backed delay queue.
- **Complexity:** **L (Large)**
- **Acceptance Criteria:**
  1. Workflows support: `WAIT_DURATION` (e.g., 48 hours), `HTTP_POST_WEBHOOK`, `DISPATCH_EMAIL`, and `CREATE_DEAL`.
  2. Multi-condition builder supporting nested `AND` / `OR` logic.
  3. Execution logs display step-by-step input, output, and failure retry status.
- **Required Tests:** Test delayed workflow execution, webhook retry on failure, and nested condition evaluation.
- **Risks & Migration:** Delayed execution requires an asynchronous background worker process.

---

### P2.3 — Autonomous AI Prospecting & Follow-Up Sales Agent
- **Problem & Evidence:** Current AI Gateway provides on-demand scoring and text generation, but does not autonomously execute proactive sales tasks. Competitors are launching autonomous agents (Salesforce Agentforce, HubSpot Breeze Prospecting Agent).
- **Business Value:** Unlocks true AI-driven sales acceleration; captures revenue from inbound leads 24/7.
- **User Impact:** Reps arrive each morning to find qualified leads with draft follow-ups ready for review.
- **Dependencies:** LLM Tool Calling (function calling), `AiAgentRun` queue.
- **Complexity:** **XL (Extra Large)**
- **Acceptance Criteria:**
  1. Autonomous agent periodically inspects new inbound leads.
  2. Researches lead company domain, computes score, drafts personalized outreach email, and queues it in the AI Center Approval Queue.
  3. When approved by rep, email is dispatched and logged to activity timeline.
- **Required Tests:** Test autonomous agent tool calling, prompt boundary enforcement, and human approval gates.
- **Risks & Migration:** Strict guardrails must prevent unauthorized automated email dispatch without human oversight.

---

## 5. P3: Advanced Enterprise Features & Ecosystem

### P3.1 — Multi-Stage Visual Approval Governance (Blueprint / Approval Processes)
- **Problem & Evidence:** Enterprise deals often require manager discount approvals, credit term approvals, or contract reviews before advancing. Currently, any rep can move deals or submit quotes.
- **Business Value:** Essential for large enterprise sales teams with rigorous governance.
- **Complexity:** **L (Large)**
- **Acceptance Criteria:**
  1. Quotes with discounts exceeding 15% automatically lock and enter `PENDING_APPROVAL` status.
  2. Designated managers receive approval notifications and can Approve / Reject with comments.
  3. Approved records unlock for customer dispatch.

---

### P3.2 — Custom Object & Dynamic Schema Builder
- **Problem & Evidence:** Standard CRM objects (Leads, Deals, Contacts, Companies) cannot natively represent specialized business assets (e.g., Subscriptions, Warranties, Properties, Deliveries).
- **Business Value:** Expands SwordNex AI CRM into real estate, healthcare, education, and logistics verticals.
- **Complexity:** **XL (Extra Large)**
- **Acceptance Criteria:**
  1. Admins can define Custom Objects with custom fields, relationships, and UI views.
  2. Custom objects inherit tenant isolation and custom RBAC permissions.

---

### P3.3 — Public Developer REST API & Webhook Gateway
- **Problem & Evidence:** Third-party applications cannot easily integrate with SwordNex AI CRM without using internal session tokens.
- **Business Value:** Enables an ecosystem of developer integrations, Zapier connectors, and mobile clients.
- **Complexity:** **M (Medium)**
- **Acceptance Criteria:**
  1. Workspace admins can generate scoped API keys (`sn_live_...`).
  2. Public API v1 endpoints with OpenAPI 3.0 / Swagger documentation and rate limiting.
  3. Outgoing webhooks with HMAC SHA-256 signature headers.
