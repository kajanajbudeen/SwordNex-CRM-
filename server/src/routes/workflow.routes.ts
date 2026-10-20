import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', WorkflowController.list);
router.post('/', WorkflowController.create);
router.patch('/:id', WorkflowController.update);
router.delete('/:id', WorkflowController.delete);
router.get('/:id/runs', WorkflowController.listRuns);

export default router;
