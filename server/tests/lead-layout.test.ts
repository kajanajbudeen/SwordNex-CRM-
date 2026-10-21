import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

describe('Lead Creation, Editing, Layout & Validation Module', () => {
  const app = createApp();
  let token: string;
  let orgId: string;
  let userId: string;
  let otherOrgId: string;
  let otherUserId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);

    // Create primary org
    const org = await prisma.organization.create({
      data: {
        name: 'Lead Layout Test Corp',
        slug: `lead-test-corp-${Date.now()}`,
        status: 'ACTIVE',
        isActive: true,
      },
    });
    orgId = org.id;

    // Create subscription
    await prisma.subscription.create({
      data: {
        organizationId: orgId,
        plan: 'PREMIUM',
        status: 'ACTIVE',
        seatCount: 10,
        leadLimit: 1000,
        aiTokenLimit: 100000,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: `lead.admin.${Date.now()}@example.com`,
        passwordHash,
        firstName: 'Lead',
        lastName: 'Admin',
        globalRole: 'USER',
        isActive: true,
      },
    });
    userId = user.id;

    await prisma.membership.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        role: 'ADMIN',
      },
    });

    // Create secondary org for cross-tenant testing
    const otherOrg = await prisma.organization.create({
      data: {
        name: 'Other Tenant Org',
        slug: `other-tenant-${Date.now()}`,
        status: 'ACTIVE',
        isActive: true,
      },
    });
    otherOrgId = otherOrg.id;

    const otherUser = await prisma.user.create({
      data: {
        email: `other.user.${Date.now()}@example.com`,
        passwordHash,
        firstName: 'Foreign',
        lastName: 'Member',
        globalRole: 'USER',
        isActive: true,
      },
    });
    otherUserId = otherUser.id;

    await prisma.membership.create({
      data: {
        organizationId: otherOrgId,
        userId: otherUser.id,
        role: 'ADMIN',
      },
    });

    // Log in
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'Password123!' });
    
    token = loginRes.body.data.token;
  });

  it('rejects lead creation with missing required fields (First Name, Last Name)', async () => {
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        firstName: '',
        lastName: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects assigning a Lead Owner from a foreign organization', async () => {
    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        firstName: 'Unauthorized',
        lastName: 'Assignment',
        ownerId: otherUserId, // foreign tenant user
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/authorized member/i);
  });

  it('successfully creates a comprehensive lead with all contact, address, qualification and description fields', async () => {
    const payload = {
      firstName: 'Rajesh',
      lastName: 'Kumar',
      title: 'VP of Engineering',
      company: 'Zenith Cloud India',
      email: 'rajesh.kumar@zenithcloud.in',
      secondaryEmail: 'rk.personal@gmail.com',
      phone: '+91 80 4123 4567',
      mobile: '+91 98765 43210',
      fax: '+91 80 4123 4568',
      website: 'https://zenithcloud.in',
      skypeId: 'live:rajesh.kumar_99',
      twitterHandle: '@rajesh_zenith',
      source: 'TRADE_SHOW',
      status: 'QUALIFIED',
      priority: 'HIGH',
      industry: 'Technology',
      annualRevenue: 50000000, // ₹5 Crore
      numberOfEmployees: 120,
      rating: 'HOT',
      emailOptOut: true,
      ownerId: userId,
      country: 'India',
      address: 'Tower B, 4th Floor, Tech Park',
      street: 'Outer Ring Road, Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      zipCode: '560103',
      latitude: 12.926,
      longitude: 77.6762,
      description: 'Met at India SaaS Summit 2026. High interest in enterprise AI copilot integration.',
      avatarUrl: '/uploads/leads/sample-avatar.png',
    };

    const res = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const lead = res.body.data;
    expect(lead.id).toBeDefined();
    expect(lead.firstName).toBe('Rajesh');
    expect(lead.lastName).toBe('Kumar');
    expect(lead.secondaryEmail).toBe('rk.personal@gmail.com');
    expect(lead.mobile).toBe('+91 98765 43210');
    expect(lead.annualRevenue).toBe(50000000);
    expect(lead.rating).toBe('HOT');
    expect(lead.emailOptOut).toBe(true);
    expect(lead.state).toBe('Karnataka');
    expect(lead.city).toBe('Bengaluru');
    expect(lead.latitude).toBe(12.926);

    // Verify persisted directly in PostgreSQL
    const dbLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(dbLead).not.toBeNull();
    expect(dbLead?.organizationId).toBe(orgId);
    expect(dbLead?.description).toContain('India SaaS Summit 2026');

    // Verify ConsentRecord sync
    const consent = await prisma.consentRecord.findFirst({
      where: { organizationId: orgId, email: 'rajesh.kumar@zenithcloud.in' },
    });
    expect(consent).not.toBeNull();
    expect(consent?.status).toBe('REVOKED');
  });

  it('updates an existing lead and respects organization boundary', async () => {
    // Create a lead first
    const lead = await prisma.lead.create({
      data: {
        organizationId: orgId,
        firstName: 'Anita',
        lastName: 'Rao',
        email: 'anita.rao@example.com',
      },
    });

    const updateRes = await request(app)
      .patch(`/api/v1/leads/${lead.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({
        company: 'Quantum Dynamics Ltd',
        rating: 'WARM',
        annualRevenue: 15000000,
        city: 'Mumbai',
        state: 'Maharashtra',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.company).toBe('Quantum Dynamics Ltd');
    expect(updateRes.body.data.rating).toBe('WARM');
    expect(updateRes.body.data.city).toBe('Mumbai');

    // Cross-tenant access blocked (403 tenant access denied or 404 record not in tenant)
    const foreignRes = await request(app)
      .patch(`/api/v1/leads/${lead.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', otherOrgId)
      .send({ company: 'Hacked' });

    expect([403, 404]).toContain(foreignRes.status);
  });

  it('uploads an image and verifies MIME and size validation', async () => {
    // 1x1 transparent PNG data URI
    const validPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const uploadRes = await request(app)
      .post('/api/v1/leads/upload-image')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({ image: validPngBase64 });

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.data.url).toMatch(/^\/uploads\/leads\/lead-.+\.png$/);

    // Invalid format rejected
    const invalidRes = await request(app)
      .post('/api/v1/leads/upload-image')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({ image: 'data:text/plain;base64,SGVsbG8gV29ybGQ=' });

    expect(invalidRes.status).toBe(400);
  });

  it('retrieves and persists customizable page layout configuration', async () => {
    // Fetch default layout
    const getRes = await request(app)
      .get('/api/v1/leads/layout/config')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.sections).toBeDefined();
    expect(getRes.body.data.sections.length).toBeGreaterThanOrEqual(3);

    // Modify layout
    const customSections = [
      ...getRes.body.data.sections,
    ];
    // Mark website as required
    const leadInfo = customSections.find((s: any) => s.id === 'lead_info');
    const websiteField = leadInfo.fields.find((f: any) => f.id === 'website');
    if (websiteField) websiteField.required = true;

    const putRes = await request(app)
      .put('/api/v1/leads/layout/config')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId)
      .send({ sections: customSections });

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);

    // Verify persisted
    const verifyRes = await request(app)
      .get('/api/v1/leads/layout/config')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', orgId);

    const savedLeadInfo = verifyRes.body.data.sections.find((s: any) => s.id === 'lead_info');
    const savedWebsite = savedLeadInfo.fields.find((f: any) => f.id === 'website');
    expect(savedWebsite.required).toBe(true);
  });
});
