import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('Phase 2: Commercial CPQ & Customer Invoicing Test Suite', () => {
  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;
  let contactA: any;
  let createdProductId: string;
  let createdQuoteId: string;
  let createdInvoiceId: string;

  beforeAll(async () => {
    // Clean up fixtures if present
    await prisma.user.deleteMany({
      where: { email: { in: ['cpq.finance.a@swordnex.com', 'cpq.finance.b@swordnex.com'] } },
    });
    await prisma.organization.deleteMany({
      where: { slug: { in: ['phase2-cpq-org-a', 'phase2-cpq-org-b'] } },
    });

    const hash = await bcrypt.hash('SwordNex2026!', 10);

    // Organization A
    orgA = await prisma.organization.create({
      data: {
        name: 'Phase 2 Commercial Alpha',
        slug: 'phase2-cpq-org-a',
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
        email: 'cpq.finance.a@swordnex.com',
        passwordHash: hash,
        firstName: 'Elena',
        lastName: 'Finance',
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

    // Organization B (for cross-tenant checks)
    orgB = await prisma.organization.create({
      data: {
        name: 'Phase 2 Commercial Beta',
        slug: 'phase2-cpq-org-b',
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
        email: 'cpq.finance.b@swordnex.com',
        passwordHash: hash,
        firstName: 'Frank',
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

    // Contact in Org A
    contactA = await prisma.contact.create({
      data: {
        organizationId: orgA.id,
        firstName: 'Michael',
        lastName: 'Purchaser',
        email: 'michael.buyer@megacorp.com',
        phone: '+1-555-4499',
      },
    });

    // Auth Tokens
    const loginResA = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'cpq.finance.a@swordnex.com', password: 'SwordNex2026!' });
    tokenA = loginResA.body.data.token;

    const loginResB = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'cpq.finance.b@swordnex.com', password: 'SwordNex2026!' });
    tokenB = loginResB.body.data.token;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: ['cpq.finance.a@swordnex.com', 'cpq.finance.b@swordnex.com'] } },
    });
    await prisma.organization.deleteMany({
      where: { slug: { in: ['phase2-cpq-org-a', 'phase2-cpq-org-b'] } },
    });
  });

  describe('1. Product & Service Catalog Operations', () => {
    it('should create a new commercial product with SKU and tax rate', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({
          name: 'Enterprise AI CRM License (Annual)',
          sku: 'SWN-ENT-ANNUAL',
          category: 'SOFTWARE',
          unitPrice: 12000,
          costPrice: 2400,
          currency: 'USD',
          taxRate: 18,
          unit: 'LICENSE',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sku).toBe('SWN-ENT-ANNUAL');
      expect(res.body.data.unitPrice).toBe(12000);
      expect(res.body.data.taxRate).toBe(18);

      createdProductId = res.body.data.id;
    });

    it('should reject duplicate SKU creation within the same organization', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({
          name: 'Duplicate SKU Attempt',
          sku: 'SWN-ENT-ANNUAL',
          unitPrice: 5000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already exists');
    });

    it('should list catalog products with category and active filters', async () => {
      const res = await request(app)
        .get('/api/v1/products?category=SOFTWARE&isActive=true')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Quotations (CPQ) & Multi-Item Financial Math', () => {
    it('should create a quotation with multiple line items, discounts, and auto-generated quote number', async () => {
      const res = await request(app)
        .post('/api/v1/quotes')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({
          subject: 'Commercial Proposal for 50 Enterprise Seats',
          contactId: contactA.id,
          discountPercent: 10, // 10% overall discount
          currency: 'USD',
          terms: 'Payment Net 30 days. Software warranty 1 year.',
          items: [
            {
              productId: createdProductId,
              name: 'Enterprise AI CRM License (Annual)',
              quantity: 5,
              unitPrice: 12000, // 5 * 12,000 = 60,000
              discount: 0,
              taxRate: 10, // 10% tax = 6,000 => line total = 66,000
            },
            {
              name: 'Onboarding & Migration Services',
              quantity: 1,
              unitPrice: 5000,
              discount: 0,
              taxRate: 0, // line total = 5,000
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quoteNumber).toMatch(/^QUO-\d{4}$/);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.items.length).toBe(2);

      // Verify line items and totals
      // Subtotal = 60,000 + 5,000 = 65,000
      // 10% overall discount = 6,500
      // Tax = 6,000
      // Final Total = 65,000 - 6,500 + 6,000 = 64,500
      expect(res.body.data.subtotal).toBe(65000);
      expect(res.body.data.discountAmount).toBe(6500);
      expect(res.body.data.taxAmount).toBe(6000);
      expect(res.body.data.total).toBe(64500);

      createdQuoteId = res.body.data.id;
    });

    it('should convert an accepted quote into a confirmed Sales Order', async () => {
      const res = await request(app)
        .post(`/api/v1/quotes/${createdQuoteId}/convert-to-order`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderNumber).toMatch(/^SO-\d{4}$/);
      expect(res.body.data.status).toBe('CONFIRMED');
      expect(res.body.data.total).toBe(64500);
      expect(res.body.data.items.length).toBe(2);

      // Verify quote is now marked ACCEPTED
      const quoteCheck = await request(app)
        .get(`/api/v1/quotes/${createdQuoteId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(quoteCheck.body.data.status).toBe('ACCEPTED');
      expect(quoteCheck.body.data.acceptedAt).toBeDefined();
    });

    it('should convert an accepted quote directly into a Customer Commercial Invoice', async () => {
      const res = await request(app)
        .post(`/api/v1/quotes/${createdQuoteId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoiceNumber).toMatch(/^INV-\d{4}$/);
      expect(res.body.data.status).toBe('SENT');
      expect(res.body.data.total).toBe(64500);
      expect(res.body.data.amountDue).toBe(64500);
      expect(res.body.data.amountPaid).toBe(0);

      createdInvoiceId = res.body.data.id;
    });
  });

  describe('3. Customer Invoicing, Payment Reconciliation & Aging Analysis', () => {
    it('should record a partial customer payment and update amountDue & status to PARTIALLY_PAID', async () => {
      const res = await request(app)
        .post(`/api/v1/customer-invoices/${createdInvoiceId}/payments`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({
          amount: 30000,
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: 'WIRE-TX-998822',
          notes: 'First milestone tranche payment',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.amountPaid).toBe(30000);
      expect(res.body.data.invoice.amountDue).toBe(34500);
      expect(res.body.data.invoice.status).toBe('PARTIALLY_PAID');
    });

    it('should record final balance payment and automatically transition invoice to PAID', async () => {
      const res = await request(app)
        .post(`/api/v1/customer-invoices/${createdInvoiceId}/payments`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id)
        .send({
          amount: 34500,
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: 'WIRE-TX-998899',
          notes: 'Final settlement payment',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.amountPaid).toBe(64500);
      expect(res.body.data.invoice.amountDue).toBe(0);
      expect(res.body.data.invoice.status).toBe('PAID');
      expect(res.body.data.invoice.paidAt).toBeDefined();
    });

    it('should compute receivables aging summary report', async () => {
      // Create an overdue invoice for testing aging bucket
      const pastDue = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000); // 45 days past due
      await prisma.customerInvoice.create({
        data: {
          invoiceNumber: 'INV-OVERDUE-TEST',
          organizationId: orgA.id,
          status: 'OVERDUE',
          issueDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
          dueDate: pastDue,
          total: 10000,
          amountPaid: 0,
          amountDue: 10000,
          currency: 'USD',
        },
      });

      const res = await request(app)
        .get('/api/v1/customer-invoices/aging-summary')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-organization-id', orgA.id);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.agingBuckets).toBeDefined();
      expect(res.body.data.agingBuckets.days31to60).toBeGreaterThanOrEqual(10000);
      expect(res.body.data.summary.totalReceivables).toBeGreaterThanOrEqual(10000);
      expect(res.body.data.summary.totalCollected).toBeGreaterThanOrEqual(64500);
    });
  });

  describe('4. Multi-Tenant Financial Data Isolation', () => {
    it('should strictly deny Tenant B access to Tenant A commercial catalog products', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-organization-id', orgB.id);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should strictly deny Tenant B access to Tenant A quotations', async () => {
      const res = await request(app)
        .get(`/api/v1/quotes/${createdQuoteId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-organization-id', orgB.id);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should strictly deny Tenant B access to Tenant A customer commercial invoices', async () => {
      const res = await request(app)
        .get(`/api/v1/customer-invoices/${createdInvoiceId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-organization-id', orgB.id);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
