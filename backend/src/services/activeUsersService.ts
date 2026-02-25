import { logger } from '../utils/logger';

interface ActiveUser {
  userId: number;
  email: string;
  lastSeen: Date;
  ip: string;
  path: string;
}

class ActiveUsersService {
  private users = new Map<number, ActiveUser>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Auto-cleanup every 10 minutes, remove entries older than 30 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
    // Allow process to exit without waiting for this interval
    this.cleanupInterval.unref();
  }

  /**
   * Record user activity — called from protect middleware on every authenticated request
   */
  touch(userId: number, email: string, ip: string, path: string): void {
    this.users.set(userId, {
      userId,
      email,
      lastSeen: new Date(),
      ip,
      path,
    });
  }

  /**
   * Get users active within the last N minutes
   */
  getActiveUsers(withinMinutes = 5): ActiveUser[] {
    const cutoff = Date.now() - withinMinutes * 60 * 1000;
    const active: ActiveUser[] = [];
    for (const user of this.users.values()) {
      if (user.lastSeen.getTime() >= cutoff) {
        active.push(user);
      }
    }
    return active;
  }

  /**
   * Remove stale entries (>30min old)
   */
  private cleanup(): void {
    const cutoff = Date.now() - 30 * 60 * 1000;
    let removed = 0;
    for (const [userId, user] of this.users.entries()) {
      if (user.lastSeen.getTime() < cutoff) {
        this.users.delete(userId);
        removed++;
      }
    }
    if (removed > 0) {
      logger.debug(`[ActiveUsers] Cleaned up ${removed} stale entries`);
    }
  }
}

export const activeUsersService = new ActiveUsersService();
