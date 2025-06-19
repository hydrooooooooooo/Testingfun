import { nanoid } from 'nanoid';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { config } from '../config/config';

// Session status enum
export enum SessionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  FINISHED = 'completed',
  FAILED = 'failed'
}

// Session interface
export interface Session {
  id: string;
  url: string;
  createdAt: Date;
  updatedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  data?: any;
  error?: string;
  isPaid: boolean;
  paymentIntentId?: string;
  exportUrl?: string;
  datasetId?: string;
  actorRunId?: string;
  packId?: string;
  // Nouveaux champs pour la gestion des paiements
  paymentCompletedAt?: string;
  paymentStatus?: 'pending' | 'succeeded' | 'failed';
  paymentError?: string;
  paymentPending?: boolean;
  paymentStartedAt?: string;
  // URL de téléchargement automatique après paiement
  downloadUrl?: string;
  // Indique si la session contient des données de scraping
  hasData?: boolean;
  // Token de téléchargement unique pour autoriser un téléchargement sans nouvelle vérification
  downloadToken?: string;
}

/**
 * Session service for managing scraping sessions
 * Uses file-based persistent storage with in-memory cache
 */
class SessionService {
  private sessions: Map<string, Session>;
  private readonly storagePath: string;
  private readonly storageType: string;

  constructor() {
    this.sessions = new Map<string, Session>();
    this.storageType = config.session.storage;
    this.storagePath = path.join(process.cwd(), 'data', 'sessions.json');
    
    // Initialize storage
    this.initializeStorage();
    logger.info(`Session service initialized with ${this.storageType} storage`);
  }

  /**
   * Initialize storage based on configuration
   */
  private initializeStorage(): void {
    if (this.storageType === 'file') {
      try {
        this.loadSessionsFromFile();
      } catch (error: any) {
        logger.error(`Failed to load sessions from file: ${error?.message || 'Unknown error'}`);
        // Create empty sessions file if it doesn't exist
        this.saveSessionsToFile();
      }
    }
  }

  /**
   * Load sessions from file
   */
  private loadSessionsFromFile(): void {
    try {
      // Check if file exists
      if (!fs.existsSync(this.storagePath)) {
        logger.info(`Sessions file not found at ${this.storagePath}, creating new file`);
        this.saveSessionsToFile();
        return;
      }

      // Read and parse file
      const data = fs.readFileSync(this.storagePath, 'utf8');
      const sessionsArray: Session[] = JSON.parse(data);
      
      // Convert dates from strings back to Date objects
      sessionsArray.forEach(session => {
        session.createdAt = new Date(session.createdAt);
        if (session.updatedAt) {
          session.updatedAt = new Date(session.updatedAt);
        }
      });

      // Populate the in-memory map
      this.sessions.clear();
      sessionsArray.forEach(session => {
        this.sessions.set(session.id, session);
      });

      logger.info(`Loaded ${sessionsArray.length} sessions from file`);
    } catch (error: any) {
      logger.error(`Error loading sessions from file: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Save sessions to file
   */
  private saveSessionsToFile(): void {
    if (this.storageType !== 'file') return;
    
    try {
      // Ensure directory exists
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Convert sessions map to array and save to file
      const sessionsArray = Array.from(this.sessions.values());
      fs.writeFileSync(this.storagePath, JSON.stringify(sessionsArray, null, 2), 'utf8');
      logger.info(`Saved ${sessionsArray.length} sessions to file`);
    } catch (error: any) {
      logger.error(`Error saving sessions to file: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Create a new session
   * @param sessionData Session data or URL to scrape
   * @returns Session object
   */
  createSession(sessionData: Session | string): Session {
    // If sessionData is a string, treat it as a URL
    if (typeof sessionData === 'string') {
      const id = nanoid(10);
      const session: Session = {
        id,
        url: sessionData,
        createdAt: new Date(),
        status: 'pending',
        isPaid: false
      };

      this.sessions.set(id, session);
      logger.info(`Session created: ${id} for URL: ${sessionData}`);
      
      // Persist to storage
      if (this.storageType === 'file') {
        this.saveSessionsToFile();
      }
      
      return session;
    }
    
    // If sessionData is a Session object
    const session = sessionData;
    if (!session.id) {
      session.id = nanoid(10);
    }
    if (!session.createdAt) {
      session.createdAt = new Date();
    }
    if (session.status === undefined) {
      session.status = 'pending';
    }
    if (session.isPaid === undefined) {
      session.isPaid = false;
    }

    this.sessions.set(session.id, session);
    logger.info(`Session created: ${session.id} for URL: ${session.url}`);
    
    // Persist to storage
    if (this.storageType === 'file') {
      this.saveSessionsToFile();
    }
    
    return session;
  }

  /**
   * Get a session by ID
   * @param id Session ID
   * @returns Session object or null if not found
   */
  getSession(id: string): Session | null {
    const session = this.sessions.get(id);
    if (!session) {
      logger.warn(`Session not found: ${id}`);
      return null;
    }
    return session;
  }

  /**
   * Get the most recent session that has data but is not paid yet
   * @returns Most recent unpaid session with data or null if none found
   */
  getMostRecentUnpaidSession(): Session | null {
    let mostRecent: Session | null = null;
    let mostRecentDate = new Date(0); // Start with oldest possible date

    // Iterate through all sessions to find the most recent unpaid one with data
    for (const [id, session] of this.sessions.entries()) {
      // Considérer une session comme ayant des données si elle a un datasetId ou si hasData est explicitement true
      const hasData = session.hasData === true || (session.datasetId !== undefined && session.datasetId !== null);
      
      if (!session.isPaid && hasData && session.createdAt > mostRecentDate) {
        mostRecent = session;
        mostRecentDate = session.createdAt;
      }
    }

    if (mostRecent) {
      logger.info(`Found most recent unpaid session: ${mostRecent.id} created at ${mostRecent.createdAt.toISOString()}`);
    } else {
      logger.warn('No unpaid sessions with data found');
    }

    return mostRecent;
  }

  /**
   * Update a session
   * @param id Session ID
   * @param updates Partial session object with updates
   * @returns Updated session or null if not found
   */
  updateSession(id: string, updates: Partial<Session>): Session | null {
    const session = this.getSession(id);
    if (!session) {
      return null;
    }

    const updatedSession = { 
      ...session, 
      ...updates,
      updatedAt: new Date() // Always set updatedAt when updating a session
    };
    this.sessions.set(id, updatedSession);
    logger.info(`Session updated: ${id}`);
    
    // Persist to storage
    if (this.storageType === 'file') {
      this.saveSessionsToFile();
    }
    
    return updatedSession;
  }

  /**
   * Delete a session
   * @param id Session ID
   * @returns true if deleted, false if not found
   */
  deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);
    if (deleted) {
      logger.info(`Session deleted: ${id}`);
      
      // Persist to storage
      if (this.storageType === 'file') {
        this.saveSessionsToFile();
      }
    } else {
      logger.warn(`Failed to delete session (not found): ${id}`);
    }
    return deleted;
  }

  /**
   * Get all sessions
   * @returns Array of all sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Mark a session as paid
   * @param id Session ID
   * @param paymentIntentId Stripe payment intent ID
   * @returns Updated session or null if not found
   */
  markSessionAsPaid(id: string, paymentIntentId: string): Session | null {
    return this.updateSession(id, { 
      isPaid: true, 
      paymentIntentId 
    });
  }

  /**
   * Set session export URL
   * @param id Session ID
   * @param exportUrl URL to download the export
   * @returns Updated session or null if not found
   */
  setExportUrl(id: string, exportUrl: string): Session | null {
    return this.updateSession(id, { exportUrl });
  }

  /**
   * Get dashboard statistics
   * @returns Object with statistics
   */
  getStats() {
    const sessions = this.getAllSessions();
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const paidSessions = sessions.filter(s => s.isPaid).length;
    const failedSessions = sessions.filter(s => s.status === 'failed').length;
    
    return {
      totalSessions,
      completedSessions,
      paidSessions,
      failedSessions,
      revenue: paidSessions * 9.99, // Assuming €9.99 per paid session
      successRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0
    };
  }
}

// Export singleton instance
export const sessionService = new SessionService();
