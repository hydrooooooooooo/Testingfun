import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { apifyService } from '../services/apifyService';
import { sessionService, Session, SessionStatus } from '../services/sessionService';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export class ScrapeController {
  /**
   * Start a new scraping job
   */
  async startScrape(req: Request, res: Response, next: NextFunction) {
    const { url } = req.body;
    let { sessionId, resultsLimit } = req.body;
    let session: Session | null = null;

    // Convertir resultsLimit en nombre et valider
    const limit = resultsLimit ? parseInt(resultsLimit, 10) : 3;
    const validLimit = !isNaN(limit) && limit > 0 ? limit : 3;

    try {
      // Validate URL
      if (!url || !this.isValidMarketplaceUrl(url)) {
        throw new ApiError(400, 'URL invalide. Veuillez fournir une URL Facebook ou LinkedIn Marketplace valide.');
      }

      // Generate session ID if not provided
      if (!sessionId) {
        sessionId = `sess_${nanoid(10)}`;
      }

      logger.info(`Starting scrape for URL: ${url}, sessionId: ${sessionId}`);

      // Create session record with PENDING status first
      session = sessionService.createSession({
        id: sessionId,
        url,
        status: SessionStatus.PENDING,
        createdAt: new Date(),
        isPaid: false,
        data: {
          nbItems: 0,
          startedAt: new Date().toISOString(),
          previewItems: []
        }
      });

      // Start APIFY scraping job
      const { datasetId, actorRunId } = await apifyService.startScraping(url, sessionId, validLimit);

      // Update session with RUNNING status and Apify details
      session = sessionService.updateSession(sessionId, {
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
        sessionService.updateSession(sessionId, {
          status: SessionStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error'
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
  async getScrapeResult(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        throw new ApiError(400, 'Session ID is required');
      }

      logger.info(`Récupération des résultats pour la session ${sessionId}`);

      // Get session from service
      const session = sessionService.getSession(sessionId);
      if (!session) {
        logger.error(`Session avec ID ${sessionId} non trouvée`);
        throw new ApiError(404, `Session with ID ${sessionId} not found`);
      }
      
      logger.info(`Session trouvée: ${JSON.stringify({
        id: session.id,
        status: session.status,
        datasetId: session.datasetId,
        actorRunId: session.actorRunId,
        isPaid: session.isPaid,
        hasData: !!session.data
      })}`);

      // If session has an actor run ID, get the status from APIFY
      if (session.actorRunId) {
        logger.info(`Récupération du statut Apify pour l'acteur ${session.actorRunId}`);
        const runStatus = await apifyService.getRunStatus(session.actorRunId);
        logger.info(`Statut Apify reçu: ${runStatus.status}`);
        
        // Update session status based on APIFY run status
        // Vérifier si le statut indique que le job est terminé
        const finishedStatuses = ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'];
        const isFinished = finishedStatuses.includes(runStatus.status);
        
        if (isFinished) {
          const status = runStatus.status === 'SUCCEEDED' ? SessionStatus.FINISHED : SessionStatus.FAILED;
          
          // Initialize data object if it doesn't exist
          const sessionData = session.data || {};
          
          // Update session with new status and stats
          sessionService.updateSession(sessionId, { 
            status,
            data: {
              ...sessionData,
              finishedAt: new Date().toISOString()
            }
          });

          // If finished successfully, get preview items
          if (status === SessionStatus.FINISHED && session.datasetId) {
            try {
              logger.info(`Récupération des éléments pour le dataset ${session.datasetId}`);
              
              // Get all available items count first
              const allItems = await apifyService.getDatasetItems(session.datasetId);
              const totalItemsCount = allItems.length;
              logger.info(`Nombre total d'éléments trouvés: ${totalItemsCount}`);
              
              // Get preview items with improved extraction
              const previewItems = await apifyService.getPreviewItems(session.datasetId, 3);
              logger.info(`Éléments de prévisualisation extraits: ${previewItems.length}`);
              
              // Vérifier si un fichier de backup existe déjà pour cette session
              const fs = require('fs');
              const path = require('path');
              const backupDir = './data/backups';
              const backupPath = `${backupDir}/sess_${sessionId}.json`;
              
              // Vérifier si le fichier existe déjà
              const backupExists = fs.existsSync(backupPath);
              
              // Ne créer un fichier de backup que s'il n'existe pas déjà
              if (!backupExists) {
                logger.info(`Création d'un nouveau fichier de backup pour la session ${sessionId}`);
                
                try {
                  // Assurer que le répertoire existe
                  if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                  }
                  
                  // Sauvegarder les données brutes
                  fs.writeFileSync(backupPath, JSON.stringify({
                    sessionId,
                    datasetId: session.datasetId,
                    timestamp: new Date().toISOString(),
                    totalItems: totalItemsCount,
                    previewItems,
                    allItems: allItems.slice(0, 10) // Sauvegarder seulement les 10 premiers éléments complets
                  }, null, 2));
                  
                  logger.info(`Sauvegarde des données créée: ${backupPath}`);
                } catch (backupError) {
                  logger.error(`Erreur lors de la sauvegarde des données: ${backupError}`);
                }
              } else {
                logger.info(`Fichier de backup pour la session ${sessionId} existe déjà, pas de nouvelle sauvegarde créée`);
              }
              
              // Update session with preview items and accurate statistics
              sessionService.updateSession(sessionId, { 
                data: {
                  ...sessionData,
                  finishedAt: new Date().toISOString(),
                  previewItems,
                  nbItems: totalItemsCount,
                  totalItems: totalItemsCount
                }
              });
              
              logger.info(`Session ${sessionId} mise à jour avec ${previewItems.length} éléments de prévisualisation sur ${totalItemsCount} éléments au total`);
            } catch (error) {
              logger.error(`Error getting preview items for session ${sessionId}:`, error);
              // Still update the session with finished status even if preview items failed
              sessionService.updateSession(sessionId, { 
                data: {
                  ...sessionData,
                  finishedAt: new Date().toISOString(),
                  error: error instanceof Error ? error.message : 'Error getting preview items'
                }
              });
            }
          }
        }
      }

      // Get the updated session
      const updatedSession = sessionService.getSession(sessionId);
      
      res.status(200).json({
        status: 'success',
        data: {
          sessionId: updatedSession?.id,
          datasetId: updatedSession?.datasetId,
          status: updatedSession?.status,
          stats: updatedSession?.data || {},
          isPaid: updatedSession?.isPaid,
          previewItems: updatedSession?.data?.previewItems || []
        }
      });
    } catch (error) {
      next(error);
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
