import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config/config';

/**
 * Middleware to authenticate requests using API key
 * Used for admin routes that require API key authentication
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    // Check if API key is provided
    if (!apiKey) {
      throw new ApiError(401, 'API key is required');
    }
    
    // Check if API key is valid
    if (apiKey !== config.api.adminApiKey) {
      logger.warn(`Invalid API key attempt: ${req.ip}`);
      throw new ApiError(401, 'Invalid API key');
    }
    
    // API key is valid, proceed to next middleware
    next();
  } catch (error) {
    next(error);
  }
};
