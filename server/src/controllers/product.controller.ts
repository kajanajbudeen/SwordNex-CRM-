import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuditService } from '../services/audit.service';

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional().nullable(),
  category: z.string().optional().default('GENERAL'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  costPrice: z.number().nonnegative().optional().default(0),
  currency: z.string().default('USD'),
  taxRate: z.number().nonnegative().max(100).optional().default(0),
  unit: z.string().optional().default('UNIT'),
  isActive: z.boolean().optional().default(true),
  customFields: z.record(z.any()).optional().default({}),
});

const updateProductSchema = createProductSchema.partial();

export class ProductController {
  /**
   * List all products for the tenant
   * GET /api/products
   */
  static async list(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { q, category, isActive, page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where: any = { organizationId: orgId };

      if (category && category !== 'ALL') {
        where.category = String(category);
      }

      if (isActive !== undefined && isActive !== 'ALL') {
        where.isActive = isActive === 'true';
      }

      if (q && String(q).trim()) {
        const query = String(q).trim();
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ];
      }

      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { name: 'asc' },
        }),
      ]);

      return sendSuccess(res, {
        products,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to list products', 500);
    }
  }

  /**
   * Get product by ID
   * GET /api/products/:id
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;

      const product = await prisma.product.findFirst({
        where: { id, organizationId: orgId },
      });

      if (!product) {
        return sendError(res, 'Product not found', 404);
      }

      return sendSuccess(res, product);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch product', 500);
    }
  }

  /**
   * Create a new product / service
   * POST /api/products
   */
  static async create(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const data = createProductSchema.parse(req.body);

      // Check SKU uniqueness within organization
      const existing = await prisma.product.findFirst({
        where: { organizationId: orgId, sku: data.sku.trim() },
      });

      if (existing) {
        return sendError(res, `A product with SKU "${data.sku}" already exists in your catalog.`, 400);
      }

      const product = await prisma.product.create({
        data: {
          organizationId: orgId,
          name: data.name.trim(),
          sku: data.sku.trim().toUpperCase(),
          description: data.description?.trim() || null,
          category: data.category || 'GENERAL',
          unitPrice: data.unitPrice,
          costPrice: data.costPrice,
          currency: data.currency,
          taxRate: data.taxRate,
          unit: data.unit,
          isActive: data.isActive,
          customFields: data.customFields || {},
        },
      });

      await AuditService.log({
        organizationId: orgId,
        userId: req.user!.id,
        action: 'CREATE_PRODUCT',
        entity: 'PRODUCT' as any,
        entityId: product.id,
        details: { name: product.name, sku: product.sku, unitPrice: product.unitPrice },
      });

      return sendSuccess(res, product, 'Product added to catalog successfully', undefined, 201);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to create product', 400);
    }
  }

  /**
   * Update an existing product
   * PATCH /api/products/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;
      const data = updateProductSchema.parse(req.body);

      const existing = await prisma.product.findFirst({
        where: { id, organizationId: orgId },
      });

      if (!existing) {
        return sendError(res, 'Product not found', 404);
      }

      if (data.sku && data.sku.trim().toUpperCase() !== existing.sku) {
        const duplicate = await prisma.product.findFirst({
          where: { organizationId: orgId, sku: data.sku.trim().toUpperCase() },
        });
        if (duplicate) {
          return sendError(res, `A product with SKU "${data.sku}" already exists.`, 400);
        }
      }

      const updated = await prisma.product.update({
        where: { id },
        data: {
          ...data,
          sku: data.sku ? data.sku.trim().toUpperCase() : undefined,
          name: data.name ? data.name.trim() : undefined,
        },
      });

      await AuditService.log({
        organizationId: orgId,
        userId: req.user!.id,
        action: 'UPDATE_PRODUCT',
        entity: 'PRODUCT' as any,
        entityId: id,
        details: { ...data },
      });

      return sendSuccess(res, updated, 'Product updated successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to update product', 400);
    }
  }

  /**
   * Delete or deactivate product
   * DELETE /api/products/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;

      const existing = await prisma.product.findFirst({
        where: { id, organizationId: orgId },
      });

      if (!existing) {
        return sendError(res, 'Product not found', 404);
      }

      // Check if product is referenced in quotes or invoices
      const [quoteCount, invoiceCount] = await Promise.all([
        prisma.quoteItem.count({ where: { productId: id } }),
        prisma.customerInvoiceItem.count({ where: { productId: id } }),
      ]);

      if (quoteCount > 0 || invoiceCount > 0) {
        // Soft delete / deactivate to maintain commercial audit history
        const deactivated = await prisma.product.update({
          where: { id },
          data: { isActive: false },
        });
        return sendSuccess(res, deactivated, 'Product is referenced in existing transactions and has been deactivated.');
      }

      await prisma.product.delete({ where: { id } });
      return sendSuccess(res, null, 'Product deleted successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to delete product', 500);
    }
  }
}
