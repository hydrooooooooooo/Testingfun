export interface ScrapingJob {
  id: number;
  userId: number;
  sessionId: string;
  url: string;
  totalItems: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  packPurchased: string; // pack utilisé pour ce scraping
  paymentId: number;
  exportFormats: string[];
  filePaths: string[];
}
