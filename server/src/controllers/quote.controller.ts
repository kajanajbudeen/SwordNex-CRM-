import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuditService } from '../services/audit.service';

const quoteItemInputSchema = z.object({
  productId: z.string().optional().nullable(),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional().nullable(),
  quantity: z.number().positive('Quantity must be greater than 0').default(1),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  discount: z.number().nonnegative().max(100).optional().default(0),
  taxRate: z.number().nonnegative().max(100).optional().default(0),
});

const createQuoteSchema = z.object({
  subject: z.string().min(1, 'Quote subject is required'),
  dealId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  discountPercent: z.number().nonnegative().max(100).optional().default(0),
  currency: z.string().optional().default('USD'),
  terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(quoteItemInputSchema).min(1, 'At least one line item is required'),
});

const updateQuoteSchema = z.object({
  subject: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED']).optional(),
  validUntil: z.string().optional().nullable(),
  discountPercent: z.number().nonnegative().max(100).optional(),
  terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  declinedReason: z.string().optional().nullable(),
  items: z.array(quoteItemInputSchema).optional(),
});

export class QuoteController {
  /**
   * Helper to compute line items and quote totals
   */
  private static computeTotals(items: any[], overallDiscountPercent = 0) {
    let subtotal = 0;
    let totalTax = 0;

    const computedItems = items.map((item) => {
      const qty = item.quantity || 1;
      const price = item.unitPrice || 0;
      const disc = item.discount || 0;
      const tax = item.taxRate || 0;

      const baseAmount = qty * price;
      const discountedBase = baseAmount * (1 - disc / 100);
      const itemTax = discountedBase * (tax / 100);
      const lineTotal = discountedBase + itemTax;

      subtotal += discountedBase;
      totalTax += itemTax;

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

    const discountAmount = (subtotal * overallDiscountPercent) / 100;
    const finalTotal = Math.max(0, subtotal - discountAmount + totalTax);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxAmount: Math.round(totalTax * 100) / 100,
      total: Math.round(finalTotal * 100) / 100,
      items: computedItems,
    };
  }

  /**
   * List all quotes for the organization
   * GET /api/quotes
   */
  static async list(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { q, status, dealId, contactId, companyId, page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where: any = { organizationId: orgId };

      if (status && status !== 'ALL') {
        where.status = status;
      }
      if (dealId) where.dealId = String(dealId);
      if (contactId) where.contactId = String(contactId);
      if (companyId) where.companyId = String(companyId);

      if (q && String(q).trim()) {
        const query = String(q).trim();
        where.OR = [
          { quoteNumber: { contains: query, mode: 'insensitive' } },
          { subject: { contains: query, mode: 'insensitive' } },
          { contact: { firstName: { contains: query, mode: 'insensitive' } } },
          { contact: { lastName: { contains: query, mode: 'insensitive' } } },
          { company: { name: { contains: query, mode: 'insensitive' } } },
        ];
      }

      const [total, quotes] = await Promise.all([
        prisma.quote.count({ where }),
        prisma.quote.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            contact: { select: { id: true, firstName: true, lastName: true, email: true } },
            company: { select: { id: true, name: true } },
            deal: { select: { id: true, title: true } },
            createdBy: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { items: true, salesOrders: true, invoices: true } },
          },
        }),
      ]);

      return sendSuccess(res, {
        quotes,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to list quotes', 500);
    }
  }

  /**
   * Get single quote by ID with line items
   * GET /api/quotes/:id
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;

      const quote = await prisma.quote.findFirst({
        where: { id, organizationId: orgId },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, unit: true } },
            },
          },
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          company: { select: { id: true, name: true, domain: true, address: true, city: true, country: true } },
          deal: { select: { id: true, title: true, amount: true, currency: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          salesOrders: { select: { id: true, orderNumber: true, status: true, total: true } },
          invoices: { select: { id: true, invoiceNumber: true, status: true, total: true } },
        },
      });

      if (!quote) {
        return sendError(res, 'Quote not found', 404);
      }

      return sendSuccess(res, quote);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch quote', 500);
    }
  }

  /**
   * Create a new quote with line items
   * POST /api/quotes
   */
  static async create(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const userId = req.user!.id;
      const data = createQuoteSchema.parse(req.body);

      // Verify contact/company/deal if provided
      if (data.contactId) {
        const contact = await prisma.contact.findFirst({ where: { id: data.contactId, organizationId: orgId } });
        if (!contact) return sendError(res, 'Invalid contact reference', 400);
      }
      if (data.companyId) {
        const company = await prisma.company.findFirst({ where: { id: data.companyId, organizationId: orgId } });
        if (!company) return sendError(res, 'Invalid company reference', 400);
      }
      if (data.dealId) {
        const deal = await prisma.deal.findFirst({ where: { id: data.dealId, organizationId: orgId } });
        if (!deal) return sendError(res, 'Invalid deal reference', 400);
      }

      // Verify product references belong to this organization if supplied
      for (const item of data.items) {
        if (item.productId) {
          const product = await prisma.product.findFirst({
            where: { id: item.productId, organizationId: orgId },
          });
          if (!product) {
            return sendError(res, `Product reference '${item.productId}' not found or unauthorized for this workspace`, 400);
          }
        }
      }

      // Generate sequential quote number
      const count = await prisma.quote.count({ where: { organizationId: orgId } });
      const quoteNumber = `QUO-${(count + 1001).toString().padStart(4, '0')}`;

      // Calculate totals
      const totals = QuoteController.computeTotals(data.items, data.discountPercent);

      const quote = await prisma.quote.create({
        data: {
          quoteNumber,
          organizationId: orgId,
          createdById: userId,
          subject: data.subject.trim(),
          dealId: data.dealId || null,
          contactId: data.contactId || null,
          companyId: data.companyId || null,
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          discountPercent: data.discountPercent,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          total: totals.total,
          currency: data.currency || 'USD',
          terms: data.terms || null,
          notes: data.notes || null,
          items: {
            create: totals.items,
          },
        },
        include: {
          items: true,
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true } },
        },
      });

      await AuditService.log({
        organizationId: orgId,
        userId,
        action: 'CREATE_QUOTE',
        entity: 'QUOTE' as any,
        entityId: quote.id,
        details: { quoteNumber, subject: quote.subject, total: quote.total },
      });

      return sendSuccess(res, quote, 'Quote created successfully', undefined, 201);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to create quote', 400);
    }
  }

  /**
   * Update quote and line items
   * PATCH /api/quotes/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;
      const data = updateQuoteSchema.parse(req.body);

      const existing = await prisma.quote.findFirst({
        where: { id, organizationId: orgId },
        include: { items: true },
      });

      if (!existing) {
        return sendError(res, 'Quote not found', 404);
      }

      let updateData: any = { ...data };

      if (data.status === 'ACCEPTED' && existing.status !== 'ACCEPTED') {
        updateData.acceptedAt = new Date();
      } else if (data.status === 'DECLINED' && existing.status !== 'DECLINED') {
        updateData.declinedAt = new Date();
      }

      if (data.validUntil) {
        updateData.validUntil = new Date(data.validUntil);
      }

      // If items or discountPercent updated, re-calculate
      if (data.items || data.discountPercent !== undefined) {
        const itemsToCompute = data.items || existing.items;
        const discountPct = data.discountPercent !== undefined ? data.discountPercent : existing.discountPercent;
        const totals = QuoteController.computeTotals(itemsToCompute, discountPct);

        updateData.subtotal = totals.subtotal;
        updateData.discountAmount = totals.discountAmount;
        updateData.taxAmount = totals.taxAmount;
        updateData.total = totals.total;

        if (data.items) {
          // Replace items
          await prisma.quoteItem.deleteMany({ where: { quoteId: id } });
          updateData.items = {
            create: totals.items,
          };
        } else {
          delete updateData.items;
        }
      }

      const updated = await prisma.quote.update({
        where: { id },
        data: updateData,
        include: { items: true },
      });

      return sendSuccess(res, updated, 'Quote updated successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to update quote', 400);
    }
  }

  /**
   * Convert Quote into a Confirmed Sales Order
   * POST /api/quotes/:id/convert-to-order
   */
  static async convertToOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;
      const userId = req.user!.id;

      const quote = await prisma.quote.findFirst({
        where: { id, organizationId: orgId },
        include: { items: true },
      });

      if (!quote) {
        return sendError(res, 'Quote not found', 404);
      }

      const count = await prisma.salesOrder.count({ where: { organizationId: orgId } });
      const orderNumber = `SO-${(count + 1001).toString().padStart(4, '0')}`;

      // Create Sales Order
      const salesOrder = await prisma.salesOrder.create({
        data: {
          orderNumber,
          organizationId: orgId,
          quoteId: quote.id,
          dealId: quote.dealId,
          contactId: quote.contactId,
          companyId: quote.companyId,
          createdById: userId,
          status: 'CONFIRMED',
          orderDate: new Date(),
          subtotal: quote.subtotal,
          discountAmount: quote.discountAmount,
          taxAmount: quote.taxAmount,
          total: quote.total,
          currency: quote.currency,
          terms: quote.terms,
          notes: `Generated automatically from quotation ${quote.quoteNumber}`,
          items: {
            create: quote.items.map((i) => ({
              productId: i.productId,
              name: i.name,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discount: i.discount,
              taxRate: i.taxRate,
              total: i.total,
            })),
          },
        },
        include: { items: true },
      });

      // Mark quote as ACCEPTED
      await prisma.quote.update({
        where: { id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      return sendSuccess(res, salesOrder, `Quote ${quote.quoteNumber} converted to Sales Order ${salesOrder.orderNumber}`, undefined, 201);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to convert quote to order', 500);
    }
  }

  /**
   * Convert Quote directly into a Customer Commercial Invoice
   * POST /api/quotes/:id/convert-to-invoice
   */
  static async convertToInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;
      const userId = req.user!.id;

      const quote = await prisma.quote.findFirst({
        where: { id, organizationId: orgId },
        include: { items: true },
      });

      if (!quote) {
        return sendError(res, 'Quote not found', 404);
      }

      const count = await prisma.customerInvoice.count({ where: { organizationId: orgId } });
      const invoiceNumber = `INV-${(count + 1001).toString().padStart(4, '0')}`;

      const issueDate = new Date();
      const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days Net terms

      const invoice = await prisma.customerInvoice.create({
        data: {
          invoiceNumber,
          organizationId: orgId,
          quoteId: quote.id,
          dealId: quote.dealId,
          contactId: quote.contactId,
          companyId: quote.companyId,
          createdById: userId,
          status: 'SENT',
          issueDate,
          dueDate,
          subtotal: quote.subtotal,
          discountAmount: quote.discountAmount,
          taxAmount: quote.taxAmount,
          total: quote.total,
          amountPaid: 0,
          amountDue: quote.total,
          currency: quote.currency,
          terms: quote.terms,
          notes: `Generated automatically from quotation ${quote.quoteNumber}`,
          items: {
            create: quote.items.map((i) => ({
              productId: i.productId,
              name: i.name,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discount: i.discount,
              taxRate: i.taxRate,
              total: i.total,
            })),
          },
        },
        include: { items: true },
      });

      await prisma.quote.update({
        where: { id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      return sendSuccess(res, invoice, `Quote ${quote.quoteNumber} converted to Commercial Invoice ${invoice.invoiceNumber}`, undefined, 201);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to convert quote to invoice', 500);
    }
  }
}
