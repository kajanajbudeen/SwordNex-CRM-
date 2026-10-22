import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  category: z.enum(['FOLLOW_UP', 'CALL', 'EMAIL', 'MEETING', 'PREPARATION', 'OTHER']).default('FOLLOW_UP'),
  assignedToId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
});

export class TaskController {
  static async list(req: Request, res: Response) {
    const { status, priority, category, overdue, assignedToId } = req.query;

    const where: any = { organizationId: req.organizationId };

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
      where.assignedToId = String(assignedToId);
    }

    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { not: 'COMPLETED' };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true, amount: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });

    return sendSuccess(res, tasks);
  }

  static async create(req: Request, res: Response) {
    const parsed = createTaskSchema.parse(req.body);

    if (parsed.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: parsed.leadId, organizationId: req.organizationId },
      });
      if (!lead) return sendError(res, 'Lead reference not found or unauthorized for this workspace', 400);
    }

    if (parsed.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: parsed.contactId, organizationId: req.organizationId },
      });
      if (!contact) return sendError(res, 'Contact reference not found or unauthorized for this workspace', 400);
    }

    if (parsed.dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: parsed.dealId, organizationId: req.organizationId },
      });
      if (!deal) return sendError(res, 'Deal reference not found or unauthorized for this workspace', 400);
    }

    if (parsed.assignedToId) {
      const membership = await prisma.membership.findFirst({
        where: { userId: parsed.assignedToId, organizationId: req.organizationId },
      });
      if (!membership) return sendError(res, 'Assigned user must be a member of this workspace', 400);
    }

    const task = await prisma.task.create({
      data: {
        organizationId: req.organizationId!,
        title: parsed.title,
        description: parsed.description || null,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        priority: parsed.priority,
        category: parsed.category,
        assignedToId: parsed.assignedToId || req.user!.id,
        leadId: parsed.leadId || null,
        contactId: parsed.contactId || null,
        dealId: parsed.dealId || null,
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        lead: true,
        deal: true,
      },
    });

    return sendSuccess(res, task, 'Task created successfully', undefined, 201);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;

    const existing = await prisma.task.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existing) {
      return sendError(res, 'Task not found', 404);
    }

    const { status, dueDate, title, description, priority } = req.body;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        priority: priority !== undefined ? priority : undefined,
        status: status !== undefined ? status : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
        updatedAt: new Date(),
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return sendSuccess(res, updated, 'Task updated successfully');
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    const existing = await prisma.task.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existing) {
      return sendError(res, 'Task not found', 404);
    }

    await prisma.task.delete({ where: { id } });

    return sendSuccess(res, null, 'Task deleted successfully');
  }
}
