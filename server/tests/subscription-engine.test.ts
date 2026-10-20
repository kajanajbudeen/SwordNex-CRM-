import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('SwordNex Subscription Management & Billing Engine', () => {
  let superAdminToken: string;
  let customerAdminToken: string;
  let customerOrgId: string;
  let customerSubId: string;

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

    // 3. Get customer current subscription ID
    const subRes = await request(app)
      .get('/api/v1/subscriptions/current')
      .set('Authorization', `Bearer ${customerAdminToken}`)
      .set('X-Organization-Id', customerOrgId);
    expect(subRes.status).toBe(200);
    customerSubId = subRes.body.data.subscription.id;
  });

  describe('Customer Usage & Entitlement Quota API', () => {
    it('should return detailed resource usage metrics for active organization', async () => {
      const res = await request(app)
        .get('/api/v1/subscriptions/usage')
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.usage).toBeDefined();
      expect(res.body.data.usage.activeSeats).toBeGreaterThanOrEqual(1);
      expect(res.body.data.usage.seatLimit).toBeGreaterThanOrEqual(1);
      expect(res.body.data.usage.leadsCount).toBeDefined();
      expect(res.body.data.usage.leadLimit).toBeDefined();
      expect(res.body.data.usage.aiTokensUsed).toBeDefined();
    });

    it('should return downloadable invoice details with official corporate tax headers', async () => {
      const invListRes = await request(app)
        .get('/api/v1/subscriptions/invoices')
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId);

      expect(invListRes.status).toBe(200);
      expect(invListRes.body.data.length).toBeGreaterThanOrEqual(1);
      const invoiceId = invListRes.body.data[0].id;

      const res = await request(app)
        .get(`/api/v1/subscriptions/invoices/${invoiceId}/download`)
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.invoiceNumber).toMatch(/^INV-/);
      expect(res.body.data.company.gstin).toBeDefined();
      expect(res.body.data.company.legalName).toContain('SwordNex Technologies');
    });

    it('should retrieve customer payment transactions ledger', async () => {
      const res = await request(app)
        .get('/api/v1/subscriptions/payments')
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Upgrade & Downgrade Lifecycle Workflows', () => {
    it('should allow customer admin to upgrade subscription instantly', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/upgrade')
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId)
        .send({
          planSlug: 'PREMIUM',
          billingInterval: 'YEARLY',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscription.plan).toBe('PREMIUM');
      expect(res.body.data.invoice.invoiceNumber).toMatch(/^INV-/);
    });

    it('should schedule downgrade to Standard plan at end of current billing period', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/downgrade')
        .set('Authorization', `Bearer ${customerAdminToken}`)
        .set('X-Organization-Id', customerOrgId)
        .send({
          targetPlanSlug: 'STANDARD',
          targetBillingInterval: 'MONTHLY',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scheduledPlan).toBe('STANDARD');
      expect(res.body.data.effectiveDate).toBeDefined();
      expect(res.body.message).toContain('fully preserved');
    });
  });

  describe('Super Admin Subscription Management & Analytics', () => {
    it('should return platform-wide subscription analytics with MRR and ARR in INR', async () => {
      const res = await request(app)
        .get('/api/swordnex-master/subscriptions/analytics')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview.mrrInr).toBeGreaterThanOrEqual(0);
      expect(res.body.data.overview.arrInr).toBeGreaterThanOrEqual(0);
      expect(res.body.data.overview.activePaid).toBeGreaterThanOrEqual(1);
      expect(res.body.data.overview.trialToPaidConversionRate).toBeDefined();
      expect(res.body.data.planDistribution).toBeDefined();
    });

    it('should return all customer subscriptions with search and status filtering', async () => {
      const res = await request(app)
        .get('/api/swordnex-master/subscriptions?status=ACTIVE')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const sub = res.body.data[0];
      expect(sub.organizationName).toBeDefined();
      expect(sub.seatsUsed).toBeDefined();
      expect(sub.seatCount).toBeDefined();
    });

    it('should reject manual subscription extension without a mandatory audit reason', async () => {
      const res = await request(app)
        .post(`/api/swordnex-master/subscriptions/${customerSubId}/extend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ extraDays: 30 }); // No reason provided

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('mandatory reason is required');
    });

    it('should successfully extend subscription when authorized with reason', async () => {
      const res = await request(app)
        .post(`/api/swordnex-master/subscriptions/${customerSubId}/extend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          extraDays: 30,
          reason: 'Executive enterprise customer contract extension approved by Board.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('extended subscription by 30 days');
    });

    it('should allow Super Admin to update subscription status with audit record', async () => {
      const res = await request(app)
        .patch(`/api/swordnex-master/subscriptions/${customerSubId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'ACTIVE',
          reason: 'Verified account compliance and confirmed SLA commitments.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');
    });

    it('should return platform-wide payments ledger', async () => {
      const res = await request(app)
        .get('/api/swordnex-master/payments')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return platform-wide tax invoices ledger', async () => {
      const res = await request(app)
        .get('/api/swordnex-master/invoices')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
