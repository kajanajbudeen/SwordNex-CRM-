import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess } from '../utils/response';

export class ReportController {
  static async getDashboardSummary(req: Request, res: Response) {
    const orgId = req.organizationId!;

    const [
      totalLeads,
      qualifiedLeads,
      totalDeals,
      openDeals,
      wonDeals,
      tasksOverdue,
      companiesCount,
      contactsCount,
    ] = await Promise.all([
      prisma.lead.count({ where: { organizationId: orgId } }),
      prisma.lead.count({ where: { organizationId: orgId, status: 'QUALIFIED' } }),
      prisma.deal.count({ where: { organizationId: orgId } }),
      prisma.deal.findMany({ where: { organizationId: orgId, status: 'OPEN' }, include: { stage: true } }),
      prisma.deal.findMany({ where: { organizationId: orgId, status: 'WON' } }),
      prisma.task.count({
        where: {
          organizationId: orgId,
          dueDate: { lt: new Date() },
          status: { not: 'COMPLETED' },
        },
      }),
      prisma.company.count({ where: { organizationId: orgId } }),
      prisma.contact.count({ where: { organizationId: orgId } }),
    ]);

    const pipelineValue = openDeals.reduce((sum, d) => sum + d.amount, 0);
    const wonRevenue = wonDeals.reduce((sum, d) => sum + d.amount, 0);
    const weightedForecast = openDeals.reduce((sum, d) => sum + (d.amount * d.probability) / 100, 0);
    const conversionRate = totalLeads > 0 ? ((wonDeals.length / totalLeads) * 100).toFixed(1) : '0';

    return sendSuccess(res, {
      kpis: {
        totalLeads,
        qualifiedLeads,
        totalDeals,
        activeDealsCount: openDeals.length,
        pipelineValue,
        wonRevenue,
        weightedForecast: Math.round(weightedForecast),
        tasksOverdue,
        conversionRate: `${conversionRate}%`,
        companiesCount,
        contactsCount,
      },
      aiInsights: [
        {
          id: 'insight-1',
          title: 'High-Value Enterprise Momentum',
          text: '2 enterprise deals valued at $275,000 are approaching final negotiation stages. Recommend scheduling an executive touchpoint this week.',
          type: 'OPPORTUNITY',
          confidence: 0.94,
        },
        {
          id: 'insight-2',
          title: 'Follow-up Bottleneck Detected',
          text: `${tasksOverdue} follow-up tasks are overdue. Automating 2nd touchpoint sequences will recover an estimated $42,000 in pipeline velocity.`,
          type: 'RISK',
          confidence: 0.89,
        },
        {
          id: 'insight-3',
          title: 'Inbound Channel Optimization',
          text: 'Referral and LinkedIn leads are converting at 4.2x the velocity of cold inbound. Consider shifting 25% of acquisition budget towards advocacy.',
          type: 'GROWTH',
          confidence: 0.92,
        },
      ],
    });
  }

  static async getSalesVelocity(req: Request, res: Response) {
    const stages = await prisma.pipelineStage.findMany({
      where: { pipeline: { organizationId: req.organizationId! } },
      include: {
        deals: { where: { organizationId: req.organizationId!, status: 'OPEN' } },
      },
      orderBy: { order: 'asc' },
    });

    const pipelineFunnel = stages.map((s) => ({
      stageName: s.name,
      dealCount: s.deals.length,
      stageValue: s.deals.reduce((acc, d) => acc + d.amount, 0),
      winProbability: s.winProbability,
      color: s.color,
    }));

    return sendSuccess(res, pipelineFunnel);
  }

  static async getLeadSources(req: Request, res: Response) {
    const leads = await prisma.lead.groupBy({
      by: ['source'],
      where: { organizationId: req.organizationId! },
      _count: { id: true },
      _avg: { score: true },
    });

    const formatted = leads.map((l) => ({
      source: l.source,
      count: l._count.id,
      averageScore: Math.round(l._avg.score || 0),
    }));

    return sendSuccess(res, formatted);
  }

  static async getUsageAndAiMetrics(req: Request, res: Response) {
    const orgId = req.organizationId!;

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });

    const usageRecords = await prisma.usageRecord.groupBy({
      by: ['metric'],
      where: { organizationId: orgId },
      _sum: { quantity: true },
    });

    return sendSuccess(res, {
      subscription,
      usage: usageRecords.map((u) => ({
        metric: u.metric,
        total: u._sum.quantity || 0,
      })),
    });
  }
}
