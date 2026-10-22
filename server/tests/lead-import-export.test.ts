import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { prisma } from '../src/utils/prisma';
import { LeadImportExportService } from '../src/services/lead-import-export.service';

const binaryParser = (res: any, callback: (err: Error | null, body: any) => void) => {
  const bufs: Buffer[] = [];
  res.on('data', (chunk: any) => bufs.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  res.on('end', () => callback(null, Buffer.concat(bufs)));
};

describe('SwordNex AI CRM — Complete Lead Import & Export Feature Test Suite', () => {
  const app = createApp();
  let adminToken: string;
  let limitedUserToken: string;
  let otherOrgToken: string;
  let orgId: string;
  let adminUserId: string;
  let otherOrgId: string;
  let otherUserId: string;
  let limitedRoleId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('SwordNex2026!', 10);

    // 1. Create primary tenant organization
    const org = await prisma.organization.create({
      data: {
        name: 'Nexus Tech Global',
        slug: `nexus-tech-${Date.now()}`,
        status: 'ACTIVE',
        isActive: true,
      },
    });
    orgId = org.id;

    // Create subscription with quota
    await prisma.subscription.create({
      data: {
        organizationId: orgId,
        plan: 'PREMIUM',
        status: 'ACTIVE',
        seatCount: 15,
        leadLimit: 50, // limit to 50 for testing quota enforcement
        aiTokenLimit: 100000,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 2. Create Admin user in org
    const adminUser = await prisma.user.create({
      data: {
        email: `import.admin.${Date.now()}@nexustech.io`,
        passwordHash,
        firstName: 'Elena',
        lastName: 'Rostova',
        globalRole: 'USER',
        isActive: true,
      },
    });
    adminUserId = adminUser.id;

    await prisma.membership.create({
      data: {
        organizationId: orgId,
        userId: adminUser.id,
        role: 'ADMIN',
      },
    });

    // 3. Create Custom Role with only LEADS:VIEW (NO EXPORT or CREATE)
    const limitedRole = await prisma.role.create({
      data: {
        organizationId: orgId,
        name: `Viewer Role ${Date.now()}`,
        department: 'SUPPORT',
        permissions: {
          create: [{ module: 'LEADS', action: 'VIEW' }],
        },
      },
    });
    limitedRoleId = limitedRole.id;

    const limitedUser = await prisma.user.create({
      data: {
        email: `limited.viewer.${Date.now()}@nexustech.io`,
        passwordHash,
        firstName: 'Toby',
        lastName: 'Flenderson',
        globalRole: 'USER',
        isActive: true,
      },
    });

    await prisma.membership.create({
      data: {
        organizationId: orgId,
        userId: limitedUser.id,
        role: 'USER',
        customRoleId: limitedRole.id,
      },
    });

    // 4. Create Secondary Tenant Org for Multi-Tenant Isolation Testing
    const otherOrg = await prisma.organization.create({
      data: {
        name: 'Apex Competitor Org',
        slug: `apex-corp-${Date.now()}`,
        status: 'ACTIVE',
        isActive: true,
      },
    });
    otherOrgId = otherOrg.id;

    await prisma.subscription.create({
      data: {
        organizationId: otherOrgId,
        plan: 'PREMIUM',
        status: 'ACTIVE',
        seatCount: 5,
        leadLimit: 1000,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const otherUser = await prisma.user.create({
      data: {
        email: `apex.user.${Date.now()}@apexcompetitor.com`,
        passwordHash,
        firstName: 'Victor',
        lastName: 'Strand',
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

    // Seed a private lead in other organization
    await prisma.lead.create({
      data: {
        organizationId: otherOrgId,
        firstName: 'Secret',
        lastName: 'CompetitorLead',
        email: 'secret@competitor.com',
        company: 'Confidential Inc',
      },
    });

    // Log in all users
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminUser.email, password: 'SwordNex2026!' });
    adminToken = adminLogin.body.data.token;

    const limitedLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: limitedUser.email, password: 'SwordNex2026!' });
    limitedUserToken = limitedLogin.body.data.token;

    const otherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: otherUser.email, password: 'SwordNex2026!' });
    otherOrgToken = otherLogin.body.data.token;
  });

  describe('1. Sample Template Generation', () => {
    it('should generate downloadable CSV sample import template', async () => {
      const res = await request(app)
        .get('/api/v1/leads/import/template?format=csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('First Name');
      expect(res.text).toContain('Last Name');
      expect(res.text).toContain('Company');
      expect(res.text).toContain('Email');
    });

    it('should generate downloadable Excel (.xlsx) sample import template', async () => {
      const res = await request(app)
        .get('/api/v1/leads/import/template?format=xlsx')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .buffer()
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(res.body).toBeInstanceOf(Buffer);

      const wb = XLSX.read(res.body, { type: 'buffer' });
      expect(wb.SheetNames).toContain('Leads Template');
      const data = XLSX.utils.sheet_to_json(wb.Sheets['Leads Template']);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe('2. File Upload, MIME & Spreadsheet Parsing', () => {
    it('should reject non-CSV/non-Excel files', async () => {
      const res = await request(app)
        .post('/api/v1/leads/import/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .attach('file', Buffer.from('alert("hack")'), 'malicious.js');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should accept and parse a valid CSV file with auto-mapping', async () => {
      const csvData = [
        'first_name,last_name,email_address,work_phone,organization,job_title,country_region',
        'Arthur,Dent,arthur.dent@earth.org,+44 123456,BBC Radio,Researcher,United Kingdom',
        'Ford,Prefect,ford.prefect@guide.galaxy,+44 987654,Megadodo,Editor,Betelgeuse',
      ].join('\r\n');

      const res = await request(app)
        .post('/api/v1/leads/import/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .attach('file', Buffer.from(csvData), 'test-leads.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fileToken).toBeDefined();
      expect(res.body.data.totalRows).toBe(2);
      expect(res.body.data.headers).toContain('first_name');
      expect(res.body.data.headers).toContain('last_name');

      // Auto-mapping check
      const mapping = res.body.data.suggestedMapping;
      expect(mapping.firstName).toBe('first_name');
      expect(mapping.lastName).toBe('last_name');
      expect(mapping.email).toBe('email_address');
    });

    it('should accept and parse a valid Excel (.xlsx) file with Unicode support', async () => {
      const wb = XLSX.utils.book_new();
      const rows = [
        {
          'First Name': 'René',
          'Last Name': 'François',
          'Company': 'L’Oréal Paris',
          'Email': 'rene.francois@loreal.fr',
          'Annual Revenue': 1200000,
          'Lead Status': 'NEW',
        },
        {
          'First Name': 'Taro',
          'Last Name': 'Tanaka (田中)',
          'Company': 'Sony Group (ソニー)',
          'Email': 'taro.tanaka@sony.jp',
          'Annual Revenue': 5000000,
          'Lead Status': 'QUALIFIED',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/v1/leads/import/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .attach('file', excelBuffer, 'unicode-leads.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalRows).toBe(2);
      expect(res.body.data.previewRows[0]['First Name']).toBe('René');
      expect(res.body.data.previewRows[1]['Last Name']).toContain('田中');
    });
  });

  describe('3. Column Mapping, Validation & Duplicate Preview', () => {
    let fileToken: string;

    beforeAll(async () => {
      // First seed an existing lead in the org for duplicate detection
      await prisma.lead.create({
        data: {
          organizationId: orgId,
          firstName: 'Existing',
          lastName: 'Customer',
          email: 'duplicate@existing.com',
          phone: '+1 555-999-0001',
          company: 'Acme Original',
        },
      });

      // Upload CSV with: 1 valid new, 1 valid duplicate, 1 row with invalid email & negative revenue
      const csvData = [
        'fname,lname,mail,tel,comp,rev',
        'Alice,Wonderland,alice@wonderland.io,+1 555-111-2222,Wonderland Corp,50000',
        'Existing,Customer,DUPLICATE@existing.com,+1 555-999-0001,Acme Updated,75000',
        ',BrokenRow,invalid-email-no-at,+1 555-333,Faulty Co,-10000',
      ].join('\r\n');

      const uploadRes = await request(app)
        .post('/api/v1/leads/import/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .attach('file', Buffer.from(csvData), 'preview-test.csv');

      fileToken = uploadRes.body.data.fileToken;
    });

    it('should accurately compute valid, invalid, duplicate rows and provide error reasons', async () => {
      const mapping = {
        firstName: 'fname',
        lastName: 'lname',
        email: 'mail',
        phone: 'tel',
        company: 'comp',
        annualRevenue: 'rev',
      };

      const res = await request(app)
        .post('/api/v1/leads/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .send({
          fileToken,
          mapping,
          options: {
            duplicateStrategy: 'SKIP',
            duplicateCriteria: ['email', 'phone'],
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.totalRows).toBe(3);
      expect(data.validRows).toBe(2);
      expect(data.invalidRows).toBe(1);
      expect(data.potentialDuplicates).toBe(1);
      expect(data.estimatedNew).toBe(1);

      // Verify row error reporting
      const invalidRow = data.previewSample.find((r: any) => !r.isValid);
      expect(invalidRow).toBeDefined();
      expect(invalidRow.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('First Name is required'),
          expect.stringContaining('Invalid email format'),
          expect.stringContaining('Annual Revenue must be a non-negative number'),
        ])
      );

      // Verify duplicate row detection
      const duplicateRow = data.previewSample.find((r: any) => r.isDuplicate);
      expect(duplicateRow).toBeDefined();
      expect(duplicateRow.duplicateReason).toContain('duplicate@existing.com');
    });
  });

  describe('4. Duplicate Handling Strategies (SKIP, UPDATE, IMPORT_ALL)', () => {
    it('Strategy: SKIP — should import only new records and skip duplicates', async () => {
      const csvData = [
        'first_name,last_name,email,company',
        'BrandNew,LeadOne,brandnew1@test.com,NewCo 1',
        'Existing,Customer,DUPLICATE@existing.com,Should Not Overwrite',
      ].join('\r\n');

      const upload = await request(app)
        .post('/api/v1/leads/import/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .attach('file', Buffer.from(csvData), 'skip-test.csv');

      const res = await request(app)
        .post('/api/v1/leads/import/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .send({
          fileToken: upload.body.data.fileToken,
          mapping: {
            firstName: 'first_name',
            lastName: 'last_name',
            email: 'email',
            company: 'company',
          },
          options: {
            duplicateStrategy: 'SKIP',
            duplicateCriteria: ['email'],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.createdCount).toBe(1);
      expect(res.body.data.skippedCount).toBe(1);
      expect(res.body.data.updatedCount).toBe(0);

      // Verify existing lead company was not touched
      const existing = await prisma.lead.findFirst({
        where: { organizationId: orgId, email: 'duplicate@existing.com' },
      });
      expect(existing?.company).toBe('Acme Original');
    });

    it('Strategy: UPDATE — should update existing records without creating duplicate rows', async () => {
      const csvData = [
        'first_name,last_name,email,company,title',
        'Existing,Customer,duplicate@existing.com,Acme Updated V2,Chief Executive Officer',
      ].join('\r\n');

      const upload = await request(app)
        .post('/api/v1/leads/import/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .attach('file', Buffer.from(csvData), 'update-test.csv');

      const res = await request(app)
        .post('/api/v1/leads/import/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .send({
          fileToken: upload.body.data.fileToken,
          mapping: {
            firstName: 'first_name',
            lastName: 'last_name',
            email: 'email',
            company: 'company',
            title: 'title',
          },
          options: {
            duplicateStrategy: 'UPDATE',
            duplicateCriteria: ['email'],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.createdCount).toBe(0);
      expect(res.body.data.updatedCount).toBe(1);

      // Verify database record was updated
      const updated = await prisma.lead.findFirst({
        where: { organizationId: orgId, email: 'duplicate@existing.com' },
      });
      expect(updated?.company).toBe('Acme Updated V2');
      expect(updated?.title).toBe('Chief Executive Officer');
    });

    it('Strategy: IMPORT_ALL — should import duplicate row as a new record when permitted', async () => {
      const csvData = [
        'first_name,last_name,email,company',
        'DuplicateCopy,Allowed,duplicate@existing.com,Duplicate Branch',
      ].join('\r\n');

      const upload = await request(app)
        .post('/api/v1/leads/import/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .attach('file', Buffer.from(csvData), 'import-all-test.csv');

      const res = await request(app)
        .post('/api/v1/leads/import/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .send({
          fileToken: upload.body.data.fileToken,
          mapping: {
            firstName: 'first_name',
            lastName: 'last_name',
            email: 'email',
            company: 'company',
          },
          options: {
            duplicateStrategy: 'IMPORT_ALL',
            duplicateCriteria: ['email'],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.createdCount).toBe(1);

      const duplicates = await prisma.lead.findMany({
        where: { organizationId: orgId, email: 'duplicate@existing.com' },
      });
      expect(duplicates.length).toBeGreaterThan(1);
    });
  });

  describe('5. Import History, Job Details & Error Report Download', () => {
    let completedJobId: string;

    beforeAll(async () => {
      // Import with 1 success, 1 failure
      const csvData = [
        'first_name,last_name,email',
        'ValidLead,GoodPerson,good.person@test.com',
        ',NoFirstName,bad.email',
      ].join('\r\n');

      const upload = await request(app)
        .post('/api/v1/leads/import/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .attach('file', Buffer.from(csvData), 'history-test.csv');

      const res = await request(app)
        .post('/api/v1/leads/import/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .send({
          fileToken: upload.body.data.fileToken,
          mapping: { firstName: 'first_name', lastName: 'last_name', email: 'email' },
          options: { duplicateStrategy: 'SKIP', duplicateCriteria: ['email'] },
        });

      completedJobId = res.body.data.id;
    });

    it('should list tenant import history with correct status and counts', async () => {
      const res = await request(app)
        .get('/api/v1/leads/import/history')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((j: any) => j.id === completedJobId);
      expect(found).toBeDefined();
      expect(found.status).toBe('COMPLETED_WITH_ERRORS');
      expect(found.createdCount).toBe(1);
      expect(found.failedCount).toBe(1);
    });

    it('should retrieve individual import job details', async () => {
      const res = await request(app)
        .get(`/api/v1/leads/import/jobs/${completedJobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(completedJobId);
      expect(res.body.data.errorReport.length).toBe(1);
      expect(res.body.data.errorReport[0].rowNumber).toBe(3);
    });

    it('should download error report in CSV format', async () => {
      const res = await request(app)
        .get(`/api/v1/leads/import/jobs/${completedJobId}/error-report?format=csv`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Row Number');
      expect(res.text).toContain('Error Reason');
      expect(res.text).toContain('First Name is required');
    });
  });

  describe('6. CSV Formula Injection Defense & Security', () => {
    it('should escape dangerous formula prefixes (=, +, -, @) on export', async () => {
      // Create lead with formula injection attempts
      await prisma.lead.create({
        data: {
          organizationId: orgId,
          firstName: '=cmd|’ /C calc’!A0',
          lastName: '+1234567890',
          company: '@SUM(A1:A10)',
          title: '-HYPERLINK("http://evil.com","click")',
          email: 'safe.formula@test.com',
        },
      });

      const res = await request(app)
        .post('/api/v1/leads/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .send({
          scope: 'FILTERED',
          filters: { search: 'safe.formula@test.com' },
          fields: ['firstName', 'lastName', 'company', 'title'],
          format: 'csv',
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');

      // Check CSV content: dangerous characters must be prefixed with a single quote '
      expect(res.text).toContain("'=cmd|’ /C calc’!A0"); // escaped formula
      expect(res.text).toContain("'+1234567890");
      expect(res.text).toContain("'@SUM(A1:A10)");
      expect(res.text).toContain("'-HYPERLINK");

    });
  });

  describe('7. Lead Export Scopes, Formats & Custom Fields', () => {
    let exportedLeadIds: string[] = [];

    beforeAll(async () => {
      const l1 = await prisma.lead.create({
        data: {
          organizationId: orgId,
          firstName: 'ExportUser1',
          lastName: 'Alpha',
          email: 'alpha@export.com',
          company: 'Alpha Inc',
          status: 'QUALIFIED',
          priority: 'HIGH',
        },
      });
      const l2 = await prisma.lead.create({
        data: {
          organizationId: orgId,
          firstName: 'ExportUser2',
          lastName: 'Beta',
          email: 'beta@export.com',
          company: 'Beta Corp',
          status: 'NEW',
          priority: 'LOW',
        },
      });
      exportedLeadIds = [l1.id, l2.id];
    });

    it('should export with SELECTED scope', async () => {
      const res = await request(app)
        .post('/api/v1/leads/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .send({
          scope: 'SELECTED',
          selectedIds: [exportedLeadIds[0]],
          format: 'csv',
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain('ExportUser1');
      expect(res.text).not.toContain('ExportUser2');
    });

    it('should export with FILTERED scope by status and priority', async () => {
      const res = await request(app)
        .post('/api/v1/leads/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .send({
          scope: 'FILTERED',
          filters: { status: 'QUALIFIED', priority: 'HIGH' },
          format: 'csv',
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain('ExportUser1');
      expect(res.text).not.toContain('ExportUser2');
    });

    it('should export in Excel (.xlsx) format with selected custom columns', async () => {
      const res = await request(app)
        .post('/api/v1/leads/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .send({
          scope: 'ALL',
          fields: ['name', 'company', 'email', 'status'],
          format: 'xlsx',
        })
        .buffer()
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(res.body).toBeInstanceOf(Buffer);

      const wb = XLSX.read(res.body, { type: 'buffer' });
      expect(wb.SheetNames).toContain('Leads Export');
      const ws = wb.Sheets['Leads Export'];
      const rows = XLSX.utils.sheet_to_json(ws);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]).toHaveProperty('Lead Name');
      expect(rows[0]).toHaveProperty('Company');
      expect(rows[0]).toHaveProperty('Email');
    });
  });

  describe('8. Tenant Isolation & Permissions Enforcement', () => {
    it('should NEVER export another tenant’s leads (Multi-Tenant Isolation)', async () => {
      const res = await request(app)
        .post('/api/v1/leads/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .send({
          scope: 'ALL',
          format: 'csv',
        });

      expect(res.status).toBe(200);
      // The other organization has 'Secret CompetitorLead'
      expect(res.text).not.toContain('Secret');
      expect(res.text).not.toContain('CompetitorLead');
      expect(res.text).not.toContain('secret@competitor.com');
    });

    it('should prevent access to other organization import jobs', async () => {
      // Primary tenant job should not be accessible from other organization token
      const jobs = await prisma.importJob.findMany({ where: { organizationId: orgId } });
      expect(jobs.length).toBeGreaterThan(0);
      const targetJobId = jobs[0].id;

      const res = await request(app)
        .get(`/api/v1/leads/import/jobs/${targetJobId}`)
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .set('x-organization-id', otherOrgId);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject export if user lacks EXPORT permission', async () => {
      const res = await request(app)
        .post('/api/v1/leads/export')
        .set('Authorization', `Bearer ${limitedUserToken}`)
        .set('x-organization-id', orgId)
        .send({
          scope: 'ALL',
          format: 'csv',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('lacks permission [LEADS:EXPORT]');
    });

    it('should reject assigning a Lead Owner from a foreign organization during import', async () => {
      const csvData = [
        'first_name,last_name,email,owner_id',
        'ForeignOwnerLead,Test,foreignowner@test.com,' + otherUserId,
      ].join('\r\n');

      const upload = await request(app)
        .post('/api/v1/leads/import/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .attach('file', Buffer.from(csvData), 'foreign-owner.csv');

      const res = await request(app)
        .post('/api/v1/leads/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-organization-id', orgId)
        .send({
          fileToken: upload.body.data.fileToken,
          mapping: {
            firstName: 'first_name',
            lastName: 'last_name',
            email: 'email',
            ownerId: 'owner_id',
          },
          options: {
            duplicateStrategy: 'SKIP',
            duplicateCriteria: ['email'],
          },
        });

      expect(res.status).toBe(200);
      const sample = res.body.data.previewSample[0];
      expect(sample.isValid).toBe(false);
      expect(sample.errors[0]).toContain('not an active member of this organization');
    });
  });
});
