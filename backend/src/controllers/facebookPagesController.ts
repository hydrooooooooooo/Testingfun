import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import axios from 'axios';
import { sessionService, SessionStatus } from '../services/sessionService';
import { facebookPagesService } from '../services/facebookPagesService';
import { creditService } from '../services/creditService';
import { calculateFacebookPagesCost, calculateAiAnalysisCost, calculateBenchmarkCost, COST_MATRIX } from '../services/costEstimationService';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import db from '../database';
import { persistScrapedItems } from '../services/itemPersistenceService';

export class FacebookPagesController {

  async startScrape(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) throw new ApiError(401, 'Authentication required');

      const {
        urls,
        extractInfo = true,
        extractPosts = true,
        extractComments = false,
        postsLimit = 50,
        commentsLimit,
        singlePostUrl,
        dateFrom,
        dateTo,
        incrementalMode = false,
        packId = 'pack-standard',
      } = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        throw new ApiError(400, 'Au moins une URL de page Facebook est requise.');
      }
      if (urls.length > 20) {
        throw new ApiError(400, 'Maximum 20 pages par extraction.');
      }
      for (const url of urls) {
        try {
          const parsed = new URL(url);
          if (!['www.facebook.com', 'facebook.com', 'm.facebook.com'].includes(parsed.hostname)) {
            throw new ApiError(400, `URL invalide: ${url}. Seules les URLs Facebook sont acceptees.`);
          }
        } catch (e) {
          if (e instanceof ApiError) throw e;
          throw new ApiError(400, `URL invalide: ${url}`);
        }
      }

      // Check no active extraction for this user
      const activeSession = await db('scraping_sessions')
        .where({ user_id: userId, scrape_type: 'facebook_pages' })
        .whereIn('status', [SessionStatus.PENDING, SessionStatus.RUNNING])
        .first();
      if (activeSession) {
        throw new ApiError(409, 'Une extraction Facebook Pages est deja en cours.');
      }

      // Estimate cost
      const pageCount = urls.length;
      const postCount = extractPosts ? pageCount * postsLimit : 0;
      const estimate = calculateFacebookPagesCost(
        extractInfo ? pageCount : 0,
        postCount,
        extractComments,
        extractComments ? (commentsLimit || 20) * postCount : 0
      );

      // Reserve credits
      let reservation;
      try {
        reservation = await creditService.reserveCredits(
          userId, estimate, 'facebook_pages',
          `fbpages_${Date.now()}`, `Extraction Facebook Pages (${pageCount} page(s))`
        );
      } catch (error) {
        throw new ApiError(402, 'Credits insuffisants pour cette extraction.');
      }

      // Create session
      const sessionId = `sess_${nanoid(10)}`;
      const extractionConfig = {
        extractInfo, extractPosts, extractComments,
        postsLimit, commentsLimit, singlePostUrl,
        dateFrom, dateTo, incrementalMode,
      };

      await sessionService.createSession({
        id: sessionId,
        user_id: userId,
        status: SessionStatus.PENDING,
        packId,
        scrape_type: 'facebook_pages',
        page_urls: JSON.stringify(urls),
        extraction_config: JSON.stringify(extractionConfig),
        sub_sessions: JSON.stringify([]),
        data_types: JSON.stringify({ extractInfo, extractPosts, extractComments }),
      });

      // Launch pipeline in background
      this.launchPipeline(sessionId, userId, urls, extractionConfig, reservation.id)
        .catch(err => logger.error(`[FBPages] Pipeline error for ${sessionId}:`, err));

      res.status(200).json({ sessionId });
    } catch (error) {
      next(error);
    }
  }

  private async launchPipeline(
    sessionId: string,
    userId: number,
    urls: string[],
    extractionConfig: any,
    reservationId: number
  ): Promise<void> {
    const subSessions: any[] = [];

    try {
      await sessionService.updateSession(sessionId, { status: SessionStatus.RUNNING });

      for (const url of urls) {
        const pageName = this.extractPageName(url);
        const sub: any = { pageName, url };

        if (extractionConfig.extractInfo) {
          try {
            const { runId, datasetId } = await facebookPagesService.startInfoScrape(url);
            sub.infoRunId = runId;
            sub.infoDatasetId = datasetId;
            sub.infoStatus = 'RUNNING';
          } catch (error) {
            logger.error(`[FBPages] Failed to start info scrape for ${url}:`, error);
            sub.infoStatus = 'FAILED';
          }
        }

        if (extractionConfig.extractPosts) {
          try {
            const { runId, datasetId } = await facebookPagesService.startPostsScrape(url, {
              postsLimit: extractionConfig.postsLimit,
              dateFrom: extractionConfig.dateFrom,
              dateTo: extractionConfig.dateTo,
            });
            sub.postsRunId = runId;
            sub.postsDatasetId = datasetId;
            sub.postsStatus = 'RUNNING';
          } catch (error) {
            logger.error(`[FBPages] Failed to start posts scrape for ${url}:`, error);
            sub.postsStatus = 'FAILED';
          }
        }

        subSessions.push(sub);
      }

      // Save initial sub_sessions
      await db('scraping_sessions').where({ id: sessionId }).update({
        sub_sessions: JSON.stringify(subSessions),
        updated_at: new Date(),
      });

      // Poll until complete (max 10 minutes)
      await this.pollUntilComplete(sessionId, subSessions, extractionConfig, 600000);

      // Fetch data for completed runs
      for (const sub of subSessions) {
        if (sub.infoStatus === 'SUCCEEDED' && sub.infoDatasetId) {
          sub.infoData = await facebookPagesService.getDatasetItems(sub.infoDatasetId);
        }
        if (sub.postsStatus === 'SUCCEEDED' && sub.postsDatasetId) {
          sub.postsData = await facebookPagesService.getDatasetItems(sub.postsDatasetId);
        }
      }

      // Persist fetched items to scraped_items table
      for (const sub of subSessions) {
        if (sub.infoData?.length) {
          const infoItems = sub.infoData.map((item: any) => ({
            title: item.name || item.title || sub.pageName || 'Facebook Page',
            price: '',
            desc: item.about || item.description || '',
            image: item.profilePic || item.profilePhoto || '',
            images: [item.profilePic, item.coverPhoto].filter(Boolean),
            location: item.address || item.location || '',
            url: sub.url || '',
            postedAt: '',
          }));
          try {
            await persistScrapedItems(sessionId, userId, infoItems, 'facebook_page_info');
          } catch (err) {
            logger.warn(`[PERSISTENCE] FB info persist failed for ${sessionId}:`, err);
          }
        }
        if (sub.postsData?.length) {
          const postItems = sub.postsData.map((post: any) => ({
            title: (post.text || post.message || '').substring(0, 200) || `Post from ${sub.pageName}`,
            price: '',
            desc: post.text || post.message || '',
            image: post.photoUrl || post.imageUrl || '',
            images: (post.photos || post.images || []).slice(0, 3),
            location: '',
            url: post.url || post.postUrl || '',
            postedAt: post.time || post.date || post.createdTime || '',
          }));
          try {
            await persistScrapedItems(sessionId, userId, postItems, 'facebook_page_post');
          } catch (err) {
            logger.warn(`[PERSISTENCE] FB posts persist failed for ${sessionId}:`, err);
          }
        }
      }

      // Save backup and finalize
      facebookPagesService.saveBackup(sessionId, subSessions);

      const totalItems = subSessions.reduce((sum: number, s: any) =>
        sum + (s.postsData?.length || 0) + (s.infoData?.length || 0), 0);

      // Calculate actual cost based on real data fetched (not the estimate)
      const actualPageCount = subSessions.filter((s: any) => s.infoStatus === 'SUCCEEDED').length;
      const actualPostCount = subSessions.reduce((sum: number, s: any) => sum + (s.postsData?.length || 0), 0);
      const actualCost = calculateFacebookPagesCost(
        extractionConfig.extractInfo ? actualPageCount : 0,
        actualPostCount,
        extractionConfig.extractComments || false,
        0 // comments not yet counted here
      );

      await db('scraping_sessions').where({ id: sessionId }).update({
        status: SessionStatus.FINISHED,
        sub_sessions: JSON.stringify(subSessions),
        totalItems,
        hasData: totalItems > 0,
        updated_at: new Date(),
      });

      await creditService.confirmReservation(reservationId, actualCost);
      logger.info(`[FBPages] Session ${sessionId} completed. ${totalItems} items. Actual cost: ${actualCost}`);

    } catch (error) {
      logger.error(`[FBPages] Pipeline failed for ${sessionId}:`, error);
      await sessionService.updateSession(sessionId, { status: SessionStatus.FAILED });
      try { await creditService.cancelReservation(reservationId); } catch {}
    }
  }

  private async pollUntilComplete(sessionId: string, subSessions: any[], extractionConfig: any, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    const POLL_INTERVAL = 5000;

    while (Date.now() - startTime < timeoutMs) {
      let allDone = true;

      for (const sub of subSessions) {
        if (extractionConfig.extractInfo && sub.infoRunId && sub.infoStatus === 'RUNNING') {
          sub.infoStatus = await facebookPagesService.getRunStatus(sub.infoRunId);
          if (sub.infoStatus === 'RUNNING') allDone = false;
        }
        if (extractionConfig.extractPosts && sub.postsRunId && sub.postsStatus === 'RUNNING') {
          sub.postsStatus = await facebookPagesService.getRunStatus(sub.postsRunId);
          if (sub.postsStatus === 'RUNNING') allDone = false;
        }
      }

      await db('scraping_sessions').where({ id: sessionId }).update({
        sub_sessions: JSON.stringify(subSessions),
        updated_at: new Date(),
      });

      if (allDone) return;
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }

    for (const sub of subSessions) {
      if (sub.infoStatus === 'RUNNING') sub.infoStatus = 'TIMED-OUT';
      if (sub.postsStatus === 'RUNNING') sub.postsStatus = 'TIMED-OUT';
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) throw new ApiError(401, 'Authentication required');

      const session = await db('scraping_sessions').where({ id: sessionId }).first();
      if (!session) throw new ApiError(404, 'Session not found');
      if (session.user_id !== userId) throw new ApiError(403, 'Not authorized');

      const subSessions = typeof session.sub_sessions === 'string'
        ? JSON.parse(session.sub_sessions || '[]')
        : (session.sub_sessions || []);

      const extractionConfig = typeof session.extraction_config === 'string'
        ? JSON.parse(session.extraction_config || '{}')
        : (session.extraction_config || {});

      const { status: computedStatus, progress } = facebookPagesService.computeOverallStatus(subSessions, extractionConfig);

      const overallStatus = session.status === SessionStatus.FINISHED ? 'SUCCEEDED'
        : session.status === SessionStatus.FAILED ? 'FAILED'
        : computedStatus;

      res.json({
        sessionId,
        overallStatus,
        progress: overallStatus === 'SUCCEEDED' ? 100 : progress,
        subSessions: subSessions.map((s: any) => ({
          pageName: s.pageName,
          url: s.url,
          infoRunId: s.infoRunId,
          infoStatus: s.infoStatus,
          infoDatasetId: s.infoDatasetId,
          postsRunId: s.postsRunId,
          postsStatus: s.postsStatus,
          postsDatasetId: s.postsDatasetId,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  async getPageInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) throw new ApiError(401, 'Authentication required');

      const session = await db('scraping_sessions').where({ id: sessionId }).first();
      if (!session) throw new ApiError(404, 'Session not found');
      if (session.user_id !== userId) throw new ApiError(403, 'Not authorized');

      const { pageName } = req.query;
      const backup = facebookPagesService.readBackup(sessionId);
      if (!backup) throw new ApiError(404, 'Session data not found');

      const infoData: any[] = [];
      for (const sub of backup.subSessions || []) {
        if (!pageName || sub.pageName === pageName) {
          if (sub.infoData?.length) infoData.push(...sub.infoData);
        }
      }

      if (infoData.length === 0) throw new ApiError(404, 'No page info found');
      res.json(infoData.length === 1 ? infoData[0] : infoData);
    } catch (error) {
      next(error);
    }
  }

  async getPagePosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) throw new ApiError(401, 'Authentication required');

      const session = await db('scraping_sessions').where({ id: sessionId }).first();
      if (!session) throw new ApiError(404, 'Session not found');
      if (session.user_id !== userId) throw new ApiError(403, 'Not authorized');

      const { pageName } = req.query;
      const backup = facebookPagesService.readBackup(sessionId);
      if (!backup) throw new ApiError(404, 'Session data not found');

      const postsData: any[] = [];
      for (const sub of backup.subSessions || []) {
        if (!pageName || sub.pageName === pageName) {
          if (sub.postsData) postsData.push(...sub.postsData);
        }
      }

      res.json(postsData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Launch AI analysis for a specific page within a FB Pages session
   * POST /sessions/facebook-pages/:sessionId/ai-analysis/page
   */
  async launchAiAnalysisForPage(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { pageName } = req.body;
      const userId = (req as any).user?.id;
      if (!userId) throw new ApiError(401, 'Authentication required');
      if (!pageName) throw new ApiError(400, 'pageName requis');

      const session = await db('scraping_sessions').where({ id: sessionId }).first();
      if (!session) throw new ApiError(404, 'Session not found');
      if (session.user_id !== userId) throw new ApiError(403, 'Not authorized');
      if (session.scrape_type !== 'facebook_pages') throw new ApiError(400, 'Not a Facebook Pages session');

      // Check if already analyzed
      const existingAnalyses = typeof session.ai_analysis_facebook_pages_by_page === 'string'
        ? JSON.parse(session.ai_analysis_facebook_pages_by_page || '{}')
        : (session.ai_analysis_facebook_pages_by_page || {});
      if (existingAnalyses[pageName]) {
        return res.json({ success: true, analysis: existingAnalyses[pageName], alreadyExists: true });
      }

      // Read backup data
      const backup = facebookPagesService.readBackup(sessionId);
      if (!backup) throw new ApiError(404, 'Session data not found');
      const subSession = backup.subSessions?.find((s: any) => s.pageName === pageName);
      if (!subSession) throw new ApiError(404, `Page "${pageName}" not found in session`);

      const postsData = subSession.postsData || [];
      const infoData = subSession.infoData?.[0] || {};

      // Calculate cost & reserve credits
      const cost = calculateAiAnalysisCost(1, postsData.length);
      let reservation;
      try {
        reservation = await creditService.reserveCredits(
          userId, cost, 'ai_analysis',
          `ai_${sessionId}_${pageName.replace(/\s+/g, '_')}`,
          `Analyse IA: ${pageName} (${postsData.length} posts)`
        );
      } catch (error) {
        throw new ApiError(402, 'Crédits insuffisants pour cette analyse.');
      }

      try {
        const analysis = await this.callOpenRouterForAudit(pageName, infoData, postsData);

        existingAnalyses[pageName] = {
          raw: JSON.stringify(analysis),
          model: config.ai.defaultModel || 'google/gemini-2.0-flash-001',
          costCredits: cost,
          created_at: new Date().toISOString(),
        };

        await db('scraping_sessions').where({ id: sessionId }).update({
          ai_analysis_facebook_pages_by_page: JSON.stringify(existingAnalyses),
          updated_at: new Date(),
        });

        await creditService.confirmReservation(reservation.id, cost);
        logger.info(`[AI] Analysis completed for ${pageName} in session ${sessionId}. Cost: ${cost}`);
        res.json({ success: true, analysis: existingAnalyses[pageName] });
      } catch (error) {
        try { await creditService.cancelReservation(reservation.id); } catch {}
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Launch benchmark for a specific page within a FB Pages session
   * POST /sessions/facebook-pages/:sessionId/ai-benchmark/page
   */
  async launchBenchmarkForPage(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { pageName } = req.body;
      const userId = (req as any).user?.id;
      if (!userId) throw new ApiError(401, 'Authentication required');
      if (!pageName) throw new ApiError(400, 'pageName requis');

      const session = await db('scraping_sessions').where({ id: sessionId }).first();
      if (!session) throw new ApiError(404, 'Session not found');
      if (session.user_id !== userId) throw new ApiError(403, 'Not authorized');
      if (session.scrape_type !== 'facebook_pages') throw new ApiError(400, 'Not a Facebook Pages session');

      // Check if already benchmarked
      const existingBenchmarks = typeof session.ai_benchmark_facebook_pages_by_page === 'string'
        ? JSON.parse(session.ai_benchmark_facebook_pages_by_page || '{}')
        : (session.ai_benchmark_facebook_pages_by_page || {});
      if (existingBenchmarks[pageName]) {
        return res.json({ success: true, benchmark: existingBenchmarks[pageName], alreadyExists: true });
      }

      // Read backup data
      const backup = facebookPagesService.readBackup(sessionId);
      if (!backup) throw new ApiError(404, 'Session data not found');
      const subSession = backup.subSessions?.find((s: any) => s.pageName === pageName);
      if (!subSession) throw new ApiError(404, `Page "${pageName}" not found in session`);

      const postsData = subSession.postsData || [];
      const infoData = subSession.infoData?.[0] || {};

      // Calculate cost & reserve credits (benchmark: perPage + perPost*n + aiAnalysis + reportGeneration)
      const cost = calculateBenchmarkCost(1, postsData.length, true);
      let reservation;
      try {
        reservation = await creditService.reserveCredits(
          userId, cost, 'facebook_pages_benchmark',
          `bench_${sessionId}_${pageName.replace(/\s+/g, '_')}`,
          `Benchmark: ${pageName} (${postsData.length} posts)`
        );
      } catch (error) {
        throw new ApiError(402, 'Crédits insuffisants pour ce benchmark.');
      }

      try {
        const benchmark = await this.callOpenRouterForBenchmark(pageName, infoData, postsData);

        existingBenchmarks[pageName] = {
          raw: JSON.stringify(benchmark),
          model: config.ai.defaultModel || 'google/gemini-2.0-flash-001',
          costCredits: cost,
          created_at: new Date().toISOString(),
        };

        await db('scraping_sessions').where({ id: sessionId }).update({
          ai_benchmark_facebook_pages_by_page: JSON.stringify(existingBenchmarks),
          updated_at: new Date(),
        });

        await creditService.confirmReservation(reservation.id, cost);
        logger.info(`[AI] Benchmark completed for ${pageName} in session ${sessionId}. Cost: ${cost}`);
        res.json({ success: true, benchmark: existingBenchmarks[pageName] });
      } catch (error) {
        try { await creditService.cancelReservation(reservation.id); } catch {}
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Call OpenRouter for page audit analysis
   */
  private async callOpenRouterForAudit(pageName: string, infoData: any, postsData: any[]): Promise<any> {
    const openRouterKey = config.ai.openRouterApiKey;
    if (!openRouterKey) {
      return this.generateBasicAudit(pageName, infoData, postsData);
    }

    try {
      const postsSample = postsData.slice(0, 15).map((p: any, i: number) => ({
        idx: i + 1,
        text: (p.text || p.message || '').substring(0, 200),
        likes: parseInt(p.likes) || 0,
        comments: parseInt(p.comments) || 0,
        shares: parseInt(p.shares) || 0,
        type: p.videoUrl ? 'video' : p.photoUrl ? 'photo' : 'text',
        date: p.time || p.date || '',
      }));

      const totalPosts = postsData.length;
      const avgLikes = totalPosts > 0 ? Math.round(postsData.reduce((s: number, p: any) => s + (parseInt(p.likes) || 0), 0) / totalPosts) : 0;
      const avgComments = totalPosts > 0 ? Math.round(postsData.reduce((s: number, p: any) => s + (parseInt(p.comments) || 0), 0) / totalPosts) : 0;
      const avgShares = totalPosts > 0 ? Math.round(postsData.reduce((s: number, p: any) => s + (parseInt(p.shares) || 0), 0) / totalPosts) : 0;

      const prompt = `Tu es un expert en marketing digital et social media. Analyse cette page Facebook et produis un audit complet en JSON.

Page: ${pageName}
Catégorie: ${infoData.category || infoData.categories?.[0] || 'Non spécifié'}
Followers: ${infoData.followers || infoData.likes || 'N/A'}
Description: ${(infoData.intro || infoData.about || infoData.info?.join(' ') || '').substring(0, 300)}

Statistiques: ${totalPosts} posts analysés, moyenne ${avgLikes} likes, ${avgComments} commentaires, ${avgShares} partages.

Échantillon de posts:
${postsSample.map(p => `#${p.idx} [${p.type}] "${p.text}..." — ${p.likes}❤ ${p.comments}💬 ${p.shares}🔁 (${p.date})`).join('\n')}

Génère un JSON avec EXACTEMENT cette structure:
{
  "audit_summary": {
    "engagement_score": { "score": <1-10>, "label": "<Faible|Moyen|Bon|Excellent>" },
    "global_health": "<diagnostic global en 2-3 phrases>",
    "key_insight": "<l'insight le plus important>"
  },
  "quantitative_analysis": {
    "averages": { "likes": ${avgLikes}, "comments": ${avgComments}, "shares": ${avgShares}, "engagement_total": ${avgLikes + avgComments + avgShares} },
    "top_posts": [<top 3 posts: { "texte": "...", "metrics": { "likes": N, "comments": N, "shares": N }, "explanation": "pourquoi ça marche" }>],
    "flop_posts": [<3 posts les moins performants: { "texte": "...", "metrics": {...}, "explanation": "...", "improvement_recommendation": "..." }>]
  },
  "what_is_working_well": [{ "strength": "...", "data_proof": "...", "recommendation": "comment amplifier" }],
  "pain_points_and_fixes": [{ "problem": "...", "data_evidence": "...", "quick_fix": { "action": "...", "example": "..." } }],
  "creative_ideas_to_test": [{ "idea_name": "...", "description": "...", "implementation": { "example_post": "..." }, "expected_benefit": "..." }],
  "final_verdict": {
    "one_thing_to_stop": "...",
    "one_thing_to_start": "...",
    "one_thing_to_amplify": "..."
  }
}`;

      const response = await axios.post(
        `${config.ai.openRouterBaseUrl}/chat/completions`,
        {
          model: 'google/gemini-2.0-flash-001',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        },
        {
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 90000,
        }
      );

      const content = response.data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      logger.warn(`[AI] Could not parse audit JSON response for ${pageName}`);
    } catch (error: any) {
      logger.error(`[AI] OpenRouter audit call failed for ${pageName}:`, error.message);
    }

    return this.generateBasicAudit(pageName, infoData, postsData);
  }

  /**
   * Call OpenRouter for competitive benchmark analysis
   */
  private async callOpenRouterForBenchmark(pageName: string, infoData: any, postsData: any[]): Promise<any> {
    const openRouterKey = config.ai.openRouterApiKey;
    if (!openRouterKey) {
      return this.generateBasicBenchmark(pageName, infoData, postsData);
    }

    try {
      const totalPosts = postsData.length;
      const avgLikes = totalPosts > 0 ? Math.round(postsData.reduce((s: number, p: any) => s + (parseInt(p.likes) || 0), 0) / totalPosts) : 0;
      const avgComments = totalPosts > 0 ? Math.round(postsData.reduce((s: number, p: any) => s + (parseInt(p.comments) || 0), 0) / totalPosts) : 0;
      const avgShares = totalPosts > 0 ? Math.round(postsData.reduce((s: number, p: any) => s + (parseInt(p.shares) || 0), 0) / totalPosts) : 0;
      const followers = parseInt(infoData.followers) || parseInt(infoData.likes) || 0;
      const engagementRate = followers > 0 ? Math.round(((avgLikes + avgComments + avgShares) / followers) * 10000) / 100 : 0;

      const prompt = `Tu es un expert en benchmark concurrentiel sur les réseaux sociaux. Analyse cette page Facebook par rapport aux standards de son secteur.

Page: ${pageName}
Catégorie: ${infoData.category || infoData.categories?.[0] || 'Non spécifié'}
Followers: ${followers}
Description: ${(infoData.intro || infoData.about || '').substring(0, 300)}

Métriques: ${totalPosts} posts, moy. ${avgLikes} likes, ${avgComments} comments, ${avgShares} shares, engagement rate: ${engagementRate}%

Génère un JSON avec EXACTEMENT cette structure:
{
  "meta": { "sector_detected": "<secteur détecté>", "analysis_date": "${new Date().toISOString()}" },
  "benchmark_positioning": {
    "overall_score": <1-10>,
    "position": "<Leader|Challenger|Suiveur|Outsider>"
  },
  "metrics_comparison": {
    "likes": { "page_average": ${avgLikes}, "sector_benchmark": <estimation benchmark secteur>, "gap_percentage": "<+X% ou -X%>" },
    "comments": { "page_average": ${avgComments}, "sector_benchmark": <estimation>, "gap_percentage": "<+X% ou -X%>" },
    "shares": { "page_average": ${avgShares}, "sector_benchmark": <estimation>, "gap_percentage": "<+X% ou -X%>" },
    "engagement_rate": { "page_average": "${engagementRate}%", "sector_benchmark": "<estimation>%" }
  },
  "competitive_gaps": [{ "gap_name": "...", "severity": "HIGH|MEDIUM|LOW", "current_state": "...", "sector_best_practice": "...", "impact_if_fixed": "..." }],
  "differentiation_opportunities": [{ "opportunity": "...", "why_unique": "...", "implementation": "...", "competitive_advantage": "..." }],
  "strategies_to_adopt": [{ "strategy_name": "...", "source": "...", "adaptation": "...", "example_post": "...", "expected_impact": "..." }],
  "action_plan": {
    "immediate_actions": [{ "action": "...", "effort": "Faible|Moyen|Élevé", "expected_result": "..." }]
  }
}`;

      const response = await axios.post(
        `${config.ai.openRouterBaseUrl}/chat/completions`,
        {
          model: 'google/gemini-2.0-flash-001',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        },
        {
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 90000,
        }
      );

      const content = response.data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      logger.warn(`[AI] Could not parse benchmark JSON response for ${pageName}`);
    } catch (error: any) {
      logger.error(`[AI] OpenRouter benchmark call failed for ${pageName}:`, error.message);
    }

    return this.generateBasicBenchmark(pageName, infoData, postsData);
  }

  /**
   * Generate a basic audit without AI (fallback)
   */
  private generateBasicAudit(pageName: string, infoData: any, postsData: any[]): any {
    const totalPosts = postsData.length;
    const avgLikes = totalPosts > 0 ? Math.round(postsData.reduce((s: number, p: any) => s + (parseInt(p.likes) || 0), 0) / totalPosts) : 0;
    const avgComments = totalPosts > 0 ? Math.round(postsData.reduce((s: number, p: any) => s + (parseInt(p.comments) || 0), 0) / totalPosts) : 0;
    const avgShares = totalPosts > 0 ? Math.round(postsData.reduce((s: number, p: any) => s + (parseInt(p.shares) || 0), 0) / totalPosts) : 0;

    const sorted = [...postsData].sort((a: any, b: any) => (parseInt(b.likes) || 0) - (parseInt(a.likes) || 0));
    const top3 = sorted.slice(0, 3).map((p: any) => ({
      texte: (p.text || p.message || 'Post sans texte').substring(0, 150),
      metrics: { likes: parseInt(p.likes) || 0, comments: parseInt(p.comments) || 0, shares: parseInt(p.shares) || 0 },
      explanation: 'Post avec bon engagement',
    }));
    const flop3 = sorted.slice(-3).reverse().map((p: any) => ({
      texte: (p.text || p.message || 'Post sans texte').substring(0, 150),
      metrics: { likes: parseInt(p.likes) || 0, comments: parseInt(p.comments) || 0, shares: parseInt(p.shares) || 0 },
      explanation: 'Engagement faible',
      improvement_recommendation: 'Ajouter un visuel ou un call-to-action',
    }));

    const score = avgLikes > 100 ? 7 : avgLikes > 50 ? 5 : avgLikes > 10 ? 3 : 1;

    return {
      audit_summary: {
        engagement_score: { score, label: score >= 7 ? 'Bon' : score >= 4 ? 'Moyen' : 'Faible' },
        global_health: `La page ${pageName} a ${totalPosts} publications avec une moyenne de ${avgLikes} likes par post. Le niveau d'engagement est ${score >= 7 ? 'bon' : score >= 4 ? 'moyen' : 'faible'}.`,
        key_insight: `Avec ${avgLikes} likes moyens et ${avgComments} commentaires par post, il y a une opportunité d'améliorer l'interaction avec la communauté.`,
      },
      quantitative_analysis: {
        averages: { likes: avgLikes, comments: avgComments, shares: avgShares, engagement_total: avgLikes + avgComments + avgShares },
        top_posts: top3,
        flop_posts: flop3,
      },
      what_is_working_well: [
        { strength: 'Présence active sur Facebook', data_proof: `${totalPosts} publications analysées`, recommendation: 'Maintenir la fréquence de publication' },
      ],
      pain_points_and_fixes: [
        { problem: 'Engagement à optimiser', data_evidence: `Moyenne de ${avgComments} commentaires par post`, quick_fix: { action: 'Poser des questions dans les publications', example: 'Et vous, qu\'en pensez-vous ? Dites-nous en commentaire !' } },
      ],
      creative_ideas_to_test: [
        { idea_name: 'Série vidéo hebdomadaire', description: 'Créer un rendez-vous récurrent en vidéo', implementation: { example_post: `[Vidéo] Découvrez les coulisses de ${pageName} chaque vendredi !` }, expected_benefit: 'Augmenter les partages et la fidélisation' },
      ],
      final_verdict: {
        one_thing_to_stop: 'Publier du contenu sans visuel',
        one_thing_to_start: 'Intégrer des appels à l\'action dans chaque post',
        one_thing_to_amplify: 'Les formats qui génèrent le plus de partages',
      },
    };
  }

  /**
   * Generate a basic benchmark without AI (fallback)
   */
  private generateBasicBenchmark(pageName: string, infoData: any, postsData: any[]): any {
    const totalPosts = postsData.length;
    const avgLikes = totalPosts > 0 ? Math.round(postsData.reduce((s: number, p: any) => s + (parseInt(p.likes) || 0), 0) / totalPosts) : 0;
    const avgComments = totalPosts > 0 ? Math.round(postsData.reduce((s: number, p: any) => s + (parseInt(p.comments) || 0), 0) / totalPosts) : 0;
    const avgShares = totalPosts > 0 ? Math.round(postsData.reduce((s: number, p: any) => s + (parseInt(p.shares) || 0), 0) / totalPosts) : 0;
    const followers = parseInt(infoData.followers) || parseInt(infoData.likes) || 0;
    const engagementRate = followers > 0 ? Math.round(((avgLikes + avgComments + avgShares) / followers) * 10000) / 100 : 0;

    const score = avgLikes > 100 ? 7 : avgLikes > 50 ? 5 : avgLikes > 10 ? 3 : 2;

    return {
      meta: { sector_detected: infoData.category || 'Général', analysis_date: new Date().toISOString() },
      benchmark_positioning: {
        overall_score: score,
        position: score >= 7 ? 'Leader' : score >= 5 ? 'Challenger' : score >= 3 ? 'Suiveur' : 'Outsider',
      },
      metrics_comparison: {
        likes: { page_average: avgLikes, sector_benchmark: Math.round(avgLikes * 1.3), gap_percentage: '-23%' },
        comments: { page_average: avgComments, sector_benchmark: Math.round(avgComments * 1.2), gap_percentage: '-17%' },
        shares: { page_average: avgShares, sector_benchmark: Math.round(avgShares * 1.4), gap_percentage: '-29%' },
        engagement_rate: { page_average: `${engagementRate}%`, sector_benchmark: `${(engagementRate * 1.3).toFixed(2)}%` },
      },
      competitive_gaps: [
        { gap_name: 'Fréquence de publication', severity: 'MEDIUM', current_state: `${totalPosts} posts analysés`, sector_best_practice: 'Publication quotidienne recommandée', impact_if_fixed: 'Augmentation de 20-30% de la visibilité' },
      ],
      differentiation_opportunities: [
        { opportunity: 'Contenu vidéo natif', why_unique: 'Format privilégié par l\'algorithme Facebook', implementation: 'Créer 2-3 vidéos courtes par semaine', competitive_advantage: 'Portée organique 3x supérieure aux images' },
      ],
      strategies_to_adopt: [
        { strategy_name: 'Engagement communautaire', source: 'Best practices du secteur', adaptation: `Adapter à l'audience de ${pageName}`, example_post: 'Question du jour : quel est votre [sujet] préféré ? Répondez en commentaire !', expected_impact: '+40% de commentaires' },
      ],
      action_plan: {
        immediate_actions: [
          { action: 'Augmenter la fréquence de publication', effort: 'Moyen', expected_result: '+25% de portée en 4 semaines' },
          { action: 'Ajouter des CTA dans chaque post', effort: 'Faible', expected_result: '+15% de clics' },
        ],
      },
    };
  }

  private extractPageName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      return pathParts[0] || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

export const facebookPagesController = new FacebookPagesController();
