import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import mentionDetectionService from '../services/mentionDetectionService';
import mentionAlertService from '../services/mentionAlertService';
import { logger } from '../utils/logger';
import db from '../database';

/**
 * Analyser les mentions d'une session
 */
export const analyzeMentions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { sessionId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Récupérer les mots-clés de l'utilisateur
    const keywords = await mentionDetectionService.getUserKeywords(req.user.id);

    if (keywords.length === 0) {
      return res.status(400).json({ 
        message: 'Aucun mot-clé configuré. Veuillez d\'abord configurer vos mots-clés de surveillance.' 
      });
    }

    // Analyser les mentions
    const mentions = await mentionDetectionService.detectMentionsInSession(
      sessionId,
      req.user.id,
      keywords
    );

    // Envoyer des alertes pour les mentions urgentes
    const urgentMentions = mentions.filter(m => m.priority_level === 'urgent');
    for (const mention of urgentMentions) {
      try {
        await mentionAlertService.sendAlert(mention, req.user, 'email');
      } catch (error: any) {
        logger.error('[MENTIONS] Failed to send alert:', error.message);
      }
    }

    logger.info(`[MENTIONS] Analysis complete: ${mentions.length} mentions found, ${urgentMentions.length} urgent`);

    return res.status(200).json({
      success: true,
      mentionsFound: mentions.length,
      urgentMentions: urgentMentions.length,
      mentions,
    });
  } catch (error: any) {
    logger.error('[MENTIONS] Error analyzing mentions:', error);
    next(error);
  }
};

/**
 * Récupérer les mentions de l'utilisateur
 */
export const getMentions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { status, type, priority, sessionId, limit, offset } = req.query;

    const filters = {
      status: status as string,
      type: type as string,
      priority: priority as string,
      sessionId: sessionId as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    };

    const result = await mentionDetectionService.getUserMentions(req.user.id, filters);

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('[MENTIONS] Error fetching mentions:', error);
    next(error);
  }
};

/**
 * Obtenir les statistiques des mentions
 */
export const getMentionStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const stats = await mentionDetectionService.getMentionStats(req.user.id);
    return res.status(200).json(stats);
  } catch (error: any) {
    logger.error('[MENTIONS] Error fetching stats:', error);
    next(error);
  }
};

/**
 * Marquer une mention comme résolue
 */
export const resolveMention = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { mentionId } = req.params;
  const { notes } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    await mentionDetectionService.resolveMention(
      parseInt(mentionId, 10),
      req.user.id,
      notes
    );

    return res.status(200).json({ 
      success: true,
      message: 'Mention marked as resolved' 
    });
  } catch (error: any) {
    logger.error('[MENTIONS] Error resolving mention:', error);
    next(error);
  }
};

/**
 * Configurer les mots-clés de surveillance
 */
export const setKeywords = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { keywords } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!Array.isArray(keywords)) {
    return res.status(400).json({ message: 'Keywords must be an array' });
  }

  try {
    await mentionDetectionService.setUserKeywords(req.user.id, keywords);

    return res.status(200).json({ 
      success: true,
      message: 'Keywords updated successfully',
      count: keywords.length 
    });
  } catch (error: any) {
    logger.error('[MENTIONS] Error setting keywords:', error);
    next(error);
  }
};

/**
 * Récupérer les mots-clés de l'utilisateur
 */
export const getKeywords = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const keywords = await mentionDetectionService.getUserKeywords(req.user.id);
    return res.status(200).json({ keywords });
  } catch (error: any) {
    logger.error('[MENTIONS] Error fetching keywords:', error);
    next(error);
  }
};

/**
 * Récupérer les mots-clés détaillés de l'utilisateur
 */
export const getKeywordsDetailed = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const keywords = await mentionDetectionService.getUserKeywordsDetailed(req.user.id);
    return res.status(200).json({ keywords });
  } catch (error: any) {
    logger.error('[MENTIONS] Error fetching detailed keywords:', error);
    next(error);
  }
};

/**
 * Ajouter un mot-clé avec configuration complète
 */
export const addKeyword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { keyword, category, monitoredPages, frequency, emailAlerts } = req.body;

  if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
    return res.status(400).json({ message: 'Keyword is required' });
  }

  try {
    const newKeyword = await mentionDetectionService.addKeyword(req.user.id, {
      keyword: keyword.trim(),
      category,
      monitoredPages,
      frequency,
      emailAlerts,
    });

    return res.status(201).json({
      success: true,
      message: 'Keyword added successfully',
      keyword: newKeyword,
    });
  } catch (error: any) {
    logger.error('[MENTIONS] Error adding keyword:', error);
    next(error);
  }
};

/**
 * Supprimer un mot-clé
 */
export const deleteKeyword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { keywordId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    await mentionDetectionService.deleteKeyword(req.user.id, parseInt(keywordId, 10));

    return res.status(200).json({
      success: true,
      message: 'Keyword deleted successfully',
    });
  } catch (error: any) {
    logger.error('[MENTIONS] Error deleting keyword:', error);
    next(error);
  }
};

/**
 * Récupérer les sessions Facebook Pages de l'utilisateur
 */
export const getFacebookPagesSessions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sessions = await mentionDetectionService.getUserFacebookPagesSessions(req.user.id);
    return res.status(200).json({ sessions });
  } catch (error: any) {
    logger.error('[MENTIONS] Error fetching Facebook Pages sessions:', error);
    next(error);
  }
};

/**
 * Obtenir les alertes non lues
 */
export const getUnreadAlerts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const alerts = await mentionAlertService.getUnreadAlerts(req.user.id);
    const count = await mentionAlertService.getUnreadCount(req.user.id);

    return res.status(200).json({ alerts, count });
  } catch (error: any) {
    logger.error('[MENTIONS] Error fetching alerts:', error);
    next(error);
  }
};

/**
 * Marquer toutes les alertes comme lues
 */
export const markAllAlertsAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    await mentionAlertService.markAllAsRead(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'All alerts marked as read'
    });
  } catch (error: any) {
    logger.error('[MENTIONS] Error marking all alerts as read:', error);
    next(error);
  }
};

/**
 * Marquer une alerte comme lue
 */
export const markAlertAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { alertId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    await mentionAlertService.markAsRead(parseInt(alertId, 10), req.user.id);

    return res.status(200).json({ 
      success: true,
      message: 'Alert marked as read' 
    });
  } catch (error: any) {
    logger.error('[MENTIONS] Error marking alert as read:', error);
    next(error);
  }
};
