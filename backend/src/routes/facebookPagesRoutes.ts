import { Router } from 'express';
import { facebookPagesController } from '../controllers/facebookPagesController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// POST /api/scrape/facebook-pages - Start scraping
router.post('/', protect, facebookPagesController.startScrape.bind(facebookPagesController));

// GET /api/scrape/facebook-pages/:sessionId/status - Poll status
router.get('/:sessionId/status', protect, facebookPagesController.getStatus.bind(facebookPagesController));

export { router as facebookPagesRoutes };
