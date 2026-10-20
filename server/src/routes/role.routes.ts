import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { requireRoles } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

// Metadata can be fetched by any tenant member
router.get('/metadata', RoleController.getMetadata);
router.get('/', RoleController.getRoles);

// Privileged role management operations (requires ADMIN or SUPER_ADMIN)
router.post('/', requireRoles(['ADMIN', 'SUPER_ADMIN']), RoleController.createRole);
router.patch('/assign-member', requireRoles(['ADMIN', 'SUPER_ADMIN']), RoleController.assignMember);
router.patch('/:id', requireRoles(['ADMIN', 'SUPER_ADMIN']), RoleController.updateRole);
router.delete('/:id', requireRoles(['ADMIN', 'SUPER_ADMIN']), RoleController.deleteRole);
router.put('/:id/permissions', requireRoles(['ADMIN', 'SUPER_ADMIN']), RoleController.updatePermissions);
router.post('/:id/duplicate', requireRoles(['ADMIN', 'SUPER_ADMIN']), RoleController.duplicateRole);

export default router;
