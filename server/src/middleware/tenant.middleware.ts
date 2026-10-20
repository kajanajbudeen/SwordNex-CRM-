import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { sendError } from '../utils/response';

export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return sendError(res, 'Authentication required before tenant resolution', 401);
    }

    const requestedOrgId = (req.headers['x-organization-id'] as string) || (req.query.organizationId as string);

    let membership;

    if (requestedOrgId) {
      membership = await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: requestedOrgId,
            userId: req.user.id,
          },
        },
        include: {
          organization: true,
        },
      });
    } else {
      // Pick first membership for user
      membership = await prisma.membership.findFirst({
        where: { userId: req.user.id },
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    // Super admin fallback if user has SUPER_ADMIN global role
    if (!membership && req.user.globalRole === 'SUPER_ADMIN' && requestedOrgId) {
      const org = await prisma.organization.findUnique({ where: { id: requestedOrgId } });
      if (org) {
        req.organizationId = org.id;
        req.membership = {
          id: 'super-admin-override',
          organizationId: org.id,
          role: 'ADMIN',
          title: 'Platform Super Administrator',
        };
        return next();
      }
    }

    if (!membership) {
      return sendError(res, 'No active organization found or unauthorized access to requested tenant', 403);
    }

    if (!membership.organization.isActive) {
      return sendError(res, 'This organization account is currently deactivated', 403);
    }

    req.organizationId = membership.organizationId;
    req.membership = {
      id: membership.id,
      organizationId: membership.organizationId,
      role: membership.role,
      title: membership.title,
    };

    next();
  } catch (error: any) {
    return sendError(res, error.message || 'Tenant resolution failed', 500);
  }
};
