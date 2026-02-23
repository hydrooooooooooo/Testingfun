import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sessionService, Session, SessionStatus } from '../services/sessionService';
import { exportService } from '../services/exportService';
import { apifyService } from '../services/apifyService';
import { ApiError } from '../middlewares/errorHandler';
import { logger, audit } from '../utils/logger';
import { alertService } from '../services/alertService';
import fs from 'fs';
import path from 'path';
import { config } from '../config/config';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class ExportController {
  /**
   * Export data as Excel/CSV file
   */
  async exportData(req: Request, res: Response, next: NextFunction) {
    const requestId = uuidv4().substring(0, 8);
    logger.info(`[${requestId}] Début de la requête d'exportation`);
    
    try {
      // Récupérer et valider les paramètres
      // Accepter les deux formats de paramètres (sessionId et session_id) pour plus de compatibilité
      const sessionIdParam = req.query.sessionId || req.query.session_id;
      const format = req.query.format as string || 'excel';
      const downloadToken = (req.query.token as string) || null;
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      // Log détaillé des paramètres reçus
      logger.info(`[${requestId}] Paramètres reçus: ${JSON.stringify(req.query)}`);
      logger.info(`[${requestId}] Requête d'exportation: format=${format}, sessionId=${sessionIdParam}, IP=${clientIp}, UA=${userAgent}`);
      
      // Vérifier que le sessionId est valide
      if (!sessionIdParam || typeof sessionIdParam !== 'string') {
        logger.warn(`[${requestId}] Tentative d'exportation sans sessionId valide`);
        throw new ApiError(400, 'Session ID is required');
      }
      
      // Utiliser une variable constante pour le reste du code
      const sessionId = sessionIdParam;
      
      // Vérifier que le format est valide
      if (format !== 'excel' && format !== 'csv') {
        logger.warn(`[${requestId}] Format d'exportation invalide: ${format}`);
        throw new ApiError(400, 'Format must be either excel or csv');
      }
      
      // Récupérer la session
      const session = await sessionService.getSession(sessionId);
      const isTemporarySession = sessionId.startsWith('temp_');
      
      // Gérer le cas où la session n'existe pas
      if (!session) {
        if (isTemporarySession) {
          // Pour les sessions temporaires, on crée une session à la volée
          logger.info(`[${requestId}] Création d'une session temporaire pour ${sessionId}`);
          const newSession: Partial<Session> = {
            id: sessionId,
            isPaid: true,
            packId: 'pack-decouverte',
            status: SessionStatus.FINISHED,  // La session est considérée comme terminée
            hasData: true // On considère qu'une session temporaire a des données
          };
          await sessionService.createSession(newSession);
          return this.handleTemporaryExport(sessionId, format as 'excel' | 'csv', requestId, req, res, next);
        } else {
          // Pour les sessions normales, on renvoie une erreur
          logger.error(`[${requestId}] Session non trouvée: ${sessionId}`);
          throw new ApiError(404, `Session with ID ${sessionId} not found`);
        }
      }
      
      // Vérifier le token JWT signé s'il est fourni
      let hasValidToken = false;
      let tokenUserId: number | null = null;
      if (downloadToken) {
        try {
          const payload = jwt.verify(downloadToken, config.api.jwtSecret as string) as { sessionId: string; userId?: number };
          hasValidToken = payload.sessionId === sessionId;
          tokenUserId = payload.userId ?? null;
        } catch (e) {
          logger.warn(`[${requestId}] Token JWT invalide pour session ${sessionId}`);
          hasValidToken = false;
        }
      }

      // Vérifier ownership si authentifié
      const reqUserId = (req as AuthenticatedRequest).user?.id;
      const isOwner = !!reqUserId && !!session?.user_id && Number(session.user_id) === Number(reqUserId);

      // Conditions d'autorisation
      const isTrial = !!(session as any).is_trial;
      const isPaid = !!session.isPaid || isTemporarySession || hasValidToken || isTrial;
      
      // Log pour le débogage des tokens
      if (downloadToken) {
        logger.info(`[${requestId}] Token de téléchargement fourni: ${downloadToken}`);
        logger.info(`[${requestId}] Token stocké dans la session: ${session.downloadToken || 'aucun'}`);
        logger.info(`[${requestId}] Token valide: ${hasValidToken}`);
      }
      
      if (!isPaid) {
        logger.warn(`[${requestId}] Tentative d'exportation sans paiement pour la session ${sessionId}`);
        audit('export.denied_unpaid', { sessionId, ip: clientIp, ua: userAgent, userId: reqUserId });
        throw new ApiError(403, 'Payment required to export data');
      }

      // Si pas de token valide, exiger ownership pour empêcher accès par simple ID
      if (!hasValidToken && !isTemporarySession) {
        if (!isOwner) {
          logger.warn(`[${requestId}] Tentative d'exportation non propriétaire pour session ${sessionId}`);
          audit('export.denied_not_owner', { sessionId, ip: clientIp, ua: userAgent, userId: reqUserId });
          await alertService.notify('export.denied_not_owner', { sessionId, ip: clientIp, ua: userAgent, userId: reqUserId });
          throw new ApiError(403, 'Not authorized to export this session');
        }
      }

      // Vérifier également que le scraping est terminé
      if (session.status !== SessionStatus.FINISHED) {
        logger.warn(`[${requestId}] Tentative d'exportation pour une session non terminée (Status: ${session.status})`);
        // Le code 425 (Too Early) indique au frontend que la ressource n'est pas encore prête.
        throw new ApiError(425, 'Vos données sont en cours de préparation. Veuillez réessayer dans quelques instants.');
      }
      
      // Si le téléchargement est effectué avec un token valide, le marquer comme utilisé
      // pour éviter les téléchargements multiples avec le même token (optionnel)
      if (hasValidToken) {
        logger.info(`[${requestId}] Téléchargement autorisé via token pour la session ${sessionId}`);
        // Si ancien schéma, on efface le token stocké simple si présent
        if (session.downloadToken) {
          await sessionService.updateSession(sessionId, { downloadToken: undefined });
          logger.info(`[${requestId}] Ancien token de téléchargement effacé pour la session ${sessionId}`);
        }
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
        await sessionService.updateSession(sessionId, {
          packId: defaultPack
        });
      }

      // Si c'est une session temporaire, utiliser la méthode spécifique
      if (isTemporarySession) {
        return this.handleTemporaryExport(sessionId, format as 'excel' | 'csv', requestId, req, res, next);
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
          return this.handleTemporaryExport(sessionId, format as 'excel' | 'csv', requestId, req, res, next);
        }
      } catch (error) {
        logger.error(`[${requestId}] Erreur lors de la génération du fichier: ${error instanceof Error ? error.message : String(error)}`);
        // En cas d'erreur, essayer de générer des données de démonstration comme fallback
        return this.handleTemporaryExport(sessionId, format as 'excel' | 'csv', requestId, req, res, next, true);
      }

      // Configurer les en-têtes CORS et envoyer le fichier
      this.sendFileWithHeaders(res, buffer, filename, contentType, requestId, req.headers.origin);
      audit('export.success', { sessionId, userId: reqUserId ?? tokenUserId, format, size: buffer.length });
      // Schedule Apify dataset cleanup (non-blocking, fire and forget)
      if (session.datasetId) {
        apifyService.deleteDataset(session.datasetId).catch(() => {});
      }
      // Si c'est un export de trial, désactiver le flag pour empêcher d'autres téléchargements gratuits
      if (isTrial) {
        try {
          await sessionService.updateSession(sessionId, { is_trial: false });
          logger.info(`[${requestId}] Trial consommé: désactivation du flag is_trial pour la session ${sessionId}`);
        } catch (e) {
          logger.warn(`[${requestId}] Échec de la désactivation du flag is_trial pour la session ${sessionId}`);
        }
      }
    } catch (error) {
      // Log détaillé de l'erreur pour faciliter le débogage
      logger.error(`[${requestId}] Erreur lors de la requête d'exportation: ${error instanceof Error ? error.message : String(error)}`);
      
      if (error instanceof Error) {
        logger.error(`[${requestId}] Stack trace: ${error.stack}`);
      }
      
      // Envoyer une réponse d'erreur avec les en-têtes CORS appropriés
      const reqOrigin = req.headers.origin; res.setHeader('Access-Control-Allow-Origin', reqOrigin && config.cors.allowedOrigins.includes(reqOrigin) ? reqOrigin : config.cors.allowedOrigins[0]);
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires');
      
      // Envoyer une réponse d'erreur formatée
      const statusCode = error instanceof ApiError ? error.statusCode : 500;
      const message = error instanceof ApiError ? error.message : 'Une erreur est survenue lors de l\'exportation';
      
      res.status(statusCode).json({
        success: false,
        message,
        requestId,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Gère l'exportation pour les sessions temporaires ou en cas de fallback
   */
  private async handleTemporaryExport(
    sessionId: string,
    format: 'excel' | 'csv',
    requestId: string,
    req: Request,
    res: Response,
    next: NextFunction,
    isFallback: boolean = false
  ): Promise<void> {
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
      this.sendFileWithHeaders(res, buffer, filename, contentType, requestId, req.headers.origin);
    } catch (error) {
      // Log détaillé de l'erreur pour faciliter le débogage
      logger.error(`[${requestId}] Erreur lors de la génération du fichier de démonstration: ${error instanceof Error ? error.message : String(error)}`);
      
      if (error instanceof Error) {
        logger.error(`[${requestId}] Stack trace: ${error.stack}`);
      }
      
      // Envoyer une réponse d'erreur avec les en-têtes CORS appropriés
      const reqOrigin = req.headers.origin; res.setHeader('Access-Control-Allow-Origin', reqOrigin && config.cors.allowedOrigins.includes(reqOrigin) ? reqOrigin : config.cors.allowedOrigins[0]);
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires');
      
      // Envoyer une réponse d'erreur formatée
      const statusCode = error instanceof ApiError ? error.statusCode : 500;
      const message = error instanceof ApiError ? error.message : 'Une erreur est survenue lors de la génération du fichier de démonstration';
      
      res.status(statusCode).json({
        success: false,
        message,
        requestId,
        timestamp: new Date().toISOString()
      });
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

      // Ownership check requis (route protégée par protect)
      const session = await sessionService.getSession(sessionId);
      const reqUserId = (req as AuthenticatedRequest).user?.id;
      if (!session || !reqUserId || Number(session.user_id) !== Number(reqUserId)) {
        audit('backup.denied_not_owner', { sessionId, userId: reqUserId });
        await alertService.notify('backup.denied_not_owner', { sessionId, userId: reqUserId });
        throw new ApiError(403, 'Not authorized to access this backup');
      }
      
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
      const backupOrigin = req.headers.origin;
      if (backupOrigin && config.cors.allowedOrigins.includes(backupOrigin)) {
        res.header('Access-Control-Allow-Origin', backupOrigin);
      }
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Cache-Control, X-CSRF-Token');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      // Renvoyer les données
      res.status(200).json(backupData);
    } catch (error) {
      next(error);
    }
  }

  // === Helpers: filename sanitation and encoding ===
  private sanitizeFilename(name: string): string {
    if (!name || typeof name !== 'string') return 'download.xlsx';
    // Trim and remove leading/trailing dots or spaces
    let out = name.trim().replace(/^[\.\s]+|[\.\s]+$/g, '');
    // Replace forbidden/suspicious characters
    out = out.replace(/[\\/:*?"<>|\n\r\t]/g, '-');
    // Collapse multiple spaces, dashes, underscores
    out = out.replace(/\s+/g, ' ').replace(/[\-_]{2,}/g, '_');
    // Ensure an extension exists (keep original if present)
    if (!/\.[A-Za-z0-9]+$/.test(out)) {
      out = out + '.xlsx';
    }
    return out;
  }

  private toAsciiFallback(name: string): string {
    const match = name.match(/^(.*?)(\.[A-Za-z0-9]+)$/);
    const base = match ? match[1] : name;
    const ext = match ? match[2] : '';
    let ascii = base.normalize('NFKD').replace(/[^\x20-\x7E]/g, '_');
    ascii = ascii.replace(/\s+/g, '_').replace(/[^A-Za-z0-9._-]/g, '_');
    if (!ascii) ascii = 'download';
    return `${ascii}${ext}`;
  }

  private encodeRFC5987(name: string): string {
    return encodeURIComponent(name)
      .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  }

  /**
   * Configure les en-têtes CORS et envoie le fichier
   */
  private sendFileWithHeaders(res: Response, buffer: Buffer, filename: string, contentType: string, requestId: string, origin?: string): void {
    // Configurer les en-têtes CORS avec l'origine validée
    res.setHeader('Access-Control-Allow-Origin', origin && config.cors.allowedOrigins.includes(origin) ? origin : config.cors.allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 heures
    
    // Supprimer les en-têtes de sécurité restrictifs pour permettre le téléchargement
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('X-Content-Type-Options');
    
    // Définir les en-têtes pour le téléchargement du fichier
    res.setHeader('Content-Type', contentType);
    // Sanitize filename and provide RFC5987-compliant header for maximum compatibility
    const safeFilename = this.sanitizeFilename(filename);
    const asciiFallback = this.toAsciiFallback(safeFilename);
    const encodedFilename = this.encodeRFC5987(safeFilename);
    // Include both filename (ASCII fallback, unquoted per RFC6266 recommendations) and filename* (UTF-8)
    res.setHeader('Content-Disposition', `attachment; filename=${asciiFallback}; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', buffer.length);
    
    // En-têtes de cache pour éviter les problèmes avec les navigateurs
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Log pour débogage
    logger.info(`[${requestId}] Envoi du fichier ${filename} (${buffer.length} octets) avec en-têtes CORS améliorés`);
    logger.info(`[${requestId}] En-têtes de réponse: ${JSON.stringify(res.getHeaders())}`);
    
    // Envoyer le fichier
    res.status(200).send(buffer);
  }
}

export const exportController = new ExportController();
