import cron from 'node-cron';
import { nanoid } from 'nanoid';
import db from '../database';
import { logger } from '../utils/logger';
import { apifyService } from './apifyService';
import { creditService } from './creditService';
import { mailer } from './mailerService';
import { sessionService } from './sessionService';
import {
  COST_MATRIX,
  calculateAiAnalysisCost,
  calculateBenchmarkCost,
  calculateMentionsCost
} from './costEstimationService';
import mentionDetectionService from './mentionDetectionService';
import { saveMarketplaceBackup } from './backupService';
import { ApifyClient } from 'apify-client';
import { config } from '../config/config';

interface ScheduledScrape {
  id: string;
  user_id: number;
  name: string;
  description?: string;
  scrape_type: 'marketplace' | 'facebook_pages' | 'posts_comments';
  target_url: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  custom_cron_expression?: string;
  next_run_at: Date;
  last_run_at?: Date;
  is_active: boolean;
  is_paused: boolean;
  pause_reason?: string;
  config: {
    maxItems?: number;
    includeComments?: boolean;
    aiAnalysis?: boolean;
    benchmark?: boolean;
    mentionDetection?: boolean;
  };
  notification_settings: {
    email: boolean;
    emailAddress?: string;
    alertOnPriceChange?: boolean;
    alertOnNewMention?: boolean;
    alertOnError?: boolean;
    weeklyReport?: boolean;
  };
  credits_per_run: number;
  total_credits_spent: number;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
}

interface ExecutionResult {
  id: string;
  status: 'completed' | 'failed';
  items_scraped: number;
  credits_used: number;
  changes_detected: any;
  error_message?: string;
}

class ScheduledScrapeService {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  /** Parse TEXT columns to objects (config & notification_settings are stored as TEXT in DB) */
  private parseNotifSettings(scraper: any): any {
    return typeof scraper.notification_settings === 'string'
      ? JSON.parse(scraper.notification_settings || '{}')
      : (scraper.notification_settings || {});
  }

  private parseConfig(scraper: any): any {
    return typeof scraper.config === 'string'
      ? JSON.parse(scraper.config || '{}')
      : (scraper.config || {});
  }

  /**
   * Démarrer le scheduler CRON
   */
  startScheduler() {
    if (this.cronJob) {
      logger.warn('[SCHEDULED_SCRAPE] Scheduler already running');
      return;
    }

    // Exécuter toutes les heures
    this.cronJob = cron.schedule('0 * * * *', async () => {
      if (this.isRunning) {
        logger.info('[SCHEDULED_SCRAPE] Previous run still in progress, skipping');
        return;
      }

      this.isRunning = true;
      try {
        await this.processScheduledScrapes();
      } catch (error) {
        logger.error('[SCHEDULED_SCRAPE] Error in scheduler:', error);
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('[SCHEDULED_SCRAPE] Scheduler started - running every hour');
  }

  /**
   * Arrêter le scheduler
   */
  stopScheduler() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('[SCHEDULED_SCRAPE] Scheduler stopped');
    }
  }

  /**
   * Traiter tous les scrapes planifiés dus
   */
  async processScheduledScrapes() {
    logger.info('[SCHEDULED_SCRAPE] Processing scheduled scrapes...');

    const dueScrapers = await db('scheduled_scrapes')
      .where('is_active', true)
      .where('is_paused', false)
      .where('next_run_at', '<=', new Date())
      .orderBy('next_run_at', 'asc');

    logger.info(`[SCHEDULED_SCRAPE] Found ${dueScrapers.length} due scrapes`);

    for (const scraper of dueScrapers) {
      try {
        await this.executeScrape(scraper);
      } catch (error) {
        logger.error(`[SCHEDULED_SCRAPE] Error executing scrape ${scraper.id}:`, error);
      }
    }
  }

  /**
   * Exécuter un scrape planifié
   */
  async executeScrape(scraper: ScheduledScrape): Promise<ExecutionResult> {
    const executionId = nanoid();
    const startTime = new Date();

    // Parse config & notification_settings from TEXT columns
    const config = typeof scraper.config === 'string'
      ? JSON.parse(scraper.config || '{}')
      : (scraper.config || {});
    const notifSettings = typeof scraper.notification_settings === 'string'
      ? JSON.parse(scraper.notification_settings || '{}')
      : (scraper.notification_settings || {});

    logger.info(`[SCHEDULED_SCRAPE] Starting execution ${executionId} for scrape ${scraper.id}`, { config, notifSettings });

    // Créer l'enregistrement d'exécution
    await db('scheduled_scrape_executions').insert({
      id: executionId,
      scheduled_scrape_id: scraper.id,
      status: 'pending',
      started_at: startTime,
      created_at: startTime,
    });

    try {
      // 1. Vérifier les crédits via creditService (source of truth)
      const userBalance = await creditService.getUserCreditBalance(scraper.user_id);
      const hasCredits = userBalance.total >= scraper.credits_per_run;
      
      logger.info(`[SCHEDULED_SCRAPE] Credit check for user ${scraper.user_id}: balance=${userBalance.total}, required=${scraper.credits_per_run}, hasCredits=${hasCredits}`);

      if (!hasCredits) {
        await this.pauseForInsufficientCredits(scraper);
        
        await db('scheduled_scrape_executions')
          .where({ id: executionId })
          .update({
            status: 'failed',
            error_message: 'Crédits insuffisants',
            completed_at: new Date(),
          });

        return {
          id: executionId,
          status: 'failed',
          items_scraped: 0,
          credits_used: 0,
          changes_detected: {},
          error_message: 'Crédits insuffisants',
        };
      }

      // 2. Mettre à jour le statut
      await db('scheduled_scrape_executions')
        .where({ id: executionId })
        .update({ status: 'running' });

      // 3. Créer la session dans la base de données AVANT de lancer le scraping
      const sessionId = `sess_${nanoid()}`;
      await db('scraping_sessions').insert({
        id: sessionId,
        user_id: scraper.user_id,
        status: 'pending',
        scrape_type: scraper.scrape_type,
        url: scraper.target_url,
        isPaid: true, // Automatisations sont pré-payées via crédits
        hasData: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
      
      // Utiliser maxItems du config parsé ou valeur par défaut
      const resultsLimit = config.maxItems || 10;

      if (scraper.scrape_type === 'marketplace') {
        await apifyService.startScraping(
          scraper.target_url,
          sessionId,
          resultsLimit,
          { deepScrape: false }
        );
      } else {
        // facebook_pages and posts_comments both use the Facebook Pages Posts actor
        const client = new ApifyClient({ token: config.api.apifyToken });
        const actorId = config.api.apifyPagesPostsActorId;
        const run = await client.actor(actorId).start({
          startUrls: [{ url: scraper.target_url }],
          resultsLimit,
        });

        // Save run info to session
        await db('scraping_sessions')
          .where({ id: sessionId })
          .update({
            status: 'running',
            apify_run_id: run.id,
            dataset_id: run.defaultDatasetId,
            updated_at: new Date(),
          });
      }

      // 4. Attendre la fin du scraping (polling)
      await this.waitForScrapingCompletion(sessionId);

      // 5. Récupérer les résultats
      const sessionData = await sessionService.getSession(sessionId);
      const itemsScraped = sessionData?.totalItems || 0;

      // 5b. Créer le backup (filet de sécurité — le webhook l'a peut-être déjà fait)
      if (sessionData?.datasetId) {
        try {
          const backupItems = await apifyService.getDatasetItems(sessionData.datasetId);
          saveMarketplaceBackup(sessionId, sessionData.datasetId, backupItems);
        } catch (backupErr) {
          logger.warn(`[SCHEDULED_SCRAPE] Backup creation failed for ${sessionId}:`, backupErr);
        }
      }

      // 6. Déduire les crédits de base
      let totalCreditsUsed = scraper.credits_per_run;
      
      // Mapper le scrape_type vers le ServiceType pour creditService
      const serviceType = scraper.scrape_type === 'marketplace' ? 'marketplace' : 'facebook_pages';
      
      await creditService.deductCredits(
        scraper.user_id,
        scraper.credits_per_run,
        serviceType,
        sessionId,
        `Scraping automatisé: ${scraper.name}`
      );

      // 7. Analyses optionnelles (using parsed config)
      if (config.aiAnalysis) {
        const aiCost = await this.runAiAnalysis(sessionId, scraper.user_id);
        totalCreditsUsed += aiCost;
      }

      const supportsBenchmark = ['facebook_pages', 'posts_comments'].includes(scraper.scrape_type);

      if (config.benchmark && supportsBenchmark) {
        const benchmarkCost = await this.runBenchmark(sessionId, scraper.user_id);
        totalCreditsUsed += benchmarkCost;
      }

      if (config.mentionDetection && supportsBenchmark) {
        const mentionCost = await this.runMentionDetection(sessionId, scraper.user_id);
        totalCreditsUsed += mentionCost;
      }

      // 8. Détecter les changements
      const changes = await this.detectChanges(scraper, sessionData);

      // 9. Enregistrer les changements
      if (changes.length > 0) {
        await this.saveChanges(executionId, changes);
      }

      // 10. Envoyer les alertes
      await this.sendAlerts(scraper, changes, sessionData);

      // 11. Mettre à jour l'exécution
      const endTime = new Date();
      const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      await db('scheduled_scrape_executions')
        .where({ id: executionId })
        .update({
          session_id: sessionId,
          status: 'completed',
          items_scraped: itemsScraped,
          credits_used: totalCreditsUsed,
          ai_analysis_performed: config.aiAnalysis || false,
          benchmark_performed: config.benchmark || false,
          mention_detection_performed: config.mentionDetection || false,
          changes_detected: JSON.stringify(changes),
          completed_at: endTime,
          duration_seconds: durationSeconds,
        });

      // 12. Mettre à jour les stats du scraper
      await db('scheduled_scrapes')
        .where({ id: scraper.id })
        .update({
          last_run_at: endTime,
          next_run_at: this.calculateNextRun(scraper),
          total_runs: db.raw('total_runs + 1'),
          successful_runs: db.raw('successful_runs + 1'),
          total_credits_spent: db.raw(`total_credits_spent + ${totalCreditsUsed}`),
        });

      // 13. Notification de succès
      if (notifSettings.email) {
        await this.sendSuccessNotification(scraper, executionId, itemsScraped, changes);
      }

      logger.info(`[SCHEDULED_SCRAPE] Execution ${executionId} completed successfully`);

      return {
        id: executionId,
        status: 'completed',
        items_scraped: itemsScraped,
        credits_used: totalCreditsUsed,
        changes_detected: changes,
      };

    } catch (error: any) {
      logger.error(`[SCHEDULED_SCRAPE] Execution ${executionId} failed:`, error);

      // Mettre à jour l'exécution avec l'erreur
      try {
        await db('scheduled_scrape_executions')
          .where({ id: executionId })
          .update({
            status: 'failed',
            error_message: error.message + (error.stack ? `\n${error.stack}` : ''),
            completed_at: new Date(),
          });
      } catch (updateErr) {
        logger.error(`[SCHEDULED_SCRAPE] Failed to update execution ${executionId} status:`, updateErr);
      }

      // Mettre à jour les stats
      try {
        await db('scheduled_scrapes')
          .where({ id: scraper.id })
          .update({
            last_run_at: new Date(),
            next_run_at: this.calculateNextRun(scraper),
            total_runs: db.raw('total_runs + 1'),
            failed_runs: db.raw('failed_runs + 1'),
          });
      } catch (statsErr) {
        logger.error(`[SCHEDULED_SCRAPE] Failed to update scraper stats for ${scraper.id}:`, statsErr);
      }

      // Notification d'erreur
      if (notifSettings.alertOnError) {
        await this.sendErrorNotification(scraper, executionId, error);
      }

      return {
        id: executionId,
        status: 'failed',
        items_scraped: 0,
        credits_used: 0,
        changes_detected: {},
        error_message: error.message,
      };
    }
  }

  /**
   * Attendre la fin du scraping
   */
  private async waitForScrapingCompletion(sessionId: string, maxWaitMinutes = 30): Promise<void> {
    const maxAttempts = maxWaitMinutes * 2; // Check every 30 seconds
    let attempts = 0;

    while (attempts < maxAttempts) {
      const session = await db('scraping_sessions').where({ id: sessionId }).first();
      
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status === 'completed') {
        return;
      }

      if (session.status === 'failed') {
        throw new Error('Scraping failed');
      }

      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      attempts++;
    }

    throw new Error('Scraping timeout');
  }

  /**
   * Exécuter l'analyse IA
   * Utilise les coûts centralisés de COST_MATRIX
   */
  private async runAiAnalysis(sessionId: string, userId: number): Promise<number> {
    try {
      // Récupérer les données de la session pour calculer le coût dynamique
      const sessionData = await sessionService.getSession(sessionId);
      const itemsScraped = sessionData?.totalItems || sessionData?.items_scraped || 10;
      
      // Calculer le coût basé sur le nombre d'items (1 page, N posts)
      const cost = calculateAiAnalysisCost(1, itemsScraped);
      
      // Déduire les crédits pour l'analyse IA
      await creditService.deductCredits(
        userId,
        cost,
        'facebook_pages', // Service type pour l'analyse IA
        sessionId,
        `Analyse IA automatisée: ${itemsScraped} items`
      );
      
      logger.info(`[AUTOMATION] AI Analysis cost: ${cost} credits for ${itemsScraped} items`);
      return cost;
    } catch (error) {
      logger.error(`[AUTOMATION] Failed to run AI analysis:`, error);
      return 0;
    }
  }

  /**
   * Exécuter le benchmark
   * Utilise les coûts centralisés de COST_MATRIX
   */
  private async runBenchmark(sessionId: string, userId: number): Promise<number> {
    try {
      // Récupérer les données de la session
      const sessionData = await sessionService.getSession(sessionId);
      const itemsScraped = sessionData?.totalItems || sessionData?.items_scraped || 10;
      
      // Calculer le coût du benchmark (1 page, N posts, avec analyse IA)
      const cost = calculateBenchmarkCost(1, itemsScraped, true);
      
      // Déduire les crédits pour le benchmark
      await creditService.deductCredits(
        userId,
        cost,
        'facebook_pages_benchmark',
        sessionId,
        `Benchmark automatisé: ${itemsScraped} items`
      );
      
      logger.info(`[AUTOMATION] Benchmark cost: ${cost} credits for ${itemsScraped} items`);
      return cost;
    } catch (error) {
      logger.error(`[AUTOMATION] Failed to run benchmark:`, error);
      return 0;
    }
  }

  /**
   * Exécuter la détection de mentions
   * Utilise les coûts centralisés de COST_MATRIX
   */
  private async runMentionDetection(sessionId: string, userId: number): Promise<number> {
    try {
      // 1. Récupérer les mots-clés actifs de l'utilisateur
      const keywords = await mentionDetectionService.getUserKeywords(userId);
      if (!keywords || keywords.length === 0) {
        logger.warn('[AUTOMATION] No keywords configured, skipping mention detection');
        return 0;
      }

      // 2. Exécuter la détection de mentions (appel IA réel)
      const mentions = await mentionDetectionService.detectMentionsInSession(
        sessionId, userId, keywords
      );

      // 3. Calculer le coût réel basé sur les résultats
      const cost = calculateMentionsCost(mentions.length) + (COST_MATRIX.mentions.perKeyword * keywords.length);

      // 4. Déduire les crédits uniquement si coût > 0
      if (cost > 0) {
        await creditService.deductCredits(
          userId, cost, 'mention_analysis' as any, sessionId,
          `Détection mentions automatisée: ${mentions.length} mentions, ${keywords.length} mots-clés`
        );
      }

      logger.info(`[AUTOMATION] Mention detection: ${mentions.length} mentions found, cost: ${cost} credits`);
      return cost;
    } catch (error) {
      logger.error(`[AUTOMATION] Failed to run mention detection:`, error);
      return 0;
    }
  }

  /**
   * Détecter les changements par rapport à la dernière exécution
   */
  private async detectChanges(scraper: ScheduledScrape, currentSession: any): Promise<any[]> {
    const changes: any[] = [];

    // Récupérer la dernière exécution réussie
    const lastExecution = await db('scheduled_scrape_executions')
      .where({
        scheduled_scrape_id: scraper.id,
        status: 'completed',
      })
      .whereNot('session_id', currentSession.id)
      .orderBy('completed_at', 'desc')
      .first();

    if (!lastExecution || !lastExecution.session_id) {
      return changes; // Première exécution, pas de comparaison
    }

    const previousSession = await sessionService.getSession(lastExecution.session_id);

    if (!previousSession) {
      return changes;
    }

    // Comparer le nombre d'items
    const currentItems = currentSession.totalItems || 0;
    const previousItems = previousSession.totalItems || 0;
    
    if (currentItems !== previousItems) {
      changes.push({
        change_type: 'item_count',
        change_category: 'volume',
        old_value: previousItems.toString(),
        new_value: currentItems.toString(),
        metadata: {
          difference: currentItems - previousItems,
        },
        severity: Math.abs(currentItems - previousItems) > 10 ? 'high' : 'medium',
      });
    }

    // Pour Marketplace: détecter les changements de prix
    if (scraper.scrape_type === 'marketplace') {
      const priceChanges = await this.detectPriceChanges(
        lastExecution.session_id,
        currentSession.id
      );
      changes.push(...priceChanges);
    }

    // Pour Facebook Pages: détecter nouvelles mentions
    if (scraper.scrape_type === 'facebook_pages' && this.parseConfig(scraper).mentionDetection) {
      const mentionChanges = await this.detectNewMentions(
        lastExecution.session_id,
        currentSession.id
      );
      changes.push(...mentionChanges);
    }

    return changes;
  }

  /**
   * Détecter les changements de prix
   */
  private async detectPriceChanges(previousSessionId: string, currentSessionId: string): Promise<any[]> {
    const changes: any[] = [];

    // Récupérer les items des deux sessions
    const previousItems = await db('scraped_items')
      .where({ session_id: previousSessionId })
      .select('title', 'price', 'url');

    const currentItems = await db('scraped_items')
      .where({ session_id: currentSessionId })
      .select('title', 'price', 'url');

    // Créer un map des items précédents par URL
    const previousMap = new Map(previousItems.map(item => [item.url, item]));

    // Comparer les prix
    for (const currentItem of currentItems) {
      const previousItem = previousMap.get(currentItem.url);
      
      if (previousItem && previousItem.price !== currentItem.price) {
        const oldPrice = parseFloat(previousItem.price?.replace(/[^\d.]/g, '') || '0');
        const newPrice = parseFloat(currentItem.price?.replace(/[^\d.]/g, '') || '0');
        
        if (oldPrice > 0 && newPrice > 0 && oldPrice !== newPrice) {
          const percentChange = ((newPrice - oldPrice) / oldPrice) * 100;
          
          changes.push({
            change_type: 'price_change',
            change_category: 'pricing',
            old_value: previousItem.price,
            new_value: currentItem.price,
            metadata: {
              title: currentItem.title,
              url: currentItem.url,
              percent_change: percentChange.toFixed(2),
              direction: newPrice > oldPrice ? 'increase' : 'decrease',
            },
            severity: Math.abs(percentChange) > 20 ? 'high' : Math.abs(percentChange) > 10 ? 'medium' : 'low',
          });
        }
      }
    }

    return changes;
  }

  /**
   * Détecter les nouvelles mentions
   */
  private async detectNewMentions(previousSessionId: string, currentSessionId: string): Promise<any[]> {
    const changes: any[] = [];

    // Récupérer les mentions détectées
    const newMentions = await db('brand_mentions')
      .where({ session_id: currentSessionId })
      .where('created_at', '>', db('scheduled_scrape_executions')
        .where({ session_id: previousSessionId })
        .select('completed_at')
        .first()
      );

    for (const mention of newMentions) {
      changes.push({
        change_type: 'new_mention',
        change_category: 'engagement',
        old_value: null,
        new_value: mention.comment_text,
        metadata: {
          mention_type: mention.mention_type,
          priority: mention.priority_level,
          author: mention.comment_author,
          sentiment: mention.sentiment_score,
        },
        severity: mention.priority_level === 'urgent' ? 'critical' : mention.priority_level === 'high' ? 'high' : 'medium',
      });
    }

    return changes;
  }

  /**
   * Sauvegarder les changements détectés
   */
  private async saveChanges(executionId: string, changes: any[]): Promise<void> {
    const changeRecords = changes.map(change => ({
      execution_id: executionId,
      ...change,
    }));

    await db('scheduled_scrape_changes').insert(changeRecords);
  }

  /**
   * Envoyer les alertes
   */
  private async sendAlerts(scraper: ScheduledScrape, changes: any[], sessionData: any): Promise<void> {
    const criticalChanges = changes.filter(c => c.severity === 'critical' || c.severity === 'high');

    if (criticalChanges.length === 0) {
      return;
    }

    // Alertes de changement de prix
    const priceChanges = criticalChanges.filter(c => c.change_type === 'price_change');
    const ns = this.parseNotifSettings(scraper);
    if (priceChanges.length > 0 && ns.alertOnPriceChange) {
      await this.sendPriceChangeAlert(scraper, priceChanges);
    }

    // Alertes de nouvelles mentions
    const newMentions = criticalChanges.filter(c => c.change_type === 'new_mention');
    if (newMentions.length > 0 && ns.alertOnNewMention) {
      await this.sendMentionAlert(scraper, newMentions);
    }
  }

  /**
   * Mettre en pause pour crédits insuffisants
   */
  private async pauseForInsufficientCredits(scraper: ScheduledScrape): Promise<void> {
    await db('scheduled_scrapes')
      .where({ id: scraper.id })
      .update({
        is_paused: true,
        pause_reason: 'insufficient_credits',
      });

    // Envoyer notification
    await this.sendInsufficientCreditsNotification(scraper);

    logger.warn(`[SCHEDULED_SCRAPE] Paused scrape ${scraper.id} due to insufficient credits`);
  }

  /**
   * Calculer la prochaine exécution
   */
  private calculateNextRun(scraper: ScheduledScrape): Date {
    const now = new Date();

    switch (scraper.frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      case 'custom':
        // Pour les expressions CRON personnalisées, calculer la prochaine occurrence
        // (nécessite une bibliothèque comme cron-parser)
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Notifications par email
   */
  private async sendSuccessNotification(
    scraper: ScheduledScrape,
    executionId: string,
    itemsScraped: number,
    changes: any[]
  ): Promise<void> {
    const user = await db('users').where({ id: scraper.user_id }).first();
    const emailAddress = this.parseNotifSettings(scraper).emailAddress || user?.email;

    if (!emailAddress) return;

    const subject = `✅ Scraping automatisé terminé: ${scraper.name}`;
    const html = `
      <h2>Scraping automatisé terminé avec succès</h2>
      <p><strong>Nom:</strong> ${scraper.name}</p>
      <p><strong>Items extraits:</strong> ${itemsScraped}</p>
      <p><strong>Changements détectés:</strong> ${changes.length}</p>
      ${changes.length > 0 ? `
        <h3>Changements importants:</h3>
        <ul>
          ${changes.slice(0, 5).map(c => `
            <li>${c.change_type}: ${c.new_value || 'N/A'}</li>
          `).join('')}
        </ul>
      ` : ''}
      <p><a href="${process.env.FRONTEND_URL}/dashboard/automations/${scraper.id}">Voir les détails</a></p>
    `;

    await mailer.sendEmail({ to: emailAddress, subject, html });

    await db('scheduled_scrape_notifications').insert({
      scheduled_scrape_id: scraper.id,
      execution_id: executionId,
      notification_type: 'success',
      recipient_email: emailAddress,
      subject,
    });
  }

  private async sendErrorNotification(
    scraper: ScheduledScrape,
    executionId: string,
    error: Error
  ): Promise<void> {
    const user = await db('users').where({ id: scraper.user_id }).first();
    const emailAddress = this.parseNotifSettings(scraper).emailAddress || user?.email;

    if (!emailAddress) return;

    const subject = `❌ Erreur scraping automatisé: ${scraper.name}`;
    const html = `
      <h2>Erreur lors du scraping automatisé</h2>
      <p><strong>Nom:</strong> ${scraper.name}</p>
      <p><strong>Erreur:</strong> ${error.message}</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard/automations/${scraper.id}">Voir les détails</a></p>
    `;

    await mailer.sendEmail({ to: emailAddress, subject, html });

    await db('scheduled_scrape_notifications').insert({
      scheduled_scrape_id: scraper.id,
      execution_id: executionId,
      notification_type: 'error',
      recipient_email: emailAddress,
      subject,
    });
  }

  private async sendInsufficientCreditsNotification(scraper: ScheduledScrape): Promise<void> {
    const user = await db('users').where({ id: scraper.user_id }).first();
    const emailAddress = this.parseNotifSettings(scraper).emailAddress || user?.email;

    if (!emailAddress) return;

    const subject = `⚠️ Crédits insuffisants: ${scraper.name}`;
    const html = `
      <h2>Automatisation mise en pause</h2>
      <p>Votre automatisation "${scraper.name}" a été mise en pause car vous n'avez pas assez de crédits.</p>
      <p><strong>Crédits nécessaires:</strong> ${scraper.credits_per_run}</p>
      <p><strong>Vos crédits actuels:</strong> ${user?.credits || 0}</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard/credits">Recharger mes crédits</a></p>
    `;

    await mailer.sendEmail({ to: emailAddress, subject, html });

    await db('scheduled_scrape_notifications').insert({
      scheduled_scrape_id: scraper.id,
      notification_type: 'insufficient_credits',
      recipient_email: emailAddress,
      subject,
    });
  }

  private async sendPriceChangeAlert(scraper: ScheduledScrape, priceChanges: any[]): Promise<void> {
    const user = await db('users').where({ id: scraper.user_id }).first();
    const emailAddress = this.parseNotifSettings(scraper).emailAddress || user?.email;

    if (!emailAddress) return;

    const subject = `💰 Changements de prix détectés: ${scraper.name}`;
    const html = `
      <h2>Changements de prix détectés</h2>
      <p>${priceChanges.length} changement(s) de prix détecté(s):</p>
      <ul>
        ${priceChanges.map(c => `
          <li>
            <strong>${c.metadata.title}</strong><br>
            Ancien prix: ${c.old_value}<br>
            Nouveau prix: ${c.new_value}<br>
            Variation: ${c.metadata.percent_change}%
          </li>
        `).join('')}
      </ul>
    `;

    await mailer.sendEmail({ to: emailAddress, subject, html });

    await db('scheduled_scrape_notifications').insert({
      scheduled_scrape_id: scraper.id,
      notification_type: 'price_change',
      recipient_email: emailAddress,
      subject,
    });
  }

  private async sendMentionAlert(scraper: ScheduledScrape, mentions: any[]): Promise<void> {
    const user = await db('users').where({ id: scraper.user_id }).first();
    const emailAddress = this.parseNotifSettings(scraper).emailAddress || user?.email;

    if (!emailAddress) return;

    const subject = `🔔 Nouvelles mentions détectées: ${scraper.name}`;
    const html = `
      <h2>Nouvelles mentions de votre marque</h2>
      <p>${mentions.length} nouvelle(s) mention(s) détectée(s):</p>
      <ul>
        ${mentions.map(m => `
          <li>
            <strong>${m.metadata.author}</strong> (${m.metadata.mention_type})<br>
            ${m.new_value}<br>
            Priorité: ${m.metadata.priority}
          </li>
        `).join('')}
      </ul>
    `;

    await mailer.sendEmail({ to: emailAddress, subject, html });

    await db('scheduled_scrape_notifications').insert({
      scheduled_scrape_id: scraper.id,
      notification_type: 'new_mention',
      recipient_email: emailAddress,
      subject,
    });
  }

  /**
   * Envoyer le rapport hebdomadaire
   */
  async sendWeeklyReports(): Promise<void> {
    const scrapers = await db('scheduled_scrapes')
      .where('is_active', true)
      .whereRaw("notification_settings->>'weeklyReport' = 'true'");

    for (const scraper of scrapers) {
      await this.sendWeeklyReport(scraper);
    }
  }

  private async sendWeeklyReport(scraper: ScheduledScrape): Promise<void> {
    const user = await db('users').where({ id: scraper.user_id }).first();
    const emailAddress = this.parseNotifSettings(scraper).emailAddress || user?.email;

    if (!emailAddress) return;

    // Récupérer les stats de la semaine
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const executions = await db('scheduled_scrape_executions')
      .where({ scheduled_scrape_id: scraper.id })
      .where('created_at', '>=', weekAgo)
      .orderBy('created_at', 'desc');

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const totalItemsScraped = executions.reduce((sum, e) => sum + (e.items_scraped || 0), 0);
    const totalCreditsUsed = executions.reduce((sum, e) => sum + (e.credits_used || 0), 0);

    const subject = `📊 Rapport hebdomadaire: ${scraper.name}`;
    const html = `
      <h2>Rapport hebdomadaire - ${scraper.name}</h2>
      <h3>Statistiques de la semaine</h3>
      <ul>
        <li><strong>Exécutions:</strong> ${totalExecutions}</li>
        <li><strong>Succès:</strong> ${successfulExecutions}</li>
        <li><strong>Items extraits:</strong> ${totalItemsScraped}</li>
        <li><strong>Crédits utilisés:</strong> ${totalCreditsUsed}</li>
      </ul>
      <p><a href="${process.env.FRONTEND_URL}/dashboard/automations/${scraper.id}">Voir les détails</a></p>
    `;

    await mailer.sendEmail({ to: emailAddress, subject, html });

    await db('scheduled_scrape_notifications').insert({
      scheduled_scrape_id: scraper.id,
      notification_type: 'weekly_report',
      recipient_email: emailAddress,
      subject,
    });
  }

  /**
   * Obtenir les statistiques d'un scraper
   */
  async getScraperStats(scraperId: string): Promise<any> {
    const scraper = await db('scheduled_scrapes').where({ id: scraperId }).first();
    
    if (!scraper) {
      throw new Error('Scraper not found');
    }

    const executions = await db('scheduled_scrape_executions')
      .where({ scheduled_scrape_id: scraperId })
      .orderBy('created_at', 'desc')
      .limit(30);

    const totalChanges = await db('scheduled_scrape_changes')
      .whereIn('execution_id', executions.map(e => e.id))
      .count('* as count')
      .first();

    return {
      scraper,
      executions,
      stats: {
        total_runs: scraper.total_runs,
        successful_runs: scraper.successful_runs,
        failed_runs: scraper.failed_runs,
        success_rate: scraper.total_runs > 0 
          ? ((scraper.successful_runs / scraper.total_runs) * 100).toFixed(2) 
          : 0,
        total_credits_spent: scraper.total_credits_spent,
        total_changes_detected: totalChanges?.count || 0,
      },
    };
  }
}

export const scheduledScrapeService = new ScheduledScrapeService();
