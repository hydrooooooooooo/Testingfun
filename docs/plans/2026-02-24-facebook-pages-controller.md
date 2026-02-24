# Facebook Pages Controller Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the missing backend controller and routes that the frontend `FacebookPagesPage.tsx` already calls, enabling the full Facebook Pages scraping pipeline (page info + posts + status polling + data retrieval + export).

**Architecture:** Create a `facebookPagesController.ts` that orchestrates multi-step Apify scraping (info actor + posts actor per page), stores progress in `scraping_sessions.sub_sessions` JSONB column, and exposes REST endpoints matching the frontend's expected API contract. Reuse `ApifyClient` SDK (not raw axios like benchmarkService). Use the credit reservation pattern (reserve before, confirm/cancel after) from `creditService`.

**Tech Stack:** Express, TypeScript, Knex, ApifyClient SDK, creditService, sessionService, costEstimationService

---

## Frontend API Contract (what already exists and expects these endpoints)

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 1 | POST | `/api/scrape/facebook-pages` | Start scraping |
| 2 | GET | `/api/scrape/facebook-pages/:sessionId/status` | Poll progress |
| 3 | GET | `/api/sessions/facebook-pages/:sessionId/info` | Get page info data |
| 4 | GET | `/api/sessions/facebook-pages/:sessionId/posts` | Get posts data |
| 5 | GET | `/api/export/facebook-pages` | Export data as file |

### Request/Response contracts

**POST /api/scrape/facebook-pages** (from `FacebookPagesPage.tsx:76-84`)
```typescript
// Request body:
{
  urls: string[];            // Facebook page URLs (max 20)
  extractInfo: boolean;
  extractPosts: boolean;
  extractComments: boolean;
  postsLimit: number;        // 10-500
  commentsLimit?: number;    // 20, 50, 100, 200
  singlePostUrl?: string;
  dateFrom?: string;         // YYYY-MM-DD
  dateTo?: string;
  incrementalMode: boolean;
  packId: string;
}
// Success response: { sessionId: string }
// Error 402: insufficient credits
// Error 409: extraction already in progress
```

**GET /api/scrape/facebook-pages/:sessionId/status** (from `useFacebookPagesPolling.ts:5-21`)
```typescript
// Response:
{
  sessionId: string;
  overallStatus: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  progress: number;          // 0-100
  subSessions: Array<{
    pageName: string;
    url: string;
    infoRunId?: string;
    infoStatus?: string;
    infoDatasetId?: string;
    postsRunId?: string;
    postsStatus?: string;
    postsDatasetId?: string;
  }>;
}
```

**GET /api/sessions/facebook-pages/:sessionId/info** (from `SessionItemsView.tsx:590-604`)
```typescript
// Query: ?pageName=xxx (optional)
// Response: page info object (from Apify facebook-pages-scraper)
```

**GET /api/sessions/facebook-pages/:sessionId/posts** (from `SessionItemsView.tsx:333-348`)
```typescript
// Query: ?pageName=xxx (optional)
// Response: array of post objects (from Apify facebook-posts-scraper)
```

---

## Task 1: Create the FacebookPages service

**Files:**
- Create: `backend/src/services/facebookPagesService.ts`

**Step 1: Create the service file**

This service wraps ApifyClient to scrape Facebook pages. It manages the multi-step pipeline (info + posts per page) and stores results as backup JSON files.

```typescript
import { ApifyClient } from 'apify-client';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

interface SubSession {
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
}

interface ScrapeOptions {
  extractInfo: boolean;
  extractPosts: boolean;
  postsLimit: number;
  dateFrom?: string;
  dateTo?: string;
}

class FacebookPagesService {
  private client: ApifyClient;

  constructor() {
    this.client = new ApifyClient({ token: config.api.apifyToken });
  }

  /**
   * Start info scraping for a single page. Returns the Apify run ID and dataset ID.
   */
  async startInfoScrape(pageUrl: string): Promise<{ runId: string; datasetId: string }> {
    const actorId = config.api.apifyPagesInfoActorId;
    logger.info(`[FBPages] Starting info scrape for ${pageUrl} with actor ${actorId}`);

    const run = await Promise.race([
      this.client.actor(actorId).start({ startUrls: [{ url: pageUrl }] }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Apify info actor start timeout')), 60000)),
    ]);

    return { runId: run.id, datasetId: run.defaultDatasetId };
  }

  /**
   * Start posts scraping for a single page.
   */
  async startPostsScrape(pageUrl: string, options: { postsLimit: number; dateFrom?: string; dateTo?: string }): Promise<{ runId: string; datasetId: string }> {
    const actorId = config.api.apifyPagesPostsActorId;
    logger.info(`[FBPages] Starting posts scrape for ${pageUrl} with actor ${actorId}, limit: ${options.postsLimit}`);

    const input: any = {
      startUrls: [{ url: pageUrl }],
      resultsLimit: options.postsLimit,
    };
    if (options.dateFrom) input.startDate = options.dateFrom;
    if (options.dateTo) input.endDate = options.dateTo;

    const run = await Promise.race([
      this.client.actor(actorId).start(input),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Apify posts actor start timeout')), 60000)),
    ]);

    return { runId: run.id, datasetId: run.defaultDatasetId };
  }

  /**
   * Check the status of an Apify run.
   */
  async getRunStatus(runId: string): Promise<string> {
    try {
      const run = await this.client.run(runId).get();
      return run?.status || 'UNKNOWN';
    } catch (error) {
      logger.error(`[FBPages] Error checking run status for ${runId}:`, error);
      return 'ERROR';
    }
  }

  /**
   * Get dataset items for a completed run.
   */
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

  /**
   * Compute overall status from subSessions.
   */
  computeOverallStatus(subSessions: SubSession[], options: ScrapeOptions): { status: string; progress: number } {
    if (!subSessions || subSessions.length === 0) return { status: 'RUNNING', progress: 0 };

    let totalSteps = 0;
    let completedSteps = 0;
    let hasFailed = false;

    for (const sub of subSessions) {
      if (options.extractInfo) {
        totalSteps++;
        if (sub.infoStatus === 'SUCCEEDED') completedSteps++;
        if (sub.infoStatus === 'FAILED' || sub.infoStatus === 'TIMED-OUT' || sub.infoStatus === 'ABORTED') hasFailed = true;
      }
      if (options.extractPosts) {
        totalSteps++;
        if (sub.postsStatus === 'SUCCEEDED') completedSteps++;
        if (sub.postsStatus === 'FAILED' || sub.postsStatus === 'TIMED-OUT' || sub.postsStatus === 'ABORTED') hasFailed = true;
      }
    }

    if (totalSteps === 0) return { status: 'SUCCEEDED', progress: 100 };
    const progress = Math.round((completedSteps / totalSteps) * 100);

    if (completedSteps === totalSteps) return { status: 'SUCCEEDED', progress: 100 };
    if (hasFailed && completedSteps + 1 >= totalSteps) return { status: 'FAILED', progress };
    return { status: 'RUNNING', progress };
  }

  /**
   * Save backup JSON file for a Facebook Pages session.
   */
  saveBackup(sessionId: string, subSessions: SubSession[]): void {
    try {
      const backupDir = path.join(__dirname, '../../data/backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const filePath = path.join(backupDir, `fbpages_${sessionId}.json`);
      const data = {
        sessionId,
        timestamp: new Date().toISOString(),
        totalPages: subSessions.length,
        subSessions,
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      logger.info(`[FBPages] Backup saved: ${filePath}`);
    } catch (error) {
      logger.error(`[FBPages] Error saving backup for ${sessionId}:`, error);
    }
  }

  /**
   * Read backup JSON file for a session.
   */
  readBackup(sessionId: string): any | null {
    try {
      const filePath = path.join(__dirname, '../../data/backups', `fbpages_${sessionId}.json`);
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }
}

export const facebookPagesService = new FacebookPagesService();
```

**Step 2: Verify**

Run: `cd backend && npx tsc --noEmit 2>&1 | grep facebookPagesService || echo "OK"`

**Step 3: Commit**

```bash
git add backend/src/services/facebookPagesService.ts
git commit -m "feat: create facebookPagesService with ApifyClient SDK"
```

---

## Task 2: Create the FacebookPages controller

**Files:**
- Create: `backend/src/controllers/facebookPagesController.ts`

**Step 1: Create the controller**

This controller handles:
1. `startScrape` - validates input, checks credits, creates session, launches Apify actors per page
2. `getStatus` - reads sub_sessions from DB, polls Apify for each incomplete run, updates DB
3. `getPageInfo` - returns page info from backup file
4. `getPagePosts` - returns posts data from backup file

```typescript
import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { sessionService, SessionStatus } from '../services/sessionService';
import { facebookPagesService } from '../services/facebookPagesService';
import { creditService } from '../services/creditService';
import { costEstimationService } from '../services/costEstimationService';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import db from '../database';

export class FacebookPagesController {

  /**
   * POST /api/scrape/facebook-pages
   * Start a Facebook Pages scraping session
   */
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

      // Validate URLs
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        throw new ApiError(400, 'Au moins une URL de page Facebook est requise.');
      }
      if (urls.length > 20) {
        throw new ApiError(400, 'Maximum 20 pages par extraction.');
      }

      // Check no active extraction for this user
      const activeSessions = await db('scraping_sessions')
        .where({ user_id: userId, scrape_type: 'facebook_pages' })
        .whereIn('status', [SessionStatus.PENDING, SessionStatus.RUNNING])
        .first();
      if (activeSessions) {
        throw new ApiError(409, 'Une extraction Facebook Pages est deja en cours.');
      }

      // Estimate cost and check credits
      const pageCount = urls.length;
      const postCount = extractPosts ? pageCount * postsLimit : 0;
      const estimate = costEstimationService.calculateFacebookPagesCost(
        extractInfo ? pageCount : 0,
        postCount,
        extractComments,
        extractComments ? (commentsLimit || 20) * postCount : 0
      );

      // Reserve credits (will be confirmed or cancelled later)
      let reservation;
      try {
        reservation = await creditService.reserveCredits(
          userId, estimate, 'facebook_pages',
          undefined, `Extraction Facebook Pages (${pageCount} page(s))`
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
      } as any);

      // Launch Apify actors for each page (non-blocking)
      this.launchScrapingPipeline(sessionId, userId, urls, extractionConfig, reservation.id)
        .catch(err => logger.error(`[FBPages] Pipeline error for ${sessionId}:`, err));

      res.status(200).json({ sessionId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Launch the multi-page scraping pipeline in background
   */
  private async launchScrapingPipeline(
    sessionId: string,
    userId: number,
    urls: string[],
    config: any,
    reservationId: number
  ): Promise<void> {
    const subSessions: any[] = [];

    try {
      // Update session to RUNNING
      await sessionService.updateSession(sessionId, { status: SessionStatus.RUNNING });

      // For each page URL, start the Apify actors
      for (const url of urls) {
        const pageName = this.extractPageName(url);
        const sub: any = { pageName, url };

        if (config.extractInfo) {
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

        if (config.extractPosts) {
          try {
            const { runId, datasetId } = await facebookPagesService.startPostsScrape(url, {
              postsLimit: config.postsLimit,
              dateFrom: config.dateFrom,
              dateTo: config.dateTo,
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

      // Save initial sub_sessions to DB
      await db('scraping_sessions').where({ id: sessionId }).update({
        sub_sessions: JSON.stringify(subSessions),
        updated_at: new Date(),
      });

      // Poll until all runs complete (max 10 minutes)
      await this.pollUntilComplete(sessionId, subSessions, config, 600000);

      // Fetch data for completed runs
      for (const sub of subSessions) {
        if (sub.infoStatus === 'SUCCEEDED' && sub.infoDatasetId) {
          sub.infoData = await facebookPagesService.getDatasetItems(sub.infoDatasetId);
        }
        if (sub.postsStatus === 'SUCCEEDED' && sub.postsDatasetId) {
          sub.postsData = await facebookPagesService.getDatasetItems(sub.postsDatasetId);
        }
      }

      // Save backup and update session
      facebookPagesService.saveBackup(sessionId, subSessions);

      const totalItems = subSessions.reduce((sum, s) => sum + (s.postsData?.length || 0) + (s.infoData?.length || 0), 0);

      await db('scraping_sessions').where({ id: sessionId }).update({
        status: SessionStatus.FINISHED,
        sub_sessions: JSON.stringify(subSessions),
        totalItems,
        hasData: totalItems > 0,
        updated_at: new Date(),
      });

      // Confirm credit reservation
      await creditService.confirmReservation(reservationId);
      logger.info(`[FBPages] Session ${sessionId} completed. ${totalItems} items total.`);

    } catch (error) {
      logger.error(`[FBPages] Pipeline failed for ${sessionId}:`, error);
      await sessionService.updateSession(sessionId, { status: SessionStatus.FAILED });
      // Cancel credit reservation on failure
      try { await creditService.cancelReservation(reservationId); } catch {}
    }
  }

  /**
   * Poll Apify runs until all complete or timeout
   */
  private async pollUntilComplete(sessionId: string, subSessions: any[], config: any, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    const POLL_INTERVAL = 5000;

    while (Date.now() - startTime < timeoutMs) {
      let allDone = true;

      for (const sub of subSessions) {
        if (config.extractInfo && sub.infoRunId && sub.infoStatus === 'RUNNING') {
          sub.infoStatus = await facebookPagesService.getRunStatus(sub.infoRunId);
          if (sub.infoStatus === 'RUNNING') allDone = false;
        }
        if (config.extractPosts && sub.postsRunId && sub.postsStatus === 'RUNNING') {
          sub.postsStatus = await facebookPagesService.getRunStatus(sub.postsRunId);
          if (sub.postsStatus === 'RUNNING') allDone = false;
        }
      }

      // Save progress to DB
      await db('scraping_sessions').where({ id: sessionId }).update({
        sub_sessions: JSON.stringify(subSessions),
        updated_at: new Date(),
      });

      if (allDone) return;
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }

    // Timeout - mark remaining as timed out
    for (const sub of subSessions) {
      if (sub.infoStatus === 'RUNNING') sub.infoStatus = 'TIMED-OUT';
      if (sub.postsStatus === 'RUNNING') sub.postsStatus = 'TIMED-OUT';
    }
  }

  /**
   * GET /api/scrape/facebook-pages/:sessionId/status
   * Get the current status of a FB pages scraping session
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const session = await db('scraping_sessions').where({ id: sessionId }).first();

      if (!session) throw new ApiError(404, 'Session not found');

      const subSessions = typeof session.sub_sessions === 'string'
        ? JSON.parse(session.sub_sessions || '[]')
        : (session.sub_sessions || []);

      const extractionConfig = typeof session.extraction_config === 'string'
        ? JSON.parse(session.extraction_config || '{}')
        : (session.extraction_config || {});

      const { status: overallStatus, progress } = facebookPagesService.computeOverallStatus(subSessions, extractionConfig);

      // Use session.status if it's already terminal (FINISHED/FAILED)
      const finalStatus = session.status === SessionStatus.FINISHED ? 'SUCCEEDED'
        : session.status === SessionStatus.FAILED ? 'FAILED'
        : overallStatus;

      res.json({
        sessionId,
        overallStatus: finalStatus,
        progress: finalStatus === 'SUCCEEDED' ? 100 : finalStatus === 'FAILED' ? progress : progress,
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

  /**
   * GET /api/sessions/facebook-pages/:sessionId/info
   * Get page info data for a session (reads from backup)
   */
  async getPageInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { pageName } = req.query;

      const backup = facebookPagesService.readBackup(sessionId);
      if (!backup) throw new ApiError(404, 'Session data not found');

      let infoData: any[] = [];
      for (const sub of backup.subSessions || []) {
        if (!pageName || sub.pageName === pageName) {
          if (sub.infoData && sub.infoData.length > 0) {
            infoData.push(...sub.infoData);
          }
        }
      }

      if (infoData.length === 0) throw new ApiError(404, 'No page info found');
      res.json(infoData.length === 1 ? infoData[0] : infoData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sessions/facebook-pages/:sessionId/posts
   * Get posts data for a session (reads from backup)
   */
  async getPagePosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { pageName } = req.query;

      const backup = facebookPagesService.readBackup(sessionId);
      if (!backup) throw new ApiError(404, 'Session data not found');

      let postsData: any[] = [];
      for (const sub of backup.subSessions || []) {
        if (!pageName || sub.pageName === pageName) {
          if (sub.postsData) {
            postsData.push(...sub.postsData);
          }
        }
      }

      res.json(postsData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Extract page name from a Facebook URL
   */
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
```

**Step 2: Verify**

Run: `cd backend && npx tsc --noEmit 2>&1 | grep facebookPagesController || echo "OK"`

**Step 3: Commit**

```bash
git add backend/src/controllers/facebookPagesController.ts
git commit -m "feat: create facebookPagesController with full scraping pipeline"
```

---

## Task 3: Create the Facebook Pages routes and wire them

**Files:**
- Create: `backend/src/routes/facebookPagesRoutes.ts`
- Modify: `backend/src/routes/scrapeRoutes.ts` (mount FB pages sub-routes)
- Modify: `backend/src/routes/sessionRoutes.ts` (add FB pages data endpoints)

The frontend calls:
- `POST /scrape/facebook-pages` -> mounted under `/api/scrape`
- `GET /scrape/facebook-pages/:sessionId/status` -> mounted under `/api/scrape`
- `GET /sessions/facebook-pages/:sessionId/info` -> mounted under `/api/sessions`
- `GET /sessions/facebook-pages/:sessionId/posts` -> mounted under `/api/sessions`

**Step 1: Create the Facebook Pages routes file**

```typescript
// backend/src/routes/facebookPagesRoutes.ts
import { Router } from 'express';
import { facebookPagesController } from '../controllers/facebookPagesController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// POST /api/scrape/facebook-pages - Start scraping
router.post('/', protect, facebookPagesController.startScrape.bind(facebookPagesController));

// GET /api/scrape/facebook-pages/:sessionId/status - Poll status
router.get('/:sessionId/status', protect, facebookPagesController.getStatus.bind(facebookPagesController));

export { router as facebookPagesRoutes };
```

**Step 2: Mount in scrapeRoutes.ts**

In `backend/src/routes/scrapeRoutes.ts`, add at the top:
```typescript
import { facebookPagesRoutes } from './facebookPagesRoutes';
```

And before the `export` line, add:
```typescript
// Mount Facebook Pages sub-routes
router.use('/facebook-pages', facebookPagesRoutes);
```

**Step 3: Add FB pages data endpoints to sessionRoutes.ts**

In `backend/src/routes/sessionRoutes.ts`, add:
```typescript
import { facebookPagesController } from '../controllers/facebookPagesController';
```

And add routes:
```typescript
// Facebook Pages data endpoints
router.get('/facebook-pages/:sessionId/info', protect, facebookPagesController.getPageInfo.bind(facebookPagesController));
router.get('/facebook-pages/:sessionId/posts', protect, facebookPagesController.getPagePosts.bind(facebookPagesController));
```

**Step 4: Add CSRF exemption for the new scraping endpoint (it sends JSON from frontend, but just in case)**

No CSRF exemption needed - the frontend already sends the CSRF token via the `api` axios instance.

**Step 5: Verify**

Run: `cd backend && npx tsc --noEmit 2>&1 | grep -E "(facebookPages|scrapeRoutes|sessionRoutes)" || echo "OK"`

**Step 6: Commit**

```bash
git add backend/src/routes/facebookPagesRoutes.ts backend/src/routes/scrapeRoutes.ts backend/src/routes/sessionRoutes.ts
git commit -m "feat: wire Facebook Pages routes into scrape and session routers"
```

---

## Task 4: Add session type fields to Session interface

**Problem:** The `scraping_sessions` table has columns `scrape_type`, `page_urls`, `extraction_config`, `sub_sessions`, `data_types` (added by migration `20251120000000`), but the `Session` interface in `sessionService.ts` doesn't declare them. This causes `as any` casts.

**Files:**
- Modify: `backend/src/services/sessionService.ts` (add fields to Session interface)

**Step 1: Add missing fields to Session interface**

In `backend/src/services/sessionService.ts`, add these optional fields to the `Session` interface:

```typescript
  // Facebook Pages fields (from migration 20251120000000)
  scrape_type?: string;
  page_urls?: string;           // JSON string of URL array
  extraction_config?: string;   // JSON string of config object
  sub_sessions?: string;        // JSON string of SubSession array
  data_types?: string;          // JSON string of data types object
```

**Step 2: Update previewItems serialization to also handle sub_sessions**

In the `updateSession` method, after the `previewItems` serialization block, add:

```typescript
    if (updates.sub_sessions && typeof updates.sub_sessions !== 'string') {
      updates.sub_sessions = JSON.stringify(updates.sub_sessions);
    }
```

**Step 3: Verify**

Run: `cd backend && npx tsc --noEmit 2>&1 | grep sessionService || echo "OK"`

**Step 4: Commit**

```bash
git add backend/src/services/sessionService.ts
git commit -m "feat: add Facebook Pages fields to Session interface"
```

---

## Task 5: Create Facebook Pages export endpoint

**Problem:** The frontend calls `GET /api/export/facebook-pages?sessionId=X&fileType=zip|info|posts` but no such endpoint exists.

**Files:**
- Modify: `backend/src/routes/exportRoutes.ts` (add FB pages export route)
- Modify: `backend/src/controllers/exportController.ts` (add export method)

**Step 1: Read both files first**

Read `backend/src/routes/exportRoutes.ts` and `backend/src/controllers/exportController.ts` to understand the existing pattern.

**Step 2: Add FB pages export route**

In `exportRoutes.ts`, add a new route:

```typescript
import { facebookPagesController } from '../controllers/facebookPagesController';

// Add before the export line:
router.get('/facebook-pages', protect, exportController.exportFacebookPages.bind(exportController));
```

**Step 3: Add exportFacebookPages method to exportController**

In `exportController.ts`, add a new method to the `ExportController` class:

```typescript
  /**
   * GET /api/export/facebook-pages
   * Export Facebook Pages data as JSON (page info and/or posts)
   */
  async exportFacebookPages(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = (req.query.sessionId || req.query.session_id) as string;
      const fileType = (req.query.fileType || 'zip') as string;
      const pageName = req.query.pageName as string | undefined;

      if (!sessionId) throw new ApiError(400, 'Session ID is required');

      const userId = (req as any).user?.id;
      const session = await db('scraping_sessions').where({ id: sessionId }).first();
      if (!session) throw new ApiError(404, 'Session not found');
      if (session.user_id !== userId) throw new ApiError(403, 'Not authorized');

      // Read from backup file
      const backupPath = path.join(__dirname, '../../data/backups', `fbpages_${sessionId}.json`);
      if (!fs.existsSync(backupPath)) {
        throw new ApiError(404, 'Session data not found. The extraction may still be in progress.');
      }

      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      let responseData: any;

      if (fileType === 'info') {
        responseData = [];
        for (const sub of backupData.subSessions || []) {
          if (!pageName || sub.pageName === pageName) {
            responseData.push(...(sub.infoData || []));
          }
        }
      } else if (fileType === 'posts') {
        responseData = [];
        for (const sub of backupData.subSessions || []) {
          if (!pageName || sub.pageName === pageName) {
            responseData.push(...(sub.postsData || []));
          }
        }
      } else {
        // 'zip' or default - return everything
        responseData = backupData;
      }

      const jsonStr = JSON.stringify(responseData, null, 2);
      const buffer = Buffer.from(jsonStr, 'utf-8');
      const filename = `facebook_pages_${sessionId}_${fileType}_${Date.now()}.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
```

**Step 4: Add required imports to exportController if missing**

Make sure `db` import exists: `import db from '../database';`

**Step 5: Verify**

Run: `cd backend && npx tsc --noEmit 2>&1 | grep -E "(exportController|exportRoutes)" || echo "OK"`

**Step 6: Commit**

```bash
git add backend/src/controllers/exportController.ts backend/src/routes/exportRoutes.ts
git commit -m "feat: add Facebook Pages export endpoint"
```

---

## Summary

| Task | What it creates | Endpoints |
|------|----------------|-----------|
| 1 | `facebookPagesService.ts` | (internal service) |
| 2 | `facebookPagesController.ts` | (controller logic) |
| 3 | Routes wiring | `POST /api/scrape/facebook-pages`, `GET .../status`, `GET .../info`, `GET .../posts` |
| 4 | Session interface update | (type safety) |
| 5 | Export endpoint | `GET /api/export/facebook-pages` |

**Total: 5 tasks, 3 new files, 4 modified files**

After implementation, the full Facebook Pages pipeline will work:
1. Frontend form submits to `POST /api/scrape/facebook-pages`
2. Backend creates session, reserves credits, launches Apify actors per page
3. Frontend polls `GET .../status` every 5 seconds
4. Backend polls Apify, updates sub_sessions in DB, saves backup on completion
5. Frontend navigates to dashboard, fetches info/posts via `GET .../info` and `GET .../posts`
6. User exports data via `GET /api/export/facebook-pages`

## Deferred

- **Comment scraping integration**: The `extractComments` flag is accepted but not yet wired to `commentScraperService`. Requires the comment routes (now mounted in Phase 5) to work first.
- **Incremental mode**: The `incrementalMode` flag is accepted but not yet wired to `incrementalScrapeService`. Requires missing Knex migrations for `facebook_page_tracking` table.
- **AI analysis**: `POST /api/sessions/facebook-pages/:sessionId/ai-analysis/page` is called by the frontend but requires OpenRouter integration (separate plan).
