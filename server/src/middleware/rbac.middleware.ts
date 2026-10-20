import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { sendError } from '../utils/response';

export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    // Platform Super Admin bypasses role restrictions
    if (req.user.globalRole === 'SUPER_ADMIN') {
      return next();
    }

    const currentRole = req.membership?.role;
    if (!currentRole || !allowedRoles.includes(currentRole)) {
      return sendError(
        res,
        `Access denied. Required role: [${allowedRoles.join(', ')}]. Your current role: ${currentRole || 'None'}`,
        403
      );
    }

    next();
  };
};
