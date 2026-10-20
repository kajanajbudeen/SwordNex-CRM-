import { prisma } from '../utils/prisma';

export interface CreateAuditLogParams {
  organizationId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export class AuditService {
  static async log(params: CreateAuditLogParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          details: params.details || {},
        },
      });
    } catch (error) {
      console.error('[AuditService.log] Failed to write audit record:', error);
      return null;
    }
  }
}
