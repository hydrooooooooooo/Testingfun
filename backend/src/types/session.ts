/**
 * Session type definitions
 */

export interface Session {
  url: string; // L'URL de la session de scraping
  id: string;
  user_id?: number; // L'ID de l'utilisateur associé
  status: 'pending' | 'running' | 'completed' | 'failed' | 'payment_failed';
  actorRunId?: string;
  datasetId?: string;
  isPaid: boolean;
  packId?: string;
  downloadUrl?: string;
  downloadToken?: string; // Le token pour le téléchargement sécurisé
  totalItems?: number;
  previewItems?: any[];
  hasData?: boolean;
  paymentIntentId?: string; // L'ID de l'intention de paiement Stripe
  data?: any[]; // Les données scrappées, si disponibles
  created_at: string;
  updated_at: string;
}

export interface SessionStats {
  nbItems: number;
  startedAt: string;
  finishedAt?: string;
}

export type SessionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'payment_failed';
