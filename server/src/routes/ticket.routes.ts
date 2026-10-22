import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/summary', TicketController.getSummary);
router.get('/', TicketController.list);
router.post('/', TicketController.create);
router.get('/:id', TicketController.getById);
router.patch('/:id', TicketController.update);
router.post('/:id/comments', TicketController.addComment);
router.post('/:id/ai-draft', TicketController.aiDraft);

export default router;
