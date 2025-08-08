import { Router } from 'express';
import { packController } from '../controllers/packController';

const router = Router();

router.get('/', packController.getAllPacks);

export { router as packRoutes };
