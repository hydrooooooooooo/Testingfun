import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { scrapeController } from '../controllers/scrapeController';

const router = Router();

// Protected trial scrape endpoint
router.post('/scrape', protect, (req, res, next) => scrapeController.startTrialScrape(req, res, next));

export default router;
