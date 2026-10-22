import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuditService } from '../services/audit.service';
import { AiGateway } from '../services/ai/ai.gateway';

const createTicketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  channel: z.enum(['EMAIL', 'PORTAL', 'PHONE', 'CHAT', 'WEB', 'OTHER']).default('EMAIL'),
  category: z.string().optional().default('GENERAL'),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  customFields: z.record(z.any()).optional().default({}),
});

const updateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().optional(),
  assignedToId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  csatRating: z.number().min(1).max(5).optional().nullable(),
  csatFeedback: z.string().optional().nullable(),
});

const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  isInternal: z.boolean().optional().default(false),
});

export class TicketController {
  /**
   * Helper to calculate SLA deadlines based on priority
   */
  private static calculateSlaDeadlines(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') {
    const now = new Date();
    let responseHours = 8;
    let resolutionHours = 48;

    switch (priority) {
      case 'URGENT':
        responseHours = 2;
        resolutionHours = 8;
        break;
      case 'HIGH':
        responseHours = 4;
        resolutionHours = 24;
        break;
      case 'MEDIUM':
        responseHours = 8;
        resolutionHours = 48;
        break;
      case 'LOW':
        responseHours = 24;
        resolutionHours = 72;
        break;
    }

    const firstResponseDueAt = new Date(now.getTime() + responseHours * 60 * 60 * 1000);
    const resolutionDueAt = new Date(now.getTime() + resolutionHours * 60 * 60 * 1000);

    return { firstResponseDueAt, resolutionDueAt };
  }

  /**
   * List tickets with full filtering, search, and pagination
   * GET /api/tickets
   */
  static async list(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const {
        q,
        status,
        priority,
        category,
        assignedToId,
        contactId,
        page = '1',
        limit = '20',
      } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where: any = { organizationId: orgId };

      if (status && status !== 'ALL') {
        where.status = status;
      }
      if (priority && priority !== 'ALL') {
        where.priority = priority;
      }
      if (category && category !== 'ALL') {
        where.category = category;
      }
      if (assignedToId && assignedToId !== 'ALL') {
        where.assignedToId = assignedToId === 'UNASSIGNED' ? null : String(assignedToId);
      }
      if (contactId) {
        where.contactId = String(contactId);
      }

      if (q && String(q).trim()) {
        const query = String(q).trim();
        where.OR = [
          { ticketNumber: { contains: query, mode: 'insensitive' } },
          { subject: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { contact: { firstName: { contains: query, mode: 'insensitive' } } },
          { contact: { lastName: { contains: query, mode: 'insensitive' } } },
          { contact: { email: { contains: query, mode: 'insensitive' } } },
        ];
      }

      const [total, tickets] = await Promise.all([
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
            contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            company: { select: { id: true, name: true, domain: true } },
            _count: { select: { comments: true, attachments: true } },
          },
        }),
      ]);

      return sendSuccess(res, {
        tickets,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to list tickets', 500);
    }
  }

  /**
   * Get KPI summary of tickets for the organization
   * GET /api/tickets/summary
   */
  static async getSummary(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const now = new Date();

      const [
        total,
        open,
        inProgress,
        waitingOnCustomer,
        resolved,
        closed,
        urgent,
        breachedSla,
      ] = await Promise.all([
        prisma.ticket.count({ where: { organizationId: orgId } }),
        prisma.ticket.count({ where: { organizationId: orgId, status: 'OPEN' } }),
        prisma.ticket.count({ where: { organizationId: orgId, status: 'IN_PROGRESS' } }),
        prisma.ticket.count({ where: { organizationId: orgId, status: 'WAITING_ON_CUSTOMER' } }),
        prisma.ticket.count({ where: { organizationId: orgId, status: 'RESOLVED' } }),
        prisma.ticket.count({ where: { organizationId: orgId, status: 'CLOSED' } }),
        prisma.ticket.count({ where: { organizationId: orgId, priority: 'URGENT', status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
        prisma.ticket.count({
          where: {
            organizationId: orgId,
            status: { notIn: ['RESOLVED', 'CLOSED'] },
            resolutionDueAt: { lt: now },
          },
        }),
      ]);

      return sendSuccess(res, {
        total,
        open,
        inProgress,
        waitingOnCustomer,
        resolved,
        closed,
        urgent,
        breachedSla,
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch ticket summary', 500);
    }
  }

  /**
   * Get single ticket by ID with complete thread
   * GET /api/tickets/:id
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;

      const ticket = await prisma.ticket.findFirst({
        where: { id, organizationId: orgId },
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          company: { select: { id: true, name: true, domain: true } },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
            },
          },
          attachments: true,
        },
      });

      if (!ticket) {
        return sendError(res, 'Ticket not found', 404);
      }

      return sendSuccess(res, ticket);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to retrieve ticket', 500);
    }
  }

  /**
   * Create a new ticket
   * POST /api/tickets
   */
  static async create(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const userId = req.user!.id;
      const data = createTicketSchema.parse(req.body);

      // Verify contact/company if supplied
      if (data.contactId) {
        const contact = await prisma.contact.findFirst({
          where: { id: data.contactId, organizationId: orgId },
        });
        if (!contact) {
          return sendError(res, 'Invalid contact reference for current organization', 400);
        }
      }

      if (data.companyId) {
        const company = await prisma.company.findFirst({
          where: { id: data.companyId, organizationId: orgId },
        });
        if (!company) {
          return sendError(res, 'Invalid company reference for current organization', 400);
        }
      }

      // Generate sequential ticket number
      const count = await prisma.ticket.count({ where: { organizationId: orgId } });
      const ticketNumber = `TICK-${(count + 1001).toString().padStart(4, '0')}`;

      // Calculate SLAs
      const { firstResponseDueAt, resolutionDueAt } = TicketController.calculateSlaDeadlines(data.priority);

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber,
          organizationId: orgId,
          createdById: userId,
          subject: data.subject.trim(),
          description: data.description.trim(),
          priority: data.priority,
          channel: data.channel,
          category: data.category || 'GENERAL',
          contactId: data.contactId || null,
          companyId: data.companyId || null,
          assignedToId: data.assignedToId || null,
          tags: data.tags || [],
          customFields: data.customFields || {},
          firstResponseDueAt,
          resolutionDueAt,
        },
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          company: { select: { id: true, name: true } },
        },
      });

      await AuditService.log({
        organizationId: orgId,
        userId,
        action: 'CREATE_TICKET',
        entity: 'TICKET',
        entityId: ticket.id,
        details: { ticketNumber, subject: ticket.subject, priority: ticket.priority },
      });

      return sendSuccess(res, ticket, 'Ticket created successfully', undefined, 201);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to create ticket', 400);
    }
  }

  /**
   * Update an existing ticket (status, priority, assignee, CSAT)
   * PATCH /api/tickets/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;
      const userId = req.user!.id;
      const data = updateTicketSchema.parse(req.body);

      const existing = await prisma.ticket.findFirst({
        where: { id, organizationId: orgId },
      });

      if (!existing) {
        return sendError(res, 'Ticket not found', 404);
      }

      const updateData: any = { ...data };

      // Manage status progression timestamps
      if (data.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
        updateData.resolvedAt = new Date();
      } else if (data.status && data.status !== 'RESOLVED' && data.status !== 'CLOSED') {
        updateData.resolvedAt = null;
      }

      if (data.status === 'CLOSED' && existing.status !== 'CLOSED') {
        updateData.closedAt = new Date();
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          company: { select: { id: true, name: true } },
        },
      });

      await AuditService.log({
        organizationId: orgId,
        userId,
        action: 'UPDATE_TICKET',
        entity: 'TICKET',
        entityId: id,
        details: { ...data },
      });

      return sendSuccess(res, updated, 'Ticket updated successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to update ticket', 400);
    }
  }

  /**
   * Add a reply or internal note to a ticket
   * POST /api/tickets/:id/comments
   */
  static async addComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;
      const userId = req.user!.id;
      const data = addCommentSchema.parse(req.body);

      const ticket = await prisma.ticket.findFirst({
        where: { id, organizationId: orgId },
      });

      if (!ticket) {
        return sendError(res, 'Ticket not found', 404);
      }

      // Record comment
      const comment = await prisma.ticketComment.create({
        data: {
          ticketId: id,
          authorId: userId,
          authorType: 'AGENT',
          content: data.content.trim(),
          isInternal: data.isInternal || false,
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
      });

      // If it's a public response from an agent and firstRespondedAt is not yet set, update it
      if (!data.isInternal && !ticket.firstRespondedAt) {
        await prisma.ticket.update({
          where: { id },
          data: { firstRespondedAt: new Date() },
        });
      }

      return sendSuccess(res, comment, 'Comment added successfully', undefined, 201);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to add comment', 400);
    }
  }

  /**
   * AI Copilot: Draft resolution response for a ticket
   * POST /api/tickets/:id/ai-draft
   */
  static async aiDraft(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orgId = req.organizationId!;

      const ticket = await prisma.ticket.findFirst({
        where: { id, organizationId: orgId },
        include: {
          contact: { select: { firstName: true, lastName: true } },
        },
      });

      if (!ticket) {
        return sendError(res, 'Ticket not found', 404);
      }

      const customerName = ticket.contact
        ? `${ticket.contact.firstName} ${ticket.contact.lastName}`.trim()
        : 'Customer';

      const draftResult = await AiGateway.draftSupportReply({
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        customerName,
      });

      return sendSuccess(res, draftResult);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to draft AI response', 500);
    }
  }
}
