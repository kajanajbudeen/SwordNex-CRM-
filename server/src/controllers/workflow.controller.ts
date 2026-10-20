import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuditService } from '../services/audit.service';

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.enum(['LEAD_CREATED', 'LEAD_UPDATED', 'DEAL_STAGE_CHANGED', 'TASK_OVERDUE', 'SCORE_THRESHOLD', 'MANUAL']),
  conditions: z.array(z.any()).default([]),
  actions: z.array(z.any()).default([]),
  isActive: z.boolean().default(true),
});

export class WorkflowController {
  static async list(req: Request, res: Response) {
    const workflows = await prisma.automationWorkflow.findMany({
      where: { organizationId: req.organizationId },
      include: {
        _count: { select: { runs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, workflows);
  }

  static async create(req: Request, res: Response) {
    const parsed = createWorkflowSchema.parse(req.body);

    const workflow = await prisma.automationWorkflow.create({
      data: {
        organizationId: req.organizationId!,
        name: parsed.name,
        description: parsed.description || null,
        triggerType: parsed.triggerType,
        conditions: parsed.conditions,
        actions: parsed.actions,
        isActive: parsed.isActive,
      },
    });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'CREATE_WORKFLOW',
      entity: 'WORKFLOW',
      entityId: workflow.id,
      details: { name: workflow.name, triggerType: workflow.triggerType },
    });

    return sendSuccess(res, workflow, 'Workflow created successfully', undefined, 201);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;

    const existing = await prisma.automationWorkflow.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existing) {
      return sendError(res, 'Workflow not found', 404);
    }

    const updated = await prisma.automationWorkflow.update({
      where: { id },
      data: {
        ...req.body,
        updatedAt: new Date(),
      },
    });

    return sendSuccess(res, updated, 'Workflow updated successfully');
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    const existing = await prisma.automationWorkflow.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existing) {
      return sendError(res, 'Workflow not found', 404);
    }

    await prisma.automationWorkflow.delete({ where: { id } });

    return sendSuccess(res, null, 'Workflow deleted successfully');
  }

  static async listRuns(req: Request, res: Response) {
    const { id } = req.params;

    const runs = await prisma.workflowRun.findMany({
      where: {
        workflowId: id,
        organizationId: req.organizationId,
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    return sendSuccess(res, runs);
  }
}
