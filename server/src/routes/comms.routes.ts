import { Router } from 'express';
import { CommsController } from '../controllers/comms.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { requireActiveSubscription } from '../middleware/subscription.middleware';

const router = Router();

// Public provider webhook callback (Twilio, WhatsApp, Sendgrid)
router.post('/webhook/:provider', CommsController.handleInboundWebhook);

router.use(authenticate, resolveTenant, requireActiveSubscription);

router.get('/conversations', CommsController.listConversations);
router.post('/conversations', CommsController.createConversation);
router.get('/conversations/:id/messages', CommsController.getMessages);
router.post('/conversations/:id/messages', CommsController.sendMessage);

export default router;
