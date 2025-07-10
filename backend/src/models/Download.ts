export interface Download {
  id: number;
  userId: number;
  scrapingJobId: number;
  format: 'excel' | 'csv';
  filePath: string;
  downloadedAt: Date;
  ipAddress: string;
}
