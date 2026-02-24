import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { downloadSessionData } from '../controllers/sessionController';

const router = Router();

router.get('/:sessionId/download', protect, downloadSessionData);

export { router as sessionRoutes };
