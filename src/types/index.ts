export interface Purchase {
  id: number;
  user_id: number;
  session_id: string;
  pack_id: string;
  payment_intent_id: string;
  amount_paid: number;
  currency: string;
  download_url: string;
  purchased_at: string;
}

export interface Download {
  id: number;
  user_id: number;
  session_id: string;
  file_format: 'excel' | 'csv' | 'json';
  downloaded_at: string;
}

export interface UserData {
  user: {
    id: number;
    name: string;
    email: string;
    created_at: string;
  };
  stats: {
    totalScrapes: number;
    totalDownloads: number;
  };
  payments: Purchase[];
  downloads: Download[];
}
