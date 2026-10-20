import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', CampaignController.list);
router.post('/', CampaignController.create);
router.patch('/:id', CampaignController.update);
router.delete('/:id', CampaignController.delete);

export default router;
