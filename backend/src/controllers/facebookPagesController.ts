import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { sessionService, SessionStatus } from '../services/sessionService';
import { facebookPagesService } from '../services/facebookPagesService';
import { creditService } from '../services/creditService';
import { calculateFacebookPagesCost } from '../services/costEstimationService';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import db from '../database';
import { persistScrapedItems } from '../services/itemPersistenceService';

export class FacebookPagesController {

  async startScrape(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) throw new ApiError(401, 'Authentication required');

      const {
        urls,
        extractInfo = true,
        extractPosts = true,
        extractComments = false,
        postsLimit = 50,
        commentsLimit,
        singlePostUrl,
        dateFrom,
        dateTo,
        incrementalMode = false,
        packId = 'pack-standard',
      } = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        throw new ApiError(400, 'Au moins une URL de page Facebook est requise.');
      }
      if (urls.length > 20) {
        throw new ApiError(400, 'Maximum 20 pages par extraction.');
      }
      for (const url of urls) {
        try {
          const parsed = new URL(url);
          if (!['www.facebook.com', 'facebook.com', 'm.facebook.com'].includes(parsed.hostname)) {
            throw new ApiError(400, `URL invalide: ${url}. Seules les URLs Facebook sont acceptees.`);
          }
        } catch (e) {
          if (e instanceof ApiError) throw e;
          throw new ApiError(400, `URL invalide: ${url}`);
        }
      }

      // Check no active extraction for this user
      const activeSession = await db('scraping_sessions')
        .where({ user_id: userId, scrape_type: 'facebook_pages' })
        .whereIn('status', [SessionStatus.PENDING, SessionStatus.RUNNING])
        .first();
      if (activeSession) {
        throw new ApiError(409, 'Une extraction Facebook Pages est deja en cours.');
      }

      // Estimate cost
      const pageCount = urls.length;
      const postCount = extractPosts ? pageCount * postsLimit : 0;
      const estimate = calculateFacebookPagesCost(
        extractInfo ? pageCount : 0,
        postCount,
        extractComments,
        extractComments ? (commentsLimit || 20) * postCount : 0
      );

      // Reserve credits
      let reservation;
      try {
        reservation = await creditService.reserveCredits(
          userId, estimate, 'facebook_pages',
          `fbpages_${Date.now()}`, `Extraction Facebook Pages (${pageCount} page(s))`
        );
      } catch (error) {
        throw new ApiError(402, 'Credits insuffisants pour cette extraction.');
      }

      // Create session
      const sessionId = `sess_${nanoid(10)}`;
      const extractionConfig = {
        extractInfo, extractPosts, extractComments,
        postsLimit, commentsLimit, singlePostUrl,
        dateFrom, dateTo, incrementalMode,
      };

      await sessionService.createSession({
        id: sessionId,
        user_id: userId,
        status: SessionStatus.PENDING,
        packId,
        scrape_type: 'facebook_pages',
        page_urls: JSON.stringify(urls),
        extraction_config: JSON.stringify(extractionConfig),
        sub_sessions: JSON.stringify([]),
        data_types: JSON.stringify({ extractInfo, extractPosts, extractComments }),
      });

      // Launch pipeline in background
      this.launchPipeline(sessionId, userId, urls, extractionConfig, reservation.id)
        .catch(err => logger.error(`[FBPages] Pipeline error for ${sessionId}:`, err));

      res.status(200).json({ sessionId });
    } catch (error) {
      next(error);
    }
  }

  private async launchPipeline(
    sessionId: string,
    userId: number,
    urls: string[],
    extractionConfig: any,
    reservationId: number
  ): Promise<void> {
    const subSessions: any[] = [];

    try {
      await sessionService.updateSession(sessionId, { status: SessionStatus.RUNNING });

      for (const url of urls) {
        const pageName = this.extractPageName(url);
        const sub: any = { pageName, url };

        if (extractionConfig.extractInfo) {
          try {
            const { runId, datasetId } = await facebookPagesService.startInfoScrape(url);
            sub.infoRunId = runId;
            sub.infoDatasetId = datasetId;
            sub.infoStatus = 'RUNNING';
          } catch (error) {
            logger.error(`[FBPages] Failed to start info scrape for ${url}:`, error);
            sub.infoStatus = 'FAILED';
          }
        }

        if (extractionConfig.extractPosts) {
          try {
            const { runId, datasetId } = await facebookPagesService.startPostsScrape(url, {
              postsLimit: extractionConfig.postsLimit,
              dateFrom: extractionConfig.dateFrom,
              dateTo: extractionConfig.dateTo,
            });
            sub.postsRunId = runId;
            sub.postsDatasetId = datasetId;
            sub.postsStatus = 'RUNNING';
          } catch (error) {
            logger.error(`[FBPages] Failed to start posts scrape for ${url}:`, error);
            sub.postsStatus = 'FAILED';
          }
        }

        subSessions.push(sub);
      }

      // Save initial sub_sessions
      await db('scraping_sessions').where({ id: sessionId }).update({
        sub_sessions: JSON.stringify(subSessions),
        updated_at: new Date(),
      });

      // Poll until complete (max 10 minutes)
      await this.pollUntilComplete(sessionId, subSessions, extractionConfig, 600000);

      // Fetch data for completed runs
      for (const sub of subSessions) {
        if (sub.infoStatus === 'SUCCEEDED' && sub.infoDatasetId) {
          sub.infoData = await facebookPagesService.getDatasetItems(sub.infoDatasetId);
        }
        if (sub.postsStatus === 'SUCCEEDED' && sub.postsDatasetId) {
          sub.postsData = await facebookPagesService.getDatasetItems(sub.postsDatasetId);
        }
      }

      // Persist fetched items to scraped_items table
      for (const sub of subSessions) {
        if (sub.infoData?.length) {
          const infoItems = sub.infoData.map((item: any) => ({
            title: item.name || item.title || sub.pageName || 'Facebook Page',
            price: '',
            desc: item.about || item.description || '',
            image: item.profilePic || item.profilePhoto || '',
            images: [item.profilePic, item.coverPhoto].filter(Boolean),
            location: item.address || item.location || '',
            url: sub.url || '',
            postedAt: '',
          }));
          try {
            await persistScrapedItems(sessionId, userId, infoItems, 'facebook_page_info');
          } catch (err) {
            logger.warn(`[PERSISTENCE] FB info persist failed for ${sessionId}:`, err);
          }
        }
        if (sub.postsData?.length) {
          const postItems = sub.postsData.map((post: any) => ({
            title: (post.text || post.message || '').substring(0, 200) || `Post from ${sub.pageName}`,
            price: '',
            desc: post.text || post.message || '',
            image: post.photoUrl || post.imageUrl || '',
            images: (post.photos || post.images || []).slice(0, 3),
            location: '',
            url: post.url || post.postUrl || '',
            postedAt: post.time || post.date || post.createdTime || '',
          }));
          try {
            await persistScrapedItems(sessionId, userId, postItems, 'facebook_page_post');
          } catch (err) {
            logger.warn(`[PERSISTENCE] FB posts persist failed for ${sessionId}:`, err);
          }
        }
      }

      // Save backup and finalize
      facebookPagesService.saveBackup(sessionId, subSessions);

      const totalItems = subSessions.reduce((sum: number, s: any) =>
        sum + (s.postsData?.length || 0) + (s.infoData?.length || 0), 0);

      await db('scraping_sessions').where({ id: sessionId }).update({
        status: SessionStatus.FINISHED,
        sub_sessions: JSON.stringify(subSessions),
        totalItems,
        hasData: totalItems > 0,
        updated_at: new Date(),
      });

      await creditService.confirmReservation(reservationId);
      logger.info(`[FBPages] Session ${sessionId} completed. ${totalItems} items.`);

    } catch (error) {
      logger.error(`[FBPages] Pipeline failed for ${sessionId}:`, error);
      await sessionService.updateSession(sessionId, { status: SessionStatus.FAILED });
      try { await creditService.cancelReservation(reservationId); } catch {}
    }
  }

  private async pollUntilComplete(sessionId: string, subSessions: any[], extractionConfig: any, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    const POLL_INTERVAL = 5000;

    while (Date.now() - startTime < timeoutMs) {
      let allDone = true;

      for (const sub of subSessions) {
        if (extractionConfig.extractInfo && sub.infoRunId && sub.infoStatus === 'RUNNING') {
          sub.infoStatus = await facebookPagesService.getRunStatus(sub.infoRunId);
          if (sub.infoStatus === 'RUNNING') allDone = false;
        }
        if (extractionConfig.extractPosts && sub.postsRunId && sub.postsStatus === 'RUNNING') {
          sub.postsStatus = await facebookPagesService.getRunStatus(sub.postsRunId);
          if (sub.postsStatus === 'RUNNING') allDone = false;
        }
      }

      await db('scraping_sessions').where({ id: sessionId }).update({
        sub_sessions: JSON.stringify(subSessions),
        updated_at: new Date(),
      });

      if (allDone) return;
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }

    for (const sub of subSessions) {
      if (sub.infoStatus === 'RUNNING') sub.infoStatus = 'TIMED-OUT';
      if (sub.postsStatus === 'RUNNING') sub.postsStatus = 'TIMED-OUT';
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) throw new ApiError(401, 'Authentication required');

      const session = await db('scraping_sessions').where({ id: sessionId }).first();
      if (!session) throw new ApiError(404, 'Session not found');
      if (session.user_id !== userId) throw new ApiError(403, 'Not authorized');

      const subSessions = typeof session.sub_sessions === 'string'
        ? JSON.parse(session.sub_sessions || '[]')
        : (session.sub_sessions || []);

      const extractionConfig = typeof session.extraction_config === 'string'
        ? JSON.parse(session.extraction_config || '{}')
        : (session.extraction_config || {});

      const { status: computedStatus, progress } = facebookPagesService.computeOverallStatus(subSessions, extractionConfig);

      const overallStatus = session.status === SessionStatus.FINISHED ? 'SUCCEEDED'
        : session.status === SessionStatus.FAILED ? 'FAILED'
        : computedStatus;

      res.json({
        sessionId,
        overallStatus,
        progress: overallStatus === 'SUCCEEDED' ? 100 : progress,
        subSessions: subSessions.map((s: any) => ({
          pageName: s.pageName,
          url: s.url,
          infoRunId: s.infoRunId,
          infoStatus: s.infoStatus,
          infoDatasetId: s.infoDatasetId,
          postsRunId: s.postsRunId,
          postsStatus: s.postsStatus,
          postsDatasetId: s.postsDatasetId,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPageInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) throw new ApiError(401, 'Authentication required');

      const session = await db('scraping_sessions').where({ id: sessionId }).first();
      if (!session) throw new ApiError(404, 'Session not found');
      if (session.user_id !== userId) throw new ApiError(403, 'Not authorized');

      const { pageName } = req.query;
      const backup = facebookPagesService.readBackup(sessionId);
      if (!backup) throw new ApiError(404, 'Session data not found');

      const infoData: any[] = [];
      for (const sub of backup.subSessions || []) {
        if (!pageName || sub.pageName === pageName) {
          if (sub.infoData?.length) infoData.push(...sub.infoData);
        }
      }

      if (infoData.length === 0) throw new ApiError(404, 'No page info found');
      res.json(infoData.length === 1 ? infoData[0] : infoData);
    } catch (error) {
      next(error);
    }
  }

  async getPagePosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) throw new ApiError(401, 'Authentication required');

      const session = await db('scraping_sessions').where({ id: sessionId }).first();
      if (!session) throw new ApiError(404, 'Session not found');
      if (session.user_id !== userId) throw new ApiError(403, 'Not authorized');

      const { pageName } = req.query;
      const backup = facebookPagesService.readBackup(sessionId);
      if (!backup) throw new ApiError(404, 'Session data not found');

      const postsData: any[] = [];
      for (const sub of backup.subSessions || []) {
        if (!pageName || sub.pageName === pageName) {
          if (sub.postsData) postsData.push(...sub.postsData);
        }
      }

      res.json(postsData);
    } catch (error) {
      next(error);
    }
  }

  private extractPageName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      return pathParts[0] || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

export const facebookPagesController = new FacebookPagesController();
