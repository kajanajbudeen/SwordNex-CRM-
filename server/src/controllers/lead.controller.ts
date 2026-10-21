import { Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AiGateway } from '../services/ai/ai.gateway';
import { WorkflowEngine } from '../services/automation/workflow.engine';
import { AuditService } from '../services/audit.service';
import { EntitlementService } from '../services/entitlement.service';

const leadSourceEnum = z.enum([
  'ADVERTISEMENT',
  'WEBSITE',
  'REFERRAL',
  'COLD_CALL',
  'TRADE_SHOW',
  'SOCIAL_MEDIA',
  'PARTNER',
  'EMAIL_CAMPAIGN',
  'CAMPAIGN',
  'LINKEDIN',
  'API',
  'EVENT',
  'OTHER',
]);

const leadStatusEnum = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'UNQUALIFIED',
  'CONVERTED',
]);

const leadPriorityEnum = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);

const leadRatingEnum = z.enum([
  'HOT',
  'WARM',
  'COLD',
]);

const createLeadSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  secondaryEmail: z.string().trim().email('Invalid secondary email address').optional().or(z.literal('')),
  phone: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  fax: z.string().trim().optional(),
  company: z.string().trim().optional(),
  title: z.string().trim().optional(),
  website: z.string().trim().optional(),
  skypeId: z.string().trim().optional(),
  twitterHandle: z.string().trim().optional(),
  avatarUrl: z.string().trim().optional().nullable(),
  status: leadStatusEnum.optional(),
  priority: leadPriorityEnum.optional(),
  source: leadSourceEnum.optional(),
  industry: z.string().trim().optional(),
  annualRevenue: z.coerce.number().min(0, 'Annual revenue must be non-negative').optional().nullable(),
  numberOfEmployees: z.coerce.number().int().min(0, 'Number of employees must be a non-negative integer').optional().nullable(),
  rating: leadRatingEnum.optional().nullable(),
  emailOptOut: z.boolean().optional().default(false),
  ownerId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),

  // Address Information
  country: z.string().trim().optional(),
  address: z.string().trim().optional(),
  street: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  latitude: z.coerce.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional().nullable(),
  longitude: z.coerce.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional().nullable(),

  // Description Information
  description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional(),
});

const updateLeadSchema = createLeadSchema.partial();

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
    try {
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

      // Server-side validation: Lead Owner must belong to the active organization
      if (parsed.ownerId) {
        const isMember = await prisma.membership.findFirst({
          where: {
            organizationId: req.organizationId!,
            userId: parsed.ownerId,
          },
        });
        if (!isMember) {
          return sendError(res, 'Assigned Lead Owner must be an authorized member of your organization', 400);
        }
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
          secondaryEmail: parsed.secondaryEmail || null,
          phone: parsed.phone || null,
          mobile: parsed.mobile || null,
          fax: parsed.fax || null,
          company: parsed.company || null,
          title: parsed.title || null,
          website: parsed.website || null,
          skypeId: parsed.skypeId || null,
          twitterHandle: parsed.twitterHandle || null,
          avatarUrl: parsed.avatarUrl || null,
          status: parsed.status || 'NEW',
          priority: parsed.priority || (aiScoring.score >= 80 ? 'HIGH' : 'MEDIUM'),
          source: parsed.source || 'WEBSITE',
          industry: parsed.industry || null,
          annualRevenue: parsed.annualRevenue !== undefined && parsed.annualRevenue !== null ? Number(parsed.annualRevenue) : null,
          numberOfEmployees: parsed.numberOfEmployees !== undefined && parsed.numberOfEmployees !== null ? Number(parsed.numberOfEmployees) : null,
          rating: parsed.rating || null,
          emailOptOut: parsed.emailOptOut ?? false,
          country: parsed.country || null,
          address: parsed.address || null,
          street: parsed.street || null,
          city: parsed.city || null,
          state: parsed.state || null,
          zipCode: parsed.zipCode || null,
          latitude: parsed.latitude !== undefined && parsed.latitude !== null ? Number(parsed.latitude) : null,
          longitude: parsed.longitude !== undefined && parsed.longitude !== null ? Number(parsed.longitude) : null,
          description: parsed.description || null,
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

      // Synchronize ConsentRecord if marketing email opt-out was requested
      if (lead.emailOptOut && lead.email) {
        await prisma.consentRecord.create({
          data: {
            organizationId: req.organizationId!,
            email: lead.email.toLowerCase(),
            phone: lead.phone || null,
            consentType: 'MARKETING_EMAIL',
            status: 'REVOKED',
            source: 'LEAD_CREATION_OPT_OUT',
            revokedAt: new Date(),
          },
        }).catch(console.error);
      }

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
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: err.errors[0]?.message || 'Validation failed',
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      return sendError(res, err.message || 'Failed to create lead', 500);
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existingLead = await prisma.lead.findFirst({
        where: { id, organizationId: req.organizationId },
      });

      if (!existingLead) {
        return sendError(res, 'Lead not found', 404);
      }

      const parsed = updateLeadSchema.parse(req.body);

      // Server-side validation: Lead Owner must belong to the active organization if modified
      if (parsed.ownerId) {
        const isMember = await prisma.membership.findFirst({
          where: {
            organizationId: req.organizationId!,
            userId: parsed.ownerId,
          },
        });
        if (!isMember) {
          return sendError(res, 'Assigned Lead Owner must be an authorized member of your organization', 400);
        }
      }

      // Sync ConsentRecord if email opt-out status changes
      if (parsed.emailOptOut !== undefined && parsed.emailOptOut !== existingLead.emailOptOut) {
        const targetEmail = (parsed.email || existingLead.email)?.toLowerCase();
        if (targetEmail) {
          await prisma.consentRecord.create({
            data: {
              organizationId: req.organizationId!,
              email: targetEmail,
              phone: parsed.phone || existingLead.phone || null,
              consentType: 'MARKETING_EMAIL',
              status: parsed.emailOptOut ? 'REVOKED' : 'GRANTED',
              source: 'LEAD_EDIT_OPT_OUT',
              revokedAt: parsed.emailOptOut ? new Date() : null,
              grantedAt: parsed.emailOptOut ? undefined : new Date(),
            },
          }).catch(console.error);
        }
      }

      const updated = await prisma.lead.update({
        where: { id },
        data: {
          ...parsed,
          annualRevenue: parsed.annualRevenue !== undefined ? (parsed.annualRevenue === null ? null : Number(parsed.annualRevenue)) : undefined,
          numberOfEmployees: parsed.numberOfEmployees !== undefined ? (parsed.numberOfEmployees === null ? null : Number(parsed.numberOfEmployees)) : undefined,
          latitude: parsed.latitude !== undefined ? (parsed.latitude === null ? null : Number(parsed.latitude)) : undefined,
          longitude: parsed.longitude !== undefined ? (parsed.longitude === null ? null : Number(parsed.longitude)) : undefined,
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

      await AuditService.log({
        organizationId: req.organizationId!,
        userId: req.user!.id,
        action: 'UPDATE_LEAD',
        entity: 'LEAD',
        entityId: id,
        details: { name: `${updated.firstName} ${updated.lastName}`, company: updated.company },
      });

      return sendSuccess(res, updated, 'Lead updated successfully');
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: err.errors[0]?.message || 'Validation failed',
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      return sendError(res, err.message || 'Failed to update lead', 500);
    }
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

  static async exportCsv(req: Request, res: Response) {
    try {
      const { status, priority, source } = req.query;
      const where: any = { organizationId: req.organizationId };

      if (status && status !== 'ALL') {
        where.status = status;
      }
      if (priority && priority !== 'ALL') {
        where.priority = priority;
      }
      if (source && source !== 'ALL') {
        where.source = source;
      }

      const leads = await prisma.lead.findMany({
        where,
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
        'Status',
        'Priority',
        'Source',
        'Score',
        'Created At',
      ];

      const rows = leads.map((l) => [
        l.id,
        l.firstName,
        l.lastName,
        l.email || '',
        l.phone || '',
        l.company || '',
        l.title || '',
        l.status,
        l.priority,
        l.source,
        l.score,
        l.createdAt.toISOString(),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

      await AuditService.log({
        organizationId: req.organizationId!,
        userId: req.user?.id,
        action: 'EXPORT',
        entity: 'LEADS',
        details: { count: leads.length, filter: { status, priority, source } },
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="leads-export-${Date.now()}.csv"`
      );
      return res.status(200).send(csvContent);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to export leads', 500);
    }
  }

  static readonly DEFAULT_LAYOUT = {
    sections: [
      {
        id: 'lead_info',
        title: 'Lead Information',
        visible: true,
        order: 1,
        fields: [
          { id: 'ownerId', label: 'Lead Owner', visible: true, required: false, order: 1, isSystemRequired: false },
          { id: 'firstName', label: 'First Name', visible: true, required: true, order: 2, isSystemRequired: true },
          { id: 'lastName', label: 'Last Name', visible: true, required: true, order: 3, isSystemRequired: true },
          { id: 'title', label: 'Title / Job Title', visible: true, required: false, order: 4, isSystemRequired: false },
          { id: 'company', label: 'Company', visible: true, required: false, order: 5, isSystemRequired: false },
          { id: 'email', label: 'Email', visible: true, required: false, order: 6, isSystemRequired: false },
          { id: 'secondaryEmail', label: 'Secondary Email', visible: true, required: false, order: 7, isSystemRequired: false },
          { id: 'phone', label: 'Phone', visible: true, required: false, order: 8, isSystemRequired: false },
          { id: 'mobile', label: 'Mobile', visible: true, required: false, order: 9, isSystemRequired: false },
          { id: 'fax', label: 'Fax', visible: true, required: false, order: 10, isSystemRequired: false },
          { id: 'website', label: 'Website', visible: true, required: false, order: 11, isSystemRequired: false },
          { id: 'skypeId', label: 'Skype ID', visible: true, required: false, order: 12, isSystemRequired: false },
          { id: 'twitterHandle', label: 'Twitter Handle', visible: true, required: false, order: 13, isSystemRequired: false },
          { id: 'source', label: 'Lead Source', visible: true, required: false, order: 14, isSystemRequired: false },
          { id: 'status', label: 'Lead Status', visible: true, required: false, order: 15, isSystemRequired: false },
          { id: 'industry', label: 'Industry', visible: true, required: false, order: 16, isSystemRequired: false },
          { id: 'annualRevenue', label: 'Annual Revenue (₹)', visible: true, required: false, order: 17, isSystemRequired: false },
          { id: 'numberOfEmployees', label: 'Number of Employees', visible: true, required: false, order: 18, isSystemRequired: false },
          { id: 'rating', label: 'Rating', visible: true, required: false, order: 19, isSystemRequired: false },
          { id: 'emailOptOut', label: 'Email Opt Out', visible: true, required: false, order: 20, isSystemRequired: false },
        ],
      },
      {
        id: 'address_info',
        title: 'Address Information',
        visible: true,
        order: 2,
        fields: [
          { id: 'address', label: 'Flat / House No. / Building / Apartment Name', visible: true, required: false, order: 1, isSystemRequired: false },
          { id: 'street', label: 'Street Address', visible: true, required: false, order: 2, isSystemRequired: false },
          { id: 'country', label: 'Country / Region', visible: true, required: false, order: 3, isSystemRequired: false },
          { id: 'state', label: 'State / Province', visible: true, required: false, order: 4, isSystemRequired: false },
          { id: 'city', label: 'City', visible: true, required: false, order: 5, isSystemRequired: false },
          { id: 'zipCode', label: 'ZIP / Postal Code', visible: true, required: false, order: 6, isSystemRequired: false },
          { id: 'latitude', label: 'Latitude', visible: true, required: false, order: 7, isSystemRequired: false },
          { id: 'longitude', label: 'Longitude', visible: true, required: false, order: 8, isSystemRequired: false },
        ],
      },
      {
        id: 'description_info',
        title: 'Description Information',
        visible: true,
        order: 3,
        fields: [
          { id: 'description', label: 'Description Notes & Conversation Details', visible: true, required: false, order: 1, isSystemRequired: false },
        ],
      },
    ],
  };

  static async uploadImage(req: Request, res: Response) {
    try {
      const { image, fileName } = req.body;
      if (!image || typeof image !== 'string') {
        return sendError(res, 'No image data provided', 400);
      }

      const matches = image.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
      if (!matches) {
        return sendError(res, 'Invalid image format. Supported formats: JPEG, PNG, WebP', 400);
      }

      const rawExt = matches[1].toLowerCase();
      const mimeExt = rawExt === 'jpeg' || rawExt === 'jpg' ? 'jpg' : rawExt;
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // Max 5MB file size
      const MAX_SIZE = 5 * 1024 * 1024;
      if (buffer.length > MAX_SIZE) {
        return sendError(res, 'Image file size exceeds the 5MB limit', 400);
      }

      // Verify file signature magic bytes
      const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      const isWebp = buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP';

      if (!isJpeg && !isPng && !isWebp) {
        return sendError(res, 'File verification failed: signature does not match JPEG, PNG, or WebP', 400);
      }

      const uploadDir = path.join(process.cwd(), 'uploads', 'leads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uniqueName = `lead-${uuidv4()}.${mimeExt}`;
      const filePath = path.join(uploadDir, uniqueName);
      fs.writeFileSync(filePath, buffer);

      const imageUrl = `/uploads/leads/${uniqueName}`;
      return sendSuccess(res, { url: imageUrl, size: buffer.length }, 'Image uploaded successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Image upload failed', 500);
    }
  }

  static async getLayoutConfig(req: Request, res: Response) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: req.organizationId },
        select: { settings: true },
      });

      const settings = (org?.settings as any) || {};
      const layout = settings.leadFormLayout || LeadController.DEFAULT_LAYOUT;
      return sendSuccess(res, layout);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to retrieve layout configuration', 500);
    }
  }

  static async updateLayoutConfig(req: Request, res: Response) {
    try {
      // Authorization check: User must be SUPER_ADMIN or Org ADMIN or have custom permission LEADS:MANAGE
      const isAdmin = req.user?.globalRole === 'SUPER_ADMIN' || req.membership?.role === 'ADMIN';
      if (!isAdmin) {
        const membership = await prisma.membership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: req.organizationId!,
              userId: req.user!.id,
            },
          },
          include: { customRole: { include: { permissions: true } } },
        });
        const canManage = membership?.customRole?.permissions.some(
          (p) => p.module === 'LEADS' && (p.action === 'MANAGE' || p.action === 'EDIT')
        );
        if (!canManage) {
          return sendError(res, 'Access denied. Administrator privileges required to edit page layouts.', 403);
        }
      }

      const { sections } = req.body;
      if (!sections || !Array.isArray(sections)) {
        return sendError(res, 'Invalid layout configuration structure', 400);
      }

      // Ensure system mandatory fields (firstName, lastName) remain required and visible
      for (const sec of sections) {
        if (sec.fields && Array.isArray(sec.fields)) {
          for (const f of sec.fields) {
            if (f.id === 'firstName' || f.id === 'lastName') {
              f.required = true;
              f.visible = true;
              f.isSystemRequired = true;
            }
          }
        }
      }

      const org = await prisma.organization.findUnique({
        where: { id: req.organizationId },
        select: { settings: true },
      });

      const existingSettings = (org?.settings as any) || {};
      const newSettings = {
        ...existingSettings,
        leadFormLayout: { sections },
      };

      await prisma.organization.update({
        where: { id: req.organizationId },
        data: { settings: newSettings },
      });

      await AuditService.log({
        organizationId: req.organizationId!,
        userId: req.user!.id,
        action: 'UPDATE',
        entity: 'SETTINGS',
        details: { type: 'LEAD_PAGE_LAYOUT', updatedSectionsCount: sections.length },
      });

      return sendSuccess(res, { sections }, 'Lead page layout updated and published successfully');
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to update layout configuration', 500);
    }
  }
}
