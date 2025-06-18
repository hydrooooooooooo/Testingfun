/**
 * Session type definitions
 */

export interface Session {
  id: string;
  url: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
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
}

export interface SessionStats {
  nbItems: number;
  startedAt: string;
  finishedAt?: string;
}

export type SessionStatus = 'pending' | 'running' | 'completed' | 'failed';
