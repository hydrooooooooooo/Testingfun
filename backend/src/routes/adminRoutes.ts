import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { protect, restrictTo } from '../middlewares/authMiddleware';
import { adminOwnerOnly } from '../middlewares/adminOwnerMiddleware';
import { validate, adminSearchSchema, adminUserSearchSchema } from '../middlewares/validation';
import { adminLimiter, adminExportLimiter } from '../middlewares/rateLimiter';

const router = Router();

// all routes below require admin role + rate limiting
router.use(protect, restrictTo('admin'), adminOwnerOnly, adminLimiter);

router.get('/sessions', (req, res, next) => adminController.getAllSessions(req, res, next));
router.get('/sessions/active-count', (req, res, next) => adminController.getActiveSessionsCount(req, res, next));
router.get('/sessions/:sessionId', (req, res, next) => adminController.getSessionById(req, res, next));
router.get('/sessions/:sessionId/refund', (req, res, next) => adminController.refundSession(req, res, next));
router.delete('/sessions/:sessionId', (req, res, next) => adminController.archiveSession(req, res, next));
router.get('/stats', (req, res, next) => adminController.getDashboardStats(req, res, next));
router.get('/report', (req, res, next) => adminController.getFullReport(req, res, next));
router.get('/searches', validate(adminSearchSchema), (req, res, next) => adminController.getSearchEvents(req, res, next));
router.get('/searches/export', adminExportLimiter, validate(adminSearchSchema), (req, res, next) => adminController.exportSearchesCsv(req, res, next));
router.get('/metrics-advanced', (req, res, next) => adminController.getAdvancedMetrics(req, res, next));
router.get('/users', validate(adminUserSearchSchema), (req, res, next) => adminController.getUsers(req, res, next));
router.get('/users/:userId', (req, res, next) => adminController.getUserById(req, res, next));
router.patch('/users/:userId/credits', (req, res, next) => adminController.adjustUserCredits(req, res, next));
router.patch('/users/:userId/status', (req, res, next) => adminController.toggleUserStatus(req, res, next));

router.get('/ai-usage', (req, res, next) => adminController.getAIUsageSummary(req, res, next));

export default router;
