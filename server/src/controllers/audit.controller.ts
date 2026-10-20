import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess } from '../utils/response';

export class AuditController {
  static async list(req: Request, res: Response) {
    const { action, entity, limit = 50 } = req.query;

    const where: any = { organizationId: req.organizationId };

    if (action && action !== 'ALL') {
      where.action = String(action);
    }

    if (entity && entity !== 'ALL') {
      where.entity = String(entity);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });

    return sendSuccess(res, logs);
  }
}
