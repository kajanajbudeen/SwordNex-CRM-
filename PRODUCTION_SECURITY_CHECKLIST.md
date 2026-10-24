# SwordNex AI CRM — Production Security Audit & Hardening Checklist

This document details the complete security controls implemented in SwordNex AI CRM, the verification mechanism for each control, and the operational responsibilities for production deployment.

---

## 1. Network & Infrastructure Security

| Control | Status | Implementation Details | Verification |
| :--- | :---: | :--- | :--- |
| **Private Database Isolation** | ✅ IMPLEMENTED | PostgreSQL runs exclusively on `crm_db_network` with `internal: true`. No host port mapping for `5432`. | `docker compose -f docker-compose.prod.yml ps` shows 0 external ports on `database`. |
| **Strict Reverse Proxy Trust** | ✅ IMPLEMENTED | Express `app.set('trust proxy', config.trustedProxy)` configured with `loopback,linklocal,uniquelocal`. No blind `trust proxy = true`. | Rate limiter and audit log correctly extract client IP (`req.ip`) from `X-Forwarded-For`. |
| **Security Headers** | ✅ IMPLEMENTED | Nginx injects HSTS (`max-age=31536000`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. | `curl -I https://crm.yourdomain.com` |
| **Uploads & Body Limits** | ✅ IMPLEMENTED | Nginx sets `client_max_body_size 15M;` to support lead CSV imports while preventing memory exhaustion DoS attacks. | Large requests (>15M) return `413 Request Entity Too Large`. |
| **Non-Root Containers** | ✅ IMPLEMENTED | Server runtime executes as unprivileged user `USER node` (UID 1000). | `docker compose -f docker-compose.prod.yml exec server whoami` returns `node`. |

---

## 2. Secrets Management & Fail-Fast Startup Validation

| Control | Status | Implementation Details | Verification |
| :--- | :---: | :--- | :--- |
| **Docker Secrets Support** | ✅ IMPLEMENTED | `readSecret()` utility loads credentials from `/run/secrets/*` or `*_FILE` environment variables without putting raw secrets in process env. | Tested with Docker Compose secrets files in `./secrets/`. |
| **Zero Committed Secrets** | ✅ IMPLEMENTED | `.gitignore` explicitly ignores `secrets/`, `*.env.production`, `*.pem`, `*.key`, `backups/`, and `wal_archive/`. | `git status` verifies no credential or key files are staged. |
| **Fail-Fast Production Validation** | ✅ IMPLEMENTED | `validateConfig()` runs on server startup in `production`. Aborts boot immediately if `JWT_SECRET` contains default words ("secret", "dev", "swordnex_prod") or is under 32 characters. | Tested via automated unit test `Production Readiness Remediation Suite`. |
| **Safe Error Masking** | ✅ IMPLEMENTED | Unhandled errors return generic messages in production without stack traces or SQL error text. | `sendError(res, 'Internal server error', 500)` in production mode. |

---

## 3. JWT Authentication & Session Security

| Control | Status | Implementation Details | Verification |
| :--- | :---: | :--- | :--- |
| **Cryptographic Algorithm Pinning** | ✅ IMPLEMENTED | Both `jwt.sign` and `jwt.verify` strictly enforce `algorithms: ['HS256']`. Rejects `none` algorithm and key confusion attacks. | Tested in `utils/jwt.ts`. |
| **Claims Enforcement** | ✅ IMPLEMENTED | All tokens issue and verify `issuer: 'swordnex-ai-crm'` and `audience: 'swordnex-api'`. | Tokens signed by different issuer/audience are rejected with `401`. |
| **Independent Access & Refresh Secrets** | ✅ IMPLEMENTED | Access tokens use `JWT_SECRET`; refresh tokens use `JWT_REFRESH_SECRET`. Tokens cannot be used interchangeably. | Passing an access token to `/api/v1/auth/refresh` fails verification. |
| **Instant Session Revocation** | ✅ IMPLEMENTED | User entity tracks `tokenVersion: Int`. Logging out or resetting passwords increments `tokenVersion`, instantly invalidating all issued access and refresh tokens. | Tested in `server/tests/security-phase2.test.ts`. |
| **No Passwords or Tokens in Logs** | ✅ IMPLEMENTED | Audit logging scrubs passwords, hashes, and authorization headers before persistence. | Audit log entries in database contain only sanitized metadata. |

---

## 4. Payment Gateway & Webhook Hardening

| Control | Status | Implementation Details | Verification |
| :--- | :---: | :--- | :--- |
| **Raw Request Body Webhooks** | ✅ IMPLEMENTED | Express captures unparsed `req.rawBody` buffer in JSON parser before JSON deserialization. | HMAC is calculated against the exact bytes sent by Razorpay. |
| **Constant-Time Verification** | ✅ IMPLEMENTED | Uses `crypto.timingSafeEqual(expectedBuf, sigBuf)` for both payment signatures and webhook signatures. Mitigates side-channel timing attacks. | Verified in `subscription.controller.ts`. |
| **Webhook Deduplication & Idempotency** | ✅ IMPLEMENTED | Webhook events are checked against `prisma.paymentWebhookEvent.eventId`. Duplicate deliveries return `200 { status: 'duplicate_ignored' }`. | Verified in automated test suite. |
| **Backend-Only Keys** | ✅ IMPLEMENTED | `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are never sent to the client. Only the public `RAZORPAY_KEY_ID` is provided to initialize checkout. | Client bundle and `/api/plans` payloads inspected. |
| **Server-Side Verified Pricing** | ✅ IMPLEMENTED | Subscription prices, taxes (18% GST), and totals are computed strictly from database records (`SubscriptionPlanConfig`). Client-provided prices are ignored. | Verified in `subscription.controller.ts`. |

---

## 5. Password Reset & SMTP Security

| Control | Status | Implementation Details | Verification |
| :--- | :---: | :--- | :--- |
| **Account Enumeration Defense** | ✅ IMPLEMENTED | `/api/v1/auth/forgot-password` always returns `200 OK` with "If this email address exists, a password reset link has been dispatched." regardless of whether the email exists. | Response time and body are identical for existing and non-existing accounts. |
| **Hashed Token Storage** | ✅ IMPLEMENTED | Only the SHA-256 hash of the reset token is stored in `User.passwordResetToken`. Raw token is dispatched solely via email. Database compromise does not expose usable reset links. | Verified in `auth.controller.ts`. |
| **1-Hour Expiry & Single Use** | ✅ IMPLEMENTED | Tokens expire after 60 minutes (`passwordResetExpiresAt`). Upon password reset, `passwordResetToken` is set to `null` and `tokenVersion` is incremented. | Attempting to reuse a reset token fails with `400 Invalid or expired token`. |
| **Authenticated SMTP** | ✅ IMPLEMENTED | Pooled `nodemailer` transport supports TLS 1.2+ over port 587 (STARTTLS) or port 465 (SMTPS) with verified sender identity. | Verified via `EmailService.verifyConnection()`. |

---

## 6. Multi-Tenant Boundary Enforcement & Dynamic RBAC

| Control | Status | Implementation Details | Verification |
| :--- | :---: | :--- | :--- |
| **Tenant Scope Isolation** | ✅ IMPLEMENTED | All queries for CRM resources (`Lead`, `Contact`, `Deal`, `Task`, `Quote`, `CustomerInvoice`, `Ticket`) enforce `where: { organizationId }`. | Tested across 125 backend tests with cross-tenant assertion suites. |
| **Relational IDOR Mitigation** | ✅ IMPLEMENTED | When referencing parent entities (e.g. updating a Task belonging to a Deal or Contact), queries verify that both parent and child belong to `req.organizationId`. | Tested in `production-readiness-remediation.test.ts`. |
| **Privilege Separation** | ✅ IMPLEMENTED | Platform `SUPER_ADMIN` privileges are separated from tenant-level `ADMIN` roles. Tenant admins cannot assign `globalRole = SUPER_ADMIN`. | Tested in `security-entitlements.test.ts`. |
| **Randomized Member Invitations** | ✅ IMPLEMENTED | Member invitations generate a secure cryptographic 16-character random password; static default passwords like `SwordNex@123` have been eliminated. | Tested in `production-readiness-remediation.test.ts`. |

---

## 7. Rate Limiting & Abuse Prevention

| Limiter | Window | Max Hits | Targeted Routes |
| :--- | :---: | :---: | :--- |
| `authLimiter` | 15 mins | 20 requests | `/api/v1/auth/login`, `/api/v1/auth/register` |
| `passwordResetLimiter` | 15 mins | 5 requests | `/api/v1/auth/forgot-password`, `/api/v1/auth/reset-password` |
| `webhookLimiter` | 1 min | 120 requests | `/api/v1/subscriptions/webhook`, `/api/v1/comms/webhook/*` |
| `aiLimiter` | 1 min | 30 requests | `/api/v1/ai/*` |
| `generalLimiter` | 15 mins | 1000 requests | All other `/api/v1/*` routes |
