import { Request, Response, NextFunction } from 'express';
import db from '../database';
import { ApiError } from '../middlewares/errorHandler';

class PackController {
  async getAllPacks(req: Request, res: Response, next: NextFunction) {
    try {
      const packs = await db('packs').select('*');
      res.status(200).json(packs);
    } catch (error) {
      next(new ApiError(500, 'Failed to retrieve packs.'));
    }
  }
}

export const packController = new PackController();
