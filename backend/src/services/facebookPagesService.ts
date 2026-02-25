import { ApifyClient } from 'apify-client';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { readBackup as readBackupFile } from './backupService';

export interface SubSession {
  pageName: string;
  url: string;
  infoRunId?: string;
  infoStatus?: string;
  infoDatasetId?: string;
  infoData?: any[];
  postsRunId?: string;
  postsStatus?: string;
  postsDatasetId?: string;
  postsData?: any[];
  commentsRunId?: string;
  commentsStatus?: string;
  commentsDatasetId?: string;
  commentsData?: any[];
}

export interface ScrapeOptions {
  extractInfo: boolean;
  extractPosts: boolean;
  extractComments?: boolean;
  postsLimit: number;
  dateFrom?: string;
  dateTo?: string;
}

class FacebookPagesService {
  private client: ApifyClient;

  constructor() {
    this.client = new ApifyClient({ token: config.api.apifyToken });
  }

  async startInfoScrape(pageUrl: string): Promise<{ runId: string; datasetId: string }> {
    const actorId = config.api.apifyPagesInfoActorId;
    logger.info(`[FBPages] Starting info scrape for ${pageUrl} with actor ${actorId}`);

    const run = await Promise.race([
      this.client.actor(actorId).start({ startUrls: [{ url: pageUrl }] }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Apify info actor start timeout')), 60000)),
    ]);

    return { runId: run.id, datasetId: run.defaultDatasetId };
  }

  async startPostsScrape(pageUrl: string, options: { postsLimit: number; dateFrom?: string; dateTo?: string }): Promise<{ runId: string; datasetId: string }> {
    const actorId = config.api.apifyPagesPostsActorId;
    logger.info(`[FBPages] Starting posts scrape for ${pageUrl} with actor ${actorId}, limit: ${options.postsLimit}`);

    const input: any = {
      startUrls: [{ url: pageUrl }],
      resultsLimit: options.postsLimit,
      captionText: true,
    };
    if (options.dateFrom) input.onlyPostsNewerThan = options.dateFrom;
    if (options.dateTo) input.onlyPostsOlderThan = options.dateTo;

    const run = await Promise.race([
      this.client.actor(actorId).start(input),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Apify posts actor start timeout')), 60000)),
    ]);

    return { runId: run.id, datasetId: run.defaultDatasetId };
  }

  async getRunStatus(runId: string): Promise<string> {
    try {
      const run = await this.client.run(runId).get();
      return run?.status || 'UNKNOWN';
    } catch (error) {
      logger.error(`[FBPages] Error checking run status for ${runId}:`, error);
      return 'ERROR';
    }
  }

  async getDatasetItems(datasetId: string): Promise<any[]> {
    try {
      const { items } = await Promise.race([
        this.client.dataset(datasetId).listItems(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Dataset fetch timeout')), 30000)),
      ]);
      return items || [];
    } catch (error) {
      logger.error(`[FBPages] Error fetching dataset ${datasetId}:`, error);
      return [];
    }
  }

  computeOverallStatus(subSessions: SubSession[], options: ScrapeOptions): { status: string; progress: number } {
    if (!subSessions || subSessions.length === 0) return { status: 'RUNNING', progress: 0 };

    let totalSteps = 0;
    let succeededSteps = 0;
    let failedSteps = 0;
    const TERMINAL_STATUSES = ['FAILED', 'TIMED-OUT', 'ABORTED', 'ERROR'];

    for (const sub of subSessions) {
      if (options.extractInfo) {
        totalSteps++;
        if (sub.infoStatus === 'SUCCEEDED') succeededSteps++;
        if (TERMINAL_STATUSES.includes(sub.infoStatus || '')) failedSteps++;
      }
      if (options.extractPosts) {
        totalSteps++;
        if (sub.postsStatus === 'SUCCEEDED') succeededSteps++;
        if (TERMINAL_STATUSES.includes(sub.postsStatus || '')) failedSteps++;
      }
      if (options.extractComments && sub.commentsRunId) {
        totalSteps++;
        if (sub.commentsStatus === 'SUCCEEDED') succeededSteps++;
        if (TERMINAL_STATUSES.includes(sub.commentsStatus || '')) failedSteps++;
      }
    }

    if (totalSteps === 0) return { status: 'SUCCEEDED', progress: 100 };

    const finishedSteps = succeededSteps + failedSteps;
    const progress = Math.round((finishedSteps / totalSteps) * 100);

    if (finishedSteps === totalSteps) {
      return { status: failedSteps > 0 ? 'FAILED' : 'SUCCEEDED', progress: 100 };
    }
    return { status: 'RUNNING', progress };
  }

  readBackup(sessionId: string): any | null {
    return readBackupFile(sessionId, 'fbpages');
  }
}

export const facebookPagesService = new FacebookPagesService();
