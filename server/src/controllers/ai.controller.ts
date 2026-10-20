import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AiGateway } from '../services/ai/ai.gateway';
import { AuditService } from '../services/audit.service';
import { EntitlementService } from '../services/entitlement.service';

const copilotSchema = z.object({
  question: z.string().min(1, 'Question is required'),
});

const emailGenSchema = z.object({
  recipientName: z.string().min(1),
  recipientCompany: z.string().optional(),
  objective: z.enum(['COLD_OUTREACH', 'FOLLOW_UP', 'PROPOSAL_SUBMISSION', 'MEETING_REQUEST', 'CHECK_IN']),
  keyPoints: z.array(z.string()).optional(),
});

const meetingSummarySchema = z.object({
  transcript: z.string().min(10, 'Transcript is too short to summarize'),
});

const agentRunSchema = z.object({
  agentName: z.enum(['LEAD_RESEARCH', 'SALES_FOLLOWUP', 'CUSTOMER_ONBOARDING', 'RETENTION', 'REPORTING']),
  prompt: z.string().min(1),
});

export class AiController {
  static async askCopilot(req: Request, res: Response) {
    const { question } = copilotSchema.parse(req.body);

    // Enforce AI token quota consumption
    const tokenCheck = await EntitlementService.consumeAiTokens(req.organizationId!, 185);
    if (!tokenCheck.allowed) {
      return res.status(402).json({
        success: false,
        code: tokenCheck.code,
        error: tokenCheck.message,
        upgradeRequired: true,
      });
    }

    // Aggregate tenant summary context
    const [leadsCount, highPriorityLeadsCount, deals] = await Promise.all([
      prisma.lead.count({ where: { organizationId: req.organizationId } }),
      prisma.lead.count({ where: { organizationId: req.organizationId, priority: { in: ['HIGH', 'URGENT'] } } }),
      prisma.deal.findMany({
        where: { organizationId: req.organizationId, status: 'OPEN' },
        include: { stage: true },
      }),
    ]);

    const pipelineValue = deals.reduce((acc, d) => acc + d.amount, 0);
    const weightedForecast = deals.reduce((acc, d) => acc + (d.amount * d.probability) / 100, 0);

    const copilotReply = await AiGateway.askCopilot(question, {
      totalLeads: leadsCount,
      highPriorityLeadsCount,
      pipelineValue,
      weightedForecast,
    });

    return sendSuccess(res, copilotReply);
  }

  static async scoreLead(req: Request, res: Response) {
    const { title, company, email, phone, source } = req.body;

    const result = await AiGateway.scoreLead({ title, company, email, phone, source });
    return sendSuccess(res, result);
  }

  static async getNextBestAction(req: Request, res: Response) {
    const { type, title, stageOrStatus, lastActivityDaysAgo, amount } = req.body;

    const result = await AiGateway.getNextBestAction({
      type: type || 'LEAD',
      title: title || 'Target Account',
      stageOrStatus: stageOrStatus || 'NEW',
      lastActivityDaysAgo: Number(lastActivityDaysAgo || 0),
      amount: amount ? Number(amount) : undefined,
    });

    return sendSuccess(res, result);
  }

  static async generateSalesEmail(req: Request, res: Response) {
    const parsed = emailGenSchema.parse(req.body);
    const result = await AiGateway.generateSalesEmail(parsed);
    return sendSuccess(res, result);
  }

  static async summarizeMeeting(req: Request, res: Response) {
    const parsed = meetingSummarySchema.parse(req.body);
    const result = await AiGateway.summarizeMeetingTranscript(parsed.transcript);
    return sendSuccess(res, result);
  }

  static async evaluateDealHealth(req: Request, res: Response) {
    const { amount, stageName, daysInCurrentStage, activitiesCount } = req.body;

    const result = await AiGateway.evaluateDealHealth({
      amount: Number(amount || 0),
      stageName: stageName || 'Discovery',
      daysInCurrentStage: Number(daysInCurrentStage || 5),
      activitiesCount: Number(activitiesCount || 2),
    });

    return sendSuccess(res, result);
  }

  static async naturalLanguageSearch(req: Request, res: Response) {
    const { query } = req.body;

    if (!query) {
      return sendError(res, 'Query parameter is required', 400);
    }

    const parsedFilter = await AiGateway.parseNaturalLanguageQuery(query);

    let matchingRecords: any[] = [];

    if (parsedFilter.targetEntity === 'DEAL') {
      matchingRecords = await prisma.deal.findMany({
        where: {
          organizationId: req.organizationId!,
          ...parsedFilter.filters,
        },
        include: { stage: true, company: true, contact: true },
        take: 20,
      });
    } else {
      matchingRecords = await prisma.lead.findMany({
        where: {
          organizationId: req.organizationId!,
          ...parsedFilter.filters,
        },
        orderBy: { score: 'desc' },
        take: 20,
      });
    }

    return sendSuccess(res, {
      interpretation: parsedFilter,
      results: matchingRecords,
      count: matchingRecords.length,
    });
  }

  static async triggerAgentRun(req: Request, res: Response) {
    const parsed = agentRunSchema.parse(req.body);

    // Controlled Autonomous Agent: requires approval for sensitive actions
    const isSensitive = parsed.agentName === 'SALES_FOLLOWUP' || parsed.prompt.toLowerCase().includes('email');

    const agentRun = await prisma.aiAgentRun.create({
      data: {
        organizationId: req.organizationId!,
        agentName: parsed.agentName,
        status: isSensitive ? 'WAITING_APPROVAL' : 'COMPLETED',
        prompt: parsed.prompt,
        requiresApproval: isSensitive,
        isApproved: !isSensitive,
        tokensUsed: 420,
        costUsd: 0.0084,
        actionsPlanned: [
          { action: 'ENRICH_DOMAIN', details: 'Scanning verified corporate filings and technographics' },
          { action: 'COMPUTE_INTENT_SIGNALS', details: 'Aggregating CRM activity frequency' },
          { action: 'DRAFT_COMMUNICATION', details: 'Generating tailored stakeholder correspondence' },
        ],
        executionState: {
          status: isSensitive ? 'Awaiting Human Approval in Admin Queue' : 'Completed Execution Successfully',
          summary: `Autonomous agent ${parsed.agentName} processed prompt and compiled recommendations.`,
        },
        completedAt: isSensitive ? null : new Date(),
      },
    });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'TRIGGER_AI_AGENT',
      entity: 'AI_AGENT',
      entityId: agentRun.id,
      details: { agentName: parsed.agentName, requiresApproval: isSensitive },
    });

    return sendSuccess(res, agentRun, 'Agent run registered successfully', undefined, 201);
  }

  static async listAgentRuns(req: Request, res: Response) {
    const runs = await prisma.aiAgentRun.findMany({
      where: { organizationId: req.organizationId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return sendSuccess(res, runs);
  }

  static async approveAgentRun(req: Request, res: Response) {
    const { id } = req.params;

    const run = await prisma.aiAgentRun.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!run) {
      return sendError(res, 'Agent run record not found', 404);
    }

    const updated = await prisma.aiAgentRun.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        isApproved: true,
        approvedById: req.user!.id,
        completedAt: new Date(),
        executionState: {
          status: 'Approved by human supervisor and executed successfully',
        },
      },
    });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'APPROVE_AI_AGENT_ACTION',
      entity: 'AI_AGENT',
      entityId: id,
    });

    return sendSuccess(res, updated, 'Agent action approved and executed');
  }
}
