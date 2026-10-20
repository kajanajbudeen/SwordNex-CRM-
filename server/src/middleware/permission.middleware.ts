import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { sendError } from '../utils/response';

export const requirePermission = (module: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      // Super Admin has full platform access
      if (req.user.globalRole === 'SUPER_ADMIN') {
        return next();
      }

      // Org Admin has full tenant organization access
      if (req.membership?.role === 'ADMIN') {
        return next();
      }

      // For standard users / employees, check assigned custom role & permissions
      const membership = await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: req.organizationId!,
            userId: req.user.id,
          },
        },
        include: {
          customRole: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!membership || !membership.customRole) {
        return sendError(
          res,
          `Access denied. You do not have an assigned role for module [${module}].`,
          403
        );
      }

      const hasPermission = membership.customRole.permissions.some(
        (p) => p.module === module && (p.action === action || p.action === 'MANAGE')
      );

      if (!hasPermission) {
        return sendError(
          res,
          `Access denied. Your role '${membership.customRole.name}' lacks permission [${module}:${action}].`,
          403
        );
      }

      next();
    } catch (err: any) {
      return sendError(res, err.message || 'Permission check failed', 500);
    }
  };
};
