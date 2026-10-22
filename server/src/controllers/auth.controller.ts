import crypto from 'crypto';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { AuditService } from '../services/audit.service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export class AuthController {
  static async register(req: Request, res: Response) {
    const parsed = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email.toLowerCase() },
    });

    if (existingUser) {
      return sendError(res, 'An account with this email address already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);
    const orgSlug = parsed.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000);

    // Create User, Organization, and Membership in a single atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: parsed.email.toLowerCase(),
          passwordHash,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          globalRole: 'USER', // Platform Super Admin is never provisioned on registration; customer admin role is scoped to Membership
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: parsed.organizationName,
          slug: orgSlug,
          plan: 'FREE_TRIAL',
          status: 'ACTIVE',
          settings: { currency: 'INR', timezone: 'Asia/Kolkata' },
        },
      });

      const membership = await tx.membership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'ADMIN',
          title: 'Founder / Managing Director',
        },
      });

      // Seed Default Custom Roles for the new organization
      const salesRole = await tx.role.create({
        data: {
          organizationId: organization.id,
          name: 'Sales Executive',
          description: 'Outbound sales, leads and deals management',
          department: 'SALES',
          permissions: {
            create: [
              { module: 'LEADS', action: 'VIEW' },
              { module: 'LEADS', action: 'CREATE' },
              { module: 'LEADS', action: 'EDIT' },
              { module: 'DEALS', action: 'VIEW' },
              { module: 'DEALS', action: 'CREATE' },
              { module: 'DEALS', action: 'EDIT' },
              { module: 'CONTACTS', action: 'VIEW' },
              { module: 'CONTACTS', action: 'CREATE' },
              { module: 'TASKS', action: 'VIEW' },
              { module: 'TASKS', action: 'CREATE' },
            ],
          },
        },
      });

      await tx.role.create({
        data: {
          organizationId: organization.id,
          name: 'Customer Support',
          description: 'Ticket management, contacts and communications',
          department: 'SUPPORT',
          permissions: {
            create: [
              { module: 'CONTACTS', action: 'VIEW' },
              { module: 'COMPANIES', action: 'VIEW' },
              { module: 'TASKS', action: 'VIEW' },
              { module: 'TASKS', action: 'CREATE' },
              { module: 'COMMS', action: 'VIEW' },
              { module: 'COMMS', action: 'CREATE' },
            ],
          },
        },
      });

      await tx.role.create({
        data: {
          organizationId: organization.id,
          name: 'Team Leader',
          description: 'Team deals, lead assignment and task approvals',
          department: 'SALES',
          permissions: {
            create: [
              { module: 'LEADS', action: 'VIEW' },
              { module: 'LEADS', action: 'EDIT' },
              { module: 'LEADS', action: 'ASSIGN' },
              { module: 'DEALS', action: 'VIEW' },
              { module: 'DEALS', action: 'EDIT' },
              { module: 'DEALS', action: 'APPROVE' },
              { module: 'TASKS', action: 'VIEW' },
              { module: 'TASKS', action: 'APPROVE' },
            ],
          },
        },
      });

      // Create default Sales Pipeline and stages
      const pipeline = await tx.pipeline.create({
        data: {
          organizationId: organization.id,
          name: 'Standard Sales Pipeline',
          isDefault: true,
        },
      });

      const stages = [
        { name: 'New', order: 1, winProbability: 10, color: '#64748B' },
        { name: 'Qualified', order: 2, winProbability: 25, color: '#3B82F6' },
        { name: 'Discovery', order: 3, winProbability: 40, color: '#8B5CF6' },
        { name: 'Proposal', order: 4, winProbability: 60, color: '#EC4899' },
        { name: 'Negotiation', order: 5, winProbability: 80, color: '#F59E0B' },
        { name: 'Won', order: 6, winProbability: 100, color: '#10B981' },
        { name: 'Lost', order: 7, winProbability: 0, color: '#EF4444' },
      ];

      for (const stg of stages) {
        await tx.pipelineStage.create({
          data: {
            pipelineId: pipeline.id,
            name: stg.name,
            order: stg.order,
            winProbability: stg.winProbability,
            color: stg.color,
          },
        });
      }

      // Automatically Start 15-Day Free Trial (server-side timestamps)
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      const gracePeriodEndsAt = new Date(trialEndsAt.getTime() + 3 * 24 * 60 * 60 * 1000);

      const subscription = await tx.subscription.create({
        data: {
          organizationId: organization.id,
          plan: 'FREE_TRIAL',
          planSlug: 'FREE_TRIAL',
          billingInterval: 'MONTHLY',
          status: 'TRIALING',
          price: 0.0,
          currency: 'INR',
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
          trialStartsAt: now,
          trialEndsAt,
          gracePeriodEndsAt,
          seatCount: 5,
          leadLimit: 15000,
          aiTokenLimit: 500000,
        },
      });

      return { user, organization, membership, subscription };
    });

    const accessToken = generateAccessToken({
      userId: result.user.id,
      email: result.user.email,
      globalRole: result.user.globalRole,
      tokenVersion: result.user.tokenVersion,
    });

    const refreshToken = generateRefreshToken({
      userId: result.user.id,
      email: result.user.email,
      globalRole: result.user.globalRole,
      tokenVersion: result.user.tokenVersion,
    });

    await AuditService.log({
      organizationId: result.organization.id,
      userId: result.user.id,
      action: 'REGISTER_ORGANIZATION',
      entity: 'USER',
      entityId: result.user.id,
      details: { organizationName: parsed.organizationName, plan: 'FREE_TRIAL', trialDays: 15 },
    });

    return sendSuccess(
      res,
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          globalRole: result.user.globalRole,
        },
        organization: result.organization,
        membership: result.membership,
        subscription: result.subscription,
        trialDaysRemaining: 15,
        dashboardView: '/dashboard',
        token: accessToken,
        refreshToken,
      },
      'Organization registered with 15-Day Free Trial activated.',
      undefined,
      201
    );
  }

  static async login(req: Request, res: Response) {
    const parsed = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: parsed.email.toLowerCase() },
      include: {
        memberships: {
          include: {
            organization: {
              include: { subscription: true },
            },
            customRole: {
              include: { permissions: true },
            },
          },
        },
      },
    });

    if (!user) {
      return sendError(res, 'Invalid email or password credentials.', 401);
    }

    const isMatch = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password credentials.', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Your user account is deactivated. Contact your administrator.', 403);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const activeMembership = user.memberships[0];

    // Compute Trial Remaining Days & Expiry
    let trialDaysRemaining = 0;
    let isTrialExpired = false;
    let isGracePeriodActive = false;

    if (activeMembership?.organization?.subscription) {
      const sub = activeMembership.organization.subscription;
      if (sub.status === 'TRIALING' && sub.trialEndsAt) {
        const diffMs = sub.trialEndsAt.getTime() - Date.now();
        trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        isTrialExpired = Date.now() > sub.trialEndsAt.getTime();
        if (sub.gracePeriodEndsAt) {
          isGracePeriodActive = isTrialExpired && Date.now() <= sub.gracePeriodEndsAt.getTime();
        }
      }
    }

    // Role-Based Dashboard View Redirect logic
    let dashboardView = '/dashboard';
    if (user.globalRole === 'SUPER_ADMIN') {
      dashboardView = '/swordnex-master/dashboard';
    } else if (activeMembership?.role === 'ADMIN') {
      dashboardView = '/dashboard';
    } else if (activeMembership?.customRole) {
      const dept = activeMembership.customRole.department?.toUpperCase();
      const roleName = activeMembership.customRole.name.toLowerCase();
      if (dept === 'SALES' || roleName.includes('sales')) {
        dashboardView = '/dashboard?view=sales';
      } else if (dept === 'SUPPORT' || roleName.includes('support')) {
        dashboardView = '/dashboard?view=support';
      } else if (dept === 'HR' || roleName.includes('hr')) {
        dashboardView = '/dashboard?view=hr';
      } else if (dept === 'MANAGEMENT' || roleName.includes('leader') || roleName.includes('manager')) {
        dashboardView = '/dashboard?view=team';
      }
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      globalRole: user.globalRole,
      tokenVersion: user.tokenVersion,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      globalRole: user.globalRole,
      tokenVersion: user.tokenVersion,
    });

    if (activeMembership) {
      await AuditService.log({
        organizationId: activeMembership.organizationId,
        userId: user.id,
        action: 'LOGIN',
        entity: 'USER',
        entityId: user.id,
        ipAddress: req.ip,
      });
    }

    // Extract formatted permissions list
    const permissions = activeMembership?.customRole?.permissions.map(
      (p) => `${p.module}:${p.action}`
    ) || (activeMembership?.role === 'ADMIN' ? ['*:*'] : []);

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        globalRole: user.globalRole,
      },
      organization: activeMembership?.organization || null,
      membership: {
        id: activeMembership?.id,
        role: activeMembership?.role,
        title: activeMembership?.title,
        customRoleId: activeMembership?.customRoleId,
        customRoleName: activeMembership?.customRole?.name,
        department: activeMembership?.customRole?.department,
      },
      permissions,
      dashboardView,
      subscription: activeMembership?.organization?.subscription || null,
      trialStatus: {
        trialDaysRemaining,
        isTrialExpired,
        isGracePeriodActive,
      },
      token: accessToken,
      refreshToken,
    });
  }

  static async me(req: Request, res: Response) {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        globalRole: true,
        isActive: true,
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, {
      user,
      currentOrganizationId: req.organizationId,
      currentMembership: req.membership,
    });
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return sendError(res, 'Refresh token is required', 400);
      }

      let payload;
      try {
        payload = verifyRefreshToken(refreshToken);
      } catch (err: any) {
        return sendError(res, 'Invalid or expired refresh token', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.isActive) {
        return sendError(res, 'User account is deactivated or no longer exists', 401);
      }

      // Session revocation validation
      if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
        return sendError(res, 'Refresh token has been revoked or invalidated. Please sign in again.', 401);
      }

      const newAccessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        globalRole: user.globalRole,
        tokenVersion: user.tokenVersion,
      });

      const newRefreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
        globalRole: user.globalRole,
        tokenVersion: user.tokenVersion,
      });

      return sendSuccess(
        res,
        {
          token: newAccessToken,
          refreshToken: newRefreshToken,
        },
        'Token refreshed successfully'
      );
    } catch (error: any) {
      return sendError(res, error.message || 'Token refresh failed', 500);
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      if (req.user) {
        // Increment tokenVersion to revoke all active tokens immediately
        await prisma.user.update({
          where: { id: req.user.id },
          data: { tokenVersion: { increment: 1 } },
        });

        if (req.organizationId) {
          await AuditService.log({
            organizationId: req.organizationId,
            userId: req.user.id,
            action: 'LOGOUT',
            entity: 'USER',
            entityId: req.user.id,
            ipAddress: req.ip,
          });
        }
      }
      return sendSuccess(res, null, 'Logged out successfully. All sessions revoked.');
    } catch (error: any) {
      return sendError(res, error.message || 'Logout failed', 500);
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user || !user.isActive) {
        return sendSuccess(res, null, 'If this email address exists, a password reset link has been dispatched.');
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: hashedToken,
          passwordResetExpiresAt: expiresAt,
        },
      });

      return sendSuccess(
        res,
        process.env.NODE_ENV !== 'production' ? { resetToken: rawToken } : null,
        'If this email address exists, a password reset link has been dispatched.'
      );
    } catch (error: any) {
      return sendError(res, error.message || 'Password reset request failed', 400);
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpiresAt: { gt: new Date() },
          isActive: true,
        },
      });

      if (!user) {
        return sendError(res, 'Invalid or expired password reset token.', 400);
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
          tokenVersion: { increment: 1 },
        },
      });

      return sendSuccess(res, null, 'Password reset successfully. Please log in with your new password.');
    } catch (error: any) {
      return sendError(res, error.message || 'Password reset failed', 400);
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return sendError(res, 'Incorrect current password.', 400);
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      });

      return sendSuccess(res, null, 'Password updated successfully. All other sessions revoked.');
    } catch (error: any) {
      return sendError(res, error.message || 'Password change failed', 400);
    }
  }
}
