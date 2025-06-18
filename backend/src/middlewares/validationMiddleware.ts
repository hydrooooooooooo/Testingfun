import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from './errorHandler';

/**
 * Middleware to validate request data using express-validator
 * Throws an ApiError with 400 status code if validation fails
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, `Validation error: ${errors.array()[0].msg}`);
  }
  next();
};
