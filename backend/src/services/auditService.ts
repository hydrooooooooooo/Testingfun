// ====================================================================
// 1. NOUVEAU FICHIER: backend/src/services/auditService.ts
// ====================================================================
import { logger } from '../utils/logger';
import { sessionService } from './sessionService';
import fs from 'fs';
import path from 'path';

export interface SessionAuditLog {
  sessionId: string;
  timestamp: string;
  action: 'CREATED' | 'UPDATED' | 'SCRAPE_STARTED' | 'SCRAPE_COMPLETED' | 'PAYMENT_INITIATED' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'EXPORT_DOWNLOADED' | 'ERROR';
  details: any;
  userAgent?: string;
  ipAddress?: string;
  errorMessage?: string;
  paymentStatus?: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  paymentAmount?: number;
  paymentCurrency?: string;
}

export class AuditService {
  private auditLogs: Map<string, SessionAuditLog[]> = new Map();
  private auditFilePath: string;

  constructor() {
    this.auditFilePath = path.join(process.cwd(), 'logs', 'audit.log');
    this.ensureAuditFileExists();
    this.loadAuditLogs();
  }

  private ensureAuditFileExists(): void {
    const dir = path.dirname(this.auditFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.auditFilePath)) {
      fs.writeFileSync(this.auditFilePath, '', 'utf8');
    }
  }

  private loadAuditLogs(): void {
    try {
      if (fs.existsSync(this.auditFilePath)) {
        const content = fs.readFileSync(this.auditFilePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const log: SessionAuditLog = JSON.parse(line);
            if (!this.auditLogs.has(log.sessionId)) {
              this.auditLogs.set(log.sessionId, []);
            }
            this.auditLogs.get(log.sessionId)!.push(log);
          } catch (parseError) {
            logger.warn(`Failed to parse audit log line: ${line}`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to load audit logs:', error);
    }
  }

  /**
   * Log une action de session avec état de paiement
   */
  logSessionAction(
    sessionId: string,
    action: SessionAuditLog['action'],
    details: any = {},
    request?: any,
    paymentInfo?: {
      status?: 'pending' | 'succeeded' | 'failed' | 'cancelled';
      amount?: number;
      currency?: string;
    }
  ): void {
    const auditLog: SessionAuditLog = {
      sessionId,
      timestamp: new Date().toISOString(),
      action,
      details,
      userAgent: request?.headers?.['user-agent'],
      ipAddress: request?.ip || request?.connection?.remoteAddress,
      paymentStatus: paymentInfo?.status,
      paymentAmount: paymentInfo?.amount,
      paymentCurrency: paymentInfo?.currency
    };

    // Ajouter à la mémoire
    if (!this.auditLogs.has(sessionId)) {
      this.auditLogs.set(sessionId, []);
    }
    this.auditLogs.get(sessionId)!.push(auditLog);

    // Écrire dans le fichier de log
    this.writeAuditLog(auditLog);

    // Logger aussi dans Winston
    logger.info(`Session Action: ${sessionId} - ${action}`, {
      sessionId,
      action,
      details,
      paymentStatus: paymentInfo?.status,
      timestamp: auditLog.timestamp
    });
  }

  private writeAuditLog(auditLog: SessionAuditLog): void {
    try {
      const logLine = JSON.stringify(auditLog) + '\n';
      fs.appendFileSync(this.auditFilePath, logLine, 'utf8');
    } catch (error) {
      logger.error('Failed to write audit log:', error);
    }
  }

  /**
   * Récupérer l'historique complet d'une session avec état de paiement
   */
  getSessionAuditTrail(sessionId: string): SessionAuditLog[] {
    return this.auditLogs.get(sessionId) || [];
  }

  /**
   * Récupérer toutes les sessions avec audit et état de paiement
   */
  getAllSessionsWithAuditAndPayment(): Array<{
    sessionId: string;
    createdAt: string;
    lastActivity: string;
    status: string;
    actions: number;
    hasErrors: boolean;
    paymentStatus: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'none';
    paymentAmount?: number;
    lastPaymentAction?: string;
  }> {
    const result: Array<{
      sessionId: string;
      createdAt: string;
      lastActivity: string;
      status: string;
      actions: number;
      hasErrors: boolean;
      paymentStatus: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'none';
      paymentAmount?: number;
      lastPaymentAction?: string;
    }> = [];

    for (const [sessionId, logs] of this.auditLogs.entries()) {
      if (logs.length === 0) continue;

      const session = sessionService.getSession(sessionId);
      const sortedLogs = logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const hasErrors = logs.some(log => log.action === 'ERROR');

      // Déterminer l'état du paiement à partir des logs
      const paymentLogs = logs.filter(log => 
        log.action === 'PAYMENT_INITIATED' || 
        log.action === 'PAYMENT_SUCCESS' || 
        log.action === 'PAYMENT_FAILED'
      );

      let paymentStatus: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'none' = 'none';
      let paymentAmount: number | undefined;
      let lastPaymentAction: string | undefined;

      if (paymentLogs.length > 0) {
        const lastPaymentLog = paymentLogs[paymentLogs.length - 1];
        lastPaymentAction = lastPaymentLog.timestamp;
        paymentAmount = lastPaymentLog.paymentAmount;

        switch (lastPaymentLog.action) {
          case 'PAYMENT_SUCCESS':
            paymentStatus = 'succeeded';
            break;
          case 'PAYMENT_FAILED':
            paymentStatus = 'failed';
            break;
          case 'PAYMENT_INITIATED':
            paymentStatus = 'pending';
            break;
        }
      } else if (session?.isPaid) {
        paymentStatus = 'succeeded';
      }

      result.push({
        sessionId,
        createdAt: sortedLogs[0].timestamp,
        lastActivity: sortedLogs[sortedLogs.length - 1].timestamp,
        status: session?.status || 'UNKNOWN',
        actions: logs.length,
        hasErrors,
        paymentStatus,
        paymentAmount,
        lastPaymentAction
      });
    }

    return result.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }
}

// Export singleton instance
export const auditService = new AuditService();