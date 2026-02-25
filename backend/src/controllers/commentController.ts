import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { commentScraperService } from '../services/commentScraperService';
import { creditService } from '../services/creditService';
import { sessionService } from '../services/sessionService';
import { COST_MATRIX } from '../services/costEstimationService';
import { logger } from '../utils/logger';
import config from '../config/config';
import db from '../database';
import * as fs from 'fs';
import * as path from 'path';

// Coût en crédits pour scraper les commentaires — utilise COST_MATRIX centralisé
const COMMENTS_CREDIT_COST_PER_POST = COST_MATRIX.comments.perPost; // 0.1 crédit par post

/**
 * Scraper les commentaires d'un ou plusieurs posts d'une session
 */
export const scrapeSessionComments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { sessionId } = req.params;
  const { postUrls, resultsLimit = 50, includeNestedComments = false } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!postUrls || !Array.isArray(postUrls) || postUrls.length === 0) {
    return res.status(400).json({ message: 'postUrls array is required' });
  }

  let reservationId: number | null = null;

  try {
    // Vérifier que la session appartient à l'utilisateur
    const session = await sessionService.getSession(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Session not found or access denied' });
    }

    // Calculer le coût en crédits
    const totalCreditCost = postUrls.length * COMMENTS_CREDIT_COST_PER_POST;

    // Réserver les crédits (au lieu de les déduire directement)
    try {
      const reservation = await creditService.reserveCredits(
        req.user.id,
        totalCreditCost,
        'facebook_pages',
        sessionId,
        `Extraction commentaires (${postUrls.length} posts)`
      );
      reservationId = reservation.id;
    } catch (creditError: any) {
      logger.warn('[COMMENTS] Credit reservation failed', {
        userId: req.user.id,
        error: creditError.message,
      });
      return res.status(402).json({
        message: creditError.message || 'Insufficient credits',
        required: totalCreditCost,
      });
    }

    logger.info('[COMMENTS] Starting comment scraping', {
      sessionId,
      userId: req.user.id,
      postsCount: postUrls.length,
      creditCost: totalCreditCost,
    });

    // Scraper les commentaires
    const results = await commentScraperService.scrapeMultiplePostsComments(postUrls, {
      resultsLimit,
      includeNestedComments,
    });

    // Sauvegarder les commentaires en base de données
    let totalCommentsSaved = 0;
    for (const result of results) {
      if (result.comments.length > 0) {
        await commentScraperService.saveComments(
          req.user.id,
          sessionId,
          result.postUrl,
          result.comments,
          result.runId
        );
        totalCommentsSaved += result.comments.length;
      }
    }

    // Confirmer la réservation des crédits
    await creditService.confirmReservation(reservationId!);
    logger.info('[COMMENTS] Credits confirmed for session', { sessionId, creditCost: totalCreditCost });

    // Mettre à jour la session avec les stats de commentaires
    await sessionService.updateSession(sessionId, {
      extract_comments: true,
      total_comments_scraped: totalCommentsSaved,
      comments_credit_cost: totalCreditCost,
    } as any);

    logger.info('[COMMENTS] Comment scraping completed', {
      sessionId,
      totalCommentsSaved,
      creditCost: totalCreditCost,
    });

    return res.status(200).json({
      message: 'Comments scraped successfully',
      sessionId,
      results: results.map((r) => ({
        postUrl: r.postUrl,
        totalComments: r.totalComments,
        runId: r.runId,
      })),
      totalCommentsSaved,
      creditCost: totalCreditCost,
    });
  } catch (error: any) {
    // Annuler la réservation en cas d'échec
    if (reservationId) {
      try { await creditService.cancelReservation(reservationId); } catch {}
    }

    logger.error('[COMMENTS] Error scraping comments', {
      sessionId,
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: 'Failed to scrape comments',
      error: error.message,
    });
  }
};

/**
 * Récupérer les commentaires d'un post spécifique
 * Cherche d'abord dans le fichier backup JSON, puis dans la DB
 */
export const getPostComments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { sessionId } = req.params;
  const { postUrl, limit = 50, offset = 0, includeReplies = true } = req.query;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!postUrl) {
    return res.status(400).json({ message: 'postUrl query parameter is required' });
  }

  try {
    // Vérifier que la session appartient à l'utilisateur
    const session = await sessionService.getSession(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Session not found or access denied' });
    }

    // D'abord essayer de lire depuis le fichier backup JSON (pour Facebook Pages)
    const backupPath = path.join(process.cwd(), 'data', 'backups', `fbpages_${sessionId}.json`);
    
    if (fs.existsSync(backupPath)) {
      try {
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
        const postUrlStr = postUrl as string;
        const postSlug = postUrlStr.split('/').filter(Boolean).pop() || '';

        // Chercher les commentaires pour ce post dans toutes les subSessions
        let allComments: any[] = [];

        for (const subSession of backupData.subSessions || []) {
          if (subSession.commentsData && Array.isArray(subSession.commentsData)) {
            for (const entry of subSession.commentsData) {
              // commentsData is CommentScrapingResult[] — each entry has .postUrl and .comments[]
              const entryComments: any[] = entry.comments || [];
              const entryPostUrl: string = entry.postUrl || '';

              // If entry is a grouped result, match at result level
              if (entryComments.length > 0) {
                const urlMatch = entryPostUrl === postUrlStr ||
                  (postSlug && entryPostUrl.includes(postSlug)) ||
                  (postSlug && postUrlStr.includes(entryPostUrl.split('/').filter(Boolean).pop() || 'NO_MATCH'));
                if (urlMatch) {
                  allComments = allComments.concat(entryComments);
                }
              } else {
                // Legacy flat format: entry IS the comment
                const commentPostUrl = entry.postUrl || '';
                const match = commentPostUrl === postUrlStr ||
                  (postSlug && commentPostUrl.includes(postSlug));
                if (match) allComments.push(entry);
              }
            }
          }
        }
        
        if (allComments.length > 0) {
          // Transformer les commentaires au format attendu par le frontend
          const formattedComments = allComments.map((c: any) => ({
            id: c.id,
            author_name: c.author?.name || 'Anonyme',
            text: c.text || '',
            likes: c.likes || 0,
            posted_at: c.timestamp ? new Date(c.timestamp * 1000).toISOString() : null,
            is_reply: c.isReply || false,
            replies_count: c.repliesCount || 0,
            post_url: c.postUrl,
          }));
          
          const limitNum = parseInt(limit as string, 10);
          const offsetNum = parseInt(offset as string, 10);
          const paginatedComments = formattedComments.slice(offsetNum, offsetNum + limitNum);
          
          logger.info('[COMMENTS] Fetched comments from backup JSON', {
            sessionId,
            postUrl: postUrlStr,
            total: allComments.length,
            returned: paginatedComments.length,
          });
          
          return res.status(200).json({
            sessionId,
            postUrl,
            comments: paginatedComments,
            total: allComments.length,
            limit: limitNum,
            offset: offsetNum,
          });
        }
      } catch (backupError: any) {
        logger.warn('[COMMENTS] Error reading backup file, falling back to DB', {
          sessionId,
          error: backupError.message,
        });
      }
    }

    // Fallback: chercher dans la base de données
    // Try exact match first
    let result = await commentScraperService.getPostComments(
      sessionId,
      postUrl as string,
      {
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        includeReplies: includeReplies === 'true',
      }
    );

    // If no results, try flexible URL matching (pfbid slug)
    if (result.total === 0) {
      const slug = (postUrl as string).split('/').filter(Boolean).pop() || '';
      if (slug) {
        const likeResult = await db('facebook_comments')
          .where({ session_id: sessionId })
          .andWhere('post_url', 'like', `%${slug}%`)
          .count('* as count')
          .first();
        const flexTotal = parseInt(likeResult?.count as string || '0', 10);
        if (flexTotal > 0) {
          const limitNum = parseInt(limit as string, 10);
          const offsetNum = parseInt(offset as string, 10);
          let query = db('facebook_comments')
            .where({ session_id: sessionId })
            .andWhere('post_url', 'like', `%${slug}%`)
            .orderBy('posted_at', 'desc');
          if (includeReplies !== 'true') {
            query = query.where('is_reply', false);
          }
          const flexComments = await query.limit(limitNum).offset(offsetNum);
          result = { comments: flexComments, total: flexTotal };
          logger.info('[COMMENTS] Flexible URL match found', { sessionId, slug, total: flexTotal });
        }
      }
    }

    return res.status(200).json({
      sessionId,
      postUrl,
      comments: result.comments,
      total: result.total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error: any) {
    logger.error('[COMMENTS] Error fetching comments', {
      sessionId,
      postUrl,
      error: error.message,
    });

    return res.status(500).json({
      message: 'Failed to fetch comments',
      error: error.message,
    });
  }
};

/**
 * Récupérer les statistiques des commentaires d'une session
 */
export const getSessionCommentsStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { sessionId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Vérifier que la session appartient à l'utilisateur
    const session = await sessionService.getSession(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Session not found or access denied' });
    }

    const stats = await commentScraperService.getSessionCommentsStats(sessionId);

    return res.status(200).json({
      sessionId,
      stats,
    });
  } catch (error: any) {
    logger.error('[COMMENTS] Error fetching stats', {
      sessionId,
      error: error.message,
    });

    return res.status(500).json({
      message: 'Failed to fetch comments stats',
      error: error.message,
    });
  }
};

/**
 * Supprimer les commentaires d'une session
 */
export const deleteSessionComments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { sessionId } = req.params;

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Vérifier que la session appartient à l'utilisateur
    const session = await sessionService.getSession(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({ message: 'Session not found or access denied' });
    }

    // Supprimer les commentaires
    const deletedCount = await db('facebook_comments')
      .where({ session_id: sessionId })
      .delete();

    await db('facebook_post_comments_link')
      .where({ session_id: sessionId })
      .delete();

    logger.info('[COMMENTS] Comments deleted', {
      sessionId,
      deletedCount,
    });

    return res.status(200).json({
      message: 'Comments deleted successfully',
      deletedCount,
    });
  } catch (error: any) {
    logger.error('[COMMENTS] Error deleting comments', {
      sessionId,
      error: error.message,
    });

    return res.status(500).json({
      message: 'Failed to delete comments',
      error: error.message,
    });
  }
};
