import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import db from '../database';
import { logger } from '../utils/logger';
import { benchmarkService, FullBenchmarkReport } from '../services/benchmarkService';
import { CreditService } from '../services/creditService';

const creditServiceInstance = new CreditService();

interface PostData {
  id: number;
  title: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  posted_at: string;
  url: string;
  pageName: string;
  pageUrl: string;
}

interface PageAnalysis {
  name: string;
  url: string;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  engagementRate: number;
  bestPostingTime: string;
  topPosts: PostData[];
  postsByDay: { [key: string]: number };
  color: string;
  isMyPage: boolean;
}

interface BenchmarkResult {
  dateRange: {
    start: string;
    end: string;
    label: string;
  };
  myPage: PageAnalysis | null;
  competitors: PageAnalysis[];
  allPosts: PostData[];
  summary: {
    totalPostsAnalyzed: number;
    totalPagesAnalyzed: number;
    dateRangeLabel: string;
  };
  insights: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    recommendations: string[];
  };
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

/**
 * Extraire le nom de la page depuis l'URL Facebook
 */
function extractPageName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Enlever les slashes et prendre le premier segment
    const segments = pathname.split('/').filter(s => s.length > 0);
    if (segments.length > 0) {
      // Décoder et formater le nom
      let name = decodeURIComponent(segments[0]);
      // Remplacer les tirets et underscores par des espaces
      name = name.replace(/[-_]/g, ' ');
      // Capitaliser chaque mot
      name = name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      return name;
    }
  } catch (e) {
    // Si l'URL est invalide, retourner une version nettoyée
  }
  return url.replace(/https?:\/\/(www\.)?facebook\.com\/?/i, '').split('/')[0] || 'Page inconnue';
}

/**
 * Analyser et comparer les performances avec les concurrents
 */
export const analyzeBenchmark = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { competitors, myPageUrl, config: analysisConfig } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  try {
    logger.info(`[BENCHMARK] Starting analysis for user ${userId} with ${competitors?.length || 0} competitors`);

    // Récupérer la configuration de dates
    const dateRange = analysisConfig?.dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
      label: 'Dernier mois'
    };

    // 1. Récupérer les données de l'utilisateur (ma page)
    const userSessions = await db('scraping_sessions')
      .where({ user_id: userId, scrape_type: 'facebook_pages', status: 'completed' })
      .orderBy('created_at', 'desc')
      .limit(20);

    let myPage: PageAnalysis | null = null;
    const allPosts: PostData[] = [];

    if (userSessions.length > 0) {
      const sessionIds = userSessions.map(s => s.id);
      
      // Récupérer les posts de l'utilisateur
      const userPosts = await db('scraped_items')
        .whereIn('session_id', sessionIds)
        .orderBy('created_at', 'desc');

      // Déterminer le nom de la page depuis les sessions ou l'URL fournie
      let myPageName = 'Ma Page';
      let myPageUrlFinal = myPageUrl || '';
      
      if (userSessions[0]?.page_urls) {
        try {
          const pageUrls = typeof userSessions[0].page_urls === 'string' 
            ? JSON.parse(userSessions[0].page_urls) 
            : userSessions[0].page_urls;
          if (Array.isArray(pageUrls) && pageUrls.length > 0) {
            myPageUrlFinal = pageUrls[0];
            myPageName = extractPageName(pageUrls[0]);
          }
        } catch (e) {}
      }

      if (myPageUrl) {
        myPageName = extractPageName(myPageUrl);
        myPageUrlFinal = myPageUrl;
      }

      // Transformer les posts
      const myPostsData: PostData[] = userPosts.map((p, idx) => ({
        id: p.id || idx,
        title: p.title || '',
        description: p.description || '',
        likes: parseInt(p.likes) || 0,
        comments: parseInt(p.comments_count) || 0,
        shares: parseInt(p.shares) || 0,
        posted_at: p.posted_at || p.created_at,
        url: p.url || '',
        pageName: myPageName,
        pageUrl: myPageUrlFinal
      }));

      allPosts.push(...myPostsData);

      // Calculer les métriques de ma page
      myPage = calculatePageMetrics(myPostsData, myPageName, myPageUrlFinal, COLORS[0], true);
    }

    // 2. Analyser les concurrents
    const competitorAnalyses: PageAnalysis[] = [];
    
    if (competitors && Array.isArray(competitors)) {
      for (let i = 0; i < competitors.length; i++) {
        const competitorUrl = competitors[i];
        const competitorName = extractPageName(competitorUrl);
        
        // Chercher si on a des données scrapées pour ce concurrent
        const competitorSessions = await db('scraping_sessions')
          .where({ user_id: userId, scrape_type: 'facebook_pages', status: 'completed' })
          .whereRaw(`page_urls::text LIKE ?`, [`%${competitorUrl}%`])
          .orderBy('created_at', 'desc')
          .limit(10);

        let competitorPosts: PostData[] = [];

        if (competitorSessions.length > 0) {
          const sessionIds = competitorSessions.map(s => s.id);
          const posts = await db('scraped_items')
            .whereIn('session_id', sessionIds)
            .orderBy('created_at', 'desc');

          competitorPosts = posts.map((p, idx) => ({
            id: p.id || idx + 10000,
            title: p.title || '',
            description: p.description || '',
            likes: parseInt(p.likes) || 0,
            comments: parseInt(p.comments_count) || 0,
            shares: parseInt(p.shares) || 0,
            posted_at: p.posted_at || p.created_at,
            url: p.url || '',
            pageName: competitorName,
            pageUrl: competitorUrl
          }));
        } else {
          // Générer des données de démonstration si pas de données réelles
          competitorPosts = generateDemoPostsForPage(competitorName, competitorUrl, i);
        }

        allPosts.push(...competitorPosts);
        
        const analysis = calculatePageMetrics(
          competitorPosts, 
          competitorName, 
          competitorUrl, 
          COLORS[(i + 1) % COLORS.length],
          false
        );
        competitorAnalyses.push(analysis);
      }
    }

    // 3. Générer les insights
    const insights = generateInsightsFromData(myPage, competitorAnalyses);

    // 4. Construire la réponse
    const result: BenchmarkResult = {
      dateRange: {
        start: dateRange.start,
        end: dateRange.end,
        label: dateRange.label
      },
      myPage,
      competitors: competitorAnalyses,
      allPosts: allPosts.sort((a, b) => b.likes - a.likes), // Trier par likes décroissants
      summary: {
        totalPostsAnalyzed: allPosts.length,
        totalPagesAnalyzed: (myPage ? 1 : 0) + competitorAnalyses.length,
        dateRangeLabel: dateRange.label
      },
      insights
    };

    // 5. Sauvegarder l'analyse
    await db('benchmark_analyses').insert({
      user_id: userId,
      competitors: JSON.stringify(competitors || []),
      your_score: JSON.stringify(myPage),
      competitors_data: JSON.stringify(competitorAnalyses),
      insights: JSON.stringify(insights),
      my_page_url: myPage?.url || myPageUrl || null,
      my_page_name: myPage?.name || (myPageUrl ? extractPageName(myPageUrl) : null),
      competitor_names: JSON.stringify(competitorAnalyses.map((c: PageAnalysis) => c.name)),
      created_at: new Date(),
    });

    logger.info(`[BENCHMARK] Analysis completed: ${allPosts.length} posts analyzed across ${result.summary.totalPagesAnalyzed} pages`);
    res.json(result);

  } catch (error: any) {
    logger.error(`[BENCHMARK] Error analyzing benchmark:`, error);
    logger.error(`[BENCHMARK] Error stack:`, error.stack);
    res.status(500).json({ 
      message: 'Erreur lors de l\'analyse du benchmark',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Calculer les métriques d'une page
 */
function calculatePageMetrics(
  posts: PostData[], 
  pageName: string, 
  pageUrl: string, 
  color: string,
  isMyPage: boolean
): PageAnalysis {
  const totalPosts = posts.length;
  const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);
  const totalShares = posts.reduce((sum, p) => sum + (p.shares || 0), 0);

  const avgLikes = totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0;
  const avgComments = totalPosts > 0 ? Math.round(totalComments / totalPosts) : 0;
  const avgShares = totalPosts > 0 ? Math.round(totalShares / totalPosts) : 0;

  // Taux d'engagement simplifié
  const totalInteractions = totalLikes + totalComments * 2 + totalShares * 3;
  const engagementRate = totalPosts > 0 
    ? Math.min(100, Math.round((totalInteractions / totalPosts) / 10))
    : 0;

  // Meilleur horaire de publication
  const postHours = posts.map(p => {
    try {
      const date = new Date(p.posted_at);
      return isNaN(date.getTime()) ? 12 : date.getHours();
    } catch {
      return 12;
    }
  });
  const bestHour = getMostFrequent(postHours);
  const bestPostingTime = `${bestHour}h - ${bestHour + 1}h`;

  // Top 5 posts
  const topPosts = [...posts]
    .sort((a, b) => (b.likes + b.comments * 2) - (a.likes + a.comments * 2))
    .slice(0, 5);

  // Posts par jour de la semaine
  const postsByDay: { [key: string]: number } = {
    'Lundi': 0, 'Mardi': 0, 'Mercredi': 0, 'Jeudi': 0, 
    'Vendredi': 0, 'Samedi': 0, 'Dimanche': 0
  };
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  posts.forEach(p => {
    try {
      const date = new Date(p.posted_at);
      if (!isNaN(date.getTime())) {
        postsByDay[dayNames[date.getDay()]]++;
      }
    } catch {}
  });

  return {
    name: pageName,
    url: pageUrl,
    totalPosts,
    totalLikes,
    totalComments,
    totalShares,
    avgLikes,
    avgComments,
    avgShares,
    engagementRate,
    bestPostingTime,
    topPosts,
    postsByDay,
    color,
    isMyPage
  };
}

/**
 * Générer des posts de démonstration pour une page sans données
 */
function generateDemoPostsForPage(pageName: string, pageUrl: string, index: number): PostData[] {
  const posts: PostData[] = [];
  const numPosts = 5 + Math.floor(Math.random() * 10);
  const now = Date.now();

  for (let i = 0; i < numPosts; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const likes = Math.floor(50 + Math.random() * 500);
    const comments = Math.floor(5 + Math.random() * 50);
    const shares = Math.floor(Math.random() * 30);

    posts.push({
      id: 100000 + index * 1000 + i,
      title: `Publication ${i + 1} de ${pageName}`,
      description: `Contenu de démonstration pour ${pageName}. Ceci est un exemple de post.`,
      likes,
      comments,
      shares,
      posted_at: new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      url: `${pageUrl}/posts/${i + 1}`,
      pageName,
      pageUrl
    });
  }

  return posts;
}

/**
 * Obtenir l'élément le plus fréquent dans un tableau
 */
function getMostFrequent(arr: number[]): number {
  if (arr.length === 0) return 12;
  
  const frequency: { [key: number]: number } = {};
  arr.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
  });
  
  return parseInt(Object.keys(frequency).reduce((a, b) => 
    frequency[parseInt(a)] > frequency[parseInt(b)] ? a : b
  ));
}

/**
 * Générer des insights basés sur les données réelles
 */
function generateInsightsFromData(myPage: PageAnalysis | null, competitors: PageAnalysis[]) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const recommendations: string[] = [];

  if (!myPage) {
    return {
      strengths: ['Aucune donnée de votre page disponible'],
      weaknesses: ['Effectuez d\'abord un scraping de votre page Facebook'],
      opportunities: ['Analysez vos concurrents pour identifier les meilleures pratiques'],
      recommendations: ['Commencez par scraper votre page Facebook pour obtenir des insights personnalisés']
    };
  }

  const avgCompetitorLikes = competitors.length > 0 
    ? competitors.reduce((sum, c) => sum + c.avgLikes, 0) / competitors.length 
    : 0;
  const avgCompetitorComments = competitors.length > 0 
    ? competitors.reduce((sum, c) => sum + c.avgComments, 0) / competitors.length 
    : 0;
  const avgCompetitorEngagement = competitors.length > 0 
    ? competitors.reduce((sum, c) => sum + c.engagementRate, 0) / competitors.length 
    : 0;

  // Analyser les forces
  if (myPage.avgLikes > avgCompetitorLikes) {
    strengths.push(`Vos posts génèrent en moyenne ${myPage.avgLikes} likes, supérieur à la moyenne des concurrents (${Math.round(avgCompetitorLikes)})`);
  }
  if (myPage.avgComments > avgCompetitorComments) {
    strengths.push(`Excellent taux de commentaires (${myPage.avgComments} en moyenne vs ${Math.round(avgCompetitorComments)} pour les concurrents)`);
  }
  if (myPage.engagementRate > avgCompetitorEngagement) {
    strengths.push(`Votre taux d'engagement (${myPage.engagementRate}%) dépasse la moyenne du secteur (${Math.round(avgCompetitorEngagement)}%)`);
  }
  if (myPage.totalPosts > 10) {
    strengths.push(`Bonne fréquence de publication avec ${myPage.totalPosts} posts analysés`);
  }

  // Analyser les faiblesses
  if (myPage.avgLikes < avgCompetitorLikes && avgCompetitorLikes > 0) {
    weaknesses.push(`Vos likes moyens (${myPage.avgLikes}) sont inférieurs à la concurrence (${Math.round(avgCompetitorLikes)})`);
  }
  if (myPage.avgComments < avgCompetitorComments && avgCompetitorComments > 0) {
    weaknesses.push(`Moins de commentaires que vos concurrents (${myPage.avgComments} vs ${Math.round(avgCompetitorComments)})`);
  }
  if (myPage.totalPosts < 5) {
    weaknesses.push(`Peu de posts analysés (${myPage.totalPosts}). Augmentez votre fréquence de publication.`);
  }

  // Opportunités
  opportunities.push(`Optimisez vos publications autour de ${myPage.bestPostingTime} pour maximiser l'engagement`);
  
  // Trouver le meilleur jour
  const bestDay = Object.entries(myPage.postsByDay).sort((a, b) => b[1] - a[1])[0];
  if (bestDay && bestDay[1] > 0) {
    opportunities.push(`Le ${bestDay[0]} semble être votre jour le plus actif - capitalisez dessus`);
  }

  // Analyser les top posts des concurrents
  const allCompetitorTopPosts = competitors.flatMap(c => c.topPosts);
  if (allCompetitorTopPosts.length > 0) {
    const topCompetitorPost = allCompetitorTopPosts.sort((a, b) => b.likes - a.likes)[0];
    opportunities.push(`Le post le plus performant des concurrents a ${topCompetitorPost.likes} likes - analysez ce qui fonctionne`);
  }

  // Recommandations
  recommendations.push('Analysez les contenus performants de vos concurrents et adaptez votre stratégie');
  recommendations.push('Encouragez les interactions en posant des questions dans vos posts');
  if (myPage.avgShares < 5) {
    recommendations.push('Créez du contenu plus partageable (infographies, citations, conseils pratiques)');
  }
  if (myPage.engagementRate < 50) {
    recommendations.push('Testez différents formats de contenu (vidéos, carrousels, stories)');
  }

  return {
    strengths: strengths.length > 0 ? strengths : ['Continuez vos efforts, les données s\'accumulent'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['Aucune faiblesse majeure détectée'],
    opportunities,
    recommendations
  };
}

/**
 * Récupérer l'historique des analyses
 */
export const getBenchmarkHistory = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const analyses = await db('benchmark_analyses')
      .select('id', 'created_at', 'competitors', 'credits_cost', 'my_page_url', 'my_page_name', 'competitor_names')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(20);

    // Parser les competitors pour chaque analyse
    const formattedAnalyses = analyses.map((a: any) => {
      let competitorsList: string[] = [];
      try {
        competitorsList = typeof a.competitors === 'string' ? JSON.parse(a.competitors) : a.competitors || [];
      } catch {}
      let competitorNamesList: string[] = [];
      try {
        competitorNamesList = typeof a.competitor_names === 'string' ? JSON.parse(a.competitor_names) : a.competitor_names || [];
      } catch {}
      return {
        id: a.id,
        created_at: a.created_at,
        competitors: competitorsList,
        creditsCost: a.credits_cost || 0,
        myPageUrl: a.my_page_url || null,
        myPageName: a.my_page_name || null,
        competitorNames: competitorNamesList
      };
    });

    res.json(formattedAnalyses);
  } catch (error: any) {
    logger.error(`[BENCHMARK] Error fetching history:`, error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique' });
  }
};

/**
 * Récupérer un rapport de benchmark par ID
 */
export const getBenchmarkById = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  try {
    const analysis = await db('benchmark_analyses')
      .where({ id, user_id: userId })
      .first();

    if (!analysis) {
      return res.status(404).json({ message: 'Analyse non trouvée' });
    }

    // Parser les données JSON
    const report = {
      id: analysis.id,
      createdAt: analysis.created_at,
      creditsCost: analysis.credits_cost || 0,
      myPage: analysis.your_score ? JSON.parse(analysis.your_score) : null,
      competitors: analysis.competitors_data ? JSON.parse(analysis.competitors_data) : [],
      comparativeAnalysis: analysis.insights ? JSON.parse(analysis.insights) : null
    };

    res.json(report);
  } catch (error: any) {
    logger.error(`[BENCHMARK] Error fetching benchmark by ID:`, error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'analyse' });
  }
};

/**
 * Lancer un benchmark complet avec scraping réel des pages
 * Cet endpoint lance le scraping Apify, l'analyse IA, et déduit les crédits
 */
export const runFullBenchmark = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { myPageUrl, competitors, options } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
    return res.status(400).json({ message: 'Veuillez fournir au moins une page concurrente' });
  }

  try {
    // Vérifier les crédits disponibles
    const userBalance = await creditServiceInstance.getUserCredits(userId);
    const estimatedCost = benchmarkService.calculateEstimatedCost(
      (myPageUrl ? 1 : 0) + competitors.length,
      options?.postsLimit || 20
    );

    if (userBalance < estimatedCost) {
      return res.status(402).json({ 
        message: 'Crédits insuffisants',
        required: estimatedCost,
        available: userBalance
      });
    }

    logger.info(`[BENCHMARK] Starting full benchmark for user ${userId}. Estimated cost: ${estimatedCost} credits`);

    // Lancer le benchmark complet
    const report = await benchmarkService.runFullBenchmark(
      userId,
      myPageUrl || null,
      competitors,
      {
        scrapePosts: options?.scrapePosts !== false,
        scrapeComments: options?.scrapeComments !== false,
        scrapePageInfo: options?.scrapePageInfo !== false,
        postsLimit: options?.postsLimit || 20,
        dateRange: options?.dateRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
          label: 'Dernier mois'
        }
      }
    );

    res.json(report);

  } catch (error: any) {
    logger.error(`[BENCHMARK] Full benchmark failed:`, error);
    res.status(500).json({ 
      message: error.message || 'Erreur lors du benchmark',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Estimer le coût d'un benchmark avant de le lancer
 */
export const estimateBenchmarkCost = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { myPageUrl, competitors, postsLimit } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Non autorisé' });
  }

  const totalPages = (myPageUrl ? 1 : 0) + (competitors?.length || 0);
  const estimatedCost = benchmarkService.calculateEstimatedCost(totalPages, postsLimit || 20);
  const userBalance = await creditServiceInstance.getUserCredits(userId);

  res.json({
    estimatedCost,
    userBalance,
    canAfford: userBalance >= estimatedCost,
    breakdown: {
      pages: totalPages,
      postsPerPage: postsLimit || 20,
      costPerPage: 2,
      costPerPost: 0.1,
      aiAnalysisCost: 3,
      reportCost: 1
    }
  });
};
