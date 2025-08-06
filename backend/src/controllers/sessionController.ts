import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/sessionService';
import { apifyService } from '../services/apifyService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { logger } from '../utils/logger';
import excel from 'exceljs';
import axios from 'axios';
import { Parser } from 'json2csv';
import { exportService } from '../services/exportService';

export const downloadSessionData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { sessionId } = req.params;
  const format = (req.query.format as string) || 'excel';
  const downloadTokenHeader = req.headers['x-session-token'] as string;
  const downloadTokenQuery = req.query.token as string;
  const downloadToken = downloadTokenHeader || downloadTokenQuery; // Accepte le token de l'en-tête ou du query param


  logger.info(`Download request for session ${sessionId} with format ${format}`);

  try {
    const session = await sessionService.getSession(sessionId);

    // Vérification d'autorisation : l'utilisateur doit être le propriétaire OU fournir un token de téléchargement valide.
    const isOwner = req.user && session && session.user_id === req.user.id;
    const hasValidToken = !!(session && session.downloadToken && downloadToken && session.downloadToken === downloadToken);


    if (!session || (!isOwner && !hasValidToken)) {
      logger.warn(`Access denied for session ${sessionId}. Owner: ${!!isOwner}, Token valid: ${hasValidToken}`);
      return res.status(404).json({ message: 'Session not found or access denied.' });
    }

    if (!session.isPaid) {
      return res.status(402).json({ message: 'Payment is required for this session.' });
    }

    if (!session.datasetId || !session.packId) {
      return res.status(404).json({ message: 'Dataset or pack information is missing.' });
    }

    let fileBuffer: Buffer;
    let fileName: string;
    let contentType: string;

    if (format === 'excel' || format === 'xlsx') {
      fileBuffer = await exportService.generateEnhancedExcel(session.datasetId, session.packId);
      fileName = `EasyScrapy_${sessionId}.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (format === 'csv') {
      fileBuffer = await exportService.generateCSV(session.datasetId, session.packId);
      fileName = `EasyScrapy_${sessionId}.csv`;
      contentType = 'text/csv';
    } else {
      return res.status(400).json({ message: 'Unsupported format requested.' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileBuffer);

    logger.info(`Successfully sent file ${fileName} for session ${sessionId}`);

  } catch (error) {
    logger.error(`Error exporting session ${sessionId}:`, error);
    next(error);
  }
};
