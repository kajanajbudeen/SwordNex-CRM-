import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuditService } from '../services/audit.service';

const createContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  companyId: z.string().optional().nullable(),
  lifecycleStage: z.string().optional(),
  ownerId: z.string().optional().nullable(),
});

export class ContactController {
  static async list(req: Request, res: Response) {
    const { search, companyId } = req.query;

    const where: any = { organizationId: req.organizationId };

    if (companyId) {
      where.companyId = String(companyId);
    }

    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        company: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { deals: true, activities: true, tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, contacts);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;

    const contact = await prisma.contact.findFirst({
      where: { id, organizationId: req.organizationId },
      include: {
        company: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        deals: { include: { stage: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
        },
        tasks: { orderBy: { dueDate: 'asc' } },
      },
    });

    if (!contact) {
      return sendError(res, 'Contact not found', 404);
    }

    return sendSuccess(res, contact);
  }

  static async create(req: Request, res: Response) {
    const parsed = createContactSchema.parse(req.body);

    const contact = await prisma.contact.create({
      data: {
        organizationId: req.organizationId!,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email || null,
        phone: parsed.phone || null,
        title: parsed.title || null,
        department: parsed.department || null,
        companyId: parsed.companyId || null,
        lifecycleStage: parsed.lifecycleStage || 'LEAD',
        ownerId: parsed.ownerId || req.user!.id,
      },
      include: {
        company: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'CREATE_CONTACT',
      entity: 'CONTACT',
      entityId: contact.id,
      details: { name: `${contact.firstName} ${contact.lastName}`, email: contact.email },
    });

    return sendSuccess(res, contact, 'Contact created successfully', undefined, 201);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;

    const existing = await prisma.contact.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existing) {
      return sendError(res, 'Contact not found', 404);
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: { ...req.body, updatedAt: new Date() },
      include: {
        company: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return sendSuccess(res, updated, 'Contact updated successfully');
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    const existing = await prisma.contact.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existing) {
      return sendError(res, 'Contact not found', 404);
    }

    await prisma.contact.delete({ where: { id } });

    return sendSuccess(res, null, 'Contact deleted successfully');
  }

  static async exportCsv(req: Request, res: Response) {
    try {
      const contacts = await prisma.contact.findMany({
        where: { organizationId: req.organizationId },
        include: { company: true },
        orderBy: { createdAt: 'desc' },
      });

      const headers = [
        'ID',
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Company',
        'Title',
        'Department',
        'Lifecycle Stage',
        'Created At',
      ];

      const rows = contacts.map((c) => [
        c.id,
        c.firstName,
        c.lastName,
        c.email || '',
        c.phone || '',
        c.company?.name || '',
        c.title || '',
        c.department || '',
        c.lifecycleStage,
        c.createdAt.toISOString(),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

      await AuditService.log({
        organizationId: req.organizationId!,
        userId: req.user?.id,
        action: 'EXPORT',
        entity: 'CONTACTS',
        details: { count: contacts.length },
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="contacts-export-${Date.now()}.csv"`
      );
      return res.status(200).send(csvContent);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to export contacts', 500);
    }
  }
}
