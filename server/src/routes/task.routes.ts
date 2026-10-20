import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', TaskController.list);
router.post('/', TaskController.create);
router.patch('/:id', TaskController.update);
router.delete('/:id', TaskController.delete);

export default router;
