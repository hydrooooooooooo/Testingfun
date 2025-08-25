import { Request, Response, NextFunction } from 'express';
import { sessionService, SessionStatus } from '../services/sessionService';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { analyticsService } from '../services/analyticsService';
import db from '../database';

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

  /**
   * Get full admin report: users, sessions, searches
   */
  async getFullReport(req: Request, res: Response, next: NextFunction) {
    try {
      const [userStats, searchStats, sessionSeries, sessionBasic, paymentStats] = await Promise.all([
        analyticsService.getUserStats(),
        analyticsService.getSearchStats(),
        analyticsService.getSessionTimeseries(),
        sessionService.getStats(),
        analyticsService.getPaymentStats(),
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          users: userStats,
          searches: searchStats,
          sessions: {
            ...sessionBasic,
            timeseries: sessionSeries,
          },
          payments: paymentStats,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Paginated list of all search events
   */
  async getSearchEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
      const from = (req.query.from as string) || undefined;
      const to = (req.query.to as string) || undefined;
      const userId = req.query.userId !== undefined ? Number(req.query.userId) : undefined;
      const data = await analyticsService.getSearchEventsPaginatedFiltered({ page, limit, from, to, userId: isNaN(Number(userId)) ? undefined as any : (userId as number) });
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export filtered search events to CSV
   */
  async exportSearchesCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const from = (req.query.from as string) || undefined;
      const to = (req.query.to as string) || undefined;
      const userId = req.query.userId !== undefined ? Number(req.query.userId) : undefined;
      const { items } = await analyticsService.getSearchEventsPaginatedFiltered({ page: 1, limit: 100000, from, to, userId: isNaN(Number(userId)) ? undefined as any : (userId as number) });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="searches.csv"');
      const header = ['id','created_at','user_id','user_email','session_id','session_name','url','domain','download_url','status','duration_ms','error_code'];
      res.write(header.join(',') + '\n');
      for (const it of items as any[]) {
        const row = [
          it.id,
          it.created_at,
          it.user_id ?? '',
          it.user_email ?? '',
          it.session_id ?? '',
          it.session_name ?? '',
          (it.url||'').replace(/\n|\r|,/g,' '),
          it.domain ?? '',
          it.download_url ?? '',
          it.status ?? '',
          it.duration_ms ?? '',
          it.error_code ?? ''
        ];
        res.write(row.join(',') + '\n');
      }
      res.end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Advanced metrics bundle
   */
  async getAdvancedMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const [active, verifyRate, signupConv, searchesMA, distribution, failureLatency, search2pay, paymentsTS, verify24h, cohorts] = await Promise.all([
        analyticsService.getActiveUsersCounts(),
        analyticsService.getVerificationRate(),
        analyticsService.getSignupToFirstSearchConversion(),
        analyticsService.getSearchesPerDayWithMA(),
        analyticsService.getPerUserSearchDistribution(),
        analyticsService.getFailureAndLatency(),
        analyticsService.getSearchToPaymentConversion(),
        analyticsService.getPaymentsTimeseriesAndBreakdown(),
        analyticsService.getVerificationWithin24hRate(),
        analyticsService.getRetentionCohorts(),
      ]);
      res.status(200).json({
        status: 'success',
        data: {
          activeUsers: active, // dau/wau/mau
          verification: verifyRate, // total, verified, rate
          signupToFirstSearch: signupConv, // conversionRate, medianDelayMs
          searchesPerDay: searchesMA, // count + ma7
          perUserSearchDistribution: distribution, // median/p90/p99
          failuresAndLatency: failureLatency, // failureRate, latencyMs p50/p95/p99
          searchToPayment: search2pay, // conversionRate
          payments: paymentsTS, // paymentsPerDay, methodBreakdown
          verificationWithin24h: verify24h, // rate
          retentionCohorts: cohorts, // simplified S+1
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lightweight users search for admin filters
   */
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q || '').trim();
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
      const rows = await db('users')
        .select('id', 'email')
        .modify((qb: any) => {
          if (q) qb.whereILike('email', `%${q}%`);
        })
        .orderBy('id', 'desc')
        .limit(limit);
      res.status(200).json({ status: 'success', data: rows });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
