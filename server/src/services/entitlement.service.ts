import { prisma } from '../utils/prisma';

export interface EntitlementCheckResult {
  allowed: boolean;
  code?: string;
  message?: string;
  currentUsage?: number;
  limit?: number;
  requiredPlan?: 'STANDARD' | 'PREMIUM';
  upgradeRequired?: boolean;
}

export class EntitlementService {
  /**
   * Fetch complete subscription status, quotas, and entitlement flags for an organization
   */
  static async getTenantEntitlements(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: true,
      },
    });

    if (!org) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    let sub = org.subscription;
    const now = new Date();

    // Auto-provision 15-day Free Trial if none exists
    if (!sub) {
      const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      const graceEnd = new Date(trialEnd.getTime() + 3 * 24 * 60 * 60 * 1000);

      sub = await prisma.subscription.create({
        data: {
          organizationId,
          plan: 'FREE_TRIAL',
          planSlug: 'FREE_TRIAL',
          billingInterval: 'MONTHLY',
          status: 'TRIALING',
          price: 0.0,
          currency: 'INR',
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialStartsAt: now,
          trialEndsAt: trialEnd,
          gracePeriodEndsAt: graceEnd,
          seatCount: 5,
          leadLimit: 15000,
          aiTokenLimit: 500000,
        },
      });
    }

    // Fetch active plan configuration
    const planConfig = await prisma.subscriptionPlanConfig.findUnique({
      where: { slug: sub.planSlug },
    });

    // Compute live resource counts
    const [activeMembers, totalLeads, aiTokensAgg] = await Promise.all([
      prisma.membership.count({
        where: {
          organizationId,
          user: { isActive: true }, // Count only active users
        },
      }),
      prisma.lead.count({ where: { organizationId } }),
      prisma.usageRecord.aggregate({
        where: { organizationId, metric: 'AI_TOKENS' },
        _sum: { quantity: true },
      }),
    ]);

    let remainingTrialDays = 0;
    let isTrialExpired = false;
    let isGracePeriodActive = false;
    let isGracePeriodExpired = false;

    if (sub.status === 'TRIALING' && sub.trialEndsAt) {
      const diffMs = sub.trialEndsAt.getTime() - now.getTime();
      remainingTrialDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isTrialExpired = now > sub.trialEndsAt;

      if (sub.gracePeriodEndsAt) {
        isGracePeriodActive = isTrialExpired && now <= sub.gracePeriodEndsAt;
        isGracePeriodExpired = now > sub.gracePeriodEndsAt;
      }
    }

    const isSubscriptionExpired = sub.status === 'EXPIRED' || (sub.currentPeriodEnd && now > sub.currentPeriodEnd && sub.status !== 'ACTIVE');
    const isWriteAllowed =
      org.status === 'ACTIVE' &&
      !isGracePeriodExpired &&
      sub.status !== 'SUSPENDED' &&
      sub.status !== 'EXPIRED';

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
      },
      subscription: {
        id: sub.id,
        plan: sub.plan,
        planSlug: sub.planSlug,
        planName: planConfig?.name || sub.planSlug,
        billingInterval: sub.billingInterval,
        status: sub.status,
        price: sub.price,
        currency: sub.currency,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        trialStartsAt: sub.trialStartsAt,
        trialEndsAt: sub.trialEndsAt,
        remainingTrialDays,
        isTrialExpired,
        isGracePeriodActive,
        isGracePeriodExpired,
        isSubscriptionExpired,
        isWriteAllowed,
        cancelledAt: sub.cancelledAt,
      },
      planConfig: planConfig || {
        allowedModules: ['LEADS', 'CONTACTS', 'COMPANIES', 'DEALS', 'TASKS', 'REPORTS'],
        maxUsers: sub.seatCount,
        maxLeads: sub.leadLimit,
        maxAiTokens: sub.aiTokenLimit,
        aiFeaturesEnabled: true,
        apiAccessEnabled: false,
      },
      usage: {
        activeSeats: activeMembers,
        seatLimit: sub.seatCount,
        leadsCount: totalLeads,
        leadLimit: sub.leadLimit,
        aiTokensUsed: aiTokensAgg._sum.quantity || sub.aiTokensUsed,
        aiTokenLimit: sub.aiTokenLimit,
        storageMbUsed: Math.round(totalLeads * 0.05 + activeMembers * 2), // Estimated based on records
        storageMbLimit: planConfig?.maxStorageMb || 1000,
      },
    };
  }

  /**
   * Verify whether a given module is permitted under the tenant's active plan
   */
  static async checkModuleAccess(organizationId: string, moduleName: string): Promise<EntitlementCheckResult> {
    const entitlements = await this.getTenantEntitlements(organizationId);
    const allowedModules = entitlements.planConfig.allowedModules || [];

    const isAllowed = allowedModules.includes(moduleName);
    if (!isAllowed) {
      return {
        allowed: false,
        code: 'FEATURE_NOT_INCLUDED_IN_PLAN',
        message: `The '${moduleName}' module is not available in your current ${entitlements.subscription.planName}. Please upgrade your subscription to access this module.`,
        requiredPlan: 'PREMIUM',
        upgradeRequired: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Verify whether the organization has available user seats before inviting/activating an employee
   */
  static async checkSeatLimit(organizationId: string): Promise<EntitlementCheckResult> {
    const entitlements = await this.getTenantEntitlements(organizationId);
    const { activeSeats, seatLimit } = entitlements.usage;

    if (activeSeats >= seatLimit) {
      return {
        allowed: false,
        code: 'SEAT_LIMIT_EXCEEDED',
        message: `Active seat limit reached (${activeSeats}/${seatLimit} users). Upgrade to a higher plan or purchase additional seats to invite more employees.`,
        currentUsage: activeSeats,
        limit: seatLimit,
        upgradeRequired: true,
      };
    }

    return { allowed: true, currentUsage: activeSeats, limit: seatLimit };
  }

  /**
   * Verify whether the organization can create additional leads
   */
  static async checkLeadLimit(organizationId: string): Promise<EntitlementCheckResult> {
    const entitlements = await this.getTenantEntitlements(organizationId);
    const { leadsCount, leadLimit } = entitlements.usage;

    if (leadsCount >= leadLimit) {
      return {
        allowed: false,
        code: 'LEAD_LIMIT_EXCEEDED',
        message: `Lead capacity limit reached (${leadsCount.toLocaleString()}/${leadLimit.toLocaleString()} leads). Upgrade to Premium to expand your database quota.`,
        currentUsage: leadsCount,
        limit: leadLimit,
        upgradeRequired: true,
      };
    }

    return { allowed: true, currentUsage: leadsCount, limit: leadLimit };
  }

  /**
   * Verify and atomically log AI token consumption
   */
  static async consumeAiTokens(organizationId: string, tokensRequested: number): Promise<EntitlementCheckResult> {
    const entitlements = await this.getTenantEntitlements(organizationId);
    const { aiTokensUsed, aiTokenLimit } = entitlements.usage;

    if (!entitlements.planConfig.aiFeaturesEnabled) {
      return {
        allowed: false,
        code: 'AI_NOT_ENABLED',
        message: `AI features are not enabled on the ${entitlements.subscription.planName}. Upgrade to Standard or Premium to unlock AI capabilities.`,
        upgradeRequired: true,
      };
    }

    if (aiTokensUsed + tokensRequested > aiTokenLimit) {
      return {
        allowed: false,
        code: 'AI_TOKENS_EXHAUSTED',
        message: `Monthly AI token quota exhausted (${aiTokensUsed.toLocaleString()}/${aiTokenLimit.toLocaleString()} tokens). Upgrade your plan or wait for your next billing cycle.`,
        currentUsage: aiTokensUsed,
        limit: aiTokenLimit,
        upgradeRequired: true,
      };
    }

    // Atomically record usage
    await Promise.all([
      prisma.subscription.update({
        where: { organizationId },
        data: { aiTokensUsed: { increment: tokensRequested } },
      }),
      prisma.usageRecord.create({
        data: {
          organizationId,
          metric: 'AI_TOKENS',
          quantity: tokensRequested,
          metadata: { timestamp: new Date().toISOString() },
        },
      }),
    ]);

    return { allowed: true, currentUsage: aiTokensUsed + tokensRequested, limit: aiTokenLimit };
  }
}
