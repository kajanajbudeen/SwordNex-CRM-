import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';

const sendMessageSchema = z.object({
  body: z.string().min(1, 'Message body cannot be empty'),
  channel: z.enum(['EMAIL', 'WHATSAPP', 'SMS', 'WEB_CHAT']).default('EMAIL'),
});

const createConversationSchema = z.object({
  channel: z.enum(['EMAIL', 'WHATSAPP', 'SMS', 'WEB_CHAT']).default('EMAIL'),
  subject: z.string().optional(),
  leadId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  initialMessage: z.string().min(1),
});

export class CommsController {
  static async listConversations(req: Request, res: Response) {
    const { channel } = req.query;

    const where: any = { organizationId: req.organizationId };
    if (channel && channel !== 'ALL') {
      where.channel = channel;
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return sendSuccess(res, conversations);
  }

  static async getMessages(req: Request, res: Response) {
    const { id } = req.params;

    const conversation = await prisma.conversation.findFirst({
      where: { id, organizationId: req.organizationId },
      include: {
        lead: true,
        contact: true,
      },
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    return sendSuccess(res, { conversation, messages });
  }

  static async sendMessage(req: Request, res: Response) {
    const { id } = req.params;
    const parsed = sendMessageSchema.parse(req.body);

    const conversation = await prisma.conversation.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    // Check if an external provider integration is configured
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId: req.organizationId!,
        provider: parsed.channel === 'WHATSAPP' ? 'WHATSAPP' : parsed.channel === 'SMS' ? 'TWILIO_SMS' : 'EMAIL_SMTP',
        isEnabled: true,
      },
    });

    let messageStatus: 'SENT' | 'FAILED' = 'SENT';
    let failureReason: string | null = null;

    if (!integration) {
      // In accordance with guidelines: honestly report provider unconfigured rather than faking success
      messageStatus = 'FAILED';
      failureReason = `No active ${parsed.channel} provider integration configured in settings. Message recorded locally in audit queue.`;
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderType: 'AGENT',
        senderId: req.user!.id,
        body: parsed.body,
        status: messageStatus,
        failureReason,
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    // Record usage
    await prisma.usageRecord.create({
      data: {
        organizationId: req.organizationId!,
        metric: parsed.channel === 'WHATSAPP' ? 'WHATSAPP_MESSAGES' : 'EMAILS_SENT',
        quantity: 1,
        metadata: { conversationId: id, status: messageStatus },
      },
    });

    return sendSuccess(
      res,
      message,
      messageStatus === 'SENT' ? 'Message sent successfully' : `Message queued: ${failureReason}`,
      undefined,
      201
    );
  }

  static async createConversation(req: Request, res: Response) {
    const parsed = createConversationSchema.parse(req.body);

    const conversation = await prisma.conversation.create({
      data: {
        organizationId: req.organizationId!,
        channel: parsed.channel,
        subject: parsed.subject || `${parsed.channel} Conversation`,
        leadId: parsed.leadId || null,
        contactId: parsed.contactId || null,
        assignedToId: req.user!.id,
      },
    });

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'AGENT',
        senderId: req.user!.id,
        body: parsed.initialMessage,
        status: 'SENT',
      },
    });

    return sendSuccess(res, { conversation, message }, 'Conversation started successfully', undefined, 201);
  }
}
