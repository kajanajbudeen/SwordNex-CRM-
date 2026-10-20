import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuditService } from '../services/audit.service';

export class IntegrationController {
  static async list(req: Request, res: Response) {
    const integrations = await prisma.integration.findMany({
      where: { organizationId: req.organizationId },
    });

    const defaultProviders = [
      { provider: 'EMAIL_SMTP', name: 'Corporate Email (SMTP/IMAP)', description: 'Send and track customer emails directly from CRM' },
      { provider: 'WHATSAPP', name: 'WhatsApp Business API', description: 'Real-time multi-agent customer messaging and templates' },
      { provider: 'TWILIO_SMS', name: 'Twilio SMS & Voice', description: 'Automated SMS outreach and instant phone follow-ups' },
      { provider: 'GOOGLE_CALENDAR', name: 'Google Calendar Sync', description: 'Bi-directional calendar synchronization for meetings' },
      { provider: 'WEBHOOK', name: 'Inbound Webhook Gateway', description: 'Receive lead payloads from landing pages and custom apps' },
    ];

    const results = defaultProviders.map((def) => {
      const match = integrations.find((i) => i.provider === def.provider);
      return {
        ...def,
        id: match?.id || null,
        isEnabled: match?.isEnabled || false,
        status: match?.status || 'DISCONNECTED',
        lastSyncAt: match?.lastSyncAt || null,
        config: match ? { ...match.config as object } : {},
      };
    });

    return sendSuccess(res, results);
  }

  static async update(req: Request, res: Response) {
    const { provider, isEnabled, config, name } = req.body;

    if (!provider) {
      return sendError(res, 'Provider identifier is required', 400);
    }

    const integration = await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId: req.organizationId!,
          provider,
        },
      },
      create: {
        organizationId: req.organizationId!,
        provider,
        name: name || provider,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        config: config || {},
        status: isEnabled ? 'HEALTHY' : 'DISCONNECTED',
        lastSyncAt: isEnabled ? new Date() : null,
      },
      update: {
        isEnabled: isEnabled !== undefined ? isEnabled : undefined,
        config: config !== undefined ? config : undefined,
        status: isEnabled ? 'HEALTHY' : 'DISCONNECTED',
        lastSyncAt: isEnabled ? new Date() : undefined,
      },
    });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'UPDATE_INTEGRATION',
      entity: 'INTEGRATION',
      entityId: integration.id,
      details: { provider, isEnabled },
    });

    return sendSuccess(res, integration, 'Integration updated successfully');
  }
}
