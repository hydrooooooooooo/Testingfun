import { ApifyClient } from 'apify-client';
import config from '../config/config';
import { logger } from '../utils/logger';
import db from '../database';

// ID de l'acteur Apify pour les commentaires Facebook
const FACEBOOK_COMMENTS_ACTOR_ID = 'us5srxAYnsrkgUv2v';

export interface FacebookCommentAuthor {
  name: string;
  url?: string;
  id?: string;
}

export interface FacebookCommentData {
  id: string;
  author: FacebookCommentAuthor;
  text: string;
  likes: number;
  postedAt?: string;
  parentCommentId?: string;
  repliesCount?: number;
  isReply?: boolean;
  postUrl?: string;
}

export interface CommentScrapingOptions {
  resultsLimit?: number;
  includeNestedComments?: boolean;
  viewOption?: 'RANKED_UNFILTERED' | 'RANKED_THREADED' | 'RECENT_ACTIVITY';
}

export interface CommentScrapingResult {
  postUrl: string;
  totalComments: number;
  comments: FacebookCommentData[];
  runId: string;
  scrapedAt: string;
}

class CommentScraperService {
  private client: ApifyClient;
  // Track active comment runs to prevent duplicates
  private activeRuns: Map<string, { runId: string; startedAt: Date }> = new Map();

  constructor() {
    this.client = new ApifyClient({
      token: config.api.apifyToken || '',
    });
  }

  /**
   * Check if comments scraping is already running for a session
   */
  isRunningForSession(sessionId: string): boolean {
    return this.activeRuns.has(sessionId);
  }

  /**
   * Start comments scraping asynchronously (non-blocking)
   * Returns the run ID immediately without waiting for completion
   */
  async startCommentsScrapingAsync(
    postUrls: string[],
    sessionId: string,
    options: CommentScrapingOptions = {}
  ): Promise<{ runId: string; datasetId: string }> {
    const {
      resultsLimit = 50,
      includeNestedComments = false,
      viewOption = 'RANKED_UNFILTERED',
    } = options;

    // Prevent duplicate runs
    if (this.activeRuns.has(sessionId)) {
      const existing = this.activeRuns.get(sessionId)!;
      logger.warn('[COMMENT_SCRAPER] Comments already running for session', {
        sessionId,
        existingRunId: existing.runId,
        startedAt: existing.startedAt
      });
      throw new Error(`Comments scraping already in progress for session ${sessionId}`);
    }

    logger.info('[COMMENT_SCRAPER] Starting async comment scraping', {
      sessionId,
      postsCount: postUrls.length,
      resultsLimit,
      includeNestedComments,
    });

    try {
      const input = {
        startUrls: postUrls.map(url => ({ url })),
        resultsLimit,
        includeNestedComments,
        viewOption,
      };

      // Start actor without waiting (use start instead of call)
      const run = await this.client.actor(FACEBOOK_COMMENTS_ACTOR_ID).start(input, {
        memory: 256,
      });

      if (!run || !run.id) {
        throw new Error('Failed to start Apify actor');
      }

      // Track this run
      this.activeRuns.set(sessionId, {
        runId: run.id,
        startedAt: new Date()
      });

      logger.info('[COMMENT_SCRAPER] Async run started', {
        sessionId,
        runId: run.id,
        defaultDatasetId: run.defaultDatasetId,
      });

      return {
        runId: run.id,
        datasetId: run.defaultDatasetId,
      };
    } catch (error: any) {
      logger.error('[COMMENT_SCRAPER] Error starting async scraping', {
        sessionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check the status of a comments scraping run
   */
  async getRunStatus(runId: string): Promise<{
    status: string;
    datasetId?: string;
    itemCount?: number;
  }> {
    try {
      const run = await this.client.run(runId).get();
      
      if (!run) {
        return { status: 'NOT_FOUND' };
      }

      const result: any = {
        status: run.status,
        datasetId: run.defaultDatasetId,
      };

      // If succeeded, get item count
      if (run.status === 'SUCCEEDED' && run.defaultDatasetId) {
        try {
          const dataset = await this.client.dataset(run.defaultDatasetId).get();
          result.itemCount = dataset?.itemCount || 0;
        } catch (e) {
          // Ignore dataset errors
        }
      }

      return result;
    } catch (error: any) {
      logger.error('[COMMENT_SCRAPER] Error getting run status', {
        runId,
        error: error.message,
      });
      return { status: 'ERROR' };
    }
  }

  /**
   * Get comments from a completed run's dataset
   */
  async getCommentsFromDataset(datasetId: string): Promise<FacebookCommentData[]> {
    try {
      const { items } = await this.client.dataset(datasetId).listItems();

      return items.map((item: any) => ({
        id: item.id || item.commentId || `comment_${Date.now()}_${Math.random()}`,
        author: {
          name: item.authorName || item.author?.name || 'Unknown',
          url: item.authorUrl || item.author?.url,
          id: item.authorId || item.author?.id,
        },
        text: item.text || item.comment || '',
        likes: parseInt(item.likes || item.likesCount || '0', 10),
        postedAt: item.postedAt || item.timestamp || item.createdTime,
        parentCommentId: item.parentCommentId || item.replyToCommentId,
        repliesCount: parseInt(item.repliesCount || '0', 10),
        isReply: !!item.parentCommentId || !!item.isReply,
        postUrl: item.postUrl || item.inputUrl,
      }));
    } catch (error: any) {
      logger.error('[COMMENT_SCRAPER] Error getting comments from dataset', {
        datasetId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Start a single batch Apify actor run for all post URLs (non-blocking).
   * Returns immediately with runId + datasetId.
   */
  async startBatchComments(
    postUrls: string[],
    options: CommentScrapingOptions = {}
  ): Promise<{ runId: string; datasetId: string }> {
    const {
      resultsLimit = 50,
      includeNestedComments = false,
      viewOption = 'RANKED_UNFILTERED',
    } = options;

    logger.info('[COMMENT_SCRAPER] Starting batch comments actor', {
      postsCount: postUrls.length,
      resultsLimit,
    });

    const input = {
      startUrls: postUrls.map(url => ({ url })),
      resultsLimit,
      includeNestedComments,
      viewOption,
    };

    const run = await this.client.actor(FACEBOOK_COMMENTS_ACTOR_ID).start(input, {
      memory: 256,
    });

    if (!run || !run.id) {
      throw new Error('Failed to start batch comments actor');
    }

    logger.info('[COMMENT_SCRAPER] Batch comments actor started', {
      runId: run.id,
      datasetId: run.defaultDatasetId,
    });

    return { runId: run.id, datasetId: run.defaultDatasetId };
  }

  /**
   * Fetch dataset items from a completed batch run and group them by postUrl.
   * Returns one CommentScrapingResult per unique postUrl.
   */
  async getGroupedCommentResults(datasetId: string, runId: string): Promise<CommentScrapingResult[]> {
    const allComments = await this.getCommentsFromDataset(datasetId);

    const grouped = new Map<string, FacebookCommentData[]>();
    for (const comment of allComments) {
      const key = comment.postUrl || 'unknown';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(comment);
    }

    const results: CommentScrapingResult[] = [];
    for (const [postUrl, comments] of grouped) {
      results.push({
        postUrl,
        totalComments: comments.length,
        comments,
        runId,
        scrapedAt: new Date().toISOString(),
      });
    }

    logger.info('[COMMENT_SCRAPER] Grouped comment results', {
      datasetId,
      uniquePosts: results.length,
      totalComments: allComments.length,
    });

    return results;
  }

  /**
   * Clear tracking for a session (call when done or on error)
   */
  clearSessionTracking(sessionId: string): void {
    this.activeRuns.delete(sessionId);
  }

  /**
   * Scraper les commentaires d'un post Facebook
   */
  async scrapePostComments(
    postUrl: string,
    options: CommentScrapingOptions = {}
  ): Promise<CommentScrapingResult> {
    const {
      resultsLimit = 50,
      includeNestedComments = false,
      viewOption = 'RANKED_UNFILTERED',
    } = options;

    logger.info('[COMMENT_SCRAPER] Starting comment scraping', {
      postUrl,
      resultsLimit,
      includeNestedComments,
    });

    try {
      // Préparer l'input pour l'acteur
      const input = {
        startUrls: [{ url: postUrl }],
        resultsLimit,
        includeNestedComments,
        viewOption,
      };

      // Lancer l'acteur et attendre la fin
      const run = await this.client.actor(FACEBOOK_COMMENTS_ACTOR_ID).call(input);

      if (!run || !run.defaultDatasetId) {
        throw new Error('Apify run failed or no dataset returned');
      }

      logger.info('[COMMENT_SCRAPER] Apify run completed', {
        runId: run.id,
        datasetId: run.defaultDatasetId,
      });

      // Récupérer les résultats
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      // Transformer les données Apify en notre format
      const comments: FacebookCommentData[] = items.map((item: any) => ({
        id: item.id || item.commentId || `comment_${Date.now()}_${Math.random()}`,
        author: {
          name: item.authorName || item.author?.name || 'Unknown',
          url: item.authorUrl || item.author?.url,
          id: item.authorId || item.author?.id,
        },
        text: item.text || item.comment || '',
        likes: parseInt(item.likes || item.likesCount || '0', 10),
        postedAt: item.postedAt || item.timestamp || item.createdTime,
        parentCommentId: item.parentCommentId || item.replyToCommentId,
        repliesCount: parseInt(item.repliesCount || '0', 10),
        isReply: !!item.parentCommentId || !!item.isReply,
        postUrl: item.postUrl || item.inputUrl,
      }));

      logger.info('[COMMENT_SCRAPER] Comments scraped successfully', {
        postUrl,
        totalComments: comments.length,
      });

      return {
        postUrl,
        totalComments: comments.length,
        comments,
        runId: run.id,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('[COMMENT_SCRAPER] Error scraping comments', {
        postUrl,
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to scrape comments: ${error.message}`);
    }
  }

  /**
   * Scraper les commentaires de plusieurs posts en batch
   */
  async scrapeMultiplePostsComments(
    postUrls: string[],
    options: CommentScrapingOptions = {}
  ): Promise<CommentScrapingResult[]> {
    logger.info('[COMMENT_SCRAPER] Starting batch comment scraping', {
      postsCount: postUrls.length,
    });

    const results: CommentScrapingResult[] = [];

    // Scraper les posts un par un pour éviter de surcharger l'API
    for (const postUrl of postUrls) {
      try {
        const result = await this.scrapePostComments(postUrl, options);
        results.push(result);

        // Petit délai entre chaque scraping pour éviter le rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        logger.error('[COMMENT_SCRAPER] Error scraping post comments', {
          postUrl,
          error: error.message,
        });
        // Continuer avec les autres posts même si un échoue
        results.push({
          postUrl,
          totalComments: 0,
          comments: [],
          runId: '',
          scrapedAt: new Date().toISOString(),
        });
      }
    }

    logger.info('[COMMENT_SCRAPER] Batch scraping completed', {
      totalPosts: postUrls.length,
      successfulPosts: results.filter((r) => r.totalComments > 0).length,
    });

    return results;
  }

  /**
   * Sauvegarder les commentaires en base de données
   */
  async saveComments(
    userId: number,
    sessionId: string,
    postUrl: string,
    comments: FacebookCommentData[],
    runId: string
  ): Promise<void> {
    logger.info('[COMMENT_SCRAPER] Saving comments to database', {
      userId,
      sessionId,
      postUrl,
      commentsCount: comments.length,
    });

    try {
      // Créer ou mettre à jour le lien post-commentaires
      await db('facebook_post_comments_link')
        .insert({
          session_id: sessionId,
          post_url: postUrl,
          total_comments_scraped: comments.length,
          scrape_status: 'completed',
          scrape_run_id: runId,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflict(['session_id', 'post_url'])
        .merge();

      // Sauvegarder les commentaires
      if (comments.length > 0) {
        const commentsToInsert = comments.map((comment) => ({
          user_id: userId,
          session_id: sessionId,
          post_url: postUrl,
          comment_id: comment.id,
          author_name: comment.author.name,
          author_url: comment.author.url,
          author_id: comment.author.id,
          text: comment.text,
          likes: comment.likes,
          posted_at: comment.postedAt ? new Date(comment.postedAt) : null,
          parent_comment_id: comment.parentCommentId,
          replies_count: comment.repliesCount || 0,
          is_reply: comment.isReply || false,
          scrape_run_id: runId,
          raw_data: JSON.stringify(comment),
          created_at: new Date(),
          updated_at: new Date(),
        }));

        // Insérer par batch de 100 pour éviter les problèmes de mémoire
        const batchSize = 100;
        for (let i = 0; i < commentsToInsert.length; i += batchSize) {
          const batch = commentsToInsert.slice(i, i + batchSize);
          await db('facebook_comments').insert(batch);
        }
      }

      logger.info('[COMMENT_SCRAPER] Comments saved successfully', {
        sessionId,
        postUrl,
        savedCount: comments.length,
      });
    } catch (error: any) {
      logger.error('[COMMENT_SCRAPER] Error saving comments', {
        sessionId,
        postUrl,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Récupérer les commentaires d'un post depuis la base de données
   */
  async getPostComments(
    sessionId: string,
    postUrl: string,
    options?: {
      limit?: number;
      offset?: number;
      includeReplies?: boolean;
    }
  ): Promise<{ comments: any[]; total: number }> {
    const { limit = 50, offset = 0, includeReplies = true } = options || {};

    let query = db('facebook_comments')
      .where({ session_id: sessionId, post_url: postUrl })
      .orderBy('posted_at', 'desc');

    if (!includeReplies) {
      query = query.where('is_reply', false);
    }

    const [comments, countResult] = await Promise.all([
      query.limit(limit).offset(offset),
      db('facebook_comments')
        .where({ session_id: sessionId, post_url: postUrl })
        .count('* as count')
        .first(),
    ]);

    return {
      comments,
      total: parseInt(countResult?.count as string || '0', 10),
    };
  }

  /**
   * Récupérer les statistiques des commentaires d'une session
   */
  async getSessionCommentsStats(sessionId: string): Promise<any> {
    const stats = await db('facebook_comments')
      .where({ session_id: sessionId })
      .select(
        db.raw('COUNT(*) as total_comments'),
        db.raw('COUNT(DISTINCT post_url) as posts_with_comments'),
        db.raw('SUM(likes) as total_likes'),
        db.raw('AVG(likes) as avg_likes_per_comment')
      )
      .first();

    const postStats = await db('facebook_post_comments_link')
      .where({ session_id: sessionId })
      .select('post_url', 'total_comments_scraped', 'scrape_status');

    return {
      ...stats,
      posts: postStats,
    };
  }
}

export const commentScraperService = new CommentScraperService();
