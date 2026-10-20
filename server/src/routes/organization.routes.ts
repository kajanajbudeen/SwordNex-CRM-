import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { requireRoles } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/my-workspaces', OrganizationController.listUserOrganizations);
router.get('/current', resolveTenant, OrganizationController.getCurrentOrganization);
router.patch('/current', resolveTenant, requireRoles(['ADMIN']), OrganizationController.updateCurrentOrganization);
router.get('/members', resolveTenant, OrganizationController.listMembers);
router.post('/members/invite', resolveTenant, requireRoles(['ADMIN']), OrganizationController.inviteMember);

export default router;
