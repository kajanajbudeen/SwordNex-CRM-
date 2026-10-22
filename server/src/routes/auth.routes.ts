import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/forgot-password', passwordResetLimiter, AuthController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, AuthController.resetPassword);
router.post('/change-password', authenticate, AuthController.changePassword);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, resolveTenant, AuthController.me);

export default router;
