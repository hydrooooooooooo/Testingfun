import db from '../database';
import { logger } from '../utils/logger';
import axios from 'axios';
import { config } from '../config/config';

interface MentionAnalysis {
  type: 'recommendation' | 'question' | 'complaint';
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  responseTime: number;
  detectedKeywords: string[];
  reasoning: string;
}

class MentionDetectionService {
  /**
   * Analyser les posts d'une session pour détecter les mentions de mots-clés
   * Lit directement les fichiers de backup pour récupérer les posts
   */
  async detectMentionsInSession(
    sessionId: string,
    userId: number,
    keywords: string[]
  ): Promise<any[]> {
    logger.info(`[MENTIONS] Detecting mentions in session ${sessionId} for user ${userId}`);

    if (!keywords || keywords.length === 0) {
      logger.warn('[MENTIONS] No keywords provided, skipping detection');
      return [];
    }

    // 1. Charger les posts et commentaires depuis le fichier de backup
    const { posts, comments } = await this.loadPostsAndCommentsFromBackup(sessionId);

    if ((!posts || posts.length === 0) && (!comments || comments.length === 0)) {
      logger.info('[MENTIONS] No posts or comments found in session');
      return [];
    }

    logger.info(`[MENTIONS] Found ${posts.length} posts and ${comments.length} comments to analyze`);

    // 2. Filtrer les posts contenant les mots-clés
    const postMentions = posts.filter((post: any) => {
      const text = (post.text || post.message || '').toLowerCase();
      return keywords.some(keyword => 
        text.includes(keyword.toLowerCase())
      );
    }).map((p: any) => ({ ...p, sourceType: 'post' }));

    // 3. Filtrer les commentaires contenant les mots-clés
    const commentMentions = comments.filter((comment: any) => {
      const text = (comment.text || comment.message || '').toLowerCase();
      return keywords.some(keyword => 
        text.includes(keyword.toLowerCase())
      );
    }).map((c: any) => ({ ...c, sourceType: 'comment' }));

    // Combiner posts et commentaires
    const mentionCandidates = [...postMentions, ...commentMentions];

    logger.info(`[MENTIONS] Found ${mentionCandidates.length} items with keywords (${postMentions.length} posts, ${commentMentions.length} comments)`);

    if (mentionCandidates.length === 0) {
      return [];
    }

    // 3. Analyser chaque mention avec l'IA (ou fallback basique) et sauvegarder en DB
    const mentions = [];
    for (const post of mentionCandidates) {
      try {
        const analysis = await this.analyzeMention(post, keywords);
        
        // Préparer les données de la mention
        const mentionData = {
          user_id: userId,
          session_id: sessionId,
          brand_keywords: JSON.stringify(analysis.detectedKeywords),
          mention_type: analysis.type,
          confidence_score: analysis.confidence,
          sentiment: analysis.sentiment,
          sentiment_score: analysis.sentimentScore,
          priority_level: analysis.priority,
          suggested_response_time: analysis.responseTime,
          post_url: post.postUrl || post.url || post.link || '',
          comment_text: post.text || post.message || '',
          comment_author: post.sourceType === 'comment' ? (post.author_name || post.authorName || 'Utilisateur') : (post.pageName || 'Page Facebook'),
          comment_likes: post.likes || post.reactions || 0,
          comment_posted_at: post.time || post.timestamp || post.posted_at || new Date().toISOString(),
          page_name: post.pageName || '',
          post_type: post.sourceType || post.type || 'post', // 'post' ou 'comment'
          status: 'new',
        };

        // Sauvegarder en base de données
        const [savedMention] = await db('brand_mentions')
          .insert(mentionData)
          .returning('*');

        // Mettre à jour le compteur de mentions pour les mots-clés détectés
        for (const keyword of analysis.detectedKeywords) {
          await this.incrementKeywordMentionCount(userId, keyword);
        }

        mentions.push({
          ...savedMention,
          brand_keywords: analysis.detectedKeywords, // Retourner en array pour le frontend
        });
        
        logger.info(`[MENTIONS] Saved mention ${savedMention.id} - Type: ${analysis.type}, Priority: ${analysis.priority}, Keywords: ${analysis.detectedKeywords.join(', ')}`);
      } catch (error: any) {
        logger.error(`[MENTIONS] Error analyzing/saving post:`, error.message);
      }
    }

    logger.info(`[MENTIONS] Successfully detected and saved ${mentions.length} mentions`);
    return mentions;
  }

  /**
   * Incrémenter le compteur de mentions pour un mot-clé
   */
  private async incrementKeywordMentionCount(userId: number, keyword: string): Promise<void> {
    try {
      await db('brand_keywords')
        .where({ user_id: userId, keyword: keyword, is_active: true })
        .increment('mentions_count', 1)
        .update({ last_mention_at: new Date() });
    } catch (error: any) {
      logger.warn(`[MENTIONS] Could not increment count for keyword "${keyword}":`, error.message);
    }
  }

  /**
   * Charger les posts ET les commentaires depuis un fichier de backup
   */
  private async loadPostsAndCommentsFromBackup(sessionId: string): Promise<{ posts: any[], comments: any[] }> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const backupsDir = path.join(__dirname, '../../data/backups');

    try {
      // Trouver le fichier correspondant à la session
      const files = await fs.readdir(backupsDir);
      const sessionFile = files.find(f => 
        f.includes(sessionId) || 
        f.replace('fbpages_', '').replace('.json', '') === sessionId
      );

      if (!sessionFile) {
        // Essayer avec le préfixe fbpages_sess_
        const altFile = files.find(f => f === `fbpages_sess_${sessionId}.json`);
        if (!altFile) {
          logger.warn(`[MENTIONS] No backup file found for session ${sessionId}`);
          return { posts: [], comments: [] };
        }
      }

      const filePath = path.join(backupsDir, sessionFile || `fbpages_sess_${sessionId}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Extraire tous les posts et commentaires de toutes les sous-sessions
      const allPosts: any[] = [];
      const allComments: any[] = [];
      
      for (const subSession of (data.subSessions || [])) {
        const pageName = subSession.pageName || 'Unknown Page';
        const pageUrl = subSession.url;
        
        // Extraire les posts
        for (const post of (subSession.postsData || [])) {
          allPosts.push({
            ...post,
            pageName,
            pageUrl,
          });
          
          // Extraire les commentaires de chaque post (si présents)
          const postComments = post.comments_data || post.commentsData || [];
          for (const comment of postComments) {
            allComments.push({
              ...comment,
              pageName,
              pageUrl,
              postId: post.postId || post.id,
              postUrl: post.url || post.postUrl,
              postText: (post.text || post.message || '').substring(0, 100), // Contexte du post
            });
          }
        }
        
        // Aussi vérifier les commentaires stockés séparément (commentsData au niveau subSession)
        for (const comment of (subSession.commentsData || [])) {
          allComments.push({
            ...comment,
            pageName,
            pageUrl,
          });
        }
      }

      logger.info(`[MENTIONS] Loaded ${allPosts.length} posts and ${allComments.length} comments from backup`);
      return { posts: allPosts, comments: allComments };
    } catch (err) {
      logger.error(`[MENTIONS] Error loading posts/comments from backup:`, err);
      return { posts: [], comments: [] };
    }
  }

  /**
   * Analyser une mention avec l'IA
   */
  private async analyzeMention(
    comment: any,
    keywords: string[]
  ): Promise<MentionAnalysis> {
    const prompt = `Analyse ce commentaire Facebook et détermine :
1. Type de mention : "recommendation" (recommandation positive), "question" (demande d'information), ou "complaint" (plainte/problème)
2. Sentiment : "positive", "neutral", ou "negative"
3. Score de sentiment : 0-100 (0 = très négatif, 50 = neutre, 100 = très positif)
4. Niveau de priorité : "low" (faible), "medium" (moyen), "high" (élevé), ou "urgent" (urgent)
5. Temps de réponse suggéré en minutes : 5, 12, 60, 180, ou 1440
6. Mots-clés détectés parmi : ${keywords.join(', ')}

Commentaire :
"${comment.text}"

Auteur : ${comment.author_name}
Likes : ${comment.likes || 0}
Date : ${comment.posted_at}

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
{
  "type": "recommendation|question|complaint",
  "confidence": 0-100,
  "sentiment": "positive|neutral|negative",
  "sentimentScore": 0-100,
  "priority": "low|medium|high|urgent",
  "responseTime": 5|12|60|180|1440,
  "detectedKeywords": ["keyword1", "keyword2"],
  "reasoning": "Explication courte en français"
}`;

    try {
      // Appel direct à l'API OpenRouter
      const response = await axios.post(
        `${config.ai.openRouterBaseUrl}/chat/completions`,
        {
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.ai.openRouterApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content || '';
      
      // Nettoyer la réponse pour extraire uniquement le JSON
      let cleanedResponse = aiResponse.trim();
      
      // Supprimer les balises markdown si présentes
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }

      const analysis: MentionAnalysis = JSON.parse(cleanedResponse);
      
      // Validation des valeurs
      if (!['recommendation', 'question', 'complaint'].includes(analysis.type)) {
        analysis.type = 'question';
      }
      if (!['positive', 'neutral', 'negative'].includes(analysis.sentiment)) {
        analysis.sentiment = 'neutral';
      }
      if (!['low', 'medium', 'high', 'urgent'].includes(analysis.priority)) {
        analysis.priority = 'medium';
      }

      return analysis;
    } catch (error: any) {
      logger.error('[AI] OpenRouter.mentionAnalysis', {
        error: error.message,
        operation: 'analyze_mention',
        commentText: comment.text?.substring(0, 100),
        keywordsCount: keywords.length
      });
      
      // Fallback : analyse basique basée sur les mots-clés
      const text = comment.text?.toLowerCase() || '';
      const detectedKeywords = keywords.filter(k => 
        text.includes(k.toLowerCase())
      );

      // Détection basique du type
      let type: 'recommendation' | 'question' | 'complaint' = 'question';
      if (text.includes('recommande') || text.includes('excellent') || text.includes('super')) {
        type = 'recommendation';
      } else if (text.includes('problème') || text.includes('mauvais') || text.includes('déçu')) {
        type = 'complaint';
      }

      // Détection basique du sentiment
      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
      let sentimentScore = 50;
      if (type === 'recommendation') {
        sentiment = 'positive';
        sentimentScore = 75;
      } else if (type === 'complaint') {
        sentiment = 'negative';
        sentimentScore = 25;
      }

      return {
        type,
        confidence: 50,
        sentiment,
        sentimentScore,
        priority: 'medium',
        responseTime: 60,
        detectedKeywords,
        reasoning: 'Analyse automatique (IA indisponible)',
      };
    }
  }

  /**
   * Récupérer les mentions d'un utilisateur
   */
  async getUserMentions(
    userId: number,
    filters?: {
      status?: string;
      type?: string;
      priority?: string;
      sessionId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ mentions: any[]; total: number }> {
    try {
      let query = db('brand_mentions').where({ user_id: userId });

      if (filters?.status) {
        query = query.where({ status: filters.status });
      }
      if (filters?.type) {
        query = query.where({ mention_type: filters.type });
      }
      if (filters?.priority) {
        query = query.where({ priority_level: filters.priority });
      }
      if (filters?.sessionId) {
        query = query.where({ session_id: filters.sessionId });
      }

      // Compter le total
      const [{ count }] = await query.clone().count('* as count');
      const total = parseInt(count as string, 10);

      // Récupérer les mentions avec pagination
      const mentions = await query
        .orderBy('created_at', 'desc')
        .limit(filters?.limit || 50)
        .offset(filters?.offset || 0);

      return { mentions, total };
    } catch (error: any) {
      // Si la table n'existe pas, retourner une liste vide
      if (error?.code === '42P01') {
        logger.warn('[MENTIONS] brand_mentions table missing - returning empty mentions');
        return { mentions: [], total: 0 };
      }
      throw error;
    }
  }

  /**
   * Marquer une mention comme traitée
   */
  async resolveMention(
    mentionId: number,
    userId: number,
    notes?: string
  ): Promise<void> {
    await db('brand_mentions')
      .where({ id: mentionId, user_id: userId })
      .update({
        status: 'resolved',
        resolved_at: new Date(),
        resolution_notes: notes,
        updated_at: new Date(),
      });

    logger.info(`[MENTIONS] Mention ${mentionId} marked as resolved`);
  }
  /**
   * Obtenir les statistiques des mentions pour un utilisateur
   */
  async getMentionStats(userId: number): Promise<{
    total: number;
    new: number;
    recommendations: number;
    questions: number;
    complaints: number;
    avgSentiment: number;
  }> {
    try {
      const stats = await db('brand_mentions')
        .where({ user_id: userId })
        .select(
          db.raw('COUNT(*) as total'),
          db.raw("COUNT(*) FILTER (WHERE status = 'new') as new"),
          db.raw("COUNT(*) FILTER (WHERE mention_type = 'recommendation') as recommendations"),
          db.raw("COUNT(*) FILTER (WHERE mention_type = 'question') as questions"),
          db.raw("COUNT(*) FILTER (WHERE mention_type = 'complaint') as complaints"),
          db.raw('AVG(sentiment_score) as avg_sentiment')
        )
        .first();

      return {
        total: parseInt((stats as any)?.total || '0', 10),
        new: parseInt((stats as any)?.new || '0', 10),
        recommendations: parseInt((stats as any)?.recommendations || '0', 10),
        questions: parseInt((stats as any)?.questions || '0', 10),
        complaints: parseInt((stats as any)?.complaints || '0', 10),
        avgSentiment: (stats as any)?.avg_sentiment ? parseFloat((stats as any).avg_sentiment) : 50,
      };
    } catch (error: any) {
      // Si la table n'existe pas (42P01), renvoyer des stats vides plutôt qu'un 500
      if (error?.code === '42P01') {
        logger.warn('[MENTIONS] brand_mentions table missing - returning empty stats');
        return {
          total: 0,
          new: 0,
          recommendations: 0,
          questions: 0,
          complaints: 0,
          avgSentiment: 50,
        };
      }

      throw error;
    }
  }

  /**
   * Configurer les mots-clés de surveillance pour un utilisateur
   */
  async setUserKeywords(
    userId: number,
    keywords: { keyword: string; category?: string }[]
  ): Promise<void> {
    // Désactiver tous les mots-clés existants
    await db('brand_keywords')
      .where({ user_id: userId })
      .update({ is_active: false });

    // Ajouter les nouveaux mots-clés
    if (keywords.length > 0) {
      await db('brand_keywords').insert(
        keywords.map(k => ({
          user_id: userId,
          keyword: k.keyword,
          category: k.category || 'custom',
          is_active: true,
        }))
      );
    }

    logger.info(`[MENTIONS] Updated keywords for user ${userId}: ${keywords.length} keywords`);
  }

  /**
   * Ajouter un mot-clé avec configuration complète
   */
  async addKeyword(
    userId: number,
    keywordData: {
      keyword: string;
      category?: string;
      monitoredPages?: string[];
      frequency?: string;
      emailAlerts?: boolean;
    }
  ): Promise<any> {
    const [keyword] = await db('brand_keywords')
      .insert({
        user_id: userId,
        keyword: keywordData.keyword,
        category: keywordData.category || 'custom',
        monitored_pages: JSON.stringify(keywordData.monitoredPages || []),
        frequency: keywordData.frequency || 'realtime',
        email_alerts: keywordData.emailAlerts !== false,
        is_active: true,
        mentions_count: 0,
      })
      .returning('*');

    logger.info(`[MENTIONS] Added keyword "${keywordData.keyword}" for user ${userId}`);
    return keyword;
  }

  /**
   * Supprimer un mot-clé
   */
  async deleteKeyword(userId: number, keywordId: number): Promise<void> {
    await db('brand_keywords')
      .where({ id: keywordId, user_id: userId })
      .delete();

    logger.info(`[MENTIONS] Deleted keyword ${keywordId} for user ${userId}`);
  }

  /**
   * Récupérer les mots-clés actifs d'un utilisateur (simple liste)
   */
  async getUserKeywords(userId: number): Promise<string[]> {
    try {
      const keywords = await db('brand_keywords')
        .where({ user_id: userId, is_active: true })
        .pluck('keyword');

      return keywords;
    } catch (error: any) {
      // Si la table n'existe pas, retourner une liste vide
      if (error?.code === '42P01') {
        logger.warn('[MENTIONS] brand_keywords table missing - returning empty keywords');
        return [];
      }
      throw error;
    }
  }

  /**
   * Récupérer les mots-clés avec toutes leurs configurations
   */
  async getUserKeywordsDetailed(userId: number): Promise<any[]> {
    try {
      const keywords = await db('brand_keywords')
        .where({ user_id: userId, is_active: true })
        .select('*')
        .orderBy('created_at', 'desc');

      return keywords.map((k: any) => ({
        id: k.id,
        keyword: k.keyword,
        category: k.category,
        monitoredPages: typeof k.monitored_pages === 'string' 
          ? JSON.parse(k.monitored_pages || '[]') 
          : (k.monitored_pages || []),
        frequency: k.frequency || 'realtime',
        emailAlerts: k.email_alerts !== false,
        mentionsCount: k.mentions_count || 0,
        lastMentionAt: k.last_mention_at,
        createdAt: k.created_at,
      }));
    } catch (error: any) {
      // Si la table n'existe pas, retourner une liste vide
      if (error?.code === '42P01') {
        logger.warn('[MENTIONS] brand_keywords table missing - returning empty keywords');
        return [];
      }
      throw error;
    }
  }

  /**
   * Récupérer les sessions Facebook Pages de l'utilisateur pour la surveillance
   * Scanne directement les fichiers de backup pour trouver les pages disponibles
   */
  async getUserFacebookPagesSessions(userId: number): Promise<any[]> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const backupsDir = path.join(__dirname, '../../data/backups');
    
    try {
      // Lire tous les fichiers de backup
      const files = await fs.readdir(backupsDir);
      const fbPagesFiles = files.filter(f => f.startsWith('fbpages_sess_') && f.endsWith('.json'));
      
      const sessionsWithPages = await Promise.all(
        fbPagesFiles.map(async (file) => {
          try {
            const filePath = path.join(backupsDir, file);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            const fileStat = await fs.stat(filePath);
            
            const pages = (data.subSessions || []).map((sub: any) => ({
              pageName: sub.pageName,
              url: sub.url,
              followers: sub.infoData?.[0]?.followers || sub.infoData?.[0]?.likes || 0,
              postsCount: sub.postsData?.length || 0,
              hasComments: (sub.postsData || []).some((post: any) => post.comments > 0),
            }));

            // Ne retourner que les sessions avec des pages
            if (pages.length === 0) return null;

            return {
              sessionId: data.sessionId || file.replace('fbpages_', '').replace('.json', ''),
              createdAt: data.timestamp || fileStat.mtime.toISOString(),
              pages,
              totalPages: pages.length,
            };
          } catch (err) {
            logger.warn(`[MENTIONS] Error reading backup file ${file}:`, err);
            return null;
          }
        })
      );

      // Filtrer les nulls et trier par date
      return sessionsWithPages
        .filter((s): s is NonNullable<typeof s> => s !== null && s.totalPages > 0)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      logger.error('[MENTIONS] Error reading backups directory:', err);
      return [];
    }
  }

  /**
   * Mettre à jour le compteur de mentions pour un mot-clé
   */
  async updateKeywordMentionCount(keywordId: number, count: number): Promise<void> {
    await db('brand_keywords')
      .where({ id: keywordId })
      .update({
        mentions_count: count,
        last_mention_at: new Date(),
      });
  }
}

export default new MentionDetectionService();
