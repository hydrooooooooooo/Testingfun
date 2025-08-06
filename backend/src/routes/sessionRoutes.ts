import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { downloadSessionData } from '../controllers/sessionController';

const router = Router();

router.get('/:sessionId/download', downloadSessionData);

export { router as sessionRoutes };
