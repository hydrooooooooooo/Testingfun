import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sessionService, Session, SessionStatus } from '../services/sessionService';
import { exportService } from '../services/exportService';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { config } from '../config/config';

export class ExportController {
  /**
   * Export data as Excel/CSV file
   */
  async exportData(req: Request, res: Response, next: NextFunction) {
    const requestId = uuidv4().substring(0, 8);
    logger.info(`[${requestId}] Début de la requête d'exportation`);
    
    try {
      // Récupérer et valider les paramètres
      const { sessionId, format = 'excel' } = req.query;
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      logger.info(`[${requestId}] Requête d'exportation: format=${format}, sessionId=${sessionId}, IP=${clientIp}, UA=${userAgent}`);
      
      // Vérifier que le sessionId est valide
      if (!sessionId || typeof sessionId !== 'string') {
        logger.warn(`[${requestId}] Tentative d'exportation sans sessionId valide`);
        throw new ApiError(400, 'Session ID is required');
      }
      
      // Vérifier que le format est valide
      if (format !== 'excel' && format !== 'csv') {
        logger.warn(`[${requestId}] Format d'exportation invalide: ${format}`);
        throw new ApiError(400, 'Format must be either excel or csv');
      }
      
      // Récupérer la session
      const session = sessionService.getSession(sessionId);
      const isTemporarySession = sessionId.startsWith('temp_');
      
      // Gérer le cas où la session n'existe pas
      if (!session) {
        if (isTemporarySession) {
          // Pour les sessions temporaires, on crée une session à la volée
          logger.info(`[${requestId}] Création d'une session temporaire pour ${sessionId}`);
          const newSession: Session = {
            id: sessionId,
            url: 'https://demo.marketplace-scraper.com',  // URL fictive pour les sessions temporaires
            isPaid: true,
            packId: 'pack-decouverte',
            createdAt: new Date(),
            status: SessionStatus.FINISHED,  // La session est considérée comme terminée
            data: { isTemporary: true }     // Stockage de l'information temporaire dans data
          };
          sessionService.createSession(newSession);
          return this.handleTemporaryExport(sessionId, format as 'excel' | 'csv', requestId, res, next);
        } else {
          // Pour les sessions normales, on renvoie une erreur
          logger.error(`[${requestId}] Session non trouvée: ${sessionId}`);
          throw new ApiError(404, `Session with ID ${sessionId} not found`);
        }
      }
      
      // Vérifier si la session est payée ou temporaire (pour les tests)
      const isPaid = session.isPaid || isTemporarySession;
      
      if (!isPaid) {
        logger.warn(`[${requestId}] Tentative d'exportation sans paiement pour la session ${sessionId}`);
        throw new ApiError(403, 'Payment required to export data');
      }
      
      // Vérifier si la session a un datasetId (sauf pour les sessions temporaires)
      if (!session.datasetId && !isTemporarySession) {
        logger.warn(`[${requestId}] Session ${sessionId} sans datasetId`);
        throw new ApiError(400, 'Session does not have dataset information');
      }
      
      // Si le pack n'est pas défini, utiliser un pack par défaut
      if (!session.packId) {
        const defaultPack = 'pack-decouverte';
        logger.info(`[${requestId}] Utilisation du pack par défaut ${defaultPack} pour la session ${sessionId}`);
        
        // Mettre à jour la session avec le pack par défaut
        sessionService.updateSession(sessionId, {
          packId: defaultPack
        });
      }

      // Si c'est une session temporaire, utiliser la méthode spécifique
      if (isTemporarySession) {
        return this.handleTemporaryExport(sessionId, format as 'excel' | 'csv', requestId, res, next);
      }
      
      // Pour les sessions normales, continuer avec le processus standard
      const packId = session.packId || 'pack-decouverte';
      let buffer: Buffer;
      let filename: string;
      let contentType: string;
      
      try {
        // Générer le fichier en fonction du format
        if (session.datasetId) {
          // Utiliser les données réelles si disponibles
          logger.info(`[${requestId}] Génération d'un fichier ${format} pour la session ${sessionId} avec datasetId ${session.datasetId}`);
          
          if (format === 'csv') {
            buffer = await exportService.generateCSV(session.datasetId, packId);
            filename = `marketplace_data_${sessionId}_${Date.now()}.csv`;
            contentType = 'text/csv';
          } else {
            buffer = await exportService.generateExcel(session.datasetId, packId);
            filename = `marketplace_data_${sessionId}_${Date.now()}.xlsx`;
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          }
        } else {
          // Fallback - générer des données de démonstration si aucun datasetId n'est disponible
          logger.warn(`[${requestId}] Aucun datasetId disponible pour la session ${sessionId}, génération de données de démonstration`);
          return this.handleTemporaryExport(sessionId, format as 'excel' | 'csv', requestId, res, next);
        }
      } catch (error) {
        logger.error(`[${requestId}] Erreur lors de la génération du fichier: ${error instanceof Error ? error.message : String(error)}`);
        // En cas d'erreur, essayer de générer des données de démonstration comme fallback
        return this.handleTemporaryExport(sessionId, format as 'excel' | 'csv', requestId, res, next, true);
      }

      // Configurer les en-têtes CORS et envoyer le fichier
      this.sendFileWithHeaders(res, buffer, filename, contentType, requestId);
    } catch (error) {
      logger.error(`[${requestId}] Erreur lors de l'exportation: ${error instanceof Error ? error.message : String(error)}`);
      next(error);
    }
  }
  
  /**
   * Gère l'exportation pour les sessions temporaires ou en cas de fallback
   */
  private async handleTemporaryExport(
    sessionId: string,
    format: 'excel' | 'csv',
    requestId: string,
    res: Response,
    next: NextFunction,
    isFallback: boolean = false
  ) {
    try {
      // Déterminer le pack à utiliser (par défaut pack-decouverte)
      const packId = 'pack-decouverte';
      
      // Log approprié
      if (isFallback) {
        logger.info(`[${requestId}] Utilisation du fallback pour la session ${sessionId} avec format ${format}`);
      } else {
        logger.info(`[${requestId}] Génération d'un fichier de démonstration pour la session temporaire ${sessionId}`);
      }
      
      // Générer le fichier en fonction du format
      let buffer: Buffer;
      let filename: string;
      let contentType: string;
      
      if (format === 'csv') {
        buffer = await exportService.generateDemoCSV(packId);
        filename = `demo_data_${sessionId}_${Date.now()}.csv`;
        contentType = 'text/csv';
      } else {
        buffer = await exportService.generateDemoExcel(packId);
        filename = `demo_data_${sessionId}_${Date.now()}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
      
      // Sauvegarder une copie du fichier dans le répertoire de backup pour débogage
      this.saveBackupFile(buffer, filename, requestId);
      
      // Configurer les en-têtes CORS et envoyer le fichier
      this.sendFileWithHeaders(res, buffer, filename, contentType, requestId);
    } catch (error) {
      logger.error(`[${requestId}] Erreur lors de la génération du fichier de démonstration: ${error instanceof Error ? error.message : String(error)}`);
      next(error);
    }
  }
  
  /**
   * Sauvegarde une copie du fichier dans le répertoire de backup pour débogage
   */
  private saveBackupFile(buffer: Buffer, filename: string, requestId: string): void {
    try {
      // Créer le répertoire de backup s'il n'existe pas
      const backupDir = path.join(process.cwd(), 'data', 'exports');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Sauvegarder le fichier
      const backupPath = path.join(backupDir, filename);
      fs.writeFileSync(backupPath, buffer);
      logger.info(`[${requestId}] Fichier de backup sauvegardé: ${backupPath}`);
    } catch (error) {
      // Ne pas bloquer le processus si la sauvegarde échoue
      logger.warn(`[${requestId}] Impossible de sauvegarder le fichier de backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Récupère les données complètes d'un fichier de backup
   */
  async getBackupData(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId || typeof sessionId !== 'string') {
        throw new ApiError(400, 'Session ID is required');
      }
      
      logger.info(`Récupération du fichier de backup pour la session ${sessionId}`);
      
      // Construire le chemin du fichier de backup
      const backupDir = path.join(__dirname, '../../data/backups');
      const backupPath = path.join(backupDir, `sess_${sessionId}.json`);
      
      // Vérifier si le fichier existe
      if (!fs.existsSync(backupPath)) {
        logger.warn(`Fichier de backup non trouvé pour la session ${sessionId}`);
        throw new ApiError(404, `Backup file for session ${sessionId} not found`);
      }
      
      // Lire le fichier de backup
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      
      // Ajouter les en-têtes CORS pour permettre l'accès depuis le frontend
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, cache-control');
      
      // Renvoyer les données
      res.status(200).json(backupData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Configure les en-têtes CORS et envoie le fichier
   */
  private sendFileWithHeaders(res: Response, buffer: Buffer, filename: string, contentType: string, requestId: string): void {
    // Configurer les en-têtes CORS spécifiquement pour cette réponse
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, cache-control');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    
    // Supprimer les en-têtes de sécurité restrictifs pour permettre le téléchargement
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');
    
    // Définir les en-têtes pour le téléchargement du fichier
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Log pour débogage
    logger.info(`[${requestId}] Envoi du fichier ${filename} (${buffer.length} octets)`);
    
    // Envoyer le fichier
    res.status(200).send(buffer);
  }
}

export const exportController = new ExportController();
