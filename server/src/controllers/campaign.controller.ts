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

  /**
   * Dispatch Campaign with Anti-Spam Opt-Out / Suppression Filtering
   * Route: POST /api/v1/campaigns/:id/send
   */
  static async dispatch(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const campaign = await prisma.campaign.findFirst({
        where: { id, organizationId: req.organizationId },
      });

      if (!campaign) {
        return sendError(res, 'Campaign not found', 404);
      }

      // Query revoked consent records for this tenant to build suppression list
      const revokedConsents = await prisma.consentRecord.findMany({
        where: {
          organizationId: req.organizationId!,
          status: 'REVOKED',
        },
      });

      const suppressedEmails = new Set(
        revokedConsents.filter((c) => c.email).map((c) => c.email!.toLowerCase())
      );
      const suppressedPhones = new Set(
        revokedConsents.filter((c) => c.phone).map((c) => c.phone!)
      );

      // Target leads and contacts
      const [leads, contacts] = await Promise.all([
        prisma.lead.findMany({
          where: { organizationId: req.organizationId },
          select: { id: true, email: true, phone: true },
        }),
        prisma.contact.findMany({
          where: { organizationId: req.organizationId },
          select: { id: true, email: true, phone: true },
        }),
      ]);

      const allRecipients = [...leads, ...contacts];
      const eligible = allRecipients.filter((r) => {
        if (r.email && suppressedEmails.has(r.email.toLowerCase())) return false;
        if (r.phone && suppressedPhones.has(r.phone)) return false;
        return true;
      });

      const suppressedCount = allRecipients.length - eligible.length;

      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          status: 'RUNNING',
          sentCount: eligible.length,
          scheduledAt: new Date(),
        },
      });

      // Record usage for sent items
      if (eligible.length > 0) {
        await prisma.usageRecord.create({
          data: {
            organizationId: req.organizationId!,
            metric: campaign.type === 'SMS' ? 'SMS_SENT' : 'EMAILS_SENT',
            quantity: eligible.length,
            metadata: { campaignId: campaign.id, suppressedCount },
          },
        });
      }

      await AuditService.log({
        organizationId: req.organizationId!,
        userId: req.user?.id,
        action: 'DISPATCH_CAMPAIGN',
        entity: 'CAMPAIGN',
        entityId: campaign.id,
        details: {
          name: campaign.name,
          dispatchedCount: eligible.length,
          suppressedCount,
        },
      });

      return sendSuccess(
        res,
        {
          campaign: updated,
          dispatchedCount: eligible.length,
          suppressedCount,
        },
        `Campaign dispatched to ${eligible.length} recipients (${suppressedCount} suppressed by unsubscribe preference).`
      );
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to dispatch campaign', 500);
    }
  }

  /**
   * One-Click Unsubscribe Endpoint (CAN-SPAM & Anti-Spam Compliance)
   * Route: POST /api/v1/campaigns/unsubscribe
   */
  static async unsubscribe(req: Request, res: Response) {
    try {
      const { organizationId, email, phone, consentType = 'MARKETING_EMAIL' } = req.body;

      if (!organizationId || (!email && !phone)) {
        return sendError(
          res,
          'organizationId and either email or phone is required to unsubscribe',
          400
        );
      }

      const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

      const consent = await prisma.consentRecord.create({
        data: {
          organizationId,
          email: normalizedEmail,
          phone: phone ? String(phone).trim() : null,
          consentType,
          status: 'REVOKED',
          revokedAt: new Date(),
          source: 'ONE_CLICK_UNSUBSCRIBE',
          ipAddress: req.ip,
        },
      });

      return sendSuccess(
        res,
        consent,
        'You have been successfully unsubscribed from future communications.'
      );
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to process unsubscribe request', 500);
    }
  }
}
