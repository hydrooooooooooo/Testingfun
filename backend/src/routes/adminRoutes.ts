import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { protect, restrictTo } from '../middlewares/authMiddleware';
import { adminOwnerOnly } from '../middlewares/adminOwnerMiddleware';

const router = Router();

// all routes below require admin role
router.use(protect, restrictTo('admin'), adminOwnerOnly);

router.get('/sessions', (req, res, next) => adminController.getAllSessions(req, res, next));
router.get('/sessions/:sessionId', (req, res, next) => adminController.getSessionById(req, res, next));
router.get('/stats', (req, res, next) => adminController.getDashboardStats(req, res, next));
router.get('/report', (req, res, next) => adminController.getFullReport(req, res, next));
router.get('/searches', (req, res, next) => adminController.getSearchEvents(req, res, next));
router.get('/searches/export', (req, res, next) => adminController.exportSearchesCsv(req, res, next));
router.get('/metrics-advanced', (req, res, next) => adminController.getAdvancedMetrics(req, res, next));
router.get('/users', (req, res, next) => adminController.getUsers(req, res, next));

export default router;
