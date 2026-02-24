import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { downloadSessionData } from '../controllers/sessionController';
import { facebookPagesController } from '../controllers/facebookPagesController';

const router = Router();

// Facebook Pages data endpoints
router.get('/facebook-pages/:sessionId/info', protect, facebookPagesController.getPageInfo.bind(facebookPagesController));
router.get('/facebook-pages/:sessionId/posts', protect, facebookPagesController.getPagePosts.bind(facebookPagesController));

// Facebook Pages AI analysis & benchmark endpoints
router.post('/facebook-pages/:sessionId/ai-analysis/page', protect, facebookPagesController.launchAiAnalysisForPage.bind(facebookPagesController));
router.post('/facebook-pages/:sessionId/ai-benchmark/page', protect, facebookPagesController.launchBenchmarkForPage.bind(facebookPagesController));

router.get('/:sessionId/download', protect, downloadSessionData);

export { router as sessionRoutes };
