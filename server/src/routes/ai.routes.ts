import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, resolveTenant);

router.post('/copilot', AiController.askCopilot);
router.post('/lead-score', AiController.scoreLead);
router.post('/next-best-action', AiController.getNextBestAction);
router.post('/generate-email', AiController.generateSalesEmail);
router.post('/meeting-summary', AiController.summarizeMeeting);
router.post('/summarize-meeting', AiController.summarizeMeeting);
router.post('/deal-health', AiController.evaluateDealHealth);
router.post('/search', AiController.naturalLanguageSearch);
router.post('/agent-run', AiController.triggerAgentRun);
router.get('/agent-runs', AiController.listAgentRuns);
router.post('/agent-runs/:id/approve', AiController.approveAgentRun);

export default router;
