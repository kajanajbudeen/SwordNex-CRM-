import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { sendSuccess, sendError } from '../utils/response';

export class SuperAdminController {
  /**
   * Super Admin Exclusive Authentication
   * Route: POST /api/swordnex-master/auth/login
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return sendError(res, 'Master admin email and password are required', 400);
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (!user) {
        return sendError(res, 'Invalid Master Administrator credentials', 401);
      }

      // Security requirement: Super Admin login page must NEVER authenticate non-super admins
      if (user.globalRole !== 'SUPER_ADMIN') {
        return sendError(
          res,
          'Unauthorized. This portal is strictly restricted to SwordNex Master Platform Administrators.',
          403
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return sendError(res, 'Invalid Master Administrator credentials', 401);
      }

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          globalRole: user.globalRole,
          isSuperAdmin: true,
        },
        config.jwt.secret,
        { expiresIn: '1d' }
      );

      // Audit log the master login
      await prisma.auditLog.create({
        data: {
          organizationId: (await prisma.organization.findFirst())?.id || 'master-platform',
          userId: user.id,
          action: 'LOGIN',
          entity: 'SETTINGS',
          details: { portal: 'SWORDNEX_MASTER_HEAD_OFFICE', email: user.email },
        },
      });

      return sendSuccess(
        res,
        {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            globalRole: user.globalRole,
          },
          token,
          portal: 'SWORDNEX_MASTER',
        },
        'Authenticated as SwordNex Master Platform Administrator'
      );
    } catch (err: any) {
      return sendError(res, err.message || 'Master login failed', 500);
    }
  }

  /**
   * Super Admin Platform Dashboard Metrics
   * Route: GET /api/swordnex-master/dashboard
   */
  static async getDashboard(req: Request, res: Response) {
    try {
      const [
        totalOrgs,
        totalUsers,
        activeSubs,
        trialSubs,
        expiredSubs,
        suspendedOrgs,
        allSubs,
        recentLogs,
      ] = await Promise.all([
        prisma.organization.count(),
        prisma.user.count(),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        prisma.subscription.count({ where: { status: 'TRIALING' } }),
        prisma.subscription.count({ where: { status: { in: ['EXPIRED', 'PAST_DUE', 'CANCELED'] } } }),
        prisma.organization.count({ where: { status: 'SUSPENDED' } }),
        prisma.subscription.findMany({
          where: { status: 'ACTIVE' },
          select: { price: true, billingInterval: true },
        }),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            organization: { select: { name: true, slug: true } },
          },
        }),
      ]);

      // Calculate MRR & ARR in INR
      let mrrInr = 0;
      for (const sub of allSubs) {
        if (sub.billingInterval === 'YEARLY') {
          mrrInr += sub.price / 12;
        } else {
          mrrInr += sub.price;
        }
      }
      const arrInr = mrrInr * 12;

      const totalPaidOrgs = activeSubs;
      const conversionRate = totalOrgs > 0 ? ((totalPaidOrgs / totalOrgs) * 100).toFixed(1) : '0';

      return sendSuccess(res, {
        metrics: {
          totalOrganizations: totalOrgs,
          totalUsers,
          activeSubscriptions: activeSubs,
          freeTrials: trialSubs,
          expiredSubscriptions: expiredSubs,
          suspendedOrganizations: suspendedOrgs,
          mrrInr: Math.round(mrrInr),
          arrInr: Math.round(arrInr),
          conversionRate: `${conversionRate}%`,
        },
        recentActivity: recentLogs,
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to load master dashboard', 500);
    }
  }

  /**
   * Super Admin Subscription Analytics Deep-Dive
   * Route: GET /api/swordnex-master/subscriptions/analytics
   */
  static async getSubscriptionAnalytics(req: Request, res: Response) {
    try {
      const [
        totalSubs,
        activePaid,
        activeTrials,
        expiredCount,
        canceledCount,
        allActiveSubs,
        failedPaymentsCount,
        successPaymentsCount,
        refundedPaymentsCount,
        plans,
      ] = await Promise.all([
        prisma.subscription.count(),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        prisma.subscription.count({ where: { status: 'TRIALING' } }),
        prisma.subscription.count({ where: { status: 'EXPIRED' } }),
        prisma.subscription.count({ where: { status: 'CANCELED' } }),
        prisma.subscription.findMany({
          where: { status: 'ACTIVE' },
          select: { price: true, billingInterval: true, planSlug: true },
        }),
        prisma.payment.count({ where: { status: 'FAILED' } }),
        prisma.payment.count({ where: { status: 'SUCCESS' } }),
        prisma.payment.count({ where: { status: 'REFUNDED' } }),
        prisma.subscriptionPlanConfig.findMany({ where: { isActive: true } }),
      ]);

      let mrr = 0;
      const planDistribution: Record<string, number> = { FREE_TRIAL: activeTrials };
      for (const p of plans) {
        if (p.slug !== 'FREE_TRIAL') {
          planDistribution[p.slug] = 0;
        }
      }

      for (const sub of allActiveSubs) {
        const monthlyValue = sub.billingInterval === 'YEARLY' ? sub.price / 12 : sub.price;
        mrr += monthlyValue;
        planDistribution[sub.planSlug] = (planDistribution[sub.planSlug] || 0) + 1;
      }

      const arr = mrr * 12;
      const totalPayments = successPaymentsCount + failedPaymentsCount;
      const renewalSuccessRate =
        totalPayments > 0 ? Math.round((successPaymentsCount / totalPayments) * 100) : 100;
      const failedPaymentRate =
        totalPayments > 0 ? Math.round((failedPaymentsCount / totalPayments) * 100) : 0;
      const trialToPaidConversion =
        totalSubs > 0 ? Math.round((activePaid / totalSubs) * 100) : 0;
      const arpu = activePaid > 0 ? Math.round(mrr / activePaid) : 0;

      return sendSuccess(res, {
        overview: {
          totalSubscriptions: totalSubs,
          activePaid,
          activeTrials,
          expiredCount,
          canceledCount,
          mrrInr: Math.round(mrr),
          arrInr: Math.round(arr),
          arpuInr: arpu,
          trialToPaidConversionRate: `${trialToPaidConversion}%`,
          renewalSuccessRate: `${renewalSuccessRate}%`,
          failedPaymentRate: `${failedPaymentRate}%`,
          refundedCount: refundedPaymentsCount,
        },
        planDistribution,
      });
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch subscription analytics', 500);
    }
  }

  /**
   * Super Admin Customer Subscriptions List with Search & Filtering
   * Route: GET /api/swordnex-master/subscriptions
   */
  static async getSubscriptions(req: Request, res: Response) {
    try {
      const { q, status, planSlug } = req.query;

      const where: any = {};
      if (status && status !== 'ALL') {
        where.status = status;
      }
      if (planSlug && planSlug !== 'ALL') {
        where.planSlug = planSlug;
      }
      if (q) {
        where.organization = {
          OR: [
            { name: { contains: String(q), mode: 'insensitive' } },
            { slug: { contains: String(q), mode: 'insensitive' } },
            { domain: { contains: String(q), mode: 'insensitive' } },
          ],
        };
      }

      const subscriptions = await prisma.subscription.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          organization: {
            include: {
              _count: {
                select: {
                  memberships: true,
                  leads: true,
                  deals: true,
                },
              },
            },
          },
          invoices: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      const now = new Date();
      const formatted = subscriptions.map((sub) => {
        let remainingTrialDays = 0;
        if (sub.status === 'TRIALING' && sub.trialEndsAt) {
          const diffMs = sub.trialEndsAt.getTime() - now.getTime();
          remainingTrialDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }

        return {
          id: sub.id,
          organizationId: sub.organizationId,
          organizationName: sub.organization.name,
          organizationSlug: sub.organization.slug,
          organizationDomain: sub.organization.domain,
          organizationStatus: sub.organization.status,
          plan: sub.plan,
          planSlug: sub.planSlug,
          billingInterval: sub.billingInterval,
          status: sub.status,
          price: sub.price,
          currency: sub.currency,
          seatCount: sub.seatCount,
          seatsUsed: sub.organization._count.memberships,
          leadLimit: sub.leadLimit,
          leadsUsed: sub.organization._count.leads,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          trialStartsAt: sub.trialStartsAt,
          trialEndsAt: sub.trialEndsAt,
          remainingTrialDays,
          cancelledAt: sub.cancelledAt,
          latestInvoiceNumber: sub.invoices[0]?.invoiceNumber || null,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        };
      });

      return sendSuccess(res, formatted);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch customer subscriptions', 500);
    }
  }

  /**
   * Super Admin Extend Trial or Subscription with Audit Reason
   * Route: POST /api/swordnex-master/subscriptions/:id/extend
   */
  static async extendSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { extraDays = 15, reason } = req.body;

      if (!reason || !reason.trim()) {
        return sendError(res, 'A mandatory reason is required for manual subscription extension.', 400);
      }

      const sub = await prisma.subscription.findUnique({
        where: { id },
        include: { organization: true },
      });

      if (!sub) {
        return sendError(res, 'Subscription record not found', 404);
      }

      const now = new Date();
      let newPeriodEnd: Date;
      let newTrialEnd: Date | null = null;
      let newGraceEnd: Date | null = null;

      if (sub.status === 'TRIALING') {
        const base = sub.trialEndsAt && sub.trialEndsAt > now ? sub.trialEndsAt : now;
        newTrialEnd = new Date(base.getTime() + Number(extraDays) * 24 * 60 * 60 * 1000);
        newGraceEnd = new Date(newTrialEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
        newPeriodEnd = newTrialEnd;
      } else {
        const base = sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
        newPeriodEnd = new Date(base.getTime() + Number(extraDays) * 24 * 60 * 60 * 1000);
      }

      const updated = await prisma.subscription.update({
        where: { id },
        data: {
          currentPeriodEnd: newPeriodEnd,
          ...(newTrialEnd && { trialEndsAt: newTrialEnd, gracePeriodEndsAt: newGraceEnd }),
          ...(sub.status === 'EXPIRED' && { status: sub.planSlug === 'FREE_TRIAL' ? 'TRIALING' : 'ACTIVE' }),
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          organizationId: sub.organizationId,
          userId: req.user?.id,
          action: 'UPDATE',
          entity: 'SETTINGS',
          details: {
            actionDescription: `Extended subscription by ${extraDays} days`,
            reason: reason.trim(),
            adminEmail: req.user?.email,
            newPeriodEnd: newPeriodEnd.toISOString(),
          },
        },
      });

      // In-app Notification to customer
      await prisma.notification.create({
        data: {
          organizationId: sub.organizationId,
          title: 'Subscription Extended',
          message: `Your subscription has been manually extended by ${extraDays} days by platform administration. Reason: ${reason.trim()}`,
          type: 'SYSTEM',
        },
      });

      return sendSuccess(res, updated, `Successfully extended subscription by ${extraDays} days.`);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to extend subscription', 500);
    }
  }

  /**
   * Super Admin Change Subscription Status with Mandatory Audit Reason
   * Route: PATCH /api/swordnex-master/subscriptions/:id/status
   */
  static async updateSubscriptionStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const validStatuses = ['ACTIVE', 'TRIALING', 'PAST_DUE', 'EXPIRED', 'CANCELED', 'SUSPENDED'];
      if (!validStatuses.includes(status)) {
        return sendError(res, `Invalid status. Allowed values: ${validStatuses.join(', ')}`, 400);
      }

      if (!reason || !reason.trim()) {
        return sendError(res, 'A mandatory reason is required for manual subscription status change.', 400);
      }

      const sub = await prisma.subscription.findUnique({
        where: { id },
      });

      if (!sub) {
        return sendError(res, 'Subscription record not found', 404);
      }

      const updated = await prisma.subscription.update({
        where: { id },
        data: { status },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: sub.organizationId,
          userId: req.user?.id,
          action: 'UPDATE',
          entity: 'SETTINGS',
          details: {
            actionDescription: `Subscription status manually changed from ${sub.status} to ${status}`,
            reason: reason.trim(),
            adminEmail: req.user?.email,
          },
        },
      });

      return sendSuccess(res, updated, `Subscription status updated to ${status}.`);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to update subscription status', 500);
    }
  }

  /**
   * Super Admin Organizations List
   * Route: GET /api/swordnex-master/organizations
   */
  static async getOrganizations(req: Request, res: Response) {
    try {
      const orgs = await prisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: true,
          _count: {
            select: {
              memberships: true,
              leads: true,
              deals: true,
            },
          },
        },
      });

      const now = new Date();
      const formatted = orgs.map((org) => {
        let remainingTrialDays = 0;
        if (org.subscription?.status === 'TRIALING' && org.subscription.trialEndsAt) {
          const diffMs = org.subscription.trialEndsAt.getTime() - now.getTime();
          remainingTrialDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          domain: org.domain,
          status: org.status,
          suspendedReason: org.suspendedReason,
          plan: org.plan,
          createdAt: org.createdAt,
          memberCount: org._count.memberships,
          leadCount: org._count.leads,
          dealCount: org._count.deals,
          subscription: org.subscription
            ? {
                planSlug: org.subscription.planSlug,
                status: org.subscription.status,
                billingInterval: org.subscription.billingInterval,
                price: org.subscription.price,
                currency: org.subscription.currency,
                currentPeriodEnd: org.subscription.currentPeriodEnd,
                trialEndsAt: org.subscription.trialEndsAt,
                remainingTrialDays,
              }
            : null,
        };
      });

      return sendSuccess(res, formatted);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch organizations', 500);
    }
  }

  /**
   * Suspend, Activate, or Deactivate an Organization
   * Route: PATCH /api/swordnex-master/organizations/:id/status
   */
  static async updateOrganizationStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
        return sendError(res, 'Invalid status. Allowed: ACTIVE, SUSPENDED, DEACTIVATED', 400);
      }

      const updated = await prisma.organization.update({
        where: { id },
        data: {
          status,
          suspendedReason: status === 'SUSPENDED' ? reason || 'Suspended by SwordNex Master Admin' : null,
          isActive: status === 'ACTIVE',
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          organizationId: id,
          userId: req.user?.id,
          action: 'UPDATE',
          entity: 'SETTINGS',
          details: {
            actionDescription: `Organization status changed to ${status}`,
            reason,
            changedBy: req.user?.email,
          },
        },
      });

      return sendSuccess(res, updated, `Organization has been updated to ${status}`);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to update organization status', 500);
    }
  }

  /**
   * Extend Free Trial Days for an Organization (Legacy route support)
   * Route: POST /api/swordnex-master/organizations/:id/extend-trial
   */
  static async extendTrial(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { extraDays = 15, reason = 'Extended by platform administration' } = req.body;

      const sub = await prisma.subscription.findUnique({
        where: { organizationId: id },
      });

      if (!sub) {
        return sendError(res, 'No subscription found for this organization', 404);
      }

      const baseDate = sub.trialEndsAt && sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
      const newTrialEnds = new Date(baseDate.getTime() + extraDays * 24 * 60 * 60 * 1000);
      const newGraceEnds = new Date(newTrialEnds.getTime() + 3 * 24 * 60 * 60 * 1000);

      const updated = await prisma.subscription.update({
        where: { organizationId: id },
        data: {
          status: 'TRIALING',
          trialEndsAt: newTrialEnds,
          gracePeriodEndsAt: newGraceEnds,
          currentPeriodEnd: newTrialEnds,
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          organizationId: id,
          userId: req.user?.id,
          action: 'UPDATE',
          entity: 'SETTINGS',
          details: {
            actionDescription: `Free trial extended by ${extraDays} days`,
            reason,
            extendedBy: req.user?.email,
            newTrialEndsAt: newTrialEnds.toISOString(),
          },
        },
      });

      return sendSuccess(res, updated, `Free trial successfully extended by ${extraDays} days.`);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to extend trial', 500);
    }
  }

  /**
   * Super Admin Platform-Wide Payments Ledger
   * Route: GET /api/swordnex-master/payments
   */
  static async getPayments(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const where: any = {};
      if (status && status !== 'ALL') {
        where.status = status;
      }

      const payments = await prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          invoice: { select: { invoiceNumber: true, status: true } },
        },
      });

      return sendSuccess(res, payments);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch platform payments', 500);
    }
  }

  /**
   * Super Admin Platform-Wide Invoices Ledger
   * Route: GET /api/swordnex-master/invoices
   */
  static async getInvoices(req: Request, res: Response) {
    try {
      const invoices = await prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          payments: { select: { paymentId: true, provider: true, status: true } },
        },
      });

      return sendSuccess(res, invoices);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch platform invoices', 500);
    }
  }

  /**
   * Dynamic Subscription Plan Configurations
   * Route: GET /api/swordnex-master/plans
   */
  static async getPlans(req: Request, res: Response) {
    try {
      const plans = await prisma.subscriptionPlanConfig.findMany({
        orderBy: { monthlyPrice: 'asc' },
      });
      return sendSuccess(res, plans);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch plans', 500);
    }
  }

  /**
   * Update Dynamic Subscription Plan Configuration
   * Route: PUT /api/swordnex-master/plans/:slug
   */
  static async updatePlan(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const {
        name,
        description,
        monthlyPrice,
        yearlyPrice,
        currency,
        maxUsers,
        maxCustomRoles,
        maxStorageMb,
        maxLeads,
        maxAiTokens,
        allowedModules,
        aiFeaturesEnabled,
        reportExportEnabled,
        apiAccessEnabled,
        supportLevel,
        trialDays,
        gracePeriodDays,
        isActive,
      } = req.body;

      const updated = await prisma.subscriptionPlanConfig.update({
        where: { slug },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(monthlyPrice !== undefined && { monthlyPrice: Number(monthlyPrice) }),
          ...(yearlyPrice !== undefined && { yearlyPrice: Number(yearlyPrice) }),
          ...(currency && { currency }),
          ...(maxUsers !== undefined && { maxUsers: Number(maxUsers) }),
          ...(maxCustomRoles !== undefined && { maxCustomRoles: Number(maxCustomRoles) }),
          ...(maxStorageMb !== undefined && { maxStorageMb: Number(maxStorageMb) }),
          ...(maxLeads !== undefined && { maxLeads: Number(maxLeads) }),
          ...(maxAiTokens !== undefined && { maxAiTokens: Number(maxAiTokens) }),
          ...(allowedModules && { allowedModules }),
          ...(aiFeaturesEnabled !== undefined && { aiFeaturesEnabled: Boolean(aiFeaturesEnabled) }),
          ...(reportExportEnabled !== undefined && { reportExportEnabled: Boolean(reportExportEnabled) }),
          ...(apiAccessEnabled !== undefined && { apiAccessEnabled: Boolean(apiAccessEnabled) }),
          ...(supportLevel && { supportLevel }),
          ...(trialDays !== undefined && { trialDays: Number(trialDays) }),
          ...(gracePeriodDays !== undefined && { gracePeriodDays: Number(gracePeriodDays) }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        },
      });

      return sendSuccess(res, updated, `Plan '${slug}' successfully updated.`);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to update plan configuration', 500);
    }
  }

  /**
   * Platform Security Audit Logs
   * Route: GET /api/swordnex-master/audit-logs
   */
  static async getAuditLogs(req: Request, res: Response) {
    try {
      const { action, entity } = req.query;
      const where: any = {};
      if (action) where.action = action;
      if (entity) where.entity = entity;

      const logs = await prisma.auditLog.findMany({
        where,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, globalRole: true } },
          organization: { select: { name: true, slug: true } },
        },
      });
      return sendSuccess(res, logs);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch audit logs', 500);
    }
  }
}
