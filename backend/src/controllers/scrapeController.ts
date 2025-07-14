import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { apifyService } from '../services/apifyService';
import { sessionService, Session, SessionStatus } from '../services/sessionService';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import fs from 'fs';
import path from 'path';

export class ScrapeController {
  /**
   * Start a new scraping job
   */
  async startScrape(req: Request, res: Response, next: NextFunction) {
    const { url } = req.body;
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
      });

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
          // Récupérer les items du dataset
          const rawItems = await apifyService.getDatasetItems(session.datasetId);
          
          // Normaliser les données pour avoir une structure cohérente
          const normalizedItems = this.normalizeApifyData(rawItems);
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

          if (!updatedSession) {
            throw new ApiError(500, 'Failed to update session after scraping.');
          }

          logger.info(`Session ${sessionId} updated with ${normalizedItems.length} results.`);
          // Renvoyer la session mise à jour
          session = updatedSession;

        } else if (failedStatuses.includes(runStatus.status.toUpperCase())) {
          logger.error(`Scraping for session ${sessionId} failed with status: ${runStatus.status}`);
          const updatedSession = await sessionService.updateSession(sessionId, { status: SessionStatus.FAILED });
          session = updatedSession!;
          throw new ApiError(500, `Scraping failed with status: ${runStatus.status}`);

        } else {
          // Le scraping est toujours en cours (ex: RUNNING, READY)
          logger.info(`Scraping for session ${sessionId} is still in progress with status: ${runStatus.status}`);
          return res.status(202).json({
            message: 'Scraping in progress.',
            status: session.status,
            progress: runStatus.progress,
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

        // Get all items to count them
        const allItems = await apifyService.getDatasetItems(datasetId);
        const totalItemsCount = allItems.length;

        // Get preview items
        const previewItems = await apifyService.getPreviewItems(datasetId, 3);

        // Update session in DB
        await sessionService.updateSession(sessionId, {
          status: SessionStatus.FINISHED,
          totalItems: totalItemsCount,
          previewItems: previewItems,
          hasData: totalItemsCount > 0,
        });

        logger.info(`Session ${sessionId} successfully updated with ${totalItemsCount} items.`);

      } else if (isFailed) {
        logger.warn(`Scraping for session ${sessionId} FAILED with status: ${runStatus}.`);
        await sessionService.updateSession(sessionId, {
          status: SessionStatus.FAILED,
        });
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
          location: item.location,
          url: item.url,
          postedAt: item.postedAt
        })),
        allItems: sampleAllItems.map(item => ({
          title: item.title,
          price: item.price,
          desc: item.desc,
          image: item.image,
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

  /**
   * Normalise les données brutes d'Apify en une structure de données simple.
   */
  private normalizeApifyData(items: any[]): any[] {
    if (!items || !Array.isArray(items)) {
        return [];
    }

    return items.map(item => {
        // Gérer les variations de noms de champs
        const title = item.title || item.name || item.marketplace_listing_title || item.custom_title || 'Titre non disponible';
        
        // Gérer la structure de prix imbriquée
        let price = 'Prix non disponible';
        if (item.listing_price && item.listing_price.amount && item.listing_price.currency) {
            price = `${parseFloat(item.listing_price.amount).toFixed(2)} ${item.listing_price.currency}`;
        } else if (item.price) {
            price = item.price;
        }

        // Gérer la structure d'image imbriquée
        const image = item.primary_listing_photo?.listing_image?.uri || item.image || item.imageUrl || null;

        return {
            title: title,
            price: price,
            desc: item.desc || item.description || '',
            image: image,
            location: item.location?.reverse_geocode?.city || item.location || 'Lieu non disponible',
            url: item.url || item.listing_url || '#',
            postedAt: item.postedAt || item.creation_time || null,
            // Inclure d'autres champs si nécessaire
            ...item 
        };
    });
  }
}

export const scrapeController = new ScrapeController();