import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';

const createActivitySchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'STAGE_CHANGE', 'STATUS_CHANGE', 'AI_INSIGHT']),
  title: z.string().min(1),
  description: z.string().optional(),
  leadId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
});

export class ActivityController {
  static async list(req: Request, res: Response) {
    const { leadId, contactId, dealId, companyId, limit = 50 } = req.query;

    const where: any = { organizationId: req.organizationId };

    if (leadId) where.leadId = String(leadId);
    if (contactId) where.contactId = String(contactId);
    if (dealId) where.dealId = String(dealId);
    if (companyId) where.companyId = String(companyId);

    const activities = await prisma.activity.findMany({
      where,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });

    return sendSuccess(res, activities);
  }

  static async create(req: Request, res: Response) {
    const parsed = createActivitySchema.parse(req.body);

    const activity = await prisma.activity.create({
      data: {
        organizationId: req.organizationId!,
        type: parsed.type,
        title: parsed.title,
        description: parsed.description || null,
        leadId: parsed.leadId || null,
        contactId: parsed.contactId || null,
        companyId: parsed.companyId || null,
        dealId: parsed.dealId || null,
        createdById: req.user!.id,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return sendSuccess(res, activity, 'Activity logged successfully', undefined, 201);
  }
}
