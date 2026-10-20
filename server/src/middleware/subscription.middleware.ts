import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { sendError } from '../utils/response';

export const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Super Admins bypass subscription restrictions
    if (req.user?.globalRole === 'SUPER_ADMIN') {
      return next();
    }

    if (!req.organizationId) {
      return next();
    }

    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      include: { subscription: true },
    });

    if (!org) {
      return sendError(res, 'Organization not found', 404);
    }

    if (org.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        code: 'ORGANIZATION_SUSPENDED',
        error: org.suspendedReason || 'Organization has been suspended by platform administration.',
      });
    }

    if (org.status === 'DEACTIVATED' || !org.isActive) {
      return res.status(403).json({
        success: false,
        code: 'ORGANIZATION_DEACTIVATED',
        error: 'Organization account is deactivated. Please contact support.',
      });
    }

    const sub = org.subscription;
    if (!sub) {
      return next();
    }

    const now = new Date();

    // Check if Trialing and expired
    if (sub.status === 'TRIALING' && sub.trialEndsAt) {
      const isTrialExpired = now > sub.trialEndsAt;
      const isGraceExpired = sub.gracePeriodEndsAt ? now > sub.gracePeriodEndsAt : isTrialExpired;

      if (isTrialExpired) {
        // If in grace period, allow with warning header
        if (!isGraceExpired) {
          res.setHeader('X-Subscription-Warning', 'Free trial has ended. 3-day grace period active.');
        } else {
          // Grace period expired! Restrict write operations (POST, PUT, PATCH, DELETE)
          const isWriteOp = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
          if (isWriteOp && !req.path.includes('/subscriptions') && !req.path.includes('/billing')) {
            return res.status(402).json({
              success: false,
              code: 'TRIAL_EXPIRED',
              error: 'Your 15-day Free Trial has expired. Write operations are restricted. Upgrade to Standard or Premium to reactivate full access.',
              upgradeRequired: true,
              planSlug: sub.planSlug,
            });
          }
        }
      }
    }

    // Check if Paid Subscription is Expired or Past Due
    if (sub.status === 'EXPIRED' || sub.status === 'CANCELED') {
      const isWriteOp = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      if (isWriteOp && !req.path.includes('/subscriptions') && !req.path.includes('/billing')) {
        return res.status(402).json({
          success: false,
          code: 'SUBSCRIPTION_EXPIRED',
          error: 'Your subscription is expired or cancelled. Upgrade or renew your plan to restore full write operations.',
          upgradeRequired: true,
          planSlug: sub.planSlug,
        });
      }
    }

    next();
  } catch (err: any) {
    return sendError(res, err.message || 'Subscription validation failed', 500);
  }
};
