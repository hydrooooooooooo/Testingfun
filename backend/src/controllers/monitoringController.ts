import { Request, Response, NextFunction } from 'express';
import os from 'os';
import db from '../database';
import { logger, audit } from '../utils/logger';
import { activeUsersService } from '../services/activeUsersService';

class MonitoringController {
  private lastAuditLog = 0;

  async getMonitoringData(req: Request, res: Response, next: NextFunction) {
    try {
      // Throttle audit logging to every 30s to avoid flood from 5s polling
      const now = Date.now();
      if (now - this.lastAuditLog > 30_000) {
        audit('admin.monitoring_viewed', { adminId: (req as any).user?.id });
        this.lastAuditLog = now;
      }

      const [activeSessions, recentEvents] = await Promise.all([
        this.getActiveSessions(),
        this.getRecentEvents(),
      ]);

      const server = this.getServerMetrics();
      const connectedUsers = this.getConnectedUsers();
      const dbPool = this.getDbPoolStats();

      res.json({
        status: 'success',
        data: {
          server,
          activeSessions,
          connectedUsers,
          dbPool,
          recentEvents,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  private getServerMetrics() {
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;

    return {
      ram: {
        processRss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        systemUsed: usedMem,
        systemTotal: totalMem,
        systemFree: freeMem,
        systemPercent: Math.round((usedMem / totalMem) * 100),
      },
      cpu: {
        load1: loadAvg[0],
        load5: loadAvg[1],
        load15: loadAvg[2],
        cores: cpuCount,
        loadPercent: Math.round((loadAvg[0] / cpuCount) * 100),
      },
      uptime: {
        process: Math.floor(process.uptime()),
        system: Math.floor(os.uptime()),
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
    };
  }

  private async getActiveSessions() {
    try {
      const sessions = await db('scraping_sessions')
        .leftJoin('users', 'scraping_sessions.user_id', 'users.id')
        .whereIn('scraping_sessions.status', ['pending', 'running'])
        .select(
          'scraping_sessions.id',
          'scraping_sessions.status',
          'scraping_sessions.service_type',
          'scraping_sessions.totalItems',
          'scraping_sessions.created_at',
          'scraping_sessions.updated_at',
          'users.email as user_email'
        )
        .orderBy('scraping_sessions.created_at', 'desc')
        .limit(50);

      const byType: Record<string, number> = {};
      for (const s of sessions) {
        const type = s.service_type || 'unknown';
        byType[type] = (byType[type] || 0) + 1;
      }

      return {
        total: sessions.length,
        byType,
        sessions,
      };
    } catch (error: any) {
      logger.warn('[Monitoring] Failed to get active sessions:', error.message);
      return { total: 0, byType: {}, sessions: [] };
    }
  }

  private getConnectedUsers() {
    const users = activeUsersService.getActiveUsers(5);
    return {
      count: users.length,
      users: users.map((u) => ({
        userId: u.userId,
        email: u.email,
        lastSeen: u.lastSeen,
        currentPath: u.path,
      })),
    };
  }

  private getDbPoolStats() {
    try {
      const pool = (db.client as any)?.pool;
      if (!pool) return null;
      return {
        numUsed: pool.numUsed?.() ?? null,
        numFree: pool.numFree?.() ?? null,
        numPendingAcquires: pool.numPendingAcquires?.() ?? null,
      };
    } catch {
      return null;
    }
  }

  private async getRecentEvents() {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [sessions, transactions] = await Promise.all([
        db('scraping_sessions')
          .leftJoin('users', 'scraping_sessions.user_id', 'users.id')
          .where('scraping_sessions.created_at', '>=', cutoff)
          .select(
            db.raw("'session' as event_type"),
            'scraping_sessions.id',
            'scraping_sessions.status as detail',
            'scraping_sessions.service_type',
            'scraping_sessions.created_at',
            'users.email as user_email'
          )
          .orderBy('scraping_sessions.created_at', 'desc')
          .limit(20),
        db('credit_transactions')
          .leftJoin('users', 'credit_transactions.user_id', 'users.id')
          .where('credit_transactions.created_at', '>=', cutoff)
          .select(
            db.raw("'credit' as event_type"),
            'credit_transactions.id',
            'credit_transactions.type as detail',
            'credit_transactions.amount as service_type',
            'credit_transactions.created_at',
            'users.email as user_email'
          )
          .orderBy('credit_transactions.created_at', 'desc')
          .limit(20),
      ]);

      // Merge and sort by date, limit to 30
      const all = [...sessions, ...transactions]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 30);

      return all;
    } catch (error: any) {
      logger.warn('[Monitoring] Failed to get recent events:', error.message);
      return [];
    }
  }
}

export const monitoringController = new MonitoringController();
