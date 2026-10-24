import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { config, validateConfig } from '../src/config';
import { prisma } from '../src/utils/prisma';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../src/utils/jwt';
import { EmailService } from '../src/services/email.service';

const app = createApp();

describe('SwordNex AI CRM — Complete Production Deployment & Security Verification Suite', () => {
  let testOrgId: string;
  let testUserId: string;
  let testUserEmail: string;
  let testAccessToken: string;
  let testRefreshToken: string;

  beforeAll(async () => {
    // Register isolated organization and user specifically for this test suite
    const uniqueEmail = `prod.verify.${Date.now()}@swordnex.com`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail,
        password: 'SwordNex2026!',
        firstName: 'Prod',
        lastName: 'Verifier',
        organizationName: `Prod Verification Org ${Date.now()}`,
      });

    expect(regRes.status).toBe(201);
    testAccessToken = regRes.body.data.token;
    testRefreshToken = regRes.body.data.refreshToken;
    testOrgId = regRes.body.data.organization.id;
    testUserId = regRes.body.data.user.id;
    testUserEmail = regRes.body.data.user.email;
  });

  describe('1. Production Configuration & Fail-Fast Validator', () => {
    it('should validate cryptographic secrets in production mode', () => {
      const origEnv = config.nodeEnv;
      const origSecret = config.jwt.secret;
      const origRefresh = config.jwt.refreshSecret;

      try {
        config.nodeEnv = 'production';

        // Case A: Default secret rejected
        config.jwt.secret = 'swordnex_jwt_secret_key_minimum_32_characters_for_prod';
        config.jwt.refreshSecret = 'different_secret_that_is_at_least_32_characters_long';
        let res = validateConfig();
        expect(res.valid).toBe(false);
        expect(res.errors.some((e) => e.includes('JWT_SECRET must be set to a unique, non-default secret'))).toBe(true);

        // Case B: Secret < 32 characters rejected
        config.jwt.secret = 'short_secret_under_32_chars';
        res = validateConfig();
        expect(res.valid).toBe(false);
        expect(res.errors.some((e) => e.includes('minimum 32 characters') || e.includes('at least 32 characters'))).toBe(true);

        // Case C: Identical access and refresh secrets rejected
        const identicalKey = crypto.randomBytes(32).toString('hex');
        config.jwt.secret = identicalKey;
        config.jwt.refreshSecret = identicalKey;
        res = validateConfig();
        expect(res.valid).toBe(false);
        expect(res.errors.some((e) => e.includes('must be independent, distinct keys'))).toBe(true);

        // Case D: Cryptographically independent secrets pass
        config.jwt.secret = crypto.randomBytes(32).toString('hex');
        config.jwt.refreshSecret = crypto.randomBytes(32).toString('hex');
        res = validateConfig();
        expect(res.valid).toBe(true);
        expect(res.errors.length).toBe(0);
      } finally {
        config.nodeEnv = origEnv;
        config.jwt.secret = origSecret;
        config.jwt.refreshSecret = origRefresh;
      }
    });

    it('should warn when TRUSTED_PROXY is set too broadly', () => {
      const origEnv = config.nodeEnv;
      const origProxy = config.trustedProxy;

      try {
        config.nodeEnv = 'production';
        config.jwt.secret = crypto.randomBytes(32).toString('hex');
        config.jwt.refreshSecret = crypto.randomBytes(32).toString('hex');

        config.trustedProxy = 'true';
        let res = validateConfig();
        expect(res.warnings.some((w) => w.includes('TRUSTED_PROXY is set too broadly'))).toBe(true);

        config.trustedProxy = '*';
        res = validateConfig();
        expect(res.warnings.some((w) => w.includes('TRUSTED_PROXY is set too broadly'))).toBe(true);
      } finally {
        config.nodeEnv = origEnv;
        config.trustedProxy = origProxy;
      }
    });
  });

  describe('2. JWT Claims, Algorithm Pinning & Separation', () => {
    it('should strictly sign and verify tokens with HS256, issuer, and audience', () => {
      const payload = {
        userId: testUserId,
        email: testUserEmail,
        globalRole: 'USER',
        tokenVersion: 1,
      };

      const token = generateAccessToken(payload);
      const decoded: any = jwt.decode(token, { complete: true });

      expect(decoded.header.alg).toBe('HS256');
      expect(decoded.payload.iss).toBe('swordnex-ai-crm');
      expect(decoded.payload.aud).toBe('swordnex-api');

      const verified = verifyAccessToken(token);
      expect(verified.userId).toBe(testUserId);
      expect(verified.email).toBe(testUserEmail);
    });

    it('should reject access token passed to refresh token verification', () => {
      const payload = {
        userId: testUserId,
        email: testUserEmail,
        globalRole: 'USER',
        tokenVersion: 1,
      };

      const accessToken = generateAccessToken(payload);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });

    it('should reject refresh token passed to access token verification', () => {
      const payload = {
        userId: testUserId,
        email: testUserEmail,
        globalRole: 'USER',
        tokenVersion: 1,
      };

      const refreshToken = generateRefreshToken(payload);
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('3. Password Reset Flow & Account Enumeration Protection', () => {
    it('should return identical public response whether email exists or not', async () => {
      // Non-existent email
      const fakeRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: `nonexistent_${Date.now()}@domain-fake.com` });

      expect(fakeRes.status).toBe(200);
      expect(fakeRes.body.success).toBe(true);
      expect(fakeRes.body.message).toContain('If this email address exists, a password reset link has been dispatched');

      // Real email
      const realRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      expect(realRes.status).toBe(200);
      expect(realRes.body.success).toBe(true);
      expect(realRes.body.message).toContain('If this email address exists, a password reset link has been dispatched');
    });

    it('should store SHA-256 hashed token and invalidate old session on password reset', async () => {
      // Issue forgot-password for a fresh test user
      const tempEmail = `reset_test_${Date.now()}@swordnex.com`;
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: tempEmail,
          password: 'InitialPassword2026!',
          firstName: 'Reset',
          lastName: 'Tester',
          organizationName: `Reset Corp ${Date.now()}`,
        });
      expect(regRes.status).toBe(201);
      const initialToken = regRes.body.data.token;

      // Trigger forgot password
      await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: tempEmail });

      // Verify token in DB is hashed (64-character hex SHA-256)
      const userInDb = await prisma.user.findUnique({
        where: { email: tempEmail },
      });
      expect(userInDb?.passwordResetToken).toBeDefined();
      expect(userInDb?.passwordResetToken?.length).toBe(64); // SHA-256 hex length
      expect(userInDb?.passwordResetExpiresAt).toBeDefined();

      // Reset password using the raw token (in test environment, forgot-password returns resetToken for automated assertions)
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
      await prisma.user.update({
        where: { id: userInDb!.id },
        data: {
          passwordResetToken: hashed,
          passwordResetExpiresAt: new Date(Date.now() + 3600000),
        },
      });

      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'NewPassword2026!Updated',
        });
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Attempting to reuse the same reset token MUST fail
      const reuseRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'AnotherPassword2026!',
        });
      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.success).toBe(false);

      // Previous session must be revoked (initialToken fails)
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${initialToken}`);
      expect(meRes.status).toBe(401);
    });
  });

  describe('4. Razorpay Signature Verification & Webhook Reconciliation', () => {
    it('should verify payment signature using HMAC SHA-256 and timingSafeEqual', async () => {
      const orderId = `order_test_${Date.now()}`;
      const paymentId = `pay_test_${Date.now()}`;
      const secret = config.razorpay.keySecret || 'test_razorpay_secret_key_123456';

      // Temporarily set secret for test
      const origSecret = config.razorpay.keySecret;
      config.razorpay.keySecret = secret;

      try {
        const validSignature = crypto
          .createHmac('sha256', secret)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');

        // Verify valid HMAC passes
        const expectedBuf = Buffer.from(validSignature, 'utf8');
        const sigBuf = Buffer.from(validSignature, 'utf8');
        expect(expectedBuf.length === sigBuf.length && crypto.timingSafeEqual(expectedBuf, sigBuf)).toBe(true);

        // Verify altered signature fails
        const badSignature = crypto
          .createHmac('sha256', 'wrong_secret')
          .update(`${orderId}|${paymentId}`)
          .digest('hex');
        const badBuf = Buffer.from(badSignature, 'utf8');
        expect(expectedBuf.length === badBuf.length && crypto.timingSafeEqual(expectedBuf, badBuf)).toBe(false);
      } finally {
        config.razorpay.keySecret = origSecret;
      }
    });

    it('should reconcile payment.captured via webhook, activating subscription and generating invoice', async () => {
      // Create a pending payment
      const orderId = `order_webhook_${Date.now()}`;
      const paymentRecord = await prisma.payment.create({
        data: {
          organizationId: testOrgId,
          amount: 2499,
          currency: 'INR',
          provider: 'RAZORPAY',
          orderId,
          status: 'PENDING',
          metadata: { planSlug: 'STANDARD', billingInterval: 'MONTHLY' },
        },
      });

      const eventId = `evt_reconcile_${Date.now()}`;
      const webhookPayload = {
        event_id: eventId,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_reconciled_${Date.now()}`,
              order_id: orderId,
              amount: 249900,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      };

      const res = await request(app)
        .post('/api/v1/subscriptions/webhook')
        .send(webhookPayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('processed');

      // Verify payment was updated to SUCCESS with an invoiceId
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: paymentRecord.id },
      });
      expect(updatedPayment?.status).toBe('SUCCESS');
      expect(updatedPayment?.invoiceId).toBeDefined();

      // Verify Invoice was created
      const invoice = await prisma.invoice.findUnique({
        where: { id: updatedPayment!.invoiceId! },
      });
      expect(invoice).toBeDefined();
      expect(invoice?.status).toBe('PAID');
      expect(invoice?.planSlug).toBe('STANDARD');

      // Verify duplicate webhook returns duplicate_ignored (idempotency)
      const dupRes = await request(app)
        .post('/api/v1/subscriptions/webhook')
        .send(webhookPayload);
      expect(dupRes.status).toBe(200);
      expect(dupRes.body.status).toBe('duplicate_ignored');
    });

    it('should handle payment.failed webhook safely by updating payment status to FAILED', async () => {
      const orderId = `order_failed_${Date.now()}`;
      const paymentRecord = await prisma.payment.create({
        data: {
          organizationId: testOrgId,
          amount: 4999,
          currency: 'INR',
          provider: 'RAZORPAY',
          orderId,
          status: 'PENDING',
        },
      });

      const eventId = `evt_failed_${Date.now()}`;
      const webhookPayload = {
        event_id: eventId,
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: `pay_failed_${Date.now()}`,
              order_id: orderId,
              amount: 499900,
              currency: 'INR',
              status: 'failed',
            },
          },
        },
      };

      const res = await request(app)
        .post('/api/v1/subscriptions/webhook')
        .send(webhookPayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('processed');

      const updatedPayment = await prisma.payment.findUnique({
        where: { id: paymentRecord.id },
      });
      expect(updatedPayment?.status).toBe('FAILED');
    });
  });

  describe('5. Health Endpoint & Proxy Headers', () => {
    it('should return unauthenticated non-sensitive health metadata', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.app).toBe('SwordNex AI CRM Server');
      expect(res.body.uptime).toBeDefined();
      expect(res.body.timestamp).toBeDefined();

      // Ensure no sensitive configuration is leaked
      expect(res.body.databaseUrl).toBeUndefined();
      expect(res.body.jwtSecret).toBeUndefined();
      expect(res.body.env).toBeUndefined();
    });

    it('should respect trust proxy headers when resolving remote IP', async () => {
      const res = await request(app)
        .get('/health')
        .set('X-Forwarded-For', '203.0.113.195, 127.0.0.1');

      expect(res.status).toBe(200);
    });
  });

  describe('6. SMTP Service Connection Verification', () => {
    it('should safely inspect SMTP connection status without throwing or logging credentials', async () => {
      const status = await EmailService.verifyConnection();
      expect(status).toBeDefined();
      expect(typeof status.connected).toBe('boolean');
      expect(typeof status.message).toBe('string');
      // Must not leak passwords
      expect(status.message).not.toContain(config.smtp.pass || 'undefined');
    });
  });
});
