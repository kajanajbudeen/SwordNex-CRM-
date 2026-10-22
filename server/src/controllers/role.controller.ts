import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const SYSTEM_MODULES = [
  'LEADS',
  'CONTACTS',
  'COMPANIES',
  'DEALS',
  'TASKS',
  'EMPLOYEES',
  'REPORTS',
  'SETTINGS',
  'BILLING',
  'WORKFLOWS',
  'AI_CENTER',
  'COMMS',
  'TICKETS',
  'PRODUCTS',
  'QUOTES',
  'INVOICES',
] as const;

export const SYSTEM_ACTIONS = [
  'VIEW',
  'CREATE',
  'EDIT',
  'DELETE',
  'APPROVE',
  'EXPORT',
  'ASSIGN',
  'MANAGE',
] as const;

export class RoleController {
  /**
   * Get all roles for the current organization
   * Route: GET /api/roles
   */
  static async getRoles(req: Request, res: Response) {
    try {
      const roles = await prisma.role.findMany({
        where: { organizationId: req.organizationId },
        orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
        include: {
          permissions: true,
          _count: {
            select: { memberships: true },
          },
        },
      });

      const formatted = roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        department: r.department,
        memberCount: r._count.memberships,
        permissions: r.permissions.map((p) => ({
          module: p.module,
          action: p.action,
        })),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));

      return sendSuccess(res, formatted);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch roles', 500);
    }
  }

  /**
   * Create a new custom role with permissions
   * Route: POST /api/roles
   */
  static async createRole(req: Request, res: Response) {
    try {
      const { name, description, department = 'GENERAL', permissions = [] } = req.body;

      if (!name || !name.trim()) {
        return sendError(res, 'Role name is required', 400);
      }

      // Check Plan Limit for Custom Roles
      const [currentRolesCount, sub] = await Promise.all([
        prisma.role.count({
          where: { organizationId: req.organizationId, isSystem: false },
        }),
        prisma.subscription.findUnique({
          where: { organizationId: req.organizationId },
        }),
      ]);

      const planConfig = await prisma.subscriptionPlanConfig.findUnique({
        where: { slug: sub?.planSlug || 'FREE_TRIAL' },
      });

      const maxAllowed = planConfig?.maxCustomRoles || 5;
      if (currentRolesCount >= maxAllowed) {
        return res.status(402).json({
          success: false,
          code: 'PLAN_LIMIT_REACHED',
          error: `Your current plan allows up to ${maxAllowed} custom roles. Upgrade your plan to create more custom roles.`,
          upgradeRequired: true,
        });
      }

      // Validate unique name in tenant
      const existing = await prisma.role.findFirst({
        where: { organizationId: req.organizationId, name: name.trim() },
      });

      if (existing) {
        return sendError(res, `A role named '${name}' already exists in your organization`, 409);
      }

      const newRole = await prisma.role.create({
        data: {
          organizationId: req.organizationId!,
          name: name.trim(),
          description,
          department,
          isSystem: false,
          permissions: {
            create: permissions.map((p: any) => ({
              module: p.module,
              action: p.action,
            })),
          },
        },
        include: { permissions: true },
      });

      return sendSuccess(res, newRole, `Role '${newRole.name}' created successfully`);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to create role', 500);
    }
  }

  /**
   * Update role metadata
   * Route: PATCH /api/roles/:id
   */
  static async updateRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, department } = req.body;

      const role = await prisma.role.findFirst({
        where: { id, organizationId: req.organizationId },
      });

      if (!role) {
        return sendError(res, 'Role not found', 404);
      }

      if (role.isSystem) {
        return sendError(res, 'System default roles cannot have their name modified', 400);
      }

      const updated = await prisma.role.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && { description }),
          ...(department && { department }),
        },
      });

      return sendSuccess(res, updated, `Role updated successfully`);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to update role', 500);
    }
  }

  /**
   * Delete a custom role
   * Route: DELETE /api/roles/:id
   */
  static async deleteRole(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const role = await prisma.role.findFirst({
        where: { id, organizationId: req.organizationId },
        include: { _count: { select: { memberships: true } } },
      });

      if (!role) {
        return sendError(res, 'Role not found', 404);
      }

      if (role.isSystem) {
        return sendError(res, 'System default roles cannot be deleted', 400);
      }

      if (role._count.memberships > 0) {
        return sendError(
          res,
          `Cannot delete role '${role.name}'. It is currently assigned to ${role._count.memberships} team member(s). Reassign them first.`,
          400
        );
      }

      await prisma.role.delete({ where: { id } });

      return sendSuccess(res, null, `Role '${role.name}' deleted successfully`);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to delete role', 500);
    }
  }

  /**
   * Update / Sync Permission Matrix for a Role
   * Route: PUT /api/roles/:id/permissions
   */
  static async updatePermissions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { permissions } = req.body; // Array of { module, action }

      if (!Array.isArray(permissions)) {
        return sendError(res, 'Permissions must be provided as an array', 400);
      }

      const role = await prisma.role.findFirst({
        where: { id, organizationId: req.organizationId },
      });

      if (!role) {
        return sendError(res, 'Role not found', 404);
      }

      // Delete existing permissions for role
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Filter and insert unique valid permissions
      const validPermissions: { module: string; action: string }[] = [];
      const seen = new Set<string>();

      for (const p of permissions) {
        const key = `${p.module}:${p.action}`;
        if (!seen.has(key)) {
          seen.add(key);
          validPermissions.push({ module: p.module, action: p.action });
        }
      }

      if (validPermissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: validPermissions.map((p) => ({
            roleId: id,
            module: p.module,
            action: p.action,
          })),
        });
      }

      const updatedPermissions = await prisma.rolePermission.findMany({
        where: { roleId: id },
      });

      return sendSuccess(
        res,
        updatedPermissions,
        `Permissions for role '${role.name}' updated successfully (${validPermissions.length} rules active).`
      );
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to update permissions', 500);
    }
  }

  /**
   * Duplicate an existing role
   * Route: POST /api/roles/:id/duplicate
   */
  static async duplicateRole(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const sourceRole = await prisma.role.findFirst({
        where: { id, organizationId: req.organizationId },
        include: { permissions: true },
      });

      if (!sourceRole) {
        return sendError(res, 'Source role not found', 404);
      }

      const duplicateName = `${sourceRole.name} (Copy)`;
      const newRole = await prisma.role.create({
        data: {
          organizationId: req.organizationId!,
          name: duplicateName,
          description: `Cloned from ${sourceRole.name}`,
          department: sourceRole.department,
          isSystem: false,
          permissions: {
            create: sourceRole.permissions.map((p) => ({
              module: p.module,
              action: p.action,
            })),
          },
        },
        include: { permissions: true },
      });

      return sendSuccess(res, newRole, `Role duplicated as '${duplicateName}'`);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to duplicate role', 500);
    }
  }

  /**
   * Assign a Custom Role to an Organization Member
   * Route: PATCH /api/roles/assign-member
   */
  static async assignMember(req: Request, res: Response) {
    try {
      const { userId, customRoleId } = req.body;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      // Check role belongs to tenant if provided
      if (customRoleId) {
        const role = await prisma.role.findFirst({
          where: { id: customRoleId, organizationId: req.organizationId },
        });
        if (!role) {
          return sendError(res, 'Role not found in your organization', 404);
        }
      }

      const membership = await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: req.organizationId!,
            userId,
          },
        },
      });

      if (!membership) {
        return sendError(res, 'Member not found in organization', 404);
      }

      const updated = await prisma.membership.update({
        where: { id: membership.id },
        data: { customRoleId: customRoleId || null },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          customRole: true,
        },
      });

      return sendSuccess(
        res,
        updated,
        `Assigned ${updated.user.firstName} ${updated.user.lastName} to ${updated.customRole?.name || 'Standard User'}`
      );
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to assign role', 500);
    }
  }

  /**
   * Return metadata of available modules and actions
   * Route: GET /api/roles/metadata
   */
  static async getMetadata(req: Request, res: Response) {
    return sendSuccess(res, {
      modules: SYSTEM_MODULES,
      actions: SYSTEM_ACTIONS,
      departments: ['SALES', 'SUPPORT', 'HR', 'MANAGEMENT', 'FINANCE', 'MARKETING', 'GENERAL'],
    });
  }
}
