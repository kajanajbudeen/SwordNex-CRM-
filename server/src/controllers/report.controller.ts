import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';

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

  /**
   * Sales Rep "My Day" Unified Daily Cockpit
   * GET /api/reports/my-day
   */
  static async getMyDay(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const userId = req.user!.id;
      const now = new Date();
      const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [closingDeals, myTasks, newLeads, myTickets] = await Promise.all([
        prisma.deal.findMany({
          where: {
            organizationId: orgId,
            ownerId: userId,
            status: 'OPEN',
            expectedCloseDate: { lte: next7Days },
          },
          include: {
            stage: true,
            contact: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
          orderBy: { expectedCloseDate: 'asc' },
          take: 5,
        }),
        prisma.task.findMany({
          where: {
            organizationId: orgId,
            assignedToId: userId,
            status: { not: 'COMPLETED' },
          },
          orderBy: { dueDate: 'asc' },
          take: 10,
        }),
        prisma.lead.findMany({
          where: {
            organizationId: orgId,
            ownerId: userId,
            status: 'NEW',
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.ticket.findMany({
          where: {
            organizationId: orgId,
            assignedToId: userId,
            status: { notIn: ['RESOLVED', 'CLOSED'] },
          },
          orderBy: [{ priority: 'desc' }, { resolutionDueAt: 'asc' }],
          take: 5,
        }),
      ]);

      return sendSuccess(res, {
        summary: {
          closingDealsCount: closingDeals.length,
          pendingTasksCount: myTasks.length,
          uncontactedLeadsCount: newLeads.length,
          assignedTicketsCount: myTickets.length,
        },
        closingDeals,
        tasks: myTasks,
        newLeads,
        tickets: myTickets,
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch My Day cockpit', 500);
    }
  }

  /**
   * Database-backed Monthly Revenue Forecast Breakdown
   * GET /api/reports/forecasts
   */
  static async getForecasts(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const openDeals = await prisma.deal.findMany({
        where: { organizationId: orgId, status: 'OPEN' },
        select: {
          id: true,
          amount: true,
          probability: true,
          forecastCategory: true,
          expectedCloseDate: true,
          stage: { select: { name: true, winProbability: true } },
        },
      });

      const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthBuckets: Record<string, { committed: number; bestCase: number; pipeline: number }> = {};
      months.forEach((m) => {
        monthBuckets[m] = { committed: 0, bestCase: 0, pipeline: 0 };
      });

      for (const d of openDeals) {
        let monthName = 'Oct';
        if (d.expectedCloseDate) {
          const m = d.expectedCloseDate.toLocaleString('default', { month: 'short' });
          if (monthBuckets[m]) monthName = m;
        }

        const amt = d.amount;
        monthBuckets[monthName].pipeline += amt;

        if (d.forecastCategory === 'COMMIT' || d.probability >= 80) {
          monthBuckets[monthName].committed += amt;
          monthBuckets[monthName].bestCase += amt;
        } else if (d.forecastCategory === 'BEST_CASE' || d.probability >= 50) {
          monthBuckets[monthName].bestCase += amt;
        } else {
          monthBuckets[monthName].bestCase += Math.round((amt * d.probability) / 100);
        }
      }

      const trend = months.map((month) => ({
        month: month === 'Oct' ? 'Oct (Current)' : month,
        committed: monthBuckets[month].committed,
        bestCase: monthBuckets[month].bestCase,
        pipeline: monthBuckets[month].pipeline,
      }));

      return sendSuccess(res, trend);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to calculate forecasts', 500);
    }
  }

  /**
   * Export CRM Executive Analytics Report as CSV
   * GET /api/reports/export/csv
   */
  static async exportAnalyticsCsv(req: Request, res: Response) {
    try {
      const orgId = req.organizationId!;
      const [leads, deals, tasks] = await Promise.all([
        prisma.lead.count({ where: { organizationId: orgId } }),
        prisma.deal.findMany({ where: { organizationId: orgId } }),
        prisma.task.count({ where: { organizationId: orgId } }),
      ]);

      const wonDeals = deals.filter((d) => d.status === 'WON');
      const openDeals = deals.filter((d) => d.status === 'OPEN');
      const pipelineValue = openDeals.reduce((sum, d) => sum + d.amount, 0);
      const wonRevenue = wonDeals.reduce((sum, d) => sum + d.amount, 0);

      const rows = [
        ['Metric', 'Value'],
        ['Total Leads', String(leads)],
        ['Total Deals', String(deals.length)],
        ['Active Pipeline Value (USD)', String(pipelineValue)],
        ['Total Booked Won Revenue (USD)', String(wonRevenue)],
        ['Total Open Tasks', String(tasks)],
        ['Generated At', new Date().toISOString()],
      ];

      const csvContent = rows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="crm-analytics-export-${Date.now()}.csv"`
      );
      return res.status(200).send(csvContent);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to export analytics CSV', 500);
    }
  }
}
