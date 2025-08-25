export interface Purchase {
  id: number;
  user_id: number;
  amount: number;
  currency: string;
  status: string;
  description: string;
  credits_purchased: number;
  stripe_payment_id: string;
  created_at: string;
}

export interface Download {
  id: number;
  user_id: number;
  session_id: string;
  file_path: string;
  scraped_url: string;
  results_count: number;
  file_size: number;
  file_format: 'excel' | 'csv' | 'json';
  downloaded_at: string;
}

export type PaymentActivity = Purchase & { type: 'payment'; date: string; };
export type DownloadActivity = Download & { type: 'download'; date: string; };
export type Activity = PaymentActivity | DownloadActivity;

export interface Session {
  id: string;
  user_id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  actorRunId?: string;
  datasetId?: string;
  isPaid: boolean;
  packId?: string;
  totalItems?: number;
  downloadUrl?: string;
  downloadToken?: string;
  payment_intent_id?: string | null;
  url?: string;
  // Trial flag for free trial sessions
  is_trial?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserData {
  user: {
    id: number;
    name: string;
    email: string;
    // Indicates if the user has already consumed the one-time free trial
    trial_used?: boolean;
    created_at: string;
  };
  stats: {
    totalScrapes: number;
    totalDownloads: number;
  };
  payments: Purchase[];
  downloads: Session[]; // Changed from Download[] to Session[] to reflect API changes
  sessions: Session[]; // Added to align with backend getDashboardData response
}
