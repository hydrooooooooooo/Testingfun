export interface UserData {
  user: {
    name: string;
    email: string;
    created_at: string;
  };
  stats: {
    totalPayments: { count: number };
    totalDownloads: { count: number };
    totalScrapingJobs: { count: number };
  };
  payments: any[]; 
  downloads: any[];
}
