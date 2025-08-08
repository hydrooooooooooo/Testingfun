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

      // Get all sessions
      const sessions = await sessionService.getAllSessions();
      
      // Map sessions to a more readable format
      const formattedSessions = sessions.map(session => ({
        id: session.id,
        status: session.status,
        isPaid: session.isPaid,
        created_at: session.created_at,
        updated_at: session.updated_at || session.created_at,
        user: session.user_id || 'N/A',
        packId: session.packId || 'N/A',
        totalItems: session.totalItems || 0,
        hasData: session.hasData,
        paymentMethod: (session as any).payment_method || null,
      }));
      
      res.status(200).json(formattedSessions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get session details by ID (for admin purposes)
   */
  async getSessionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      
      // Get session from service
      const session = await sessionService.getSession(sessionId);
      if (!session) {
        throw new ApiError(404, `Session with ID ${sessionId} not found`);
      }
      
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard statistics (for admin purposes)
   */
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {

      // Get all sessions
      const sessions = await sessionService.getAllSessions();
      
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

      // Group by payment method
      const methodStats: Record<string, number> = {};
      sessions.forEach((session) => {
        const method = (session as any).payment_method;
        if (session.isPaid && method) {
          methodStats[method] = (methodStats[method] || 0) + 1;
        }
      });
      
      res.status(200).json({
        status: 'success',
        data: {
          totalSessions,
          paidSessions,
          completedSessions,
          failedSessions,
          packStats,
          methodStats
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
