import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('Phase 3 Modules & Phase 5 AI Intelligence Test Suite', () => {
  let testOrg: any;
  let adminUser: any;
  let adminToken: string;
  let testLead: any;
  let testContact: any;
  let testDeal: any;
  let testCampaign: any;

  beforeAll(async () => {
    // Clean test data
    await prisma.user.deleteMany({ where: { email: 'p3.admin@swordnex.com' } });
    await prisma.organization.deleteMany({ where: { slug: 'phase3-test-org' } });

    const hash = await bcrypt.hash('SwordNex2026!', 10);

    testOrg = await prisma.organization.create({
      data: {
        name: 'Phase 3 Verification Org',
        slug: 'phase3-test-org',
        plan: 'STANDARD',
        status: 'ACTIVE',
      },
    });

    await prisma.subscription.create({
      data: {
        organizationId: testOrg.id,
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

    adminUser = await prisma.user.create({
      data: {
        email: 'p3.admin@swordnex.com',
        passwordHash: hash,
        firstName: 'P3Admin',
        lastName: 'Tester',
        globalRole: 'USER',
        tokenVersion: 0,
      },
    });

    await prisma.membership.create({
      data: {
        organizationId: testOrg.id,
        userId: adminUser.id,
        role: 'ADMIN',
      },
    });

    // Authenticate admin
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'p3.admin@swordnex.com',
      password: 'SwordNex2026!',
    });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.data.token;

    // Seed sample Lead
    testLead = await prisma.lead.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'Rohan',
        lastName: 'Sharma',
        email: 'rohan.sharma@enterprise-client.com',
        phone: '+919876543210',
        company: 'Enterprise Client Pvt Ltd',
        title: 'VP of Technology',
        status: 'NEW',
        priority: 'HIGH',
        source: 'WEBSITE',
        score: 85,
      },
    });

    // Seed sample Contact
    testContact = await prisma.contact.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'Priya',
        lastName: 'Patel',
        email: 'priya.patel@clientcorp.in',
        phone: '+919812345678',
        title: 'Chief Information Officer',
        department: 'Information Technology',
        lifecycleStage: 'CUSTOMER',
      },
    });

    // Seed Pipeline and Stage for Deal
    const pipeline = await prisma.pipeline.create({
      data: {
        organizationId: testOrg.id,
        name: 'Enterprise Cloud Pipeline',
        isDefault: true,
      },
    });

    const stage = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline.id,
        name: 'Technical Proposal',
        order: 1,
        winProbability: 60,
      },
    });

    // Seed sample Deal
    testDeal = await prisma.deal.create({
      data: {
        organizationId: testOrg.id,
        pipelineId: pipeline.id,
        stageId: stage.id,
        title: 'Enterprise Multi-Tenant CRM License Deal',
        amount: 450000,
        currency: 'INR',
        status: 'OPEN',
        probability: 60,
      },
    });

    // Seed sample Campaign
    testCampaign = await prisma.campaign.create({
      data: {
        organizationId: testOrg.id,
        name: 'Q4 Product Launch Announcement',
        type: 'EMAIL',
        subject: 'Introducing SwordNex 2.0 Enterprise Automation',
        content: 'Exclusive early access for technology leaders.',
      },
    });
  });

  describe('1. Enterprise CSV Data Exports (Leads, Contacts, Deals)', () => {
    it('should export leads as valid RFC 4180 CSV with correct headers', async () => {
      const res = await request(app)
        .get('/api/v1/leads/export/csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrg.id);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('leads-export-');

      const csv = res.text;
      expect(csv).toContain('"ID","First Name","Last Name","Email","Phone","Company","Title","Status","Priority","Source","Score","Created At"');
      expect(csv).toContain('Rohan');
      expect(csv).toContain('rohan.sharma@enterprise-client.com');
      expect(csv).toContain('Enterprise Client Pvt Ltd');
    });

    it('should export contacts as valid CSV with correct fields', async () => {
      const res = await request(app)
        .get('/api/v1/contacts/export/csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrg.id);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Priya');
      expect(res.text).toContain('priya.patel@clientcorp.in');
      expect(res.text).toContain('Chief Information Officer');
    });

    it('should export deals as valid CSV with stage and probability', async () => {
      const res = await request(app)
        .get('/api/v1/deals/export/csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrg.id);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Enterprise Multi-Tenant CRM License Deal');
      expect(res.text).toContain('450000');
      expect(res.text).toContain('Technical Proposal');
    });

    it('should reject unauthenticated export requests with 401', async () => {
      const res = await request(app).get('/api/v1/leads/export/csv');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Inbound Communication Webhooks (Status Updates & Inbound Messages)', () => {
    it('should process delivery status callback and update Message status', async () => {
      // Create test conversation & message
      const conv = await prisma.conversation.create({
        data: {
          organizationId: testOrg.id,
          channel: 'SMS',
          subject: 'Test SMS Thread',
        },
      });

      const msg = await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderType: 'AGENT',
          body: 'Hello Rohan, following up on your demo request.',
          status: 'SENT',
          externalMessageId: 'SM_twilio_test_987654',
        },
      });

      const res = await request(app)
        .post('/api/v1/comms/webhook/twilio')
        .send({
          externalMessageId: 'SM_twilio_test_987654',
          status: 'DELIVERED',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.event).toBe('status_updated');

      const updated = await prisma.message.findUnique({ where: { id: msg.id } });
      expect(updated?.status).toBe('DELIVERED');
    });

    it('should ingest incoming message from customer and attach to conversation', async () => {
      const res = await request(app)
        .post('/api/v1/comms/webhook/twilio')
        .send({
          from: '+919876543210',
          body: 'Thanks for following up! Can we schedule a call tomorrow at 3pm?',
          channel: 'SMS',
          organizationId: testOrg.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.event).toBe('message_received');

      const savedMsg = await prisma.message.findUnique({ where: { id: res.body.messageId } });
      expect(savedMsg).toBeDefined();
      expect(savedMsg?.senderType).toBe('CUSTOMER');
      expect(savedMsg?.body).toContain('tomorrow at 3pm');
    });
  });

  describe('3. Campaign Anti-Spam Compliance & Opt-Out Suppression', () => {
    it('should register one-click unsubscribe in ConsentRecord', async () => {
      const res = await request(app)
        .post('/api/v1/campaigns/unsubscribe')
        .send({
          organizationId: testOrg.id,
          email: 'rohan.sharma@enterprise-client.com',
          consentType: 'MARKETING_EMAIL',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const record = await prisma.consentRecord.findFirst({
        where: {
          organizationId: testOrg.id,
          email: 'rohan.sharma@enterprise-client.com',
          status: 'REVOKED',
        },
      });
      expect(record).toBeDefined();
      expect(record?.source).toBe('ONE_CLICK_UNSUBSCRIBE');
    });

    it('should automatically suppress unsubscribed emails when dispatching campaigns', async () => {
      const res = await request(app)
        .post(`/api/v1/campaigns/${testCampaign.id}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrg.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.suppressedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. AI Center Dynamic Intelligence & Transcript Summarizer', () => {
    it('should dynamically parse actual meeting transcripts rather than returning static templates', async () => {
      const customTranscript = `Vikram: Hello team, thanks for meeting. We need to complete the AWS migration by this Friday.
Ananya: I will prepare the database backup and verify replica syncing tomorrow.
Vikram: Great, please confirm once done. Also, our primary risk is bandwidth delay during the peak hours.
Karthik: I will schedule a checkpoint call with DevOps next week to monitor latency.`;

      const res = await request(app)
        .post('/api/v1/ai/summarize-meeting')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrg.id)
        .send({
          transcript: customTranscript,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.summary).toBeDefined();
      expect(data.actionItems.length).toBeGreaterThanOrEqual(2);

      // Verify that the action items reflect the actual text inputs (Vikram / Ananya / Karthik)
      const tasksJoined = data.actionItems.map((a: any) => a.task).join(' ');
      expect(
        tasksJoined.includes('AWS migration') ||
        tasksJoined.includes('database backup') ||
        tasksJoined.includes('checkpoint call')
      ).toBe(true);
    });

    it('should generate personalized sales email copy referencing company and recipient', async () => {
      const res = await request(app)
        .post('/api/v1/ai/generate-email')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', testOrg.id)
        .send({
          recipientName: 'Vikram Sethi',
          recipientCompany: 'Sethi Logistics Global',
          objective: 'PROPOSAL_SUBMISSION',
          keyPoints: ['Integration with SAP ERP', '24/7 dedicated support SLA'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subject).toContain('Sethi Logistics Global');
      expect(res.body.data.body).toContain('Vikram Sethi');
    });
  });
});
