import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const app = createApp();

describe('Phase 2 Security & Tenant Isolation Test Suite', () => {
  let tenantAOrg: any;
  let tenantBOrg: any;
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Clean test users & orgs if exist
    const testEmails = ['sec.userA@example.com', 'sec.userB@example.com'];
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
    await prisma.organization.deleteMany({
      where: { slug: { in: ['sec-test-org-a', 'sec-test-org-b'] } },
    });

    const hash = await bcrypt.hash('SwordNex2026!', 10);

    // Setup Tenant A
    tenantAOrg = await prisma.organization.create({
      data: {
        name: 'Security Test Org A',
        slug: 'sec-test-org-a',
        plan: 'STANDARD',
        status: 'ACTIVE',
      },
    });

    userA = await prisma.user.create({
      data: {
        email: 'sec.userA@example.com',
        passwordHash: hash,
        firstName: 'Alice',
        lastName: 'SecA',
        globalRole: 'USER',
        tokenVersion: 0,
      },
    });

    await prisma.membership.create({
      data: {
        organizationId: tenantAOrg.id,
        userId: userA.id,
        role: 'ADMIN',
      },
    });

    // Setup Tenant B
    tenantBOrg = await prisma.organization.create({
      data: {
        name: 'Security Test Org B',
        slug: 'sec-test-org-b',
        plan: 'STANDARD',
        status: 'ACTIVE',
      },
    });

    userB = await prisma.user.create({
      data: {
        email: 'sec.userB@example.com',
        passwordHash: hash,
        firstName: 'Bob',
        lastName: 'SecB',
        globalRole: 'USER',
        tokenVersion: 0,
      },
    });

    await prisma.membership.create({
      data: {
        organizationId: tenantBOrg.id,
        userId: userB.id,
        role: 'ADMIN',
      },
    });

    // Log in both users to obtain valid JWTs
    const loginResA = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sec.userA@example.com', password: 'SwordNex2026!' });
    tokenA = loginResA.body.data.token;

    const loginResB = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sec.userB@example.com', password: 'SwordNex2026!' });
    tokenB = loginResB.body.data.token;
  });

  describe('1. Instantaneous Session Revocation via Token Versioning', () => {
    it('should allow authenticated requests with an active token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', tenantAOrg.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('sec.userA@example.com');
    });

    it('should immediately revoke token validity upon user logout', async () => {
      // Perform logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', tenantAOrg.id);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Subsequent request with the logged-out token MUST be rejected with 401
      const subsequentRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', tenantAOrg.id);

      expect(subsequentRes.status).toBe(401);
      expect(subsequentRes.body.error).toMatch(/revoked|invalidated|Authentication/i);
    });
  });

  describe('2. Password Reset & Token Invalidation Flow', () => {
    let resetToken: string;

    it('should issue a hashed password reset token on forgot-password request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'sec.userB@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resetToken).toBeDefined();
      resetToken = res.body.data.resetToken;

      // Verify token in database is hashed (not raw plaintext)
      const user = await prisma.user.findUnique({
        where: { email: 'sec.userB@example.com' },
      });
      expect(user?.passwordResetToken).not.toBe(resetToken);
      expect(user?.passwordResetExpiresAt).toBeDefined();
    });

    it('should reject invalid or manipulated reset tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'fake-invalid-token-12345', newPassword: 'NewPassword2026!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid or expired password reset token/i);
    });

    it('should successfully reset password and increment tokenVersion', async () => {
      const userBefore = await prisma.user.findUnique({
        where: { email: 'sec.userB@example.com' },
      });
      const initialVersion = userBefore?.tokenVersion || 0;

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, newPassword: 'BrandNewSecurePass2026!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify tokenVersion incremented (revoking prior sessions)
      const userAfter = await prisma.user.findUnique({
        where: { email: 'sec.userB@example.com' },
      });
      expect(userAfter?.tokenVersion).toBeGreaterThan(initialVersion);
      expect(userAfter?.passwordResetToken).toBeNull();

      // Prior tokenB MUST now be rejected
      const accessRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-organization-id', tenantBOrg.id);

      expect(accessRes.status).toBe(401);

      // Logging in with new password succeeds
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'sec.userB@example.com', password: 'BrandNewSecurePass2026!' });

      expect(newLogin.status).toBe(200);
      expect(newLogin.body.data.token).toBeDefined();
    });
  });

  describe('3. Strict Multi-Tenant Isolation & IDOR Prevention', () => {
    let leadBId: string;

    beforeAll(async () => {
      // Re-login User A and User B
      const loginA = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'sec.userA@example.com', password: 'SwordNex2026!' });
      tokenA = loginA.body.data.token;

      const loginB = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'sec.userB@example.com', password: 'BrandNewSecurePass2026!' });
      tokenB = loginB.body.data.token;

      // Seed a Lead in Tenant B
      const leadB = await prisma.lead.create({
        data: {
          organizationId: tenantBOrg.id,
          firstName: 'Secret',
          lastName: 'ClientB',
          email: 'secret.b@tenantb.com',
          company: 'Confidential Corp B',
          score: 85,
        },
      });
      leadBId = leadB.id;
    });

    it('should reject User A attempting to access Tenant B with header override', async () => {
      // User A specifies Tenant B's organization ID in header
      const res = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', tenantBOrg.id);

      // Must be rejected with 403 Forbidden
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/unauthorized access to requested tenant/i);
    });

    it('should prevent User A from fetching Tenant B lead by direct ID (IDOR)', async () => {
      // User A queries Tenant B's lead ID within Tenant A context
      const res = await request(app)
        .get(`/api/v1/leads/${leadBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', tenantAOrg.id);

      // Must return 404 (not found in Tenant A) rather than leaking Tenant B data
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found or access denied/i);
    });
  });

  describe('4. Cryptographic Payment Verification Enforcement', () => {
    it('should reject payment verification if HMAC SHA256 signature does not match', async () => {
      // Temporarily set a test key secret
      const originalSecret = process.env.RAZORPAY_KEY_SECRET;
      process.env.RAZORPAY_KEY_SECRET = 'test_secret_for_hmac_verification';

      const res = await request(app)
        .post('/api/v1/subscriptions/verify')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', tenantAOrg.id)
        .send({
          orderId: 'order_test_123',
          paymentId: 'pay_test_456',
          signature: 'invalid_tampered_signature_hex',
          planSlug: 'STANDARD',
          billingInterval: 'MONTHLY',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cryptographic payment signature verification failed/i);

      process.env.RAZORPAY_KEY_SECRET = originalSecret;
    });
  });
});
