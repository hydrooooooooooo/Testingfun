import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { apifyService } from '../services/apifyService';
import { sessionService, Session, SessionStatus } from '../services/sessionService';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import fs from 'fs';
import path from 'path';
import db from '../database';
import { persistScrapedItems } from '../services/itemPersistenceService';

export class ScrapeController {
  /**
   * Start a new scraping job
   */
  async startScrape(req: Request, res: Response, next: NextFunction) {
    const { url, packId } = req.body;
    let { sessionId, resultsLimit, deepScrape, getProfileUrls } = req.body;
    let session: Session | null = null;

    // Convertir resultsLimit en nombre et valider
    const limit = resultsLimit ? parseInt(resultsLimit, 10) : 3;
    const validLimit = !isNaN(limit) && limit > 0 ? limit : 3;

    // Préparer les options de scraping
    const scrapingOptions = {
      deepScrape: deepScrape !== undefined ? Boolean(deepScrape) : (validLimit > 5),
      getProfileUrls: getProfileUrls !== undefined ? Boolean(getProfileUrls) : false
    };

    try {
      // Validate URL
      if (!url || !this.isValidMarketplaceUrl(url)) {
        throw new ApiError(400, 'URL invalide. Veuillez fournir une URL Facebook ou LinkedIn Marketplace valide.');
      }

      // Generate session ID if not provided
      if (!sessionId) {
        sessionId = `sess_${nanoid(10)}`;
      }

      logger.info(`Starting scrape for URL: ${url}, sessionId: ${sessionId}, options:`, scrapingOptions);

      // Get user ID from authenticated request
      const userId = (req as any).user?.id;

      // Create session record with PENDING status first
      session = await sessionService.createSession({
        id: sessionId,
        status: SessionStatus.PENDING,
        isPaid: false,
        user_id: userId, // Attach user if available
        packId: packId, // Attach packId
        url: url,
      });

      // Log search event
      try {
        const domain = (() => {
          try { return new URL(url).hostname; } catch { return null; }
        })();
        await db('search_events').insert({
          user_id: userId || null,
          session_id: sessionId,
          url,
          domain,
          status: 'PENDING',
        });
      } catch (e) {
        logger.warn('Failed to log search event', e);
      }

      // Start APIFY scraping job with options
      const { datasetId, actorRunId } = await apifyService.startScraping(url, sessionId, validLimit, scrapingOptions);

      // Update session with RUNNING status and Apify details
      session = await sessionService.updateSession(sessionId, {
        datasetId,
        actorRunId,
        status: SessionStatus.RUNNING
      });

      res.status(200).json({
        status: 'success',
        data: {
          sessionId,
          datasetId,
          actorRunId,
          status: session?.status || SessionStatus.PENDING
        }
      });
    } catch (error) {
      // If we have a session, update it with FAILED status
      if (session && sessionId) {
        await sessionService.updateSession(sessionId, {
          status: SessionStatus.FAILED
        });
      }

      // Log the error and pass it to the error handler
      logger.error(`Error starting scrape: ${error instanceof Error ? error.message : 'Unknown error'}`);
      next(error);
    }
  }

  /**
   * Start a one-time free TRIAL scraping (max 10 items)
   */
  async startTrialScrape(req: Request, res: Response, next: NextFunction) {
    const { url } = req.body;
    let session: Session | null = null;
    try {
      const authUser = (req as any).user;
      const userId = authUser?.id;
      if (!userId) throw new ApiError(401, 'Authentication required for trial scraping.');

      if (!url || !this.isValidMarketplaceUrl(url)) {
        throw new ApiError(400, 'URL invalide. Veuillez fournir une URL Facebook ou LinkedIn Marketplace valide.');
      }

      const user = await db('users').select('id', 'trial_used').where({ id: userId }).first();
      if (!user) throw new ApiError(404, 'Utilisateur non trouvé.');
      if (user.trial_used) throw new ApiError(403, 'Votre essai gratuit a déjà été utilisé.');

      const TRIAL_LIMIT = 10;
      const sessionId = `sess_${nanoid(10)}`;

      session = await sessionService.createSession({
        id: sessionId,
        status: SessionStatus.PENDING,
        isPaid: false,
        is_trial: true,
        user_id: userId,
        packId: 'TRIAL',
        url,
      });

      try {
        const domain = (() => { try { return new URL(url).hostname; } catch { return null; } })();
        await db('search_events').insert({ user_id: userId, session_id: sessionId, url, domain, status: 'PENDING' });
      } catch (e) {
        logger.warn('Failed to log trial search event', e);
      }

      await db('users').where({ id: userId, trial_used: false }).update({ trial_used: true, updated_at: new Date() });

      const scrapingOptions = { deepScrape: false, getProfileUrls: false };
      const { datasetId, actorRunId } = await apifyService.startScraping(url, sessionId, TRIAL_LIMIT, scrapingOptions);

      await sessionService.updateSession(sessionId, { datasetId, actorRunId, status: SessionStatus.RUNNING });

      res.status(200).json({ status: 'success', data: { sessionId, datasetId, actorRunId, isTrial: true } });
    } catch (error) {
      if (session) { try { await sessionService.updateSession(session.id, { status: SessionStatus.FAILED }); } catch {} }
      logger.error(`Error starting trial scrape: ${error instanceof Error ? error.message : 'Unknown error'}`);
      next(error);
    }
  }

  /**
   * Get scraping job results
   */
  public getScrapeResult = async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.query.sessionId as string;
    try {
      logger.info(`Attempting to fetch results for session: ${sessionId}`);

      if (!sessionId) {
        // Cette erreur est normalement attrapée par le validateur en amont, mais c'est une double sécurité.
        throw new ApiError(400, 'Session ID is required.');
      }

      let session = await sessionService.getSession(sessionId);
      if (!session) {
        throw new ApiError(404, `Session with ID ${sessionId} not found`);
      }

      // Si le scraping n'est pas terminé, on vérifie l'état sur Apify
      if (session.status === SessionStatus.PENDING || session.status === SessionStatus.RUNNING) {
        if (!session.actorRunId) {
          throw new ApiError(400, 'Scraping run ID not found for this session.');
        }

        const runStatus = await apifyService.getRunStatus(session.actorRunId);

        // Statuts considérés comme terminés avec succès
        const successStatuses = ['SUCCEEDED', 'FINISHED'];
        // Statuts considérés comme en échec
        const failedStatuses = ['FAILED', 'TIMED-OUT', 'ABORTED'];

        if (successStatuses.includes(runStatus.status.toUpperCase())) {
          logger.info(`Scraping for session ${sessionId} succeeded. Fetching data from dataset ${session.datasetId}.`);
          if (!session.datasetId) {
            throw new ApiError(500, 'Dataset ID is missing from the session.');
          }
          // getDatasetItems() already normalizes via extractItemData()
          const normalizedItems = await apifyService.getDatasetItems(session.datasetId);

          // Persist items to scraped_items table (fire-and-forget)
          if (session.user_id) {
            persistScrapedItems(sessionId, session.user_id, normalizedItems, 'marketplace')
              .catch(err => logger.warn(`[PERSISTENCE] Background persist failed for ${sessionId}:`, err));
          }

          const previewItems = normalizedItems.slice(0, 3);

          // Créer le fichier de backup
          this.createBackupFile(sessionId, session.datasetId, normalizedItems.length, previewItems, normalizedItems);
          
          // Mettre à jour la session avec les données finales et le statut FINISHED
          const updatedSession = await sessionService.updateSession(sessionId, {
            status: SessionStatus.FINISHED,
            totalItems: normalizedItems.length,
            previewItems: previewItems,
            hasData: normalizedItems.length > 0,
          });

          // Update search_events with FINISHED status and duration
          try {
            const ev = await db('search_events').select('created_at').where({ session_id: sessionId }).orderBy('created_at', 'asc').first();
            const durationMs = ev?.created_at ? (Date.now() - new Date(ev.created_at).getTime()) : null;
            await db('search_events').where({ session_id: sessionId }).update({ status: 'FINISHED', duration_ms: durationMs });
          } catch (e) {
            logger.warn('Failed to update search_event on success', e);
          }

          if (!updatedSession) {
            throw new ApiError(500, 'Failed to update session after scraping.');
          }

          logger.info(`Session ${sessionId} updated with ${normalizedItems.length} results.`);
          // Renvoyer la session mise à jour
          session = updatedSession;

        } else if (failedStatuses.includes(runStatus.status.toUpperCase())) {
          logger.error(`Scraping for session ${sessionId} failed with status: ${runStatus.status}`);
          const updatedSession = await sessionService.updateSession(sessionId, { status: SessionStatus.FAILED });
          // Update search_events with FAILED status and duration
          try {
            const ev = await db('search_events').select('created_at').where({ session_id: sessionId }).orderBy('created_at', 'asc').first();
            const durationMs = ev?.created_at ? (Date.now() - new Date(ev.created_at).getTime()) : null;
            await db('search_events').where({ session_id: sessionId }).update({ status: 'FAILED', duration_ms: durationMs, error_code: runStatus.status || 'FAILED' });
          } catch (e) {
            logger.warn('Failed to update search_event on failure', e);
          }
          session = updatedSession!;
          throw new ApiError(500, `Scraping failed with status: ${runStatus.status}`);

        } else {
          // Le scraping est toujours en cours (ex: RUNNING, READY) -> appliquer un timeout global
          const maxMs = Number(process.env.MAX_SCRAPE_RUNTIME_MS || 15 * 60 * 1000); // 15 min par défaut
          const runtimeMs = runStatus.runtimeMs ?? 0;
          logger.info(`Scraping in progress for session ${sessionId}`, {
            apifyStatus: runStatus.status,
            progress: runStatus.progress,
            startedAt: runStatus.startedAt,
            finishedAt: runStatus.finishedAt,
            runtimeMs,
            maxMs,
          });

          if (runtimeMs > 0 && runtimeMs > maxMs) {
            logger.warn(`Scraping timeout reached for session ${sessionId} after ${runtimeMs} ms. Marking as FAILED.`);
            const updatedSession = await sessionService.updateSession(sessionId, { status: SessionStatus.FAILED });
            // Update search_events with FAILED and duration
            try {
              const ev = await db('search_events').select('created_at').where({ session_id: sessionId }).orderBy('created_at', 'asc').first();
              const durationMs = ev?.created_at ? (Date.now() - new Date(ev.created_at).getTime()) : null;
              await db('search_events').where({ session_id: sessionId }).update({ status: 'FAILED', duration_ms: durationMs, error_code: 'TIMEOUT' });
            } catch (e) {
              logger.warn('Failed to update search_event on timeout', e);
            }
            session = updatedSession!;
            return res.status(504).json({
              message: 'Scraping timed out.',
              status: SessionStatus.FAILED,
              progress: runStatus.progress,
              runtimeMs,
              maxMs,
            });
          }

          return res.status(202).json({
            message: 'Scraping in progress.',
            status: session.status,
            progress: runStatus.progress,
            startedAt: runStatus.startedAt,
            runtimeMs,
          });
        }
      }

      // Toujours renvoyer l'état le plus récent de la session
      // On recharge la session pour être sûr d'avoir les dernières données, surtout si le webhook a tourné entre-temps
      const finalSession = await sessionService.getSession(sessionId);
      res.status(200).json(finalSession);

    } catch (error) {
      logger.error(`Error fetching results for session ${sessionId}:`, error);
      // Propage l'erreur pour que le middleware de gestion des erreurs la traite
      next(error);
    }
  };

  /**
   * Handle Apify webhook events to process scraping results automatically.
   */
  async handleApifyWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Received Apify webhook:', req.body);

      const { sessionId, resource, eventData } = req.body;

      if (!sessionId || !resource || !eventData) {
        logger.warn('Invalid Apify webhook payload received.');
        return res.status(400).send('Invalid payload');
      }

      const { status: runStatus } = eventData;
      const { defaultDatasetId: datasetId } = resource;

      const isSucceeded = runStatus === 'SUCCEEDED';
      const isFailed = ['FAILED', 'TIMED_OUT', 'ABORTED'].includes(runStatus);

      if (isSucceeded && datasetId) {
        logger.info(`Scraping for session ${sessionId} SUCCEEDED. Processing results from dataset ${datasetId}...`);

        // Single API call - getDatasetItems already normalizes via extractItemData()
        const allItems = await apifyService.getDatasetItems(datasetId);

        // Persist items to scraped_items table (fire-and-forget)
        const webhookSession = await sessionService.getSession(sessionId);
        if (webhookSession?.user_id) {
          persistScrapedItems(sessionId, webhookSession.user_id, allItems, 'marketplace')
            .catch(err => logger.warn(`[PERSISTENCE] Background persist failed for ${sessionId}:`, err));
        }

        const totalItemsCount = allItems.length;
        const previewItems = allItems.slice(0, 3);

        // Create backup file (same as polling path)
        this.createBackupFile(sessionId, datasetId, totalItemsCount, previewItems, allItems);

        // Update session in DB
        await sessionService.updateSession(sessionId, {
          status: SessionStatus.FINISHED,
          totalItems: totalItemsCount,
          previewItems: previewItems,
          hasData: totalItemsCount > 0,
        });

        // Update search_events with FINISHED and duration
        try {
          const ev = await db('search_events').select('created_at').where({ session_id: sessionId }).orderBy('created_at', 'asc').first();
          const durationMs = ev?.created_at ? (Date.now() - new Date(ev.created_at).getTime()) : null;
          await db('search_events').where({ session_id: sessionId }).update({ status: 'FINISHED', duration_ms: durationMs });
        } catch (e) {
          logger.warn('Failed to update search_event on webhook success', e);
        }

        logger.info(`Session ${sessionId} successfully updated with ${totalItemsCount} items.`);

      } else if (isFailed) {
        logger.warn(`Scraping for session ${sessionId} FAILED with status: ${runStatus}.`);
        await sessionService.updateSession(sessionId, {
          status: SessionStatus.FAILED,
        });
        try {
          const ev = await db('search_events').select('created_at').where({ session_id: sessionId }).orderBy('created_at', 'asc').first();
          const durationMs = ev?.created_at ? (Date.now() - new Date(ev.created_at).getTime()) : null;
          await db('search_events').where({ session_id: sessionId }).update({ status: 'FAILED', duration_ms: durationMs, error_code: runStatus });
        } catch (e) {
          logger.warn('Failed to update search_event on webhook failure', e);
        }
      } else {
        logger.info(`Received non-final webhook status '${runStatus}' for session ${sessionId}. Ignoring.`);
      }

      res.status(200).send('Webhook received');
    } catch (error) {
      logger.error('Error handling Apify webhook:', error);
      // Important to not pass to next() to avoid sending a generic error response to Apify
      res.status(500).send('Internal Server Error');
    }
  }

  /**
   * Créer un fichier de backup avec les données extraites
   */
  private createBackupFile(
    sessionId: string, 
    datasetId: string, 
    totalItemsCount: number, 
    previewItems: any[], 
    sampleAllItems: any[]
  ): void {
    try {
      const backupDir = path.join(process.cwd(), 'data', 'backups');
      // Le sessionId inclut déjà 'sess_', donc on l'utilise directement
      const backupPath = path.join(backupDir, `${sessionId}.json`);
      
      // Vérifier si le fichier existe déjà
      if (fs.existsSync(backupPath)) {
        logger.info(`Fichier de backup pour la session ${sessionId} existe déjà, pas de nouvelle sauvegarde créée`);
        return;
      }
      
      // Assurer que le répertoire existe
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Sauvegarder les données avec la structure correcte et les données extraites
      const backupData = {
        sessionId,
        datasetId,
        timestamp: new Date().toISOString(),
        totalItems: totalItemsCount,
        previewItems: previewItems.map(item => ({
          title: item.title,
          price: item.price,
          desc: item.desc,
          image: item.image,
          images: Array.isArray(item.images) ? item.images.slice(0, 3) : [],
          location: item.location,
          url: item.url,
          postedAt: item.postedAt
        })),
        allItems: sampleAllItems.map(item => ({
          title: item.title,
          price: item.price,
          desc: item.desc,
          image: item.image,
          images: Array.isArray(item.images) ? item.images.slice(0, 3) : [],
          location: item.location,
          url: item.url,
          postedAt: item.postedAt
        }))
      };
      
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      logger.info(`Sauvegarde des données créée: ${backupPath}`);
    } catch (backupError) {
      logger.error(`Erreur lors de la sauvegarde des données: ${backupError}`);
    }
  }

  /**
   * Validate marketplace URL
   */
  private isValidMarketplaceUrl(url: string): boolean {
    return /^https:\/\/(www\.)?(facebook|linkedin)\.com\/marketplace\/[\w-]+/.test(url.trim());
  }

}

export const scrapeController = new ScrapeController();