# SwordNex AI CRM — Security Architecture & Production Hardening Guide

> **Security Posture:** Enterprise Zero-Trust Multi-Tenant Isolation  
> **Key Protocols:** Cryptographic Timing-Safe Comparisons, Double-Secret JWT, Salted Hash Reset Tokens, Non-Root Runtimes  

---

## 1. Security Controls & Hardening Matrix

| Security Domain | Control Implemented | Technical Mechanism | Verification Command |
| :--- | :--- | :--- | :--- |
| **Database Isolation** | Private Docker Network | PostgreSQL runs exclusively on `crm_db_network` with `internal: true`. Zero host port mapping for `5432`. | `docker compose -f docker-compose.prod.yml ps` shows no published port for `database`. |
| **Reverse Proxy Trust** | Explicit CIDR Proxy Trust | `app.set('trust proxy', config.trustedProxy)` configured with `loopback,linklocal,uniquelocal`. No blind `trust proxy = true`. | Rate limiter and audit log correctly extract client IP (`req.ip`) from `X-Forwarded-For`. |
| **HTTP Security Headers** | Helmet + Nginx Injection | Injects HSTS (`max-age=31536000`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. | `curl -I https://crm.yourdomain.com` |
| **Body Size Limits** | Buffer Exhaustion Defense | Nginx sets `client_max_body_size 15M;` to support lead CSV imports while preventing memory exhaustion DoS attacks. | Large requests (>15M) return `413 Request Entity Too Large`. |
| **Least-Privilege Execution**| Non-Root User Execution | Server container executes as unprivileged user `USER node` (UID 1000). | `docker compose -f docker-compose.prod.yml exec server whoami` returns `node`. |
| **Rate Limiting** | Abuse Prevention | Express Rate Limiter applies tiered limits: `/api` (1000 req / 15 min), `/api/v1/auth/login` (5 req / 15 min), `/api/v1/ai` (20 req / min). | Exceeding limits triggers `429 Too Many Requests`. |

---

## 2. Authentication & Cryptographic Session Security

### 2.1 Double-Secret JWT Architecture
- **Algorithm Pinning**: Explicitly pinned to `HS256` in token signing and verification to prevent algorithm-switching attacks (`none` or RSA/HMAC confusion).
- **Independent Cryptographic Secrets**: Separate 64-byte hex keys for Access Tokens (`JWT_SECRET`) and Refresh Tokens (`JWT_REFRESH_SECRET`).
- **Session Revocation**: User model tracks `tokenVersion`. Incrementing `tokenVersion` on logout, password change, or suspension immediately invalidates all active tokens.

### 2.2 Password Security & Reset Token Protection
- **Password Storage**: Passwords hashed using `bcryptjs` with work factor 10.
- **Account Enumeration Protection**: Forgot-password endpoint returns an identical generic response regardless of whether the submitted email exists in the database.
- **Hashed Reset Tokens**: Password reset tokens are generated using `crypto.randomBytes(32).toString('hex')`. Only their SHA-256 hash is persisted in the database with a 1-hour expiration timestamp.
- **Single-Use Destruction**: When a password is reset, the token is atomically consumed and `tokenVersion` is incremented.

---

## 3. Razorpay Payment Gateway & Webhook Security

- **Server-Side Pricing Authorization**: Checkout orders calculate amounts strictly on the server based on database plan pricing in INR. Client-supplied amounts are ignored.
- **Cryptographic Timing-Safe Comparison**: Webhook signatures and payment verification hashes are compared using `crypto.timingSafeEqual` to prevent timing-attack side-channel leaks.
- **Raw Body Verification**: Express JSON parser preserves `req.rawBody` buffer so that HMAC SHA-256 webhook signatures are verified against exact unmodified bytes.
- **Idempotent Webhook Processing**: Received webhooks are recorded in `PaymentWebhookEvent`. Duplicate webhooks are safely acknowledged without re-processing payments.

---

## 4. Multi-Tenant Authorization & IDOR Defenses

- **Global vs. Tenant Separation**: Platform administrators (`globalRole = 'SUPER_ADMIN'`) have platform-wide access, while workspace team members have tenant-scoped roles (`Membership.role`). Tenant invitations strictly forbid assigning `SUPER_ADMIN` platform privileges.
- **Relational Composite Scoping**: All queries for tenant records (Leads, Deals, Contacts, Companies, Tasks, Invoices) include the active `organizationId`, preventing cross-tenant Insecure Direct Object Reference (IDOR) attacks.
- **Granular RBAC Permission Matrix**: Modules enforce granular actions (`VIEW`, `CREATE`, `EDIT`, `DELETE`, `APPROVE`, `EXPORT`, `ASSIGN`, `MANAGE`) via `requirePermission` middleware.

---

## 5. AI Security & Prompt Injection Defenses

- **Input Sanitization**: User-supplied input strings are filtered and escaped before inclusion in AI system prompts.
- **Human-in-the-Loop Oversight**: Autonomous sales agent actions (such as automated customer email dispatch or deal closing) require explicit human approval via the AI Center approval queue.
- **Zero API Secret Leakage**: External LLM keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) remain strictly on the backend and are never sent to the frontend client.
