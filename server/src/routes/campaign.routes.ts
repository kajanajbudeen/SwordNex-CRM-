import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { requireActiveSubscription } from '../middleware/subscription.middleware';

const router = Router();

// Public unsubscribe endpoint (one-click email/SMS footer compliance)
router.post('/unsubscribe', CampaignController.unsubscribe);

router.use(authenticate, resolveTenant, requireActiveSubscription);

router.get('/', CampaignController.list);
router.post('/', CampaignController.create);
router.post('/:id/send', CampaignController.dispatch);
router.patch('/:id', CampaignController.update);
router.delete('/:id', CampaignController.delete);

export default router;
