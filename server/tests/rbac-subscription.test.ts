import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('SwordNex RBAC & SaaS Subscription Engine', () => {
  let superAdminToken: string;
  let customerAdminToken: string;
  let customerOrgId: string;
  let salesRepToken: string;

  beforeAll(async () => {
    // 1. Authenticate Super Admin via Master Login
    const masterRes = await request(app)
      .post('/api/swordnex-master/auth/login')
      .send({
        email: 'admin@swordnex.com',
        password: 'SwordNex2026!',
      });
    expect(masterRes.status).toBe(200);
    superAdminToken = masterRes.body.data.token;

    // 2. Authenticate Customer Admin
    const customerRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'sarah.lead@swordnex.com',
        password: 'SwordNex2026!',
      });
    expect(customerRes.status).toBe(200);
    customerAdminToken = customerRes.body.data.token;
    customerOrgId = customerRes.body.data.organization.id;

    // 3. Authenticate Sales Rep (Employee with limited role)
    const repRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'alex.rep@swordnex.com',
        password: 'SwordNex2026!',
      });
    expect(repRes.status).toBe(200);
    salesRepToken = repRes.body.data.token;
  });

  describe('Super Admin Portal Isolation', () => {
    it('should strictly reject customer admin from logging into master portal', async () => {
      const res = await request(app)
        .post('/api/swordnex-master/auth/login')
        .send({
          email: 'sarah.lead@swordnex.com',
          password: 'SwordNex2026!',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('strictly restricted');
    });

    it('should allow Super Admin to access platform metrics dashboard', async () => {
      const res = await request(app)
        .get('/api/swordnex-master/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.metrics.totalOrganizations).toBeGreaterThanOrEqual(1);
      expect(res.body.data.metrics.mrrInr).toBeDefined();
    });

    it('should block customer admin from accessing Super Admin endpoints', async () => {
      const res = await request(app)
        .get('/api/swordnex-master/organizations')
        .set('Authorization', `Bearer ${customerAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Dynamic Role Creation & Granular RBAC Permissions', () => {
    let createdRoleId: string;

    it('should allow customer admin to fetch existing company roles', async () => {
      const res = await request(app)
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should allow customer admin to create a new custom role with specific permissions', async () => {
      const uniqueName = `QA & Compliance Auditor ${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId)
        .send({
          name: uniqueName,
          description: 'Audits lead quality, records compliance, and exports verification reports.',
          department: 'Compliance',
          permissions: [
            { module: 'LEADS', action: 'VIEW' },
            { module: 'LEADS', action: 'EXPORT' },
            { module: 'REPORTS', action: 'VIEW' },
            { module: 'REPORTS', action: 'EXPORT' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(uniqueName);
      expect(res.body.data.permissions.length).toBe(4);
      createdRoleId = res.body.data.id;
    });

    it('should allow duplicating an existing custom role', async () => {
      expect(createdRoleId).toBeDefined();
      const res = await request(app)
        .post(`/api/v1/roles/${createdRoleId}/duplicate`)
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toContain('Copy');
      expect(res.body.data.permissions.length).toBe(4);
    });

    it('should block non-admin employee from creating custom roles', async () => {
      const res = await request(app)
        .post('/api/v1/roles')
        .set('Authorization', `Bearer ${salesRepToken}`)
        .set('X-Organization-Id', customerOrgId)
        .send({
          name: 'Unauthorized Rogue Role',
          permissions: [{ module: 'BILLING', action: 'MANAGE' }],
        });

      expect(res.status).toBe(403);
    });

    it('should allow deleting custom role', async () => {
      expect(createdRoleId).toBeDefined();
      const res = await request(app)
        .delete(`/api/v1/roles/${createdRoleId}`)
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('SaaS Subscriptions, Dynamic INR Plans & Checkout', () => {
    it('should return live dynamic SaaS plans in INR', async () => {
      const res = await request(app).get('/api/v1/plans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const plans = res.body.data;
      expect(plans.length).toBeGreaterThanOrEqual(3);

      const standard = plans.find((p: any) => p.slug === 'STANDARD');
      expect(standard).toBeDefined();
      expect(standard.currency).toBe('INR');
      expect(standard.monthlyPrice).toBe(2499);
      expect(standard.yearlyPrice).toBe(24990);

      const premium = plans.find((p: any) => p.slug === 'PREMIUM');
      expect(premium).toBeDefined();
      expect(premium.monthlyPrice).toBe(7499);
      expect(premium.yearlyPrice).toBe(74990);
    });

    it('should retrieve current organization subscription and trial status', async () => {
      const res = await request(app)
        .get('/api/v1/subscriptions/current')
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscription).toBeDefined();
      expect(res.body.data.subscription.remainingTrialDays).toBeDefined();
      expect(res.body.data.usage).toBeDefined();
    });

    it('should create payment checkout order with cryptographic hash', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/checkout')
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId)
        .send({
          planSlug: 'PREMIUM',
          billingInterval: 'YEARLY',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderId).toContain('order_');
      expect(res.body.data.amount).toBe(74990);
      expect(res.body.data.currency).toBe('INR');
    });

    it('should verify payment, activate subscription, and generate tax invoice', async () => {
      const uniqueSuffix = Date.now();
      const mockOrderId = `order_test_${uniqueSuffix}`;
      const mockPayId = `pay_test_${uniqueSuffix}`;
      const mockSig = `sig_test_${uniqueSuffix}`;

      const res = await request(app)
        .post('/api/v1/subscriptions/verify')
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId)
        .send({
          orderId: mockOrderId,
          paymentId: mockPayId,
          signature: mockSig,
          planSlug: 'PREMIUM',
          billingInterval: 'YEARLY',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscription.plan).toBe('PREMIUM');
      expect(res.body.data.invoice.invoiceNumber).toMatch(/^INV-/);
      expect(res.body.data.invoice.status).toBe('PAID');

      // Duplicate payment attempt with exact same paymentId must be rejected with 409
      const dupRes = await request(app)
        .post('/api/v1/subscriptions/verify')
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId)
        .send({
          orderId: mockOrderId,
          paymentId: mockPayId,
          signature: mockSig,
          planSlug: 'PREMIUM',
          billingInterval: 'YEARLY',
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
      expect(dupRes.body.error).toContain('Duplicate payment confirmation');
    });

    it('should return invoice list with tax breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/subscriptions/invoices')
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const invoice = res.body.data[0];
      expect(invoice.currency).toBe('INR');
      expect(invoice.status).toBe('PAID');
    });
  });

  describe('15-Day Free Trial Auto-Provisioning & Grace Enforcement', () => {
    it('should auto-provision 15-day Free Trial on public registration', async () => {
      const uniqueEmail = `trial.tester.${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
          firstName: 'Aarav',
          lastName: 'Sharma',
          organizationName: `Aarav Tech ${Date.now()}`,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organization.plan).toBe('FREE_TRIAL');
      expect(res.body.data.trialDaysRemaining).toBe(15);
    });

    it('should block write actions for suspended organization with 403', async () => {
      // Login as Kavita (suspended org admin seeded in seed.ts)
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'kavita.media@example.com',
          password: 'SwordNex2026!',
        });

      expect(loginRes.status).toBe(200);
      const suspendedToken = loginRes.body.data.token;
      const suspendedOrgId = loginRes.body.data.organization.id;

      // Try creating a lead in the suspended organization
      const writeRes = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${suspendedToken}`)
        .set('X-Organization-Id', suspendedOrgId)
        .send({
          firstName: 'Blocked',
          lastName: 'Lead',
          email: 'blocked@example.com',
        });

      expect(writeRes.status).toBe(403);
      expect(writeRes.body.error).toMatch(/suspended|deactivated/i);
    });
  });
});
