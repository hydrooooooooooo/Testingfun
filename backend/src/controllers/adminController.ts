import { Request, Response, NextFunction } from 'express';
import { sessionService, SessionStatus } from '../services/sessionService';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export class AdminController {
  /**
   * Get all sessions (for admin purposes)
   */
  async getAllSessions(req: Request, res: Response, next: NextFunction) {
    try {
      // Simple API key check for admin access
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey || apiKey !== config.api.adminApiKey) {
        throw new ApiError(401, 'Unauthorized');
      }
      
      // Get all sessions
      const sessions = sessionService.getAllSessions();
      
      // Map sessions to a more readable format
      const formattedSessions = sessions.map(session => ({
        id: session.id,
        url: session.url,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt || session.createdAt, // Fallback to createdAt if updatedAt doesn't exist
        isPaid: session.isPaid,
        packId: session.packId,
        datasetId: session.datasetId,
        stats: session.data || {}
      }));
      
      res.status(200).json({
        status: 'success',
        data: {
          sessions: formattedSessions
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get session details by ID (for admin purposes)
   */
  async getSessionById(req: Request, res: Response, next: NextFunction) {
    try {
      // Simple API key check for admin access
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey || apiKey !== config.api.adminApiKey) {
        throw new ApiError(401, 'Unauthorized');
      }
      
      const { sessionId } = req.params;
      
      // Get session from service
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new ApiError(404, `Session with ID ${sessionId} not found`);
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          session
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard statistics (for admin purposes)
   */
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      // Simple API key check for admin access
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey || apiKey !== config.api.adminApiKey) {
        throw new ApiError(401, 'Unauthorized');
      }
      
      // Get all sessions
      const sessions = sessionService.getAllSessions();
      
      // Calculate statistics
      const totalSessions = sessions.length;
      const paidSessions = sessions.filter((s) => s.isPaid).length;
      const completedSessions = sessions.filter((s) => s.status === SessionStatus.FINISHED).length;
      const failedSessions = sessions.filter((s) => s.status === SessionStatus.FAILED).length;
      
      // Group by pack ID
      const packStats: Record<string, number> = {};
      sessions.forEach((session) => {
        if (session.packId && session.isPaid) {
          packStats[session.packId] = (packStats[session.packId] || 0) + 1;
        }
      });
      
      res.status(200).json({
        status: 'success',
        data: {
          totalSessions,
          paidSessions,
          completedSessions,
          failedSessions,
          packStats
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
