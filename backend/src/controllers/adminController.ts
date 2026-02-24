import { Request, Response, NextFunction } from 'express';
import { sessionService, SessionStatus } from '../services/sessionService';
import { creditService } from '../services/creditService';
import { ApiError } from '../middlewares/errorHandler';
import { logger, audit } from '../utils/logger';
import { config } from '../config/config';
import { analyticsService } from '../services/analyticsService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import db from '../database';
import { openRouterCostService } from '../services/openRouterCostService';

export class AdminController {
  /**
   * Get all sessions (for admin purposes)
   */
  async getAllSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as AuthenticatedRequest).user?.id;
      audit('admin.sessions_listed', { adminId });

      const sessions = await sessionService.getAllSessions();

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
      const adminId = (req as AuthenticatedRequest).user?.id;
      audit('admin.session_viewed', { adminId, sessionId });

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
      const adminId = (req as AuthenticatedRequest).user?.id;
      audit('admin.stats_viewed', { adminId });

      const sessions = await sessionService.getAllSessions();

      const totalSessions = sessions.length;
      const paidSessions = sessions.filter((s) => s.isPaid).length;
      const completedSessions = sessions.filter((s) => s.status === SessionStatus.FINISHED).length;
      const failedSessions = sessions.filter((s) => s.status === SessionStatus.FAILED).length;

      const packStats: Record<string, number> = {};
      sessions.forEach((session) => {
        if (session.packId && session.isPaid) {
          packStats[session.packId] = (packStats[session.packId] || 0) + 1;
        }
      });

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
      const adminId = (req as AuthenticatedRequest).user?.id;
      audit('admin.report_viewed', { adminId });

      const [userStats, searchStats, sessionSeries, sessionBasic, paymentStats, sectorDistribution, sizeDistribution] = await Promise.all([
        analyticsService.getUserStats(),
        analyticsService.getSearchStats(),
        analyticsService.getSessionTimeseries(),
        sessionService.getStats(),
        analyticsService.getPaymentStats(),
        analyticsService.getBusinessSectorDistribution(),
        analyticsService.getCompanySizeDistribution(),
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          users: { ...userStats, sectorDistribution, sizeDistribution },
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
      const adminId = (req as AuthenticatedRequest).user?.id;
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
      const from = (req.query.from as string) || undefined;
      const to = (req.query.to as string) || undefined;
      const userId = req.query.userId !== undefined ? Number(req.query.userId) : undefined;
      audit('admin.searches_viewed', { adminId, filters: { page, limit, from, to, userId } });

      const data = await analyticsService.getSearchEventsPaginatedFiltered({ page, limit, from, to, userId: isNaN(Number(userId)) ? undefined as any : (userId as number) });
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export filtered search events to CSV (paginated streaming, max 10000 rows)
   */
  async exportSearchesCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as AuthenticatedRequest).user?.id;
      const from = (req.query.from as string) || undefined;
      const to = (req.query.to as string) || undefined;
      const userId = req.query.userId !== undefined ? Number(req.query.userId) : undefined;
      audit('admin.searches_exported', { adminId, filters: { from, to, userId } });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="searches.csv"');
      const header = ['id','created_at','user_id','user_email','session_id','session_name','url','domain','download_url','status','duration_ms','error_code'];
      res.write(header.join(',') + '\n');

      const PAGE_SIZE = 500;
      const MAX_ROWS = 10000;
      let currentPage = 1;
      let totalWritten = 0;

      while (totalWritten < MAX_ROWS) {
        const { items } = await analyticsService.getSearchEventsPaginatedFiltered({
          page: currentPage,
          limit: PAGE_SIZE,
          from,
          to,
          userId: isNaN(Number(userId)) ? undefined as any : (userId as number),
        });

        if (!items || items.length === 0) break;

        for (const it of items as any[]) {
          if (totalWritten >= MAX_ROWS) break;
          const escapeCsv = (v: any) => {
            const s = String(v ?? '');
            return s.includes(',') || s.includes('"') || s.includes('\n')
              ? '"' + s.replace(/"/g, '""') + '"'
              : s;
          };
          const row = [
            it.id,
            it.created_at,
            it.user_id ?? '',
            escapeCsv(it.user_email ?? ''),
            it.session_id ?? '',
            escapeCsv(it.session_name ?? ''),
            escapeCsv((it.url || '').replace(/\n|\r/g, ' ')),
            it.domain ?? '',
            it.download_url ?? '',
            it.status ?? '',
            it.duration_ms ?? '',
            it.error_code ?? ''
          ];
          res.write(row.join(',') + '\n');
          totalWritten++;
        }

        if (items.length < PAGE_SIZE) break;
        currentPage++;
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
      const adminId = (req as AuthenticatedRequest).user?.id;
      audit('admin.metrics_viewed', { adminId });

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
          activeUsers: active,
          verification: verifyRate,
          signupToFirstSearch: signupConv,
          searchesPerDay: searchesMA,
          perUserSearchDistribution: distribution,
          failuresAndLatency: failureLatency,
          searchToPayment: search2pay,
          payments: paymentsTS,
          verificationWithin24h: verify24h,
          retentionCohorts: cohorts,
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
      const adminId = (req as AuthenticatedRequest).user?.id;
      const q = String(req.query.q || '').trim();
      audit('admin.users_searched', { adminId, query: q });

      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
      const rows = await db('users')
        .select('id', 'email', 'name', 'role', 'credits_balance', 'is_suspended', 'created_at', 'business_sector', 'company_size')
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

  /**
   * Get user detail by ID + recent credit transactions
   */
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as AuthenticatedRequest).user?.id;
      const userId = Number(req.params.userId);
      if (isNaN(userId)) throw new ApiError(400, 'Invalid userId');
      audit('admin.user_viewed', { adminId, userId });

      const user = await db('users')
        .select('id', 'email', 'name', 'role', 'credits_balance', 'is_suspended', 'suspension_reason', 'created_at', 'email_verified_at', 'business_sector', 'company_size', 'preferred_ai_model', 'last_login_at', 'last_login_ip')
        .where({ id: userId })
        .first();
      if (!user) throw new ApiError(404, 'User not found');

      const transactions = await db('credit_transactions')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(50);

      const sessionCount = await db('scraping_sessions')
        .where({ user_id: userId })
        .count('* as count')
        .first();

      const payments = await db('scraping_sessions')
        .where({ user_id: userId })
        .whereNotNull('payment_method')
        .select('id', 'packId', 'payment_method', 'payment_intent_id', 'isPaid', 'created_at', 'updated_at')
        .orderBy('created_at', 'desc')
        .limit(50);

      const downloads = await db('downloads')
        .where({ user_id: userId })
        .select('id', 'session_id', 'format', 'created_at', 'expires_at')
        .orderBy('created_at', 'desc')
        .limit(50);

      res.status(200).json({
        status: 'success',
        data: { user, transactions, sessionCount: Number(sessionCount?.count || 0), payments, downloads },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adjust user credits (admin_adjustment)
   */
  async adjustUserCredits(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as AuthenticatedRequest).user?.id;
      const userId = Number(req.params.userId);
      if (isNaN(userId)) throw new ApiError(400, 'Invalid userId');

      const { amount, reason } = req.body;
      if (typeof amount !== 'number' || amount === 0) throw new ApiError(400, 'amount must be a non-zero number');
      if (!reason || typeof reason !== 'string') throw new ApiError(400, 'reason is required');

      audit('admin.credits_adjusted', { adminId, userId, amount, reason });

      const transaction = await creditService.addCredits(
        userId,
        amount,
        'admin_adjustment',
        `admin_${adminId}`,
        reason,
        { adjustedBy: adminId }
      );

      res.status(200).json({ status: 'success', data: transaction });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Suspend or reactivate user
   */
  async toggleUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as AuthenticatedRequest).user?.id;
      const userId = Number(req.params.userId);
      if (isNaN(userId)) throw new ApiError(400, 'Invalid userId');
      if (userId === adminId) throw new ApiError(400, 'Cannot suspend yourself');

      const { suspended, reason } = req.body;
      if (typeof suspended !== 'boolean') throw new ApiError(400, 'suspended must be a boolean');

      audit('admin.user_status_changed', { adminId, userId, suspended, reason });

      await db('users').where({ id: userId }).update({
        is_suspended: suspended,
        suspension_reason: suspended ? (reason || null) : null,
        updated_at: db.fn.now(),
      });

      res.status(200).json({ status: 'success', message: suspended ? 'User suspended' : 'User reactivated' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refund credits for a session
   */
  async refundSession(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as AuthenticatedRequest).user?.id;
      const { sessionId } = req.params;
      audit('admin.session_refunded', { adminId, sessionId });

      const session = await sessionService.getSession(sessionId);
      if (!session) throw new ApiError(404, 'Session not found');

      // Find the usage transaction for this session
      const usageTx = await db('credit_transactions')
        .where({ reference_id: sessionId, transaction_type: 'usage' })
        .first();

      if (!usageTx) throw new ApiError(400, 'No credit usage found for this session');

      const refundAmount = Math.abs(usageTx.amount);
      const transaction = await creditService.addCredits(
        session.user_id!,
        refundAmount,
        'refund',
        sessionId,
        `Refund by admin #${adminId}`,
        { refundedBy: adminId }
      );

      res.status(200).json({ status: 'success', data: transaction });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Archive (soft delete) a session
   */
  async archiveSession(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as AuthenticatedRequest).user?.id;
      const { sessionId } = req.params;
      audit('admin.session_archived', { adminId, sessionId });

      const session = await sessionService.getSession(sessionId);
      if (!session) throw new ApiError(404, 'Session not found');

      await db('scraping_sessions').where({ id: sessionId }).update({
        status: 'ARCHIVED',
        updated_at: db.fn.now(),
      });

      res.status(200).json({ status: 'success', message: 'Session archived' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get AI usage summary (cost, tokens, model breakdown)
   */
  async getAIUsageSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as AuthenticatedRequest).user?.id;
      const startDate = req.query.from ? new Date(req.query.from as string) : undefined;
      const endDate = req.query.to ? new Date(req.query.to as string) : undefined;
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      audit('admin.ai_usage_viewed', { adminId, filters: { startDate, endDate, userId } });

      const [summary, recentLogs, profitability] = await Promise.all([
        openRouterCostService.getCostSummary({ startDate, endDate, userId }),
        openRouterCostService.getRecentLogs(100),
        openRouterCostService.getProfitabilityReport({ startDate, endDate }),
      ]);

      res.status(200).json({
        status: 'success',
        data: { summary, recentLogs, profitability },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
