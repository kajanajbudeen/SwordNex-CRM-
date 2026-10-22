import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { prisma } from '../src/utils/prisma';

const app = createApp();

describe('Production Readiness Audit & Remediation Verification Suite', () => {
  let tenantAToken: string;
  let tenantAOrgId: string;
  let tenantBToken: string;
  let tenantBOrgId: string;
  let tenantBCompanyId: string;
  let tenantBContactId: string;
  let tenantBLeadId: string;
  let tenantBProductId: string;

  beforeAll(async () => {
    // 1. Authenticate Tenant A Admin
    const tenantARes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'sarah.lead@swordnex.com',
        password: 'SwordNex2026!',
      });
    expect(tenantARes.status).toBe(200);
    tenantAToken = tenantARes.body.data.token;
    tenantAOrgId = tenantARes.body.data.organization.id;

    // 2. Authenticate Tenant B Admin
    const tenantBRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'rahul.nexus@example.com',
        password: 'SwordNex2026!',
      });
    expect(tenantBRes.status).toBe(200);
    tenantBToken = tenantBRes.body.data.token;
    tenantBOrgId = tenantBRes.body.data.organization.id;

    // 3. Create Tenant B Isolated Entities
    const bCompany = await prisma.company.create({
      data: {
        organizationId: tenantBOrgId,
        name: `Confidential Nexus Corp ${Date.now()}`,
        domain: 'nexus-secret.com',
      },
    });
    tenantBCompanyId = bCompany.id;

    const bContact = await prisma.contact.create({
      data: {
        organizationId: tenantBOrgId,
        firstName: 'Confidential',
        lastName: 'Nexus Contact',
        email: `secret.${Date.now()}@nexus.com`,
        companyId: tenantBCompanyId,
      },
    });
    tenantBContactId = bContact.id;

    const bLead = await prisma.lead.create({
      data: {
        organizationId: tenantBOrgId,
        firstName: 'Secret',
        lastName: 'Nexus Lead',
        email: `lead.${Date.now()}@nexus.com`,
        status: 'NEW',
        priority: 'HIGH',
      },
    });
    tenantBLeadId = bLead.id;

    const bProduct = await prisma.product.create({
      data: {
        organizationId: tenantBOrgId,
        sku: `SKU-B-${Date.now()}`,
        name: 'Nexus Enterprise Engine',
        unitPrice: 50000,
        currency: 'INR',
      },
    });
    tenantBProductId = bProduct.id;
  });

  describe('1. Authentication & Session Revocation Remediation', () => {
    it('should strictly reject refresh token after user session revocation (tokenVersion incremented)', async () => {
      // Login as user to get fresh refresh token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alex.rep@swordnex.com',
          password: 'SwordNex2026!',
        });
      expect(loginRes.status).toBe(200);
      const userRefreshToken = loginRes.body.data.refreshToken;
      const userToken = loginRes.body.data.token;

      // User performs logout which increments tokenVersion
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${userToken}`);
      expect(logoutRes.status).toBe(200);

      // Attempting to refresh with the old refresh token MUST return 401
      const refreshAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: userRefreshToken });

      expect(refreshAttempt.status).toBe(401);
      expect(refreshAttempt.body.success).toBe(false);
      expect(refreshAttempt.body.error).toMatch(/revoked|invalidated/i);
    });

    it('should stamp tokenVersion into Super Admin JWT payload for master platform revocation support', async () => {
      const masterRes = await request(app)
        .post('/api/swordnex-master/auth/login')
        .send({
          email: 'admin@swordnex.com',
          password: 'SwordNex2026!',
        });
      expect(masterRes.status).toBe(200);
      const masterToken = masterRes.body.data.token;

      const decoded: any = jwt.decode(masterToken);
      expect(decoded.tokenVersion).toBeDefined();
      expect(typeof decoded.tokenVersion).toBe('number');
      expect(decoded.isSuperAdmin).toBe(true);
    });
  });

  describe('2. Hardcoded Default Password Elimination on Invitations', () => {
    it('should never assign static default password when inviting new team members', async () => {
      const inviteEmail = `invited.audit.${Date.now()}@example.com`;
      const inviteRes = await request(app)
        .post('/api/v1/organizations/members/invite')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-organization-id', tenantAOrgId)
        .send({
          email: inviteEmail,
          firstName: 'Audit',
          lastName: 'Invitee',
          role: 'USER',
        });
      expect(inviteRes.status).toBe(201);

      // Attempting login with predictable static password MUST fail
      const loginAttempt = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: inviteEmail,
          password: 'SwordNexUserTempPass123!',
        });
      expect(loginAttempt.status).toBe(401);
      expect(loginAttempt.body.success).toBe(false);
    });
  });

  describe('3. Cross-Tenant Relational IDOR Protections', () => {
    it('should reject contact creation referencing foreign organization companyId', async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-organization-id', tenantAOrgId)
        .send({
          firstName: 'Intruder',
          lastName: 'Contact',
          email: `intruder.${Date.now()}@tenant-a.com`,
          companyId: tenantBCompanyId, // Foreign company ID
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/unauthorized|not found/i);
    });

    it('should reject deal creation referencing foreign organization companyId or contactId', async () => {
      const pipelinesRes = await request(app)
        .get('/api/v1/deals/pipelines')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-organization-id', tenantAOrgId);
      expect(pipelinesRes.status).toBe(200);
      const pipeline = pipelinesRes.body.data[0];
      const stage = pipeline.stages[0];

      // Attempt referencing Tenant B company
      const dealWithForeignCompany = await request(app)
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-organization-id', tenantAOrgId)
        .send({
          title: 'Unauthorized Deal Exploitation',
          amount: 100000,
          pipelineId: pipeline.id,
          stageId: stage.id,
          companyId: tenantBCompanyId, // Foreign company
        });

      expect(dealWithForeignCompany.status).toBe(400);
      expect(dealWithForeignCompany.body.error).toMatch(/unauthorized|not found/i);

      // Attempt referencing Tenant B contact
      const dealWithForeignContact = await request(app)
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-organization-id', tenantAOrgId)
        .send({
          title: 'Unauthorized Deal Contact Exploitation',
          amount: 50000,
          pipelineId: pipeline.id,
          stageId: stage.id,
          contactId: tenantBContactId, // Foreign contact
        });

      expect(dealWithForeignContact.status).toBe(400);
      expect(dealWithForeignContact.body.error).toMatch(/unauthorized|not found/i);
    });

    it('should reject task creation referencing foreign organization leadId or contactId', async () => {
      const taskRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-organization-id', tenantAOrgId)
        .send({
          title: 'Malicious Task Inspection',
          leadId: tenantBLeadId, // Foreign lead
        });

      expect(taskRes.status).toBe(400);
      expect(taskRes.body.error).toMatch(/unauthorized|not found/i);
    });

    it('should reject quotation creation referencing foreign organization productId', async () => {
      const quoteRes = await request(app)
        .post('/api/v1/quotes')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-organization-id', tenantAOrgId)
        .send({
          subject: 'Unauthorized Cross-Tenant Quote',
          items: [
            {
              productId: tenantBProductId, // Foreign product
              name: 'Injected Item',
              quantity: 1,
              unitPrice: 50000,
            },
          ],
        });

      expect(quoteRes.status).toBe(400);
      expect(quoteRes.body.error).toMatch(/unauthorized|not found/i);
    });

    it('should reject customer invoice creation referencing foreign organization contactId', async () => {
      const invoiceRes = await request(app)
        .post('/api/v1/customer-invoices')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-organization-id', tenantAOrgId)
        .send({
          contactId: tenantBContactId, // Foreign contact
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            {
              name: 'Commercial Consultation',
              quantity: 1,
              unitPrice: 20000,
            },
          ],
        });

      expect(invoiceRes.status).toBe(400);
      expect(invoiceRes.body.error).toMatch(/invalid|unauthorized|not found/i);
    });
  });

  describe('4. Webhook Security & Idempotency', () => {
    it('should ignore duplicate webhook events idempotently', async () => {
      const uniqueEventId = `evt_audit_${Date.now()}`;
      const payload = {
        event_id: uniqueEventId,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_audit_${Date.now()}`,
              amount: 249900,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      };

      // First webhook post
      const firstRes = await request(app)
        .post('/api/v1/subscriptions/webhook')
        .send(payload);
      expect(firstRes.status).toBe(200);
      expect(firstRes.body.status).toBe('processed');

      // Immediate duplicate webhook post
      const dupRes = await request(app)
        .post('/api/v1/subscriptions/webhook')
        .send(payload);
      expect(dupRes.status).toBe(200);
      expect(dupRes.body.status).toBe('duplicate_ignored');
    });
  });
});
