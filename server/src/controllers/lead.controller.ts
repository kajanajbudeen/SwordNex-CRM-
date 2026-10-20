import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AiGateway } from '../services/ai/ai.gateway';
import { WorkflowEngine } from '../services/automation/workflow.engine';
import { AuditService } from '../services/audit.service';
import { EntitlementService } from '../services/entitlement.service';

const createLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  source: z.enum(['WEBSITE', 'REFERRAL', 'LINKEDIN', 'COLD_CALL', 'CAMPAIGN', 'API', 'EVENT', 'OTHER']).optional(),
  ownerId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

const convertLeadSchema = z.object({
  createDeal: z.boolean().default(true),
  dealTitle: z.string().optional(),
  dealAmount: z.number().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  expectedCloseDate: z.string().optional(),
});

export class LeadController {
  static async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const { status, priority, source, search, ownerId } = req.query;

    const where: any = {
      organizationId: req.organizationId,
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    if (source && source !== 'ALL') {
      where.source = source;
    }

    if (ownerId && ownerId !== 'ALL') {
      where.ownerId = ownerId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { company: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { activities: true, tasks: true },
          },
        },
        orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return sendSuccess(res, leads, 'Leads fetched successfully', {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        organizationId: req.organizationId,
      },
      include: {
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
        conversations: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!lead) {
      return sendError(res, 'Lead not found or access denied', 404);
    }

    return sendSuccess(res, lead);
  }

  static async create(req: Request, res: Response) {
    const parsed = createLeadSchema.parse(req.body);

    // Enforce tenant lead database quota limit
    const leadQuotaCheck = await EntitlementService.checkLeadLimit(req.organizationId!);
    if (!leadQuotaCheck.allowed) {
      return res.status(402).json({
        success: false,
        code: leadQuotaCheck.code,
        error: leadQuotaCheck.message,
        upgradeRequired: true,
      });
    }

    // Compute AI lead score on ingestion
    const aiScoring = await AiGateway.scoreLead({
      title: parsed.title,
      company: parsed.company,
      email: parsed.email,
      phone: parsed.phone,
      source: parsed.source,
    });

    const lead = await prisma.lead.create({
      data: {
        organizationId: req.organizationId!,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email || null,
        phone: parsed.phone || null,
        company: parsed.company || null,
        title: parsed.title || null,
        status: parsed.status || 'NEW',
        priority: parsed.priority || (aiScoring.score >= 80 ? 'HIGH' : 'MEDIUM'),
        source: parsed.source || 'WEBSITE',
        score: aiScoring.score,
        scoreExplanation: aiScoring.summary,
        scoreConfidence: aiScoring.confidence,
        ownerId: parsed.ownerId || req.user!.id,
        tags: parsed.tags || [],
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Record Activity
    await prisma.activity.create({
      data: {
        organizationId: req.organizationId!,
        leadId: lead.id,
        createdById: req.user!.id,
        type: 'STATUS_CHANGE',
        title: 'Lead Created',
        description: `Lead registered into CRM with initial AI score of ${aiScoring.score}/100.`,
      },
    });

    // Fire Automation Engine event asynchronously
    WorkflowEngine.triggerEvent({
      organizationId: req.organizationId!,
      triggerType: 'LEAD_CREATED',
      entityType: 'LEAD',
      entityId: lead.id,
      data: lead,
    }).catch(console.error);

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'CREATE_LEAD',
      entity: 'LEAD',
      entityId: lead.id,
      details: { name: `${lead.firstName} ${lead.lastName}`, company: lead.company, score: lead.score },
    });

    return sendSuccess(res, lead, 'Lead created successfully with AI intelligence scoring', undefined, 201);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;

    const existingLead = await prisma.lead.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existingLead) {
      return sendError(res, 'Lead not found', 404);
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...req.body,
        updatedAt: new Date(),
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Record activity note
    await prisma.activity.create({
      data: {
        organizationId: req.organizationId!,
        leadId: id,
        createdById: req.user!.id,
        type: 'NOTE',
        title: 'Lead Updated',
        description: `Lead profile attributes modified by ${req.user!.firstName} ${req.user!.lastName}.`,
      },
    });

    // Fire Automation Engine event
    WorkflowEngine.triggerEvent({
      organizationId: req.organizationId!,
      triggerType: 'LEAD_UPDATED',
      entityType: 'LEAD',
      entityId: id,
      data: updated,
    }).catch(console.error);

    return sendSuccess(res, updated, 'Lead updated successfully');
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    const existingLead = await prisma.lead.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!existingLead) {
      return sendError(res, 'Lead not found', 404);
    }

    await prisma.lead.delete({
      where: { id },
    });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'DELETE_LEAD',
      entity: 'LEAD',
      entityId: id,
      details: { name: `${existingLead.firstName} ${existingLead.lastName}` },
    });

    return sendSuccess(res, null, 'Lead deleted successfully');
  }

  static async rescore(req: Request, res: Response) {
    const { id } = req.params;

    const lead = await prisma.lead.findFirst({
      where: { id, organizationId: req.organizationId },
      include: { _count: { select: { activities: true } } },
    });

    if (!lead) {
      return sendError(res, 'Lead not found', 404);
    }

    const scoring = await AiGateway.scoreLead({
      title: lead.title,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      activitiesCount: lead._count.activities,
    });

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        score: scoring.score,
        scoreExplanation: scoring.summary,
        scoreConfidence: scoring.confidence,
      },
    });

    // Store AI insight
    await prisma.aiInsight.create({
      data: {
        organizationId: req.organizationId!,
        entityType: 'LEAD',
        entityId: id,
        insightType: 'SCORING',
        title: `AI Score Evaluation: ${scoring.score}/100`,
        content: scoring.summary,
        confidence: scoring.confidence,
        metadata: { factors: scoring.factors },
      },
    });

    return sendSuccess(res, { lead: updated, factors: scoring.factors });
  }

  static async convert(req: Request, res: Response) {
    const { id } = req.params;
    const body = convertLeadSchema.parse(req.body);

    const lead = await prisma.lead.findFirst({
      where: { id, organizationId: req.organizationId },
    });

    if (!lead) {
      return sendError(res, 'Lead not found', 404);
    }

    if (lead.status === 'CONVERTED') {
      return sendError(res, 'This lead has already been converted', 400);
    }

    const conversionResult = await prisma.$transaction(async (tx) => {
      // 1. Find or create Company
      let companyId: string | null = null;
      if (lead.company) {
        let comp = await tx.company.findFirst({
          where: {
            organizationId: req.organizationId!,
            name: { equals: lead.company, mode: 'insensitive' },
          },
        });

        if (!comp) {
          comp = await tx.company.create({
            data: {
              organizationId: req.organizationId!,
              name: lead.company,
              phone: lead.phone,
            },
          });
        }
        companyId = comp.id;
      }

      // 2. Create Contact
      const contact = await tx.contact.create({
        data: {
          organizationId: req.organizationId!,
          companyId,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          title: lead.title,
          ownerId: lead.ownerId,
        },
      });

      // 3. Create Deal if requested
      let deal: any = null;
      if (body.createDeal) {
        let pipelineId = body.pipelineId;
        let stageId = body.stageId;

        if (!pipelineId) {
          const defaultPipe = await tx.pipeline.findFirst({
            where: { organizationId: req.organizationId!, isDefault: true },
            include: { stages: { orderBy: { order: 'asc' } } },
          });

          if (defaultPipe) {
            pipelineId = defaultPipe.id;
            stageId = stageId || defaultPipe.stages[0]?.id;
          }
        }

        if (pipelineId && stageId) {
          deal = await tx.deal.create({
            data: {
              organizationId: req.organizationId!,
              pipelineId,
              stageId,
              title: body.dealTitle || `${lead.company || lead.firstName} — Initial Opportunity`,
              amount: body.dealAmount || 15000,
              currency: 'USD',
              contactId: contact.id,
              companyId,
              ownerId: lead.ownerId || req.user!.id,
              expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }
      }

      // 4. Mark Lead as CONVERTED
      const updatedLead = await tx.lead.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          convertedAt: new Date(),
          convertedToContactId: contact.id,
          convertedToCompanyId: companyId,
          convertedToDealId: deal ? deal.id : null,
        },
      });

      // 5. Transfer Lead activities to Contact & Deal
      await tx.activity.create({
        data: {
          organizationId: req.organizationId!,
          leadId: id,
          contactId: contact.id,
          dealId: deal ? deal.id : null,
          createdById: req.user!.id,
          type: 'STATUS_CHANGE',
          title: 'Lead Converted to Account',
          description: `Lead converted to Contact (${contact.firstName} ${contact.lastName})${deal ? ` and Deal (${deal.title})` : ''}.`,
        },
      });

      return { lead: updatedLead, contact, companyId, deal };
    });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'CONVERT_LEAD',
      entity: 'LEAD',
      entityId: id,
      details: { contactId: conversionResult.contact.id, dealId: conversionResult.deal?.id },
    });

    return sendSuccess(res, conversionResult, 'Lead converted into Contact, Company, and Deal successfully');
  }
}
