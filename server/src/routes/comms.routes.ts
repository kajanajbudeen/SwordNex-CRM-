import { Router } from 'express';
import { CommsController } from '../controllers/comms.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/conversations', CommsController.listConversations);
router.post('/conversations', CommsController.createConversation);
router.get('/conversations/:id/messages', CommsController.getMessages);
router.post('/conversations/:id/messages', CommsController.sendMessage);

export default router;
