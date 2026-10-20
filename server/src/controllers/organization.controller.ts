import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { requireRoles } from '../middleware/rbac.middleware';
import { AuditService } from '../services/audit.service';
import { EntitlementService } from '../services/entitlement.service';

const createOrgSchema = z.object({
  name: z.string().min(2),
  domain: z.string().optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['ADMIN', 'USER']), // Strictly tenant membership roles; platform SUPER_ADMIN cannot be invited via tenant org
  title: z.string().optional(),
});

export class OrganizationController {
  static async listUserOrganizations(req: Request, res: Response) {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user!.id },
      include: {
        organization: {
          include: {
            subscription: true,
            _count: {
              select: {
                leads: true,
                deals: true,
                memberships: true,
              },
            },
          },
        },
      },
    });

    return sendSuccess(res, memberships);
  }

  static async getCurrentOrganization(req: Request, res: Response) {
    const organization = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      include: {
        subscription: true,
        _count: {
          select: {
            leads: true,
            deals: true,
            contacts: true,
            companies: true,
            tasks: true,
            memberships: true,
          },
        },
      },
    });

    if (!organization) {
      return sendError(res, 'Organization not found', 404);
    }

    return sendSuccess(res, {
      ...organization,
      currentRole: req.membership?.role,
    });
  }

  static async updateCurrentOrganization(req: Request, res: Response) {
    const { name, domain, settings } = req.body;

    const updated = await prisma.organization.update({
      where: { id: req.organizationId },
      data: {
        name: name || undefined,
        domain: domain !== undefined ? domain : undefined,
        settings: settings !== undefined ? settings : undefined,
      },
    });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'UPDATE_ORGANIZATION_SETTINGS',
      entity: 'ORGANIZATION',
      entityId: req.organizationId,
      details: { name, domain },
    });

    return sendSuccess(res, updated, 'Organization updated successfully');
  }

  static async listMembers(req: Request, res: Response) {
    const members = await prisma.membership.findMany({
      where: { organizationId: req.organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return sendSuccess(res, members);
  }

  static async inviteMember(req: Request, res: Response) {
    const parsed = inviteMemberSchema.parse(req.body);

    // Enforce tenant user seat quota check
    const seatCheck = await EntitlementService.checkSeatLimit(req.organizationId!);
    if (!seatCheck.allowed) {
      return res.status(402).json({
        success: false,
        code: seatCheck.code,
        error: seatCheck.message,
        upgradeRequired: true,
      });
    }

    let targetUser = await prisma.user.findUnique({
      where: { email: parsed.email.toLowerCase() },
    });

    if (!targetUser) {
      const defaultPassword = 'SwordNexUserTempPass123!';
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      targetUser = await prisma.user.create({
        data: {
          email: parsed.email.toLowerCase(),
          passwordHash,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          globalRole: 'USER', // Global role is always standard USER; platform SUPER_ADMIN is never provisioned here
        },
      });
    }

    // Check if membership already exists
    const existingMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: req.organizationId!,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership) {
      return sendError(res, 'This user is already a member of this workspace', 409);
    }

    const membership = await prisma.membership.create({
      data: {
        organizationId: req.organizationId!,
        userId: targetUser.id,
        role: parsed.role,
        title: parsed.title,
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    await AuditService.log({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'INVITE_MEMBER',
      entity: 'USER',
      entityId: targetUser.id,
      details: { role: parsed.role, title: parsed.title },
    });

    return sendSuccess(res, membership, 'Member invited and added to workspace successfully', undefined, 201);
  }
}
