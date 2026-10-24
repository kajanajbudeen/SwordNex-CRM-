import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { prisma } from '../src/utils/prisma';
import { config } from '../src/config';

const app = createApp();

describe('SwordNex AI CRM — Password Security, Visibility & Razorpay Integration Suite', () => {
  let testOrgId: string;
  let testUserId: string;
  let testUserEmail: string;
  let currentPassword = 'InitialSecurePassword123!';
  let testAccessToken: string;
  let testRefreshToken: string;

  beforeAll(async () => {
    testUserEmail = `security.audit.${Date.now()}@swordnex.com`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testUserEmail,
        password: currentPassword,
        firstName: 'Security',
        lastName: 'Auditor',
        organizationName: `Security Audit Org ${Date.now()}`,
      });

    expect(regRes.status).toBe(201);
    testAccessToken = regRes.body.data.token;
    testRefreshToken = regRes.body.data.refreshToken;
    testOrgId = regRes.body.data.organization.id;
    testUserId = regRes.body.data.user.id;
  });

  describe('1. Password Security Warning Remediation & Recovery Flow', () => {
    let resetRawToken: string;

    it('should implement anti-enumeration in forgot-password response for unknown emails', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'completely-nonexistent-user@swordnex.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('If this email address exists');
    });

    it('should securely generate and store SHA-256 hashed password reset token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // In non-production test environment, resetToken is returned for verification
      resetRawToken = res.body.data?.resetToken;
      expect(resetRawToken).toBeDefined();
      expect(resetRawToken.length).toBe(64); // 32 bytes hex

      // Verify token in DB is hashed with SHA-256 (not stored in plaintext)
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(user?.passwordResetToken).toBeDefined();
      expect(user?.passwordResetToken).not.toBe(resetRawToken);

      const expectedHashedToken = crypto.createHash('sha256').update(resetRawToken).digest('hex');
      expect(user?.passwordResetToken).toBe(expectedHashedToken);
      expect(user?.passwordResetExpiresAt).toBeDefined();
      expect(new Date(user!.passwordResetExpiresAt!).getTime()).toBeGreaterThan(Date.now());
    });

    it('should reject password reset with tampered or invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid_tampered_token_abcdef123456',
          newPassword: 'BrandNewPassword2026!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid or expired password reset token');
    });

    it('should reject password reset if new password is under 8 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetRawToken,
          newPassword: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('at least 8 characters');
    });

    it('should reset password with valid token, hash with bcrypt, clear token, and bump tokenVersion', async () => {
      const newPassword = 'NewlyResetPassword2026!';
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetRawToken,
          newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password reset successfully');

      // Verify DB record
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(updatedUser?.passwordResetToken).toBeNull();
      expect(updatedUser?.passwordResetExpiresAt).toBeNull();
      expect(updatedUser?.tokenVersion).toBeGreaterThan(0);

      // Verify bcrypt hash matches new password
      const isMatch = await bcrypt.compare(newPassword, updatedUser!.passwordHash);
      expect(isMatch).toBe(true);

      // Verify single-use: Replay attempt must fail
      const replayRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetRawToken,
          newPassword: 'AnotherPassword2026!',
        });
      expect(replayRes.status).toBe(400);

      // Update currentPassword for subsequent tests
      currentPassword = newPassword;
    });

    it('should allow login with new password and reject previous password', async () => {
      // Old password rejected
      const oldRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: 'InitialSecurePassword123!',
        });
      expect(oldRes.status).toBe(401);

      // New password accepted
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: currentPassword,
        });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      testAccessToken = loginRes.body.data.token;
      testRefreshToken = loginRes.body.data.refreshToken;
    });
  });

  describe('2. Authenticated Change Password with Session Revocation', () => {
    it('should reject unauthenticated password change attempts', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword,
          newPassword: 'AnotherNewPassword2026!',
        });

      expect(res.status).toBe(401);
    });

    it('should reject password change when current password is wrong', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          currentPassword: 'IncorrectOldPassword999!',
          newPassword: 'AnotherNewPassword2026!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Incorrect current password');
    });

    it('should reject password change when new password is under 8 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          currentPassword,
          newPassword: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 8 characters');
    });

    it('should successfully change password, re-hash with bcrypt, and revoke active sessions via tokenVersion', async () => {
      const newPassword = 'ChangedFinalPassword2026!';
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          currentPassword,
          newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password updated successfully');

      // Verify old refresh token is now rejected due to tokenVersion increment
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: testRefreshToken });
      expect(refreshRes.status).toBe(401);
      expect(refreshRes.body.error).toContain('revoked or invalidated');

      // Login with changed password to obtain fresh session
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: newPassword,
        });
      expect(loginRes.status).toBe(200);
      testAccessToken = loginRes.body.data.token;
      testRefreshToken = loginRes.body.data.refreshToken;
      currentPassword = newPassword;
    });
  });

  describe('3. Razorpay Orders & Checkout API', () => {
    it('should create order validating server-side pricing and never trust client amounts', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/checkout')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          planSlug: 'STANDARD',
          billingInterval: 'MONTHLY',
          amount: 1, // Tampered client amount must be ignored
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const orderData = res.body.data;
      expect(orderData.orderId).toBeDefined();
      expect(orderData.amount).toBe(2499); // Server-side standard monthly price
      expect(orderData.tax).toBe(449.82); // 18% GST on 2499
      expect(orderData.totalPayable).toBe(2948.82);
      expect(orderData.currency).toBe('INR');
      expect(orderData.razorpayKeyId).toBeDefined();

      // Crucial Security Assertion: Never expose keySecret
      expect((orderData as any).razorpayKeySecret).toBeUndefined();
      expect((orderData as any).keySecret).toBeUndefined();
    });

    it('should reject checkout with invalid plan slug', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/checkout')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          planSlug: 'NON_EXISTENT_PLAN',
          billingInterval: 'MONTHLY',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Valid paid plan selection required');
    });
  });

  describe('4. Razorpay Payment Verification & Cryptographic HMAC Enforcement', () => {
    const testSecret = 'uDkqG8MOIRJ3bpQE1ixtJQKQ';
    const testOrderId = `order_test_${Date.now()}`;
    const testPaymentId = `pay_test_${Date.now()}`;

    it('should reject payment verification when HMAC signature does not match secret', async () => {
      const originalSecret = process.env.RAZORPAY_KEY_SECRET;
      process.env.RAZORPAY_KEY_SECRET = testSecret;

      const res = await request(app)
        .post('/api/v1/subscriptions/verify')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          orderId: testOrderId,
          paymentId: testPaymentId,
          signature: 'completely_tampered_signature_hex_value_1234567890',
          planSlug: 'STANDARD',
          billingInterval: 'MONTHLY',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cryptographic payment signature verification failed');

      process.env.RAZORPAY_KEY_SECRET = originalSecret;
    });

    it('should verify payment with genuine HMAC SHA-256 signature, activate subscription and generate tax invoice', async () => {
      const originalSecret = process.env.RAZORPAY_KEY_SECRET;
      process.env.RAZORPAY_KEY_SECRET = testSecret;

      // Compute standard Razorpay HMAC SHA256: hmac_sha256(order_id + "|" + payment_id, secret)
      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(`${testOrderId}|${testPaymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/subscriptions/verify')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          orderId: testOrderId,
          paymentId: testPaymentId,
          signature: validSignature,
          planSlug: 'STANDARD',
          billingInterval: 'MONTHLY',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscription.status).toBe('ACTIVE');
      expect(res.body.data.subscription.plan).toBe('STANDARD');
      expect(res.body.data.invoice).toBeDefined();
      expect(res.body.data.invoice.invoiceNumber).toMatch(/^INV-/);
      expect(res.body.data.invoice.status).toBe('PAID');

      // Verify payment record in DB
      const paymentRec = await prisma.payment.findFirst({
        where: { paymentId: testPaymentId },
      });
      expect(paymentRec?.status).toBe('SUCCESS');
      expect(paymentRec?.provider).toBe('RAZORPAY');

      process.env.RAZORPAY_KEY_SECRET = originalSecret;
    });

    it('should prevent replay attack by rejecting duplicate payment confirmation for same paymentId', async () => {
      const originalSecret = process.env.RAZORPAY_KEY_SECRET;
      process.env.RAZORPAY_KEY_SECRET = testSecret;

      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(`${testOrderId}|${testPaymentId}`)
        .digest('hex');

      const dupRes = await request(app)
        .post('/api/v1/subscriptions/verify')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .set('x-organization-id', testOrgId)
        .send({
          orderId: testOrderId,
          paymentId: testPaymentId,
          signature: validSignature,
          planSlug: 'STANDARD',
          billingInterval: 'MONTHLY',
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error).toContain('Duplicate payment confirmation');

      process.env.RAZORPAY_KEY_SECRET = originalSecret;
    });
  });

  describe('5. Razorpay Webhook Idempotency & Raw-Body HMAC Verification', () => {
    const webhookSecret = 'test_webhook_secret_key_123456';
    const eventId = `evt_test_${Date.now()}`;
    const payload = {
      id: eventId,
      event: 'payment.captured',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: `pay_webhook_${Date.now()}`,
            order_id: `order_webhook_${Date.now()}`,
            amount: 235882,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    it('should reject webhook requests with invalid or missing HMAC signature when secret is set', async () => {
      const origWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

      const res = await request(app)
        .post('/api/v1/subscriptions/webhook')
        .set('x-razorpay-signature', 'invalid_signature_hex')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('invalid_signature');

      process.env.RAZORPAY_WEBHOOK_SECRET = origWebhookSecret;
    });

    it('should accept valid webhook and idempotently ignore duplicate webhook events', async () => {
      const origWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

      const rawJson = JSON.stringify(payload);
      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawJson)
        .digest('hex');

      // First webhook delivery
      const firstRes = await request(app)
        .post('/api/v1/subscriptions/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', validSignature)
        .send(rawJson);

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.status).toBe('processed');

      // Duplicate delivery with exact same eventId
      const dupRes = await request(app)
        .post('/api/v1/subscriptions/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', validSignature)
        .send(rawJson);

      expect(dupRes.status).toBe(200);
      expect(dupRes.body.status).toBe('duplicate_ignored');

      process.env.RAZORPAY_WEBHOOK_SECRET = origWebhookSecret;
    });
  });
});
