import db from '../database';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import axios from 'axios';
import { CreditService } from './creditService';
import * as fs from 'fs';
import * as path from 'path';
import { COST_MATRIX, calculateBenchmarkCost } from './costEstimationService';

const creditServiceInstance = new CreditService();

// Chemin pour sauvegarder les données brutes du benchmark
const BACKUP_DIR = path.join(__dirname, '../../data/backups');

// Coût en crédits pour le benchmark - UTILISE COST_MATRIX CENTRALISÉ
const BENCHMARK_COSTS = {
  PER_PAGE_SCRAPED: COST_MATRIX.benchmark.perPage,
  PER_POST_ANALYZED: COST_MATRIX.benchmark.perPost,
  AI_ANALYSIS: COST_MATRIX.benchmark.aiAnalysis,
  REPORT_GENERATION: COST_MATRIX.benchmark.reportGeneration,
};

export interface BenchmarkPageData {
  pageName: string;
  pageUrl: string;
  followers: number;
  likes: number;
  about: string;
  category: string;
  createdDate: string;
  posts: BenchmarkPostData[];
  profileImage: string;
  coverImage: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface BenchmarkPostData {
  id: string;
  text: string;
  likes: number;
  comments: number;
  shares: number;
  postedAt: string;
  type: 'photo' | 'video' | 'text' | 'link' | 'carousel';
  mediaUrl?: string;
  url: string;
}

export interface QualitativeAnalysis {
  publicationFrequency: string;
  contentTypes: string[];
  visualStyle: {
    description: string;
    characteristics: string[];
  };
  tonality: {
    description: string;
    characteristics: string[];
  };
  strengths: string[];
  weaknesses: string[];
  mainThemes: string[];
  audienceReaction: string;
  engagementRate: number;
}

export interface CompetitorBenchmarkResult {
  pageData: BenchmarkPageData;
  qualitativeAnalysis: QualitativeAnalysis;
  quantitativeMetrics: {
    totalPosts: number;
    avgLikesPerPost: number;
    avgCommentsPerPost: number;
    avgSharesPerPost: number;
    postFrequencyPerMonth: number;
    engagementRate: number;
    topPostTypes: { type: string; count: number; percentage: number }[];
  };
  topPosts: BenchmarkPostData[];
}

export interface FullBenchmarkReport {
  id: string;
  userId: number;
  createdAt: string;
  myPage: CompetitorBenchmarkResult | null;
  competitors: CompetitorBenchmarkResult[];
  comparativeAnalysis: {
    summary: string;
    rankings: {
      metric: string;
      rankings: { pageName: string; value: number; rank: number }[];
    }[];
    recommendations: string[];
  };
  creditsCost: number;
  status: 'pending' | 'scraping' | 'analyzing' | 'completed' | 'failed';
}

class BenchmarkService {
  /**
   * Lancer une analyse benchmark complète
   */
  async runFullBenchmark(
    userId: number,
    myPageUrl: string | null,
    competitorUrls: string[],
    options: {
      scrapePosts: boolean;
      scrapeComments: boolean;
      scrapePageInfo: boolean;
      postsLimit: number;
    }
  ): Promise<FullBenchmarkReport> {
    const benchmarkId = `benchmark_${Date.now()}_${userId}`;
    
    logger.info(`[BENCHMARK] Starting full benchmark ${benchmarkId} for user ${userId}`);

    // Calculer le coût estimé
    const totalPages = (myPageUrl ? 1 : 0) + competitorUrls.length;
    const estimatedCost = this.calculateEstimatedCost(totalPages, options.postsLimit);

    // Réserver les crédits à l'avance
    let reservationId: number | null = null;
    try {
      const reservation = await creditServiceInstance.reserveCredits(
        userId,
        estimatedCost,
        'facebook_pages_benchmark',
        benchmarkId,
        `Benchmark: ${totalPages} pages, ${options.postsLimit} posts/page`
      );
      reservationId = reservation.id;
      logger.info(`[BENCHMARK] Credits reserved: ${estimatedCost} for ${benchmarkId}`);
    } catch (creditError: any) {
      throw new Error(creditError.message || `Crédits insuffisants. Requis: ${estimatedCost}`);
    }

    // Créer l'entrée de benchmark
    const report: FullBenchmarkReport = {
      id: benchmarkId,
      userId,
      createdAt: new Date().toISOString(),
      myPage: null,
      competitors: [],
      comparativeAnalysis: {
        summary: '',
        rankings: [],
        recommendations: []
      },
      creditsCost: 0,
      status: 'scraping'
    };

    try {
      // 1. Scraper ma page si fournie
      if (myPageUrl) {
        logger.info(`[BENCHMARK] Scraping my page: ${myPageUrl}`);
        const myPageData = await this.scrapeFacebookPage(myPageUrl, options.postsLimit);
        const myPageAnalysis = await this.analyzePageQualitatively(myPageData);
        report.myPage = {
          pageData: myPageData,
          qualitativeAnalysis: myPageAnalysis,
          quantitativeMetrics: this.calculateQuantitativeMetrics(myPageData),
          topPosts: this.getTopPosts(myPageData.posts, 5)
        };
        report.creditsCost += BENCHMARK_COSTS.PER_PAGE_SCRAPED;
        report.creditsCost += myPageData.posts.length * BENCHMARK_COSTS.PER_POST_ANALYZED;
      }

      // 2. Scraper les pages concurrentes
      report.status = 'scraping';
      for (const competitorUrl of competitorUrls) {
        logger.info(`[BENCHMARK] Scraping competitor: ${competitorUrl}`);
        try {
          const pageData = await this.scrapeFacebookPage(competitorUrl, options.postsLimit);
          const qualitativeAnalysis = await this.analyzePageQualitatively(pageData);
          
          report.competitors.push({
            pageData,
            qualitativeAnalysis,
            quantitativeMetrics: this.calculateQuantitativeMetrics(pageData),
            topPosts: this.getTopPosts(pageData.posts, 5)
          });

          report.creditsCost += BENCHMARK_COSTS.PER_PAGE_SCRAPED;
          report.creditsCost += pageData.posts.length * BENCHMARK_COSTS.PER_POST_ANALYZED;
        } catch (error: any) {
          logger.error(`[BENCHMARK] Error scraping ${competitorUrl}:`, error.message);
          // Continuer avec les autres concurrents
        }
      }

      // 3. Générer l'analyse comparative avec l'IA
      report.status = 'analyzing';
      report.comparativeAnalysis = await this.generateComparativeAnalysis(report);
      report.creditsCost += BENCHMARK_COSTS.AI_ANALYSIS;
      report.creditsCost += BENCHMARK_COSTS.REPORT_GENERATION;

      // 4. Confirmer la réservation avec le coût réel
      await creditServiceInstance.confirmReservation(reservationId!, report.creditsCost);
      logger.info(`[BENCHMARK] Credits confirmed: ${report.creditsCost} for ${benchmarkId}`);

      // 5. Sauvegarder le rapport
      report.status = 'completed';
      await this.saveBenchmarkReport(report);

      logger.info(`[BENCHMARK] Completed benchmark ${benchmarkId}. Cost: ${report.creditsCost} credits`);
      return report;

    } catch (error: any) {
      // Annuler la réservation en cas d'échec
      if (reservationId) {
        try { await creditServiceInstance.cancelReservation(reservationId); } catch {}
      }
      report.status = 'failed';
      logger.error(`[BENCHMARK] Failed benchmark ${benchmarkId}:`, error);
      throw error;
    }
  }

  /**
   * Calculer le coût estimé - Utilise la fonction centralisée
   */
  calculateEstimatedCost(totalPages: number, postsLimit: number): number {
    return calculateBenchmarkCost(totalPages, postsLimit, true);
  }

  /**
   * Scraper une page Facebook via Apify (utilise les mêmes acteurs que le reste de l'app)
   */
  async scrapeFacebookPage(pageUrl: string, postsLimit: number = 20): Promise<BenchmarkPageData> {
    const apifyToken = config.api.apifyToken;
    const pagesInfoActorId = config.api.apifyPagesInfoActorId || 'apify/facebook-pages-scraper';
    const pagesPostsActorId = config.api.apifyPagesPostsActorId || 'apify/facebook-posts-scraper';
    
    if (!apifyToken) {
      logger.warn(`[BENCHMARK] No Apify token, using demo data for ${pageUrl}`);
      return this.generateDemoPageData(pageUrl);
    }

    try {
      logger.info(`[BENCHMARK] Starting scrape for ${pageUrl} with limit ${postsLimit}`);
      
      // 1. Scraper les infos de la page
      const infoRunResponse = await axios.post(
        `https://api.apify.com/v2/acts/${pagesInfoActorId}/runs?token=${apifyToken}`,
        {
          startUrls: [{ url: pageUrl }],
          proxyConfiguration: { useApifyProxy: true }
        },
        { timeout: 30000 }
      );

      const infoRunId = infoRunResponse.data.data.id;
      logger.info(`[BENCHMARK] Info run started: ${infoRunId}`);

      // 2. Scraper les posts de la page
      const postsRunResponse = await axios.post(
        `https://api.apify.com/v2/acts/${pagesPostsActorId}/runs?token=${apifyToken}`,
        {
          startUrls: [{ url: pageUrl }],
          resultsLimit: postsLimit,
          proxyConfiguration: { useApifyProxy: true }
        },
        { timeout: 30000 }
      );

      const postsRunId = postsRunResponse.data.data.id;
      logger.info(`[BENCHMARK] Posts run started: ${postsRunId}`);

      // 3. Attendre la fin des deux runs
      const [infoData, postsData] = await Promise.all([
        this.waitForApifyRun(infoRunId, apifyToken),
        this.waitForApifyRun(postsRunId, apifyToken)
      ]);

      logger.info(`[BENCHMARK] Scrape completed for ${pageUrl}. Info items: ${infoData.length}, Posts: ${postsData.length}`);

      // 4. Sauvegarder les données brutes
      await this.saveBackupData(pageUrl, infoData, postsData);

      // 5. Transformer les données
      return this.transformApifyData(infoData, postsData, pageUrl);

    } catch (error: any) {
      logger.error(`[BENCHMARK] Apify scraping failed for ${pageUrl}:`, error.message);
      return this.generateDemoPageData(pageUrl);
    }
  }

  /**
   * Attendre la fin d'un run Apify et récupérer les données
   */
  async waitForApifyRun(runId: string, apifyToken: string): Promise<any[]> {
    let status = 'RUNNING';
    let attempts = 0;
    
    while (status === 'RUNNING' && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const statusResponse = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
      );
      status = statusResponse.data.data.status;
      attempts++;
    }

    if (status !== 'SUCCEEDED') {
      throw new Error(`Apify run ${runId} failed with status: ${status}`);
    }

    // Récupérer les résultats
    const runDetails = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
    );
    const datasetId = runDetails.data.data.defaultDatasetId;
    
    const resultsResponse = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
    );

    return resultsResponse.data || [];
  }

  /**
   * Sauvegarder les données brutes du benchmark
   */
  async saveBackupData(pageUrl: string, infoData: any[], postsData: any[]): Promise<void> {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }

      const pageName = this.extractPageNameFromUrl(pageUrl).replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `bench_${pageName}_${timestamp}.json`;
      const filepath = path.join(BACKUP_DIR, filename);

      const backupData = {
        pageUrl,
        timestamp: new Date().toISOString(),
        infoData,
        postsData
      };

      fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
      logger.info(`[BENCHMARK] Backup saved: ${filename}`);
    } catch (error: any) {
      logger.warn(`[BENCHMARK] Failed to save backup:`, error.message);
    }
  }

  /**
   * Transformer les données Apify en format interne
   */
  transformApifyData(infoData: any[], postsData: any[], pageUrl: string): BenchmarkPageData {
    // Extraire les infos de la page
    const pageInfo = infoData[0] || {};
    const pageName = pageInfo.pageName || pageInfo.title || this.extractPageNameFromUrl(pageUrl);
    
    // Vérifier si la page est protégée ou non accessible
    const hasInfoError = pageInfo.error === 'not_available' || pageInfo.error === 'login_required';
    const hasPostsError = postsData[0]?.error === 'not_available' || postsData[0]?.error === 'login_required';
    
    if (hasInfoError || hasPostsError) {
      const errorDescription = pageInfo.errorDescription || postsData[0]?.errorDescription || 'Page non accessible';
      logger.warn(`[BENCHMARK] Page ${pageName} is protected or not available: ${errorDescription}`);
      
      return {
        pageName,
        pageUrl,
        followers: 0,
        likes: 0,
        about: '',
        category: 'Non spécifié',
        createdDate: '',
        posts: [],
        profileImage: '',
        coverImage: '',
        error: {
          code: 'PAGE_PROTECTED',
          message: this.getErrorMessage(pageInfo.error || postsData[0]?.error, errorDescription)
        }
      };
    }
    
    logger.info(`[BENCHMARK] Transforming data for ${pageName}: ${postsData.length} posts`);
    
    // Transformer les posts
    const posts: BenchmarkPostData[] = postsData.map((post: any, idx: number) => {
      const postData: BenchmarkPostData = {
        id: post.postId || `post_${idx}`,
        text: post.text || '',
        likes: parseInt(post.likes) || 0,
        comments: parseInt(post.comments) || 0,
        shares: parseInt(post.shares) || 0,
        postedAt: post.time || new Date().toISOString(),
        type: this.detectPostType(post),
        mediaUrl: post.media?.[0]?.thumbnail || '',
        url: post.url || post.topLevelUrl || pageUrl
      };
      return postData;
    });

    logger.info(`[BENCHMARK] Transformed ${posts.length} posts for ${pageName}. Total likes: ${posts.reduce((sum, p) => sum + p.likes, 0)}`);

    return {
      pageName,
      pageUrl,
      followers: parseInt(pageInfo.followers) || parseInt(pageInfo.likes) || 0,
      likes: parseInt(pageInfo.likes) || 0,
      about: pageInfo.intro || pageInfo.info?.join(' ') || '',
      category: pageInfo.category || pageInfo.categories?.[0] || 'Non spécifié',
      createdDate: pageInfo.creation_date || '',
      posts,
      profileImage: pageInfo.profilePictureUrl || pageInfo.profilePhoto || '',
      coverImage: pageInfo.coverPhotoUrl || pageInfo.coverPhoto || ''
    };
  }

  /**
   * Obtenir un message d'erreur lisible pour les pages protégées
   */
  private getErrorMessage(errorCode: string, originalDescription: string): string {
    const errorMessages: Record<string, string> = {
      'not_available': '🔒 Cette page Facebook est protégée ou non accessible. Le propriétaire a restreint l\'accès au contenu ou la page a été supprimée.',
      'login_required': '🔐 Cette page nécessite une connexion Facebook pour être consultée. Les données ne peuvent pas être récupérées.',
      'rate_limited': '⏳ Trop de requêtes. Veuillez réessayer dans quelques minutes.',
      'page_not_found': '❌ Cette page Facebook n\'existe pas ou a été supprimée.',
    };
    
    return errorMessages[errorCode] || `⚠️ Page non accessible: ${originalDescription}`;
  }

  /**
   * Générer des données de démo pour une page
   */
  generateDemoPageData(pageUrl: string): BenchmarkPageData {
    const pageName = this.extractPageNameFromUrl(pageUrl);
    const posts: BenchmarkPostData[] = [];
    const numPosts = 10 + Math.floor(Math.random() * 15);

    for (let i = 0; i < numPosts; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const types: ('photo' | 'video' | 'text' | 'link')[] = ['photo', 'video', 'text', 'link'];
      
      posts.push({
        id: `demo_${i}`,
        text: `Publication ${i + 1} de ${pageName}. Contenu de démonstration pour l'analyse benchmark.`,
        likes: Math.floor(50 + Math.random() * 500),
        comments: Math.floor(5 + Math.random() * 50),
        shares: Math.floor(Math.random() * 30),
        postedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        type: types[Math.floor(Math.random() * types.length)],
        url: `${pageUrl}/posts/${i + 1}`
      });
    }

    return {
      pageName,
      pageUrl,
      followers: Math.floor(5000 + Math.random() * 50000),
      likes: Math.floor(4000 + Math.random() * 40000),
      about: `Page Facebook de ${pageName}`,
      category: 'Entreprise',
      createdDate: '2020-01-01',
      posts,
      profileImage: '',
      coverImage: ''
    };
  }

  /**
   * Analyser qualitativement une page avec l'IA
   */
  async analyzePageQualitatively(pageData: BenchmarkPageData): Promise<QualitativeAnalysis> {
    const openRouterKey = config.ai.openRouterApiKey;

    if (!openRouterKey) {
      // Analyse basique sans IA
      return this.generateBasicQualitativeAnalysis(pageData);
    }

    try {
      const prompt = `Analyse cette page Facebook et génère une analyse qualitative détaillée en JSON:

Page: ${pageData.pageName}
Catégorie: ${pageData.category}
Followers: ${pageData.followers}
Description: ${pageData.about}

Échantillon de posts (${pageData.posts.length} au total):
${pageData.posts.slice(0, 5).map(p => `- "${p.text.substring(0, 100)}..." (${p.likes} likes, ${p.comments} comments, type: ${p.type})`).join('\n')}

Génère une analyse JSON avec cette structure exacte:
{
  "publicationFrequency": "description de la fréquence (ex: '1 à 2 fois par jour')",
  "contentTypes": ["liste des types de contenu principaux"],
  "visualStyle": {
    "description": "description du style visuel",
    "characteristics": ["liste des caractéristiques visuelles"]
  },
  "tonality": {
    "description": "description du ton utilisé",
    "characteristics": ["liste des caractéristiques de tonalité"]
  },
  "strengths": ["liste des points forts"],
  "weaknesses": ["liste des points faibles"],
  "mainThemes": ["liste des thématiques principales"],
  "audienceReaction": "description de la réaction du public"
}`;

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: config.ai.defaultModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        analysis.engagementRate = this.calculateEngagementRate(pageData);
        return analysis;
      }
    } catch (error: any) {
      logger.error('[AI] OpenRouter.benchmarkAnalysis', {
        error: error.message,
        operation: 'analyze_page_qualitatively',
        pageName: pageData.pageName,
        postsCount: pageData.posts.length
      });
    }

    return this.generateBasicQualitativeAnalysis(pageData);
  }

  /**
   * Générer une analyse qualitative basique sans IA
   */
  generateBasicQualitativeAnalysis(pageData: BenchmarkPageData): QualitativeAnalysis {
    const posts = pageData.posts;
    const avgDaysBetweenPosts = posts.length > 1 
      ? Math.round(30 / posts.length) 
      : 7;

    const typeCount: { [key: string]: number } = {};
    posts.forEach(p => {
      typeCount[p.type] = (typeCount[p.type] || 0) + 1;
    });
    const mainTypes = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    return {
      publicationFrequency: avgDaysBetweenPosts <= 1 ? 'Quotidienne' : 
                           avgDaysBetweenPosts <= 3 ? 'Tous les 2-3 jours' :
                           avgDaysBetweenPosts <= 7 ? 'Hebdomadaire' : 'Occasionnelle',
      contentTypes: mainTypes.length > 0 ? mainTypes : ['Photo', 'Texte'],
      visualStyle: {
        description: 'Style visuel standard',
        characteristics: ['Photos de qualité', 'Branding cohérent']
      },
      tonality: {
        description: 'Ton professionnel',
        characteristics: ['Langage courant', 'Communication claire']
      },
      strengths: [
        posts.length > 10 ? 'Bonne fréquence de publication' : 'Contenu régulier',
        'Présence active sur les réseaux'
      ],
      weaknesses: [
        posts.length < 5 ? 'Fréquence de publication faible' : 'Peut améliorer l\'engagement'
      ],
      mainThemes: ['Produits/Services', 'Actualités', 'Promotions'],
      audienceReaction: this.calculateEngagementRate(pageData) > 5 ? 'Public réactif' : 'Engagement modéré',
      engagementRate: this.calculateEngagementRate(pageData)
    };
  }

  /**
   * Calculer les métriques quantitatives
   */
  calculateQuantitativeMetrics(pageData: BenchmarkPageData) {
    const posts = pageData.posts;
    const totalPosts = posts.length;
    
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
    const totalShares = posts.reduce((sum, p) => sum + p.shares, 0);

    const typeCount: { [key: string]: number } = {};
    posts.forEach(p => {
      typeCount[p.type] = (typeCount[p.type] || 0) + 1;
    });

    const topPostTypes = Object.entries(typeCount)
      .map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / totalPosts) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalPosts,
      avgLikesPerPost: totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0,
      avgCommentsPerPost: totalPosts > 0 ? Math.round(totalComments / totalPosts) : 0,
      avgSharesPerPost: totalPosts > 0 ? Math.round(totalShares / totalPosts) : 0,
      postFrequencyPerMonth: totalPosts,
      engagementRate: this.calculateEngagementRate(pageData),
      topPostTypes
    };
  }

  /**
   * Calculer le taux d'engagement
   */
  calculateEngagementRate(pageData: BenchmarkPageData): number {
    if (pageData.followers === 0 || pageData.posts.length === 0) return 0;
    
    const totalInteractions = pageData.posts.reduce(
      (sum, p) => sum + p.likes + p.comments + p.shares, 0
    );
    const avgInteractions = totalInteractions / pageData.posts.length;
    return Math.round((avgInteractions / pageData.followers) * 10000) / 100;
  }

  /**
   * Obtenir les top posts
   */
  getTopPosts(posts: BenchmarkPostData[], limit: number): BenchmarkPostData[] {
    return [...posts]
      .sort((a, b) => (b.likes + b.comments * 2 + b.shares * 3) - (a.likes + a.comments * 2 + a.shares * 3))
      .slice(0, limit);
  }

  /**
   * Générer l'analyse comparative avec l'IA
   */
  async generateComparativeAnalysis(report: FullBenchmarkReport) {
    const allPages = [
      ...(report.myPage ? [{ ...report.myPage, isMyPage: true }] : []),
      ...report.competitors.map(c => ({ ...c, isMyPage: false }))
    ];

    // Générer les rankings
    const rankings = [
      {
        metric: 'Engagement Rate',
        rankings: allPages
          .map(p => ({ 
            pageName: p.pageData.pageName, 
            value: p.quantitativeMetrics.engagementRate,
            rank: 0
          }))
          .sort((a, b) => b.value - a.value)
          .map((r, idx) => ({ ...r, rank: idx + 1 }))
      },
      {
        metric: 'Likes Moyens',
        rankings: allPages
          .map(p => ({ 
            pageName: p.pageData.pageName, 
            value: p.quantitativeMetrics.avgLikesPerPost,
            rank: 0
          }))
          .sort((a, b) => b.value - a.value)
          .map((r, idx) => ({ ...r, rank: idx + 1 }))
      },
      {
        metric: 'Nombre de Posts',
        rankings: allPages
          .map(p => ({ 
            pageName: p.pageData.pageName, 
            value: p.quantitativeMetrics.totalPosts,
            rank: 0
          }))
          .sort((a, b) => b.value - a.value)
          .map((r, idx) => ({ ...r, rank: idx + 1 }))
      }
    ];

    // Générer les recommandations
    const recommendations: string[] = [];
    
    if (report.myPage) {
      const myEngagement = report.myPage.quantitativeMetrics.engagementRate;
      const avgCompetitorEngagement = report.competitors.length > 0
        ? report.competitors.reduce((sum, c) => sum + c.quantitativeMetrics.engagementRate, 0) / report.competitors.length
        : 0;

      if (myEngagement < avgCompetitorEngagement) {
        recommendations.push(`Votre taux d'engagement (${myEngagement}%) est inférieur à la moyenne des concurrents (${avgCompetitorEngagement.toFixed(2)}%). Analysez leurs contenus performants.`);
      }

      const myPosts = report.myPage.quantitativeMetrics.totalPosts;
      const avgCompetitorPosts = report.competitors.length > 0
        ? report.competitors.reduce((sum, c) => sum + c.quantitativeMetrics.totalPosts, 0) / report.competitors.length
        : 0;

      if (myPosts < avgCompetitorPosts) {
        recommendations.push(`Augmentez votre fréquence de publication (${myPosts} vs ${Math.round(avgCompetitorPosts)} en moyenne chez les concurrents).`);
      }
    }

    recommendations.push('Analysez les types de contenu les plus performants de vos concurrents.');
    recommendations.push('Adaptez votre stratégie de publication aux horaires optimaux identifiés.');

    return {
      summary: `Analyse comparative de ${allPages.length} pages Facebook.`,
      rankings,
      recommendations
    };
  }

  /**
   * Sauvegarder le rapport de benchmark
   */
  async saveBenchmarkReport(report: FullBenchmarkReport): Promise<void> {
    // Ne pas spécifier l'id car c'est un auto-increment INTEGER dans la table
    await db('benchmark_analyses').insert({
      user_id: report.userId,
      competitors: JSON.stringify(report.competitors.map(c => c.pageData.pageUrl)),
      your_score: JSON.stringify(report.myPage),
      competitors_data: JSON.stringify(report.competitors),
      insights: JSON.stringify(report.comparativeAnalysis),
      credits_cost: report.creditsCost || 0,
      my_page_url: report.myPage?.pageData.pageUrl || null,
      my_page_name: report.myPage?.pageData.pageName || null,
      competitor_names: JSON.stringify(report.competitors.map(c => c.pageData.pageName)),
      created_at: new Date(report.createdAt)
    });
  }

  /**
   * Extraire le nom de la page depuis l'URL
   */
  extractPageNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const segments = urlObj.pathname.split('/').filter(s => s.length > 0);
      if (segments.length > 0) {
        let name = decodeURIComponent(segments[0]);
        name = name.replace(/[-_]/g, ' ');
        return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    } catch {}
    return url.replace(/https?:\/\/(www\.)?facebook\.com\/?/i, '').split('/')[0] || 'Page';
  }

  /**
   * Détecter le type de post
   */
  detectPostType(post: any): 'photo' | 'video' | 'text' | 'link' | 'carousel' {
    if (post.videoUrl) return 'video';
    if (post.photoUrl) return 'photo';
    if (post.link) return 'link';
    if (post.photos && post.photos.length > 1) return 'carousel';
    return 'text';
  }
}

export const benchmarkService = new BenchmarkService();
