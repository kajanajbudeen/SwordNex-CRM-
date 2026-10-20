import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuditService } from '../services/audit.service';

const createCompanySchema = z.object({
  name: z.string().min(1),
  domain: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  annualRevenue: z.number().optional(),
});

export class CompanyController {
  static async list(req: Request, res: Response) {
    const { search, churnRisk } = req.query;

    const where: any = { organizationId: req.organizationId };

    if (churnRisk && churnRisk !== 'ALL') {
      where.churnRisk = String(churnRisk);
    }

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { domain: { contains: String(search), mode: 'insensitive' } },
        { industry: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: { select: { contacts: true, deals: true, activities: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, companies);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;

    const company = await prisma.company.findFirst({
      where: { id, organizationId: req.organizationId },
      include: {
        contacts: true,
        deals: { include: { stage: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!company) {
      return sendError(res, 'Company not found', 404);
    }

    return sendSuccess(res, company);
  }

  static async create(req: Request, res: Response) {
    const parsed = createCompanySchema.parse(req.body);

    const company = await prisma.company.create({
      data: {
        organizationId: req.organizationId!,
        name: parsed.name,
        domain: parsed.domain || null,
        industry: parsed.industry || null,
        size: parsed.size || null,
        website: parsed.website || null,
        phone: parsed.phone || null,
        city: parsed.city || null,
        country: parsed.country || null,
        annualRevenue: parsed.annualRevenue || null,
      },
    });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'CREATE_COMPANY',
      entity: 'COMPANY',
      entityId: company.id,
      details: { name: company.name },
    });

    return sendSuccess(res, company, 'Company created successfully', undefined, 201);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;

    const existing = await prisma.company.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existing) {
      return sendError(res, 'Company not found', 404);
    }

    const updated = await prisma.company.update({
      where: { id },
      data: { ...req.body, updatedAt: new Date() },
    });

    return sendSuccess(res, updated, 'Company updated successfully');
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    const existing = await prisma.company.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existing) {
      return sendError(res, 'Company not found', 404);
    }

    await prisma.company.delete({ where: { id } });

    return sendSuccess(res, null, 'Company deleted successfully');
  }
}
