import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { requireRoles } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/subscription', BillingController.getSubscription);
router.post('/plan', requireRoles(['ADMIN']), BillingController.changePlan);

export default router;
