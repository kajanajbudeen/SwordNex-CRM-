import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuditService } from '../services/audit.service';

const invoiceItemInputSchema = z.object({
  productId: z.string().optional().nullable(),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional().nullable(),
  quantity: z.number().positive('Quantity must be greater than 0').default(1),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  discount: z.number().nonnegative().max(100).optional().default(0),
  taxRate: z.number().nonnegative().max(100).optional().default(0),
});

const createCustomerInvoiceSchema = z.object({
  dealId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  salesOrderId: z.string().optional().nullable(),
  quoteId: z.string().optional().nullable(),
  issueDate: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  currency: z.string().optional().default('USD'),
  discountAmount: z.number().nonnegative().optional().default(0),
  terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(invoiceItemInputSchema).min(1, 'At least one line item is required'),
});

const recordPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum([
    'BANK_TRANSFER',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'UPI',
    'CASH',
    'CHECK',
    'STRIPE',
    'RAZORPAY',
    'OTHER',
  ]).default('BANK_TRANSFER'),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export class CustomerInvoiceController {
  /**
   * List customer commercial invoices
   * GET /api/customer-invoices
   */
  static async list(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { q, status, contactId, companyId, dealId, page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where: any = { organizationId: orgId };

      if (status && status !== 'ALL') {
        where.status = status;
      }
      if (contactId) where.contactId = String(contactId);
      if (companyId) where.companyId = String(companyId);
      if (dealId) where.dealId = String(dealId);

      if (q && String(q).trim()) {
        const query = String(q).trim();
        where.OR = [
          { invoiceNumber: { contains: query, mode: 'insensitive' } },
          { contact: { firstName: { contains: query, mode: 'insensitive' } } },
          { contact: { lastName: { contains: query, mode: 'insensitive' } } },
          { company: { name: { contains: query, mode: 'insensitive' } } },
        ];
      }

      const [total, invoices] = await Promise.all([
        prisma.customerInvoice.count({ where }),
        prisma.customerInvoice.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { issueDate: 'desc' },
          include: {
            contact: { select: { id: true, firstName: true, lastName: true, email: true } },
            company: { select: { id: true, name: true } },
            deal: { select: { id: true, title: true } },
            _count: { select: { items: true, payments: true } },
          },
        }),
      ]);

      return sendSuccess(res, {
        invoices,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to list customer invoices', 500);
    }
  }

  /**
   * Receivables Aging Analysis Report
   * GET /api/customer-invoices/aging-summary
   */
  static async getAgingSummary(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const now = new Date();

      const openInvoices = await prisma.customerInvoice.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        select: {
          id: true,
          invoiceNumber: true,
          amountDue: true,
          amountPaid: true,
          total: true,
          dueDate: true,
          currency: true,
          contact: { select: { firstName: true, lastName: true } },
          company: { select: { name: true } },
        },
      });

      let current = 0;
      let days1to30 = 0;
      let days31to60 = 0;
      let days61to90 = 0;
      let days90plus = 0;
      let totalReceivables = 0;

      for (const inv of openInvoices) {
        const due = new Date(inv.dueDate);
        const diffMs = now.getTime() - due.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const dueAmt = inv.amountDue;

        totalReceivables += dueAmt;

        if (diffDays <= 0) {
          current += dueAmt;
        } else if (diffDays <= 30) {
          days1to30 += dueAmt;
        } else if (diffDays <= 60) {
          days31to60 += dueAmt;
        } else if (diffDays <= 90) {
          days61to90 += dueAmt;
        } else {
          days90plus += dueAmt;
        }
      }

      // Total collected
      const paidAgg = await prisma.customerPayment.aggregate({
        where: { organizationId: orgId },
        _sum: { amount: true },
      });

      return sendSuccess(res, {
        agingBuckets: {
          current: Math.round(current * 100) / 100,
          days1to30: Math.round(days1to30 * 100) / 100,
          days31to60: Math.round(days31to60 * 100) / 100,
          days61to90: Math.round(days61to90 * 100) / 100,
          days90plus: Math.round(days90plus * 100) / 100,
        },
        summary: {
          totalReceivables: Math.round(totalReceivables * 100) / 100,
          totalCollected: Math.round((paidAgg._sum.amount || 0) * 100) / 100,
          openInvoiceCount: openInvoices.length,
        },
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to compute aging summary', 500);
    }
  }

  /**
   * Get single invoice detail
   * GET /api/customer-invoices/:id
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;

      const invoice = await prisma.customerInvoice.findFirst({
        where: { id, organizationId: orgId },
        include: {
          items: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          company: { select: { id: true, name: true, domain: true, address: true, city: true, country: true } },
          deal: { select: { id: true, title: true } },
          quote: { select: { id: true, quoteNumber: true } },
          salesOrder: { select: { id: true, orderNumber: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      if (!invoice) {
        return sendError(res, 'Invoice not found', 404);
      }

      return sendSuccess(res, invoice);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch invoice', 500);
    }
  }

  /**
   * Create customer invoice
   * POST /api/customer-invoices
   */
  static async create(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const userId = req.user!.id;
      const data = createCustomerInvoiceSchema.parse(req.body);

      // Generate sequential invoice number
      const count = await prisma.customerInvoice.count({ where: { organizationId: orgId } });
      const invoiceNumber = `INV-${(count + 1001).toString().padStart(4, '0')}`;

      // Calculate totals
      let subtotal = 0;
      let totalTax = 0;

      const items = data.items.map((item) => {
        const qty = item.quantity || 1;
        const price = item.unitPrice || 0;
        const disc = item.discount || 0;
        const tax = item.taxRate || 0;

        const base = qty * price;
        const discounted = base * (1 - disc / 100);
        const lineTax = discounted * (tax / 100);
        const lineTotal = discounted + lineTax;

        subtotal += discounted;
        totalTax += lineTax;

        return {
          productId: item.productId || null,
          name: item.name,
          description: item.description || null,
          quantity: qty,
          unitPrice: price,
          discount: disc,
          taxRate: tax,
          total: Math.round(lineTotal * 100) / 100,
        };
      });

      const total = Math.max(0, subtotal - data.discountAmount + totalTax);

      const invoice = await prisma.customerInvoice.create({
        data: {
          invoiceNumber,
          organizationId: orgId,
          createdById: userId,
          dealId: data.dealId || null,
          contactId: data.contactId || null,
          companyId: data.companyId || null,
          salesOrderId: data.salesOrderId || null,
          quoteId: data.quoteId || null,
          status: 'SENT',
          issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
          dueDate: new Date(data.dueDate),
          subtotal: Math.round(subtotal * 100) / 100,
          discountAmount: data.discountAmount,
          taxAmount: Math.round(totalTax * 100) / 100,
          total: Math.round(total * 100) / 100,
          amountPaid: 0,
          amountDue: Math.round(total * 100) / 100,
          currency: data.currency || 'USD',
          terms: data.terms || null,
          notes: data.notes || null,
          items: {
            create: items,
          },
        },
        include: { items: true },
      });

      await AuditService.log({
        organizationId: orgId,
        userId,
        action: 'CREATE_CUSTOMER_INVOICE',
        entity: 'INVOICE' as any,
        entityId: invoice.id,
        details: { invoiceNumber, total: invoice.total, dueDate: invoice.dueDate },
      });

      return sendSuccess(res, invoice, 'Customer invoice created successfully', undefined, 201);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to create invoice', 400);
    }
  }

  /**
   * Record Customer Payment against Invoice
   * POST /api/customer-invoices/:id/payments
   */
  static async recordPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;
      const userId = req.user!.id;
      const data = recordPaymentSchema.parse(req.body);

      const invoice = await prisma.customerInvoice.findFirst({
        where: { id, organizationId: orgId },
      });

      if (!invoice) {
        return sendError(res, 'Invoice not found', 404);
      }

      if (invoice.status === 'PAID') {
        return sendError(res, 'Invoice is already fully paid.', 400);
      }

      const newPaid = invoice.amountPaid + data.amount;
      const newDue = Math.max(0, invoice.total - newPaid);
      const isFullyPaid = newDue <= 0.001;

      // Create Payment Record
      const payment = await prisma.customerPayment.create({
        data: {
          organizationId: orgId,
          customerInvoiceId: id,
          amount: data.amount,
          currency: invoice.currency,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber || null,
          notes: data.notes || null,
        },
      });

      // Update Invoice
      const updatedInvoice = await prisma.customerInvoice.update({
        where: { id },
        data: {
          amountPaid: Math.round(newPaid * 100) / 100,
          amountDue: Math.round(newDue * 100) / 100,
          status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
          paidAt: isFullyPaid ? new Date() : undefined,
        },
        include: { payments: true },
      });

      await AuditService.log({
        organizationId: orgId,
        userId,
        action: 'RECORD_CUSTOMER_PAYMENT',
        entity: 'PAYMENT' as any,
        entityId: payment.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          amountPaid: data.amount,
          amountDueRemaining: updatedInvoice.amountDue,
        },
      });

      return sendSuccess(
        res,
        { payment, invoice: updatedInvoice },
        isFullyPaid ? 'Invoice is now fully paid.' : 'Partial payment recorded successfully.',
        undefined,
        201
      );
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to record payment', 400);
    }
  }
}
