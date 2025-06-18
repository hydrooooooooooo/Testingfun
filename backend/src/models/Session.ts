export enum SessionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  FINISHED = 'finished',
  FAILED = 'failed'
}

export interface SessionStats {
  nbItems: number;
  startedAt: string;
  finishedAt?: string;
}

export interface Session {
  id: string;
  url: string;
  datasetId?: string;
  actorRunId?: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  stats: SessionStats;
  isPaid: boolean;
  packId?: string;
  previewItems?: any[];
}

// In-memory session storage for development
// In production, this would be replaced with a database
export class SessionStore {
  private sessions: Map<string, Session> = new Map();

  createSession(session: Session): Session {
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  updateSession(id: string, updates: Partial<Session>): Session | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates, updatedAt: new Date().toISOString() };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  markSessionAsPaid(id: string, packId: string): Session | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const updatedSession = { 
      ...session, 
      isPaid: true, 
      packId,
      updatedAt: new Date().toISOString() 
    };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }
}

// Create a singleton instance
export const sessionStore = new SessionStore();
