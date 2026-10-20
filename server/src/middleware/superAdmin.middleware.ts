import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  if (req.user.globalRole !== 'SUPER_ADMIN') {
    return sendError(
      res,
      'Access denied. SwordNex Master Platform Administrator authorization is required.',
      403
    );
  }

  next();
};
