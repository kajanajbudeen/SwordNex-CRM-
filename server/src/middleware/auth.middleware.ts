import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { sendError } from '../utils/response';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token missing or invalid format', 401);
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: any) {
      return sendError(res, 'Invalid or expired access token', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        globalRole: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!user || !user.isActive) {
      return sendError(res, 'User account is deactivated or no longer exists', 401);
    }

    // Session revocation validation
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      return sendError(res, 'Session has been revoked or invalidated. Please sign in again.', 401);
    }

    req.user = user;
    next();
  } catch (error: any) {
    return sendError(res, error.message || 'Authentication failed', 401);
  }
};
