import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('Phase 1: Customer Support Tickets & Sales Workflows Test Suite', () => {
  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;
  let testContact: any;
  let createdTicketId: string;

  beforeAll(async () => {
    // Clean up past test fixtures if present
    await prisma.user.deleteMany({
      where: { email: { in: ['support.agent.a@swordnex.com', 'foreign.agent.b@swordnex.com'] } },
    });
    await prisma.organization.deleteMany({
      where: { slug: { in: ['phase1-support-org-a', 'phase1-support-org-b'] } },
    });

    const hash = await bcrypt.hash('SwordNex2026!', 10);

    // 1. Create Organization A
    orgA = await prisma.organization.create({
      data: {
        name: 'Phase 1 Support Alpha',
        slug: 'phase1-support-org-a',
        plan: 'PREMIUM',
        status: 'ACTIVE',
      },
    });

    await prisma.subscription.create({
      data: {
        organizationId: orgA.id,
        plan: 'PREMIUM',
        planSlug: 'PREMIUM',
        billingInterval: 'MONTHLY',
        status: 'ACTIVE',
        price: 4999,
        currency: 'INR',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    userA = await prisma.user.create({
      data: {
        email: 'support.agent.a@swordnex.com',
        passwordHash: hash,
        firstName: 'Sarah',
        lastName: 'Agent',
        globalRole: 'USER',
      },
    });

    await prisma.membership.create({
      data: {
        organizationId: orgA.id,
        userId: userA.id,
        role: 'ADMIN',
      },
    });

    // 2. Create Organization B (for cross-tenant security verification)
    orgB = await prisma.organization.create({
      data: {
        name: 'Phase 1 Support Beta',
        slug: 'phase1-support-org-b',
        plan: 'STANDARD',
        status: 'ACTIVE',
      },
    });

    await prisma.subscription.create({
      data: {
        organizationId: orgB.id,
        plan: 'STANDARD',
        planSlug: 'STANDARD',
        billingInterval: 'MONTHLY',
        status: 'ACTIVE',
        price: 2499,
        currency: 'INR',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    userB = await prisma.user.create({
      data: {
        email: 'foreign.agent.b@swordnex.com',
        passwordHash: hash,
        firstName: 'Bob',
        lastName: 'Foreign',
        globalRole: 'USER',
      },
    });

    await prisma.membership.create({
      data: {
        organizationId: orgB.id,
        userId: userB.id,
        role: 'ADMIN',
      },
    });

    // Create test contact in Org A
    testContact = await prisma.contact.create({
      data: {
        organizationId: orgA.id,
        firstName: 'Alice',
        lastName: 'Enterprise',
        email: 'alice.enterprise@acme.com',
        phone: '+1-555-0199',
      },
    });

    // Login Agent A
    const loginResA = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'support.agent.a@swordnex.com', password: 'SwordNex2026!' });
    tokenA = loginResA.body.data.token;

    // Login Agent B
    const loginResB = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'foreign.agent.b@swordnex.com', password: 'SwordNex2026!' });
    tokenB = loginResB.body.data.token;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: ['support.agent.a@swordnex.com', 'foreign.agent.b@swordnex.com'] } },
    });
    await prisma.organization.deleteMany({
      where: { slug: { in: ['phase1-support-org-a', 'phase1-support-org-b'] } },
    });
  });

  describe('1. Customer Support Ticket Creation & SLA Engine', () => {
    it('should create an urgent support ticket with automatic ticket number and SLA deadlines', async () => {
      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({
          subject: 'Production API Gateway 502 Bad Gateway',
          description: 'Our mobile client is receiving sporadic 502 responses from the webhook ingestion endpoint.',
          priority: 'URGENT',
          channel: 'EMAIL',
          category: 'TECHNICAL',
          contactId: testContact.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketNumber).toMatch(/^TICK-\d{4}$/);
      expect(res.body.data.status).toBe('OPEN');
      expect(res.body.data.priority).toBe('URGENT');
      expect(res.body.data.firstResponseDueAt).toBeDefined();
      expect(res.body.data.resolutionDueAt).toBeDefined();

      createdTicketId = res.body.data.id;
    });

    it('should retrieve ticket summary metrics with open and urgent counts', async () => {
      const res = await request(app)
        .get('/api/v1/tickets/summary')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.open).toBeGreaterThanOrEqual(1);
      expect(res.body.data.urgent).toBeGreaterThanOrEqual(1);
    });

    it('should list tickets with search and filter capabilities', async () => {
      const res = await request(app)
        .get('/api/v1/tickets?q=502&priority=URGENT')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tickets.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.tickets[0].id).toBe(createdTicketId);
    });
  });

  describe('2. Ticket Conversation Thread & AI-Assisted Resolution Drafting', () => {
    it('should add an internal note to the ticket', async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${createdTicketId}/comments`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({
          content: 'DevOps confirmed load balancer restarted at 04:12 UTC; investigating connection pool limits.',
          isInternal: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isInternal).toBe(true);
      expect(res.body.data.authorType).toBe('AGENT');
    });

    it('should add a public reply and automatically mark firstRespondedAt timestamp', async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${createdTicketId}/comments`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({
          content: 'Hello Alice, our infrastructure team is actively addressing the gateway routing. A hotfix is deploying.',
          isInternal: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify firstRespondedAt updated on the ticket
      const ticketRes = await request(app)
        .get(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(ticketRes.body.data.firstRespondedAt).toBeDefined();
    });

    it('should generate an AI-assisted resolution draft using AiGateway', async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${createdTicketId}/ai-draft`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.draft).toBeDefined();
      expect(res.body.data.confidence).toBeGreaterThan(0.5);
    });

    it('should transition ticket to RESOLVED with resolvedAt timestamp and CSAT rating', async () => {
      const res = await request(app)
        .patch(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({
          status: 'RESOLVED',
          csatRating: 5,
          csatFeedback: 'Very swift response and resolution, thank you!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RESOLVED');
      expect(res.body.data.resolvedAt).toBeDefined();
      expect(res.body.data.csatRating).toBe(5);
    });
  });

  describe('3. Multi-Tenant Ticket Security & Boundary Enforcement', () => {
    it('should strictly deny access when Tenant B attempts to view Tenant A ticket', async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${createdTicketId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-organization-id', orgB.id);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should prevent Tenant B from commenting on Tenant A ticket', async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${createdTicketId}/comments`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-organization-id', orgB.id)
        .send({ content: 'Unauthorized comment attempt', isInternal: false });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Sales Targets & Lost-Deal Root Cause Analysis', () => {
    it('should create and retrieve a sales target quota with attainment calculations', async () => {
      const targetRes = await request(app)
        .post('/api/v1/deals/targets')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({
          userId: userA.id,
          period: '2026-Q4',
          targetAmount: 50000,
          currency: 'USD',
          startDate: '2026-10-01',
          endDate: '2026-12-31',
          notes: 'Q4 Enterprise expansion quota',
        });

      expect(targetRes.status).toBe(201);
      expect(targetRes.body.success).toBe(true);
      expect(targetRes.body.data.targetAmount).toBe(50000);

      const listRes = await request(app)
        .get('/api/v1/deals/targets?period=2026-Q4')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(listRes.body.data[0].attainmentRate).toBeDefined();
    });

    it('should create deals with winLossCategory and calculate root-cause analysis', async () => {
      // Create pipeline for orgA
      const pipeline = await prisma.pipeline.create({
        data: {
          organizationId: orgA.id,
          name: 'Direct Sales Pipeline',
          stages: {
            create: [
              { name: 'Prospecting', order: 1, winProbability: 10 },
              { name: 'Closed Lost', order: 5, winProbability: 0 },
            ],
          },
        },
        include: { stages: true },
      });

      const lostStage = pipeline.stages.find((s) => s.name === 'Closed Lost')!;

      // Create 2 lost deals with distinct categories
      await prisma.deal.create({
        data: {
          organizationId: orgA.id,
          pipelineId: pipeline.id,
          stageId: lostStage.id,
          title: 'Lost to Competitor Deal',
          amount: 25000,
          status: 'LOST',
          winLossCategory: 'COMPETITOR',
          winLossReason: 'Competitor offered bundled pricing discount',
        },
      });

      await prisma.deal.create({
        data: {
          organizationId: orgA.id,
          pipelineId: pipeline.id,
          stageId: lostStage.id,
          title: 'Lost on Budget Deal',
          amount: 15000,
          status: 'LOST',
          winLossCategory: 'PRICING',
          winLossReason: 'Prospect internal budget freeze until Q1',
        },
      });

      const analysisRes = await request(app)
        .get('/api/v1/deals/win-loss-analysis')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(analysisRes.status).toBe(200);
      expect(analysisRes.body.success).toBe(true);
      expect(analysisRes.body.data.summary.totalLostCount).toBe(2);
      expect(analysisRes.body.data.summary.totalLostAmount).toBe(40000);
      expect(analysisRes.body.data.categories.length).toBe(2);
    });
  });

  describe('5. Sales Rep "My Day" Workspace & Non-Mocked Forecast Reports', () => {
    it('should return personalized "My Day" dashboard for the logged-in rep', async () => {
      const res = await request(app)
        .get('/api/v1/reports/my-day')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.closingDeals).toBeInstanceOf(Array);
      expect(res.body.data.tasks).toBeInstanceOf(Array);
    });

    it('should return database-backed monthly forecasts', async () => {
      const res = await request(app)
        .get('/api/v1/reports/forecasts')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(6);
      expect(res.body.data[0]).toHaveProperty('month');
      expect(res.body.data[0]).toHaveProperty('committed');
      expect(res.body.data[0]).toHaveProperty('bestCase');
      expect(res.body.data[0]).toHaveProperty('pipeline');
    });

    it('should export CRM analytics report as CSV', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export/csv')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Active Pipeline Value (USD)');
    });
  });
});
