import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/auditService';
import { ApiError } from '../middlewares/errorHandler';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class AuditController {
  /**
   * Récupérer l'historique d'audit d'une session avec état de paiement
   */
  async getSessionAuditTrail(req: Request, res: Response, next: NextFunction) {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey || apiKey !== config.api.adminApiKey) {
        throw new ApiError(401, 'Unauthorized - Invalid API key');
      }

      const { sessionId } = req.params;
      
      if (!sessionId) {
        throw new ApiError(400, 'Session ID is required');
      }

      logger.info(`Admin accessing audit trail for session: ${sessionId}`);

      const auditTrail = auditService.getSessionAuditTrail(sessionId);

      // Calculer des statistiques supplémentaires
      const paymentActions = auditTrail.filter(log => log.action.includes('PAYMENT'));
      const errorActions = auditTrail.filter(log => log.action === 'ERROR');
      const lastPaymentAction = paymentActions.length > 0 ? paymentActions[paymentActions.length - 1] : null;

      res.status(200).json({
        status: 'success',
        data: {
          sessionId,
          auditTrail,
          summary: {
            totalActions: auditTrail.length,
            paymentActions: paymentActions.length,
            errorActions: errorActions.length,
            lastPaymentStatus: lastPaymentAction?.paymentStatus,
            lastPaymentAmount: lastPaymentAction?.paymentAmount,
            timeSpan: {
              firstAction: auditTrail.length > 0 ? auditTrail[0].timestamp : null,
              lastAction: auditTrail.length > 0 ? auditTrail[auditTrail.length - 1].timestamp : null
            }
          }
        }
      });
    } catch (error) {
      logger.error(`Error getting audit trail for session ${req.params.sessionId}:`, error);
      next(error);
    }
  }

  /**
   * Récupérer toutes les sessions avec audit et état de paiement
   */
  async getAllSessionsWithAuditAndPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey || apiKey !== config.api.adminApiKey) {
        throw new ApiError(401, 'Unauthorized - Invalid API key');
      }

      logger.info('Admin accessing all sessions with audit and payment data');

      const sessions = auditService.getAllSessionsWithAuditAndPayment();
      const stats = auditService.getAuditStats();

      // Filtres optionnels
      const { paymentStatus, hasErrors, limit } = req.query;
      
      let filteredSessions = sessions;
      
      if (paymentStatus && typeof paymentStatus === 'string') {
        filteredSessions = filteredSessions.filter(s => s.paymentStatus === paymentStatus);
      }
      
      if (hasErrors === 'true') {
        filteredSessions = filteredSessions.filter(s => s.hasErrors);
      }
      
      if (limit && typeof limit === 'string') {
        const limitNum = parseInt(limit, 10);
        if (!isNaN(limitNum)) {
          filteredSessions = filteredSessions.slice(0, limitNum);
        }
      }

      res.status(200).json({
        status: 'success',
        data: {
          sessions: filteredSessions,
          statistics: {
            filtered: {
              totalSessions: filteredSessions.length,
              paidSessions: filteredSessions.filter(s => s.paymentStatus === 'succeeded').length,
              pendingPayments: filteredSessions.filter(s => s.paymentStatus === 'pending').length,
              failedPayments: filteredSessions.filter(s => s.paymentStatus === 'failed').length
            },
            global: stats
          },
          filters: {
            paymentStatus: paymentStatus || null,
            hasErrors: hasErrors === 'true',
            limit: limit ? parseInt(limit as string, 10) : null
          }
        }
      });
    } catch (error) {
      logger.error('Error getting all sessions with audit:', error);
      next(error);
    }
  }

  /**
   * Rechercher dans les logs d'audit
   */
  async searchAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey || apiKey !== config.api.adminApiKey) {
        throw new ApiError(401, 'Unauthorized - Invalid API key');
      }

      const { 
        sessionId, 
        dateFrom, 
        dateTo, 
        hasErrors, 
        action, 
        paymentStatus,
        limit 
      } = req.query;

      logger.info('Admin searching audit logs with criteria:', {
        sessionId,
        dateFrom,
        dateTo,
        hasErrors,
        action,
        paymentStatus
      });

      const criteria: any = {};
      
      if (sessionId && typeof sessionId === 'string') criteria.sessionId = sessionId;
      if (dateFrom && typeof dateFrom === 'string') criteria.dateFrom = dateFrom;
      if (dateTo && typeof dateTo === 'string') criteria.dateTo = dateTo;
      if (hasErrors !== undefined) criteria.hasErrors = hasErrors === 'true';
      if (action && typeof action === 'string') criteria.action = action;
      if (paymentStatus && typeof paymentStatus === 'string') criteria.paymentStatus = paymentStatus;

      let results = auditService.searchSessions(criteria);

      // Appliquer la limite si spécifiée
      if (limit && typeof limit === 'string') {
        const limitNum = parseInt(limit, 10);
        if (!isNaN(limitNum)) {
          results = results.slice(0, limitNum);
        }
      }

      // Grouper les résultats par type d'action pour des statistiques
      const actionStats = results.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.status(200).json({
        status: 'success',
        data: {
          criteria,
          results,
          statistics: {
            totalResults: results.length,
            actionBreakdown: actionStats,
            uniqueSessions: new Set(results.map(r => r.sessionId)).size,
            dateRange: results.length > 0 ? {
              earliest: results[results.length - 1].timestamp,
              latest: results[0].timestamp
            } : null
          }
        }
      });
    } catch (error) {
      logger.error('Error searching audit logs:', error);
      next(error);
    }
  }

  /**
   * Obtenir les statistiques globales d'audit
   */
  async getAuditStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey || apiKey !== config.api.adminApiKey) {
        throw new ApiError(401, 'Unauthorized - Invalid API key');
      }

      logger.info('Admin accessing audit statistics');

      const stats = auditService.getAuditStats();

      res.status(200).json({
        status: 'success',
        data: {
          statistics: stats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting audit statistics:', error);
      next(error);
    }
  }

  /**
   * Nettoyer les anciens logs d'audit
   */
  async cleanupAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey || apiKey !== config.api.adminApiKey) {
        throw new ApiError(401, 'Unauthorized - Invalid API key');
      }

      logger.info('Admin initiated audit logs cleanup');

      auditService.cleanupOldLogs();

      res.status(200).json({
        status: 'success',
        message: 'Audit logs cleanup completed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error during audit logs cleanup:', error);
      next(error);
    }
  }

  /**
   * Exporter les logs d'audit en CSV
   */
  async exportAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey || apiKey !== config.api.adminApiKey) {
        throw new ApiError(401, 'Unauthorized - Invalid API key');
      }

      const { format = 'csv' } = req.query;

      logger.info(`Admin exporting audit logs in ${format} format`);

      const sessions = auditService.getAllSessionsWithAuditAndPayment();

      if (format === 'csv') {
        // Créer le contenu CSV
        const csvHeader = 'SessionID,CreatedAt,LastActivity,Status,Actions,HasErrors,PaymentStatus,PaymentAmount,LastPaymentAction\n';
        const csvRows = sessions.map(session => [
          session.sessionId,
          session.createdAt,
          session.lastActivity,
          session.status,
          session.actions,
          session.hasErrors,
          session.paymentStatus,
          session.paymentAmount || '',
          session.lastPaymentAction || ''
        ].join(',')).join('\n');

        const csvContent = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
        
        return res.send(csvContent);
      } else {
        // Format JSON par défaut
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`);
        
        return res.json({
          exportDate: new Date().toISOString(),
          totalSessions: sessions.length,
          sessions
        });
      }
    } catch (error) {
      logger.error('Error exporting audit logs:', error);
      next(error);
    }
  }
}

export const auditController = new AuditController();