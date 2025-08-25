import { nanoid } from 'nanoid';
import { logger } from '../utils/logger';
import db from '../database';

// Session status enum
export enum SessionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  FINISHED = 'completed',
  FAILED = 'failed',
  PAYMENT_FAILED = 'payment_failed',
}

// Session interface matching the database table
export interface Session {
  id: string;
  user_id?: number;
  status: SessionStatus;
  actorRunId?: string;
  datasetId?: string;
  isPaid: boolean;
  is_trial?: boolean;
  packId?: string;
  url?: string;
  downloadUrl?: string;
  downloadToken?: string;
  totalItems?: number;
  previewItems?: any; // JSON field
  hasData: boolean;
  payment_intent_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Session service for managing scraping sessions in the database.
 */
class SessionService {

  /**
   * Create a new session in the database.
   * @param sessionData Data for the new session, including an optional user_id.
   * @returns The newly created session object.
   */
  async createSession(sessionData: Partial<Session> & { user_id?: number }): Promise<Session> {
    const id = `sess_${nanoid()}`;
    const newSessionData: Omit<Session, 'created_at' | 'updated_at'> = {
      id,
      status: SessionStatus.PENDING,
      isPaid: false,
      hasData: false,
      ...sessionData,
    };

    const [createdSession] = await db('scraping_sessions').insert(newSessionData).returning('*');
    logger.info(`Session created in DB: ${createdSession.id}`);
    return createdSession;
  }

  /**
   * Get a session by its ID from the database.
   * @param id Session ID.
   * @returns The session object or null if not found.
   */
  async getSession(id: string): Promise<Session | null> {
    const session = await db('scraping_sessions').where({ id }).first();
    if (!session) {
      logger.warn(`Session not found in DB: ${id}`);
      return null;
    }
    // Knex returns JSON as string, parse it.
    if (typeof session.previewItems === 'string') {
      try {
        session.previewItems = JSON.parse(session.previewItems);
      } catch (error) {
        logger.error(`Failed to parse previewItems for session ${id}`, error);
        session.previewItems = null;
      }
    }
    return session;
  }

  /**
   * Get the most recent session that has data but is not paid yet.
   * @returns The most recent unpaid session with data or null if none found.
   */
  async getMostRecentUnpaidSession(): Promise<Session | null> {
    const session = await db('scraping_sessions')
      .where('isPaid', false)
      .andWhere('hasData', true)
      .orderBy('created_at', 'desc')
      .first();

    if (session) {
      logger.info(`Found most recent unpaid session from DB: ${session.id}`);
      return session;
    } else {
      logger.info('No unpaid sessions with data found in DB');
      return null;
    }
  }

  /**
   * Update a session in the database.
   * @param id Session ID.
   * @param updates Partial session object with updates.
   * @returns The updated session or null if not found.
   */
  async updateSession(id: string, updates: Partial<Session>): Promise<Session | null> {
    // Stringify JSON fields before updating
    if (updates.previewItems) {
      updates.previewItems = JSON.stringify(updates.previewItems);
    }

    const [updatedSession] = await db('scraping_sessions')
      .where({ id })
      .update({
        ...updates,
        updated_at: new Date(),
      })
      .returning('*');

    if (!updatedSession) {
      logger.warn(`Failed to update session in DB (not found): ${id}`);
      return null;
    }

    logger.info(`Session updated in DB: ${id}`);
    return updatedSession;
  }

  /**
   * Delete a session from the database.
   * @param id Session ID.
   * @returns true if deleted, false if not found.
   */
  async deleteSession(id: string): Promise<boolean> {
    const deletedCount = await db('scraping_sessions').where({ id }).del();
    if (deletedCount > 0) {
      logger.info(`Session deleted from DB: ${id}`);
      return true;
    }
    logger.warn(`Failed to delete session from DB (not found): ${id}`);
    return false;
  }

  /**
   * Get all sessions from the database.
   * @returns Array of all sessions.
   */
  async getAllSessions(): Promise<Session[]> {
    return db('scraping_sessions').select('*').orderBy('created_at', 'desc');
  }

  /**
   * Mark a session as paid.
   * @param id Session ID.
   * @returns The updated session or null if not found.
   */
  async markSessionAsPaid(id: string): Promise<Session | null> {
    return this.updateSession(id, { isPaid: true });
  }

  /**
   * Set session download URL.
   * @param id Session ID.
   * @param downloadUrl URL to download the export.
   * @returns The updated session or null if not found.
   */
  async setDownloadUrl(id: string, downloadUrl: string): Promise<Session | null> {
    return this.updateSession(id, { downloadUrl });
  }

  /**
   * Get dashboard statistics from the database.
   * @returns Object with statistics.
   */
  async getStats() {
    const totalSessions = await db('scraping_sessions').count('id as count').first();
    const completedSessions = await db('scraping_sessions').where('status', 'completed').count('id as count').first();
    const paidSessions = await db('scraping_sessions').where('isPaid', true).count('id as count').first();
    const failedSessions = await db('scraping_sessions').where('status', 'failed').count('id as count').first();

    const total = Number(totalSessions?.count || 0);
    const completed = Number(completedSessions?.count || 0);

    return {
      totalSessions: total,
      completedSessions: completed,
      paidSessions: Number(paidSessions?.count || 0),
      failedSessions: Number(failedSessions?.count || 0),
      // Revenue calculation should be implemented based on the payments table
      revenue: 0, 
      successRate: total > 0 ? (completed / total) * 100 : 0
    };
  }
}

// Export singleton instance
export const sessionService = new SessionService();
