import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuditService } from '../services/audit.service';

const createCampaignSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['EMAIL', 'SMS', 'MULTI_CHANNEL']).default('EMAIL'),
  subject: z.string().optional(),
  content: z.string().optional(),
  scheduledAt: z.string().optional(),
  budget: z.number().default(0),
});

export class CampaignController {
  static async list(req: Request, res: Response) {
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: req.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, campaigns);
  }

  static async create(req: Request, res: Response) {
    const parsed = createCampaignSchema.parse(req.body);

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: req.organizationId!,
        name: parsed.name,
        type: parsed.type,
        subject: parsed.subject || null,
        content: parsed.content || null,
        budget: parsed.budget,
        scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : null,
      },
    });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'CREATE_CAMPAIGN',
      entity: 'CAMPAIGN',
      entityId: campaign.id,
      details: { name: campaign.name, type: campaign.type },
    });

    return sendSuccess(res, campaign, 'Campaign created successfully', undefined, 201);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;

    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existing) {
      return sendError(res, 'Campaign not found', 404);
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...req.body,
        updatedAt: new Date(),
      },
    });

    return sendSuccess(res, updated, 'Campaign updated successfully');
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existing) {
      return sendError(res, 'Campaign not found', 404);
    }

    await prisma.campaign.delete({ where: { id } });

    return sendSuccess(res, null, 'Campaign deleted successfully');
  }
}
