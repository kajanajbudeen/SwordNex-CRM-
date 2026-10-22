import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AiGateway } from '../services/ai/ai.gateway';
import { WorkflowEngine } from '../services/automation/workflow.engine';
import { AuditService } from '../services/audit.service';

const createDealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().nonnegative(),
  currency: z.string().default('USD'),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  expectedCloseDate: z.string().optional(),
  forecastCategory: z.string().optional(),
  winLossCategory: z.string().optional().nullable(),
  winLossReason: z.string().optional().nullable(),
});

export class DealController {
  static async listPipelines(req: Request, res: Response) {
    const pipelines = await prisma.pipeline.findMany({
      where: { organizationId: req.organizationId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return sendSuccess(res, pipelines);
  }

  static async listDeals(req: Request, res: Response) {
    const { pipelineId, status, ownerId } = req.query;

    const where: any = {
      organizationId: req.organizationId,
    };

    if (pipelineId) {
      where.pipelineId = String(pipelineId);
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (ownerId && ownerId !== 'ALL') {
      where.ownerId = String(ownerId);
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        stage: true,
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        company: {
          select: { id: true, name: true, domain: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { activities: true, tasks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return sendSuccess(res, deals);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;

    const deal = await prisma.deal.findFirst({
      where: { id, organizationId: req.organizationId },
      include: {
        stage: true,
        pipeline: true,
        contact: true,
        company: true,
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        tasks: {
          orderBy: { dueDate: 'asc' },
          include: {
            assignedTo: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!deal) {
      return sendError(res, 'Deal not found', 404);
    }

    return sendSuccess(res, deal);
  }

  static async create(req: Request, res: Response) {
    const parsed = createDealSchema.parse(req.body);

    const stage = await prisma.pipelineStage.findUnique({
      where: { id: parsed.stageId },
    });

    const probability = stage ? stage.winProbability : 20;

    const deal = await prisma.deal.create({
      data: {
        organizationId: req.organizationId!,
        title: parsed.title,
        amount: parsed.amount,
        currency: parsed.currency,
        pipelineId: parsed.pipelineId,
        stageId: parsed.stageId,
        probability,
        healthScore: 80,
        contactId: parsed.contactId || null,
        companyId: parsed.companyId || null,
        ownerId: parsed.ownerId || req.user!.id,
        expectedCloseDate: parsed.expectedCloseDate ? new Date(parsed.expectedCloseDate) : null,
        forecastCategory: parsed.forecastCategory || 'PIPELINE',
        winLossCategory: parsed.winLossCategory || null,
        winLossReason: parsed.winLossReason || null,
      },
      include: {
        stage: true,
        company: true,
        contact: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await prisma.activity.create({
      data: {
        organizationId: req.organizationId!,
        dealId: deal.id,
        contactId: parsed.contactId || null,
        companyId: parsed.companyId || null,
        createdById: req.user!.id,
        type: 'STATUS_CHANGE',
        title: 'Deal Created',
        description: `Opportunity "${deal.title}" created with value of $${deal.amount.toLocaleString()}.`,
      },
    });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'CREATE_DEAL',
      entity: 'DEAL',
      entityId: deal.id,
      details: { title: deal.title, amount: deal.amount, stageId: deal.stageId },
    });

    return sendSuccess(res, deal, 'Deal created successfully', undefined, 201);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;

    const existingDeal = await prisma.deal.findFirst({
      where: { id, organizationId: req.organizationId },
      include: { stage: true },
    });

    if (!existingDeal) {
      return sendError(res, 'Deal not found', 404);
    }

    const {
      stageId,
      status,
      amount,
      title,
      winLossReason,
      winLossCategory,
      forecastCategory,
      expectedCloseDate,
      actualCloseDate,
      ownerId,
    } = req.body;

    let probability = existingDeal.probability;
    let isStageTransition = false;
    let newStageName = '';

    if (stageId && stageId !== existingDeal.stageId) {
      isStageTransition = true;
      const targetStage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
      if (targetStage) {
        probability = targetStage.winProbability;
        newStageName = targetStage.name;
      }
    }

    const updated = await prisma.deal.update({
      where: { id },
      data: {
        stageId: stageId || undefined,
        status: status || undefined,
        amount: amount !== undefined ? Number(amount) : undefined,
        title: title || undefined,
        probability,
        winLossReason: winLossReason !== undefined ? winLossReason : undefined,
        winLossCategory: winLossCategory !== undefined ? winLossCategory : undefined,
        forecastCategory: forecastCategory !== undefined ? forecastCategory : undefined,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
        actualCloseDate:
          actualCloseDate !== undefined
            ? actualCloseDate ? new Date(actualCloseDate) : null
            : status === 'WON' || status === 'LOST'
            ? new Date()
            : undefined,
        ownerId: ownerId !== undefined ? ownerId : undefined,
        updatedAt: new Date(),
      },
      include: {
        stage: true,
        company: true,
        contact: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (isStageTransition) {
      await prisma.activity.create({
        data: {
          organizationId: req.organizationId!,
          dealId: id,
          createdById: req.user!.id,
          type: 'STAGE_CHANGE',
          title: 'Pipeline Stage Moved',
          description: `Stage changed from "${existingDeal.stage.name}" to "${newStageName}".`,
        },
      });

      WorkflowEngine.triggerEvent({
        organizationId: req.organizationId!,
        triggerType: 'DEAL_STAGE_CHANGED',
        entityType: 'DEAL',
        entityId: id,
        data: {
          dealId: id,
          previousStage: existingDeal.stage.name,
          newStage: newStageName,
          amount: updated.amount,
        },
      }).catch(console.error);
    }

    return sendSuccess(res, updated, 'Deal updated successfully');
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    const existingDeal = await prisma.deal.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existingDeal) {
      return sendError(res, 'Deal not found', 404);
    }

    await prisma.deal.delete({ where: { id } });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'DELETE_DEAL',
      entity: 'DEAL',
      entityId: id,
      details: { title: existingDeal.title, amount: existingDeal.amount },
    });

    return sendSuccess(res, null, 'Deal deleted successfully');
  }

  static async analyzeHealth(req: Request, res: Response) {
    const { id } = req.params;

    const deal = await prisma.deal.findFirst({
      where: { id, organizationId: req.organizationId },
      include: {
        stage: true,
        _count: { select: { activities: true } },
      },
    });

    if (!deal) {
      return sendError(res, 'Deal not found', 404);
    }

    const daysInCurrentStage = Math.max(
      Math.floor((Date.now() - new Date(deal.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
      1
    );

    const health = await AiGateway.evaluateDealHealth({
      amount: deal.amount,
      stageName: deal.stage.name,
      daysInCurrentStage,
      expectedCloseDate: deal.expectedCloseDate,
      activitiesCount: deal._count.activities,
    });

    // Update deal with computed health score
    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: {
        healthScore: health.healthScore,
        healthSummary: health.recommendations.join(' | '),
      },
    });

    // Save AI Insight record
    await prisma.aiInsight.create({
      data: {
        organizationId: req.organizationId!,
        entityType: 'DEAL',
        entityId: id,
        insightType: 'DEAL_HEALTH',
        title: `Deal Health: ${health.healthScore}/100 (${health.status})`,
        content: health.recommendations.join('\n'),
        confidence: health.confidence,
        metadata: {
          risks: health.risks,
          recommendations: health.recommendations,
          daysStalled: health.daysStalled,
        },
      },
    });

    return sendSuccess(res, { deal: updatedDeal, health });
  }

  static async exportCsv(req: Request, res: Response) {
    try {
      const deals = await prisma.deal.findMany({
        where: { organizationId: req.organizationId },
        include: {
          stage: true,
          pipeline: true,
          contact: { select: { firstName: true, lastName: true } },
          company: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const headers = [
        'ID',
        'Title',
        'Amount',
        'Currency',
        'Status',
        'Pipeline',
        'Stage',
        'Probability (%)',
        'Contact',
        'Company',
        'Expected Close Date',
        'Created At',
      ];

      const rows = deals.map((d) => [
        d.id,
        d.title,
        d.amount,
        d.currency,
        d.status,
        d.pipeline?.name || '',
        d.stage?.name || '',
        d.probability,
        d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : '',
        d.company?.name || '',
        d.expectedCloseDate ? d.expectedCloseDate.toISOString().slice(0, 10) : '',
        d.createdAt.toISOString(),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

      await AuditService.log({
        organizationId: req.organizationId!,
        userId: req.user?.id,
        action: 'EXPORT',
        entity: 'DEALS',
        details: { count: deals.length },
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="deals-export-${Date.now()}.csv"`
      );
      return res.status(200).send(csvContent);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to export deals', 500);
    }
  }

  /**
   * Lost-Deal Root Cause & Post-Mortem Analysis
   * GET /api/deals/win-loss-analysis
   */
  static async getWinLossAnalysis(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;

      const [lostDeals, wonDeals] = await Promise.all([
        prisma.deal.findMany({
          where: { organizationId: orgId, status: 'LOST' },
          select: {
            id: true,
            title: true,
            amount: true,
            currency: true,
            winLossCategory: true,
            winLossReason: true,
            actualCloseDate: true,
            updatedAt: true,
            owner: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.deal.findMany({
          where: { organizationId: orgId, status: 'WON' },
          select: { id: true, amount: true },
        }),
      ]);

      const totalLostCount = lostDeals.length;
      const totalLostAmount = lostDeals.reduce((sum, d) => sum + d.amount, 0);
      const totalWonCount = wonDeals.length;
      const totalWonAmount = wonDeals.reduce((sum, d) => sum + d.amount, 0);

      const categoryMap: Record<string, { count: number; totalAmount: number }> = {};
      for (const deal of lostDeals) {
        const cat = deal.winLossCategory || 'UNSPECIFIED';
        if (!categoryMap[cat]) {
          categoryMap[cat] = { count: 0, totalAmount: 0 };
        }
        categoryMap[cat].count += 1;
        categoryMap[cat].totalAmount += deal.amount;
      }

      const categories = Object.entries(categoryMap).map(([category, stats]) => ({
        category,
        count: stats.count,
        totalAmount: stats.totalAmount,
        percentage: totalLostCount > 0 ? Math.round((stats.count / totalLostCount) * 100) : 0,
      })).sort((a, b) => b.totalAmount - a.totalAmount);

      return sendSuccess(res, {
        summary: {
          totalLostCount,
          totalLostAmount,
          totalWonCount,
          totalWonAmount,
          winLossRatio: totalLostCount > 0 ? ((totalWonCount / (totalWonCount + totalLostCount)) * 100).toFixed(1) : '100',
        },
        categories,
        recentLostDeals: lostDeals.slice(0, 10),
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch win/loss analysis', 500);
    }
  }

  /**
   * Sales Targets & Quota Attainment
   * GET /api/deals/targets
   */
  static async listSalesTargets(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { period } = req.query;

      const where: any = { organizationId: orgId };
      if (period) {
        where.period = String(period);
      }

      const targets = await prisma.salesTarget.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
        orderBy: { period: 'desc' },
      });

      // Calculate real achieved revenue for each target
      const targetsWithAttainment = await Promise.all(
        targets.map(async (t) => {
          const dealWhere: any = {
            organizationId: orgId,
            status: 'WON',
            updatedAt: { gte: t.startDate, lte: t.endDate },
          };
          if (t.userId) {
            dealWhere.ownerId = t.userId;
          }

          const wonDeals = await prisma.deal.findMany({
            where: dealWhere,
            select: { amount: true },
          });

          const achievedAmount = wonDeals.reduce((sum, d) => sum + d.amount, 0);
          const attainmentRate = t.targetAmount > 0 ? Math.round((achievedAmount / t.targetAmount) * 100) : 0;
          const variance = achievedAmount - t.targetAmount;

          return {
            ...t,
            achievedAmount,
            attainmentRate,
            variance,
          };
        })
      );

      return sendSuccess(res, targetsWithAttainment);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to list sales targets', 500);
    }
  }

  /**
   * Set or Update a Sales Target
   * POST /api/deals/targets
   */
  static async setSalesTarget(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const { userId, period, targetAmount, currency = 'USD', startDate, endDate, notes } = req.body;

      if (!period || !targetAmount || !startDate || !endDate) {
        return sendError(res, 'period, targetAmount, startDate, and endDate are required', 400);
      }

      if (userId) {
        const user = await prisma.membership.findFirst({
          where: { organizationId: orgId, userId },
        });
        if (!user) {
          return sendError(res, 'Assigned user does not belong to current organization', 400);
        }
      }

      const target = await prisma.salesTarget.create({
        data: {
          organizationId: orgId,
          userId: userId || null,
          period,
          targetAmount: Number(targetAmount),
          currency,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          notes: notes || null,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      return sendSuccess(res, target, 'Sales target created successfully', undefined, 201);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to set sales target', 400);
    }
  }
}
